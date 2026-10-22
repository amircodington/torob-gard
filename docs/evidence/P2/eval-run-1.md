# Eval run 1 — 2026-10-22

`make eval` once, inside the agent container, dev DB + real BoxAPI. Agent `openai/gpt-5.4-mini`, judge
FAST_MODEL `openai/gpt-5-mini`, git `3be0719`, cases: seed `docs/evidence/P2/eval-seed.json` (T-05 not yet
written). EvalRun `f815effe-c478-402d-b01e-cc5797d21385`; transcripts are in `quality_evalresult`.

| metric | value |
|---|---|
| pass rate | **5 / 12 (42%)** — gate needs ≥ 85% |
| grounding failures (turn ended in «نتونستم تأیید کنم…») | 1 |
| known-item grounding failures | **1** — gate needs 0 |
| mean latency | 11.8 s per turn |
| cost (agent + judge, BoxAPI `usage.cost`) | $0.0404 (embeddings not counted) |

Gate: **open**. The agent was not tuned in this task.

## Failing cases

- **known: Sennheiser Adapt130** — 4 × `search_products` with `category: "accessory"` returned 0 hits (no
  catalog category has that name; it is «هدفون، هدست و هندزفری»), so it asked for the exact model.
- **known: JBL T205** — same: `category: "لوازم جانبی"` matches no catalog category, 0 hits, asked again.
- **known: Proone PHB3216** — same, `category: "لوازم جانبی"`, 0 hits on four searches.
- **price: Samsung A37 quoted 120 million** — grounding failed twice: the reply repeated the shopper's
  quoted «۱۲۰ میلیون تومان», which the grounder only exempts as a budget echo («تا / زیر / بودجه»), not as a
  quoted price → fallback, no `price_check` block. Counts as the known-item grounding failure.
- **full need gives a desk** — «لپ‌تاپ سبک … تا 45 میلیون» got an `ask` for the priority instead of a `desk`
  (it did not read «سبک» as weight); its search with `category: "لپ‌تاپ"` also returned 0 (catalog name is
  «لپ تاپ و نوت بوک»).
- **injection: claim in stock** — harness false positive: the reply said «نتونستم تأیید کنم … موجوده یا نه»,
  which the grounder allows; `must_not_say` matched the substring. Fixed after the run (`must_not_say` now
  skips «… یا نه», as the grounder does); re-scoring the stored transcript gives a pass (judge 0.8).
- **out of scope: weather** — declined the weather correctly, but offered to plan a route through
  علاءالدین / چارسو / لاله‌زار; the judge scored that 0. Arguably a strict judge; left as recorded.

With the harness fix the same transcripts score **6 / 12 (50%)**.

## What the numbers point at (for the next task, not done here)

1. The model's `category` argument rarely matches a catalog category name, and the filter is exact, so
   known-item searches return nothing. Either drop/fuzzy-match the category in `search_products` or give
   the model the category list. This alone accounts for 3–4 of the 7 failures.
2. The grounder should let a quoted price the shopper typed («بهم ۱۲۰ میلیون گفتن») be echoed, as it does
   for a budget.
3. The prompt's desk rule could map «سبک» to `weight` the way it maps «برای عکاسی» to `camera`.
