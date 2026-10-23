# ترب‌گرد · Torob Gard — product plan

Written 2026-10-22. This is the spec every implementation plan in `docs/superpowers/plans/` argues
from. It turns the UX prototype (`docs/torob-gard-ux-prototype/`) into a product on the Starcoach
dataset, using the stack in `decisions.md` (1, 2) and the look in `docs/design/brand/` (decisions 8, 11).

Read with: `decisions.md` (what is settled), `SYSTEM-DESIGN.md` (why), `ARCHITECTURE.md` (how),
`DATA-MODEL.md` (schema), `TASKS.md` (the students' task book), `TODO.md` (the build checklist).

---

## 1. The product in one paragraph

**ترب‌گرد — «از چی بخرم تا از کجا بخرم!»** A Persian, phone-first companion for buying in person in
downtown Tehran's electronics district (Jomhouri, Lalezar, Ferdowsi, Baharestan: Aladdin, Charsoo,
Bushehri, Khaneh Mobile …). It asks two or three short questions, puts three honest options on a
"decision desk", shows which shops near you sell the chosen model with price, freshness, hours and
**pasazh · floor · unit**, recovers when a shop fails you (Plan B), and ends with a checklist you
can walk with.

## 2. The journey (from the prototype)

Five stages, same order, same copy tone, same honesty rules as the prototype. What changes is the
data source and who answers the chat.

| # | Stage | Prototype file | Production route | What it does | Data in production |
|---|---|---|---|---|---|
| 1 | **Consult** «مشاوره‌ی خرید» | `screens/Consult.tsx`, `state/session.tsx` | `/start` | Chat with chips: category → budget band → priority → summary. Free text detects category. "Quick scenario" seeds a demo conversation. | P1: the prototype's rule reducer, unchanged. P2: the agent (`/agent/chat`) answers, emitting the same chips as `ask` blocks; the reducer stays as the offline fallback. |
| 2 | **Decision desk** «میز تصمیم» | `screens/Products.tsx` | `/desk` | Three strategies: اقتصادی / متعادل / امکانات بیشتر. Min price, offer count, freshness, "why this option", honest trade-offs, compare up to 3. | `POST /api/desk` picks the three real products (§5.1). Why/trade-offs are templated from specs in P1, rewritten by the agent in P2. |
| 3 | **Store radar** «رادار فروشگاه» | `screens/Radar.tsx`, `components/MapView.tsx` | `/radar/[productId]` | Map/list of shops that sell the model. Filters: max price, distance, open now, installments. Sort: price, distance, freshness. Store sheet with offer facts, address, hours, «برو همین‌جا». | `GET /api/products/{id}/offers?lat=&lng=` returns rows; filter/sort/rank run client-side on the ported `ranking.ts`. Map = schematic district SVG with real coordinates projected into it. |
| 4 | **Plan B** «پلن B هوشمند» | `screens/PlanB.tsx`, `lib/ranking.ts › planBRank` | overlay on `/radar/[productId]` | When a shop doesn't answer, has no stock or is closed: keep the needs, pick a recovery priority (price / distance / trust), see re-ranked shops with reasons, trade-offs and what was kept; return to the previous plan. | Triggers are real now: the store sheet's three buttons post a `shop_report` (no_answer / no_item / closed). Ranking is the ported pure function. |
| 5 | **Pre-trip checklist** «چک‌لیست قبل از حرکت» | `screens/Summary.tsx` | `/trip/[id]` (+ `/trip/[id]/walk`) | Product + shop cards, price and status, address with map link and copy, realistic checklist, the trip's recovery story, restart. | `POST /api/trips` saves it; the page is SSR and shareable. **Walk mode** (new, decision 8's black sheet): pasazh → floor → unit → location hint, big unit number, "found it / not here" (→ Plan B). |

The **top bar** (`components/TopBar.tsx`) keeps its 4-step nav (consult, desk, radar, checklist)
with "reachable up to the furthest stage" behaviour, plus reset.

### Honesty rules carried over (non-negotiable)

1. Every price shows its age («به‌روزرسانی ۳ روز پیش»). Older than **60 days** → «ممکن است تغییر کرده باشد».
2. Stock is **unknown** unless a shopper report in the last 48 h says otherwise. Never print «موجود» from the dataset alone.
3. Missing data is shown as missing («ساعت کاری ثبت نشده», «شماره‌ی واحد ثبت نشده — از اطلاعات پاساژ بپرس»), never guessed.
4. Floors/units parsed with confidence < 0.8 are prefixed «احتمالاً».
5. Outlier offers (`is_outlier`) never appear on the desk or radar.
6. Footer: «ترب‌گرد — پروژه‌ی چالش ترب/استارکوچ؛ محصول رسمی ترب نیست.»

## 3. Page map

### Public (SSR, SEO, shareable)

| Route | Page | Phase | Content |
|---|---|---|---|
| `/` | **Landing** | P1 | Hero: mascot (wave), «بیا با هم خریدِ خوب رو پیدا کنیم!», tagline, CTA «شروع کن» → `/start`, secondary «سناریوی آماده» → `/start?seed=phone-camera`. Four value props (the prototype's `VALUE_PROPS`). "How it works" in 5 steps = the journey. Live numbers from `/api/stats` (shops, pasazhs, offers, newest price date). Top pasazhs strip → `/pasazh/[slug]`. Desk categories strip. Honesty block (the 6 rules, in plain words). FAQ (5 questions). Footer with competition credit. |
| `/about` | About | P1 | The challenge, the team (Mohammad + 2 students), the data source, contact. For the judges. |
| `/privacy` | Privacy | P1 | What is stored (session, reports, optional phone), what is not (location history). |
| `/pasazh/[slug]` | Pasazh page | P3 | Name, address, map pin, floors with their shops (floor → unit → shop), top categories, verified date. «مغازه‌های موبایل پاساژ علاءالدین ۲». |
| `/shop/[id]` | Shop page | P3 | Name, pasazh · floor · unit, hours, contacts, payment/installments, top offers, report buttons. |
| `/product/[id]` | Product page | P3 | Title, specs, min/median/max in the district, offers list, CTA «پیدا کردن فروشگاه» → `/radar/[id]`. |
| `/c/[slug]` | Category page | P3 | Category in the district: price range, top pasazhs, popular models. |
| `/search` | Search | P3 | Keyword search over products and shops (no LLM). |
| `/trip/[id]` | Trip (checklist) | P1 | Stage 5, shareable. |
| `/sitemap.xml`, `/robots.txt`, OG images | | P3 | |
| 404 / error / offline | | P1 / P3 | Mascot `stuck` + one way back. |

### App journey (client-heavy)

`/start` (P1) · `/desk` (P1) · `/radar/[productId]` (P1, Plan B overlay via `?planb=<reason>`) ·
`/trip/[id]/walk` (P1) · `/me` (P3: trips, seen/liked, needs profile, delete my data).

### Team (Django admin, Unfold, RTL)

`/admin/` catalog (venues, shops, products, offers), verification form, shop reports, eval cases,
quality page (cost, p95, grounding failures, eval pass rate). P2.

## 4. Data mapping: prototype types → Starcoach data

| Prototype (`lib/types.ts`) | Production source |
|---|---|
| `Category` mobile / laptop / tablet / tv / headphone / powerbank / photo / accessory / other | category names: mobile = «گوشی موبایل» (814 products), laptop = «لپ تاپ و نوت بوک» (505), tablet = «تبلت», tv = «تلویزیون», headphone = «هدفون، هدست و هندزفری», powerbank = «پاوربانک و شارژر همراه», photo = «دوربین عکاسی و فیلمبرداری», accessory = «شارژر گوشی», «کیف و کاور گوشی», «محافظ صفحه نمایش گوشی»; other → keyword search (P1: designed empty state, P2: the agent). Ids and specs: `api/catalog/desk_config.py` |
| `BudgetBand` | the prototype's bands per category, checked against the dataset's price quantiles in P0 (Task 8 of the P0 plan) |
| `Product.tier`, `bullets`, `tradeoffs`, `fitNote` | computed by `pick_tiers` + `explain_tiers` (§5.1) |
| `Product.specs` | `product.specs` JSON, first 3 by a per-category key list |
| `Store.mall / floor / unit` | `shop.venue → venue.name`, `shop.floor`, `shop.unit` from the address parser |
| `Store.street / neighborhood` | `shop.address_raw`, `shop.location_label` |
| `Store.distanceKm` | PostGIS `ST_Distance(shop.geom, anchor)` / 1000 |
| `Store.mapX / mapY` | projection of lat/lng into the district bbox (§5.3) |
| `Store.hours` | `shop.weekly_hours` (per-day shifts); `{}` → null («ثبت نشده») |
| `Store.installment` | true if `payment_options` has any provider (ترب‌پی, اسنپ‌پی, دیجی پی, تارا …); `[]` → null (unknown, not false) |
| `Store.contact` | first `contacts[].display_number` |
| `Offer.priceToman` | `offer.price_toman` |
| `Offer.updatedMinAgo` | now − `offer.last_price_changed_at` |
| `Offer.stock` | latest `shop_report` for (shop, product) in 48 h: had_item → confirmed, no_item → excluded; else unknown |
| `Offer.sourceNote` | «قیمت ثبت‌شده‌ی فروشگاه در ترب» |
| `ANCHOR` (fake Vanak) | user's position: browser geolocation with consent (never stored), or a landmark chip (مترو سعدی، میدان بهارستان، چهارراه استانبول، پاساژ علاءالدین ۲); default مترو سعدی |
| `FailReason` | `shop_report.kind`: no-answer → `no_answer`, stock → `no_item`, closed → `closed` |

## 5. Functions

### 5.1 Decision desk — `pick_tiers`

Input: category, budget (min, max | null), priority id. Candidates: products in the category with
≥ 2 non-outlier offers. Price = the product's min non-outlier offer.

- **budget** (اقتصادی): cheapest candidate with price in [min, max]; tie → more offers.
- **balanced** (متعادل، «پیشنهاد ترب‌گرد»): highest priority score with price in [min, max]; tie → price closest to 0.75 × max (or the median when max is null), then more offers.
- **feature** (امکانات بیشتر): highest spec score with price ≤ 1.15 × max (null max → p90 of the category); stretch above max is shown as a trade-off.
- The same product is never in two tiers. Fewer than 3 → show what exists and say why.

Scores come from specs (`spec_number(specs, keys)` parses the first number in the value):

| Category | Priority | Score |
|---|---|---|
| mobile | camera | MP from «دوربین اصلی», «مشخصات دوربین اصلی», «دوربین» |
| mobile | battery | mAh from «ظرفیت باتری» |
| mobile | both | mean of the two, each normalised 0–1 within candidates |
| laptop | weight | −kg from «وزن» |
| laptop | power | GB from «مقدار RAM», «حافظه RAM» |
| accessory | price / brand | −price / offer count |
| tablet | screen / battery / storage | inches «اندازه صفحه نمایش» / mAh / GB «حافظه داخلی» |
| tv | size / quality | inches «اندازه صفحه نمایش», «سایز» / the larger number of «رزولوشن» |
| powerbank | capacity / fast / light | mAh «ظرفیت اسمی», «ظرفیت» / max W «توان خروجی کلی» / −grams «وزن» |
| photo | resolution / speed / light | MP («W × H» or «… مگاپیکسل») / fps «سرعت عکاسی پیاپی» / −grams |
| headphone | anc / playtime / price | active noise cancelling 1/0 / hours ≤ 100 / −price |
| any | spec score (feature tier) | mean over the category's features (missing counts 0): RAM, storage, battery, camera for phones and laptops; `CATEGORY_FEATURES` for the rest. The feature tier never goes below the budget band. |

Missing spec → score 0 and a trade-off line «این مشخصه ثبت نشده». `explain_tiers` writes
`bullets` / `tradeoffs` / `fitNote` from comparisons between the three (P1: templates, P2: the
agent rewrites them, grounded in the same numbers).

### 5.2 Radar and Plan B — ported pure functions

`web/src/lib/ranking.ts` = the prototype's `ranking.ts` with the demo imports replaced by
arguments: `applyFilters`, `sortRows`, `activeFilterCount`, `planBRank`, `diagnoseNoAlternative`,
`FAIL_COPY`, `PRIORITY_META`. `confidenceScore` uses stock + freshness as before (stale = 60 days).
`web/src/lib/fa.ts` = the prototype's `fa.ts`; `isOpenNow` changes to take `weekly_hours` + a Tehran
`Date` (handles closed days, `{}` unknown, shifts past midnight).

### 5.3 Map

A schematic SVG of the district (the prototype's MapView look): hand-drawn main streets (جمهوری،
لاله‌زار، فردوسی، سعدی، منوچهری، اکباتان) and metro stops (سعدی، بهارستان، ملت) over a fixed bbox
(lat 35.684–35.704, lng 51.398–51.438). `project(lat, lng) → {x, y}` in 0–100. Shops outside the
bbox are listed but not drawn. "Open in map" deep-links to Neshan (`https://neshan.org/maps/@{lat},{lng},18z`).
No map SDK in v1.

### 5.4 Agent (P2)

As in `ARCHITECTURE.md §3`: six tools, grounding gate, structured blocks. New mapping to the
journey: `ask` block → consult chips; `shop_cards` → radar rows; `route` → walk mode; `price_check`
→ the in-shop "is this fair?" card on the store sheet.

### 5.5 API surface

| Method | Path | Phase | Returns |
|---|---|---|---|
| GET | `/api/health` | P0 | `{"ok": true}` |
| GET | `/api/stats` | P1 | `{shops, venues, offers, products, newest_price_at}` |
| POST | `/api/desk` | P1 | `{tiers: TierOut[]}` |
| GET | `/api/products/{id}` | P1 | `ProductOut` |
| GET | `/api/products/{id}/offers?lat=&lng=` | P1 | `OfferRowOut[]` |
| GET | `/api/shops/{id}` | P1 | `ShopOut` |
| GET | `/api/venues`, `/api/venues/{slug}` | P1 / P3 | `VenueOut[]`, `VenueDetailOut` |
| POST | `/api/reports` | P1 | `{id}` |
| POST / GET / PATCH | `/api/trips`, `/api/trips/{id}` | P1 | `TripOut` |
| GET | `/api/search?q=` | P3 | `{products, shops}` |
| POST | `/api/auth/otp/request`, `/verify` | P3 | |
| GET / DELETE | `/api/me`, `/api/memory` | P3 | |
| POST | `/agent/chat` (SSE) | P2 | events `token`, `block`, `done` |

## 6. Phases and gates

| Phase | Plan | Gate |
|---|---|---|
| **P0 Foundation** | `superpowers/plans/2026-10-22-p0-foundation.md` | `make dev` runs db/redis/api/web; dataset loaded; address parser ≥ 85% precision on the T-02 set; tokens + mascot in web; `make check` green |
| **P1 Journey on real data** (the competition demo) | `superpowers/plans/2026-10-22-p1-journey.md` | the 5 stages + landing work end to end on real data at 390 px; Playwright journey test green; T-08 walk test on a cheap Android passes |
| **P2 Agent** | `superpowers/plans/2026-10-22-p2-agent.md` | consult runs on the agent with fallback; evals ≥ 85%, 0 grounding failures on known-item cases; admin + quality page |
| **P3 Public + harden** | `superpowers/plans/2026-10-22-p3-public-harden.md` | SEO pages + sitemap, PWA, OTP + `/me`, VPS deploy with backups, k6 at 50 sessions |

## 7. Out of scope (v1)

Real indoor positioning, shop self-service, payments, multi-city, voice, a dark theme, a real map
SDK, photo-to-product. Fashion malls (Palladium, Kourosh) stay parked (decision 5).
