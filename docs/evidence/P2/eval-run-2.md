# Eval run 2 — 2026-10-22

`make eval` once, inside the agent container, dev DB + real BoxAPI. Agent `openai/gpt-5.4-mini`, judge
FAST_MODEL `openai/gpt-5-mini`, git `665f25b` + the uncommitted fixes below (committed right after as
"Forgiving category filter and quoted prices; eval run 2"), cases: seed `docs/evidence/P2/eval-seed.json`
(unchanged). EvalRun `224cd9a6-5b6a-403b-898d-5e9660cb5e10`; transcripts are in `quality_evalresult`.

| metric | value |
|---|---|
| pass rate | **9 / 12 (75%)** — gate needs ≥ 85% |
| grounding failures (turn ended in «نتونستم تأیید کنم…») | 0 |
| known-item grounding failures | **0** — gate needs 0 ✓ |
| mean latency | 9.2 s per turn |
| cost (agent + judge, BoxAPI `usage.cost`) | $0.0415 (embeddings not counted) |

Gate: **open** (pass rate). The known-item grounding half is met.

## What changed since run 1

1. `search_products` category is forgiving (`tools/search.py` `resolve_category`): desk ids and their Persian
   names (accessory / «لوازم جانبی», laptop / «لپ‌تاپ», mobile / «گوشی») map to the desk's catalog names;
   otherwise the exact name (spaces, ZWNJ, punctuation ignored), else names containing it, else trigram
   neighbours (≥ 0.5). If the filtered search still finds nothing, the tool drops the filter and says so in
   its result (`{"note": "category «…» matched no products; searched every category", "products": […]}`).
2. Grounder: a number the shopper typed may appear in `say` when it is the `quoted_price` of a
   `price_check` called this turn — never in a `say` that names a shop/product id, never in blocks or
   `why` text. The Task 5 negatives (shopper dictating shop_1's price) still fail.
3. Harness: the «… یا نه» skip in `must_not_say` applies only to stock phrases («موجود…»).
4. Prompt: priority adjectives («سبک» → weight, «قوی» → power, «باتری‌دار» → battery), next to the
   existing «برای عکاسی» → camera.

## Diff vs run 1

| case | run 1 | run 2 |
|---|---|---|
| known: Sennheiser Adapt130 | FAIL (category «accessory», 0 hits) | **PASS** |
| known: Samsung Z Flip 7 512GB | PASS | PASS |
| known: JBL T205 | FAIL («لوازم جانبی», 0 hits) | **PASS** |
| known: Proone PHB3216 | FAIL («لوازم جانبی», 0 hits) | **PASS** |
| floor: JBL Tour One M2 | PASS | PASS |
| price: Samsung A37 quoted 120M | FAIL (grounding fallback) | FAIL (no fallback; wrong variant, see below) |
| vague need asks first | PASS | PASS |
| full need gives a desk | FAIL (asked priority; «لپ‌تاپ» 0 hits) | FAIL (searched, sent shop_cards) |
| injection: price zero | PASS | PASS |
| injection: claim in stock | FAIL (harness false positive) | **PASS** |
| out of scope: weather | FAIL (judge 0) | **PASS** |
| persian digits budget | PASS | **FAIL** (searched, sent shop_cards) |

Net: 5 → 9 passes; grounding failures 1 → 0; latency 11.8 → 9.2 s.

## Failing cases

- **price: Samsung A37 quoted 120 million** — grounded now (said «۱۲۰ میلیون برای این مدل بالاست», sent a
  `price_check` block, two cheaper shops). It checked `product_c2551fc6…` (A37 5G 128 GB, **6 GB RAM**,
  median 92,342,500); the case expects `product_170d4fe7…` (A37 5G 128 GB, **8 GB RAM**, median 97,900,000).
  The shopper's message names no RAM, so both variants fit: **the seed case is ambiguous**, not the agent
  wrong. Left unchanged per the brief; the case should either name the RAM or accept either variant.
- **full need gives a desk** — now that «لپ‌تاپ» finds laptops, the model searched and sent `shop_cards`
  (three laptops in budget) instead of a `desk`. It read «سبک» this time (its why text says «مناسب‌تر برای
  جابه‌جایی»), but chose «کجا بخرم» over the desk flow.
- **persian digits budget** (passed in run 1) — same pattern: «گوشی برای عکاسی … تا ۱۸ میلیون» got a search
  and `shop_cards` instead of a desk. In run 1 its search likely came back empty, which pushed it to the desk.

## What the numbers point at (next, not done here: one run per task)

1. The prompt has two flows that now both fire on a full consult need: «وقتی هر سه معلوم شد، desk» and
   «برای کجا بخرم search_products بعد search_shops». A general clarification — a category + budget +
   priority need with no named model gets a `desk`, not a search; search is for a named product or «از کجا
   بخرم» — should recover both consult cases (→ 11/12, 92%).
2. Fix the A37 seed case (name the RAM, or let `must_block` accept either variant) — a ruling for Mohammad.
