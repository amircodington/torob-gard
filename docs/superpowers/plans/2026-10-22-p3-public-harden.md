# P3 Public Pages and Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shareable SEO pages for every pasazh, shop, product and desk category; keyword search; an installable PWA; optional phone login with a `/me` page; and a production deploy on one Iranian VPS with backups and a load check.

**Architecture:** Next.js server components render catalog pages from Django read endpoints with ISR; a service worker caches the shell and the last trip for offline use; Django adds OTP auth (Kavenegar) and memory endpoints; Compose prod + nginx on the VPS, deployed with `make push-test` like future-mission-2d.

**Tech Stack:** as P0–P2, plus Kavenegar SMS, nginx, k6.

**Spec:** `docs/PLAN.md` §3 (public pages, `/me`), §5.5; `docs/ARCHITECTURE.md` §7–9; `docs/SYSTEM-DESIGN.md` §3, §7; `docs/DATA-MODEL.md` (people group, retention).

## Global Constraints

- Every public page: `<title>` and description in Persian, canonical URL, OG image, JSON-LD (`Store` for shops, `Product` + `AggregateOffer` for products, `ShoppingCenter` for pasazhs).
- Honesty rules (`PLAN.md §2`) apply to catalog pages too: price ages, «احتمالاً» floors, missing data shown as missing.
- Phone is optional, stored as HMAC + AES-GCM, never logged; no location history; sessions anonymised after 90 days.
- Rate limits: 30 agent turns / 10 min per user; 5 OTP / hour per phone; 20 reports / 10 min.
- No runtime loads from outside Iran except BoxAPI and `image.torob.com` (product images proxied and cached by nginx in this phase).

## Review Focus

1. Venue slug from a Persian-only name (no ASCII) → stable URL that survives a re-ingest (Task 1 test).
2. A shop or product id that no longer exists after a data refresh → 404 page with the stuck mascot, not a 500 (Task 1 test).
3. Offline after visiting a trip → `/trip/[id]` and walk mode still open from the service worker (Task 3 test).
4. OTP flooding one phone number or guessing codes → limited and locked after 5 wrong codes (Task 4 test).
5. A guest who logs in → their session's trips move to the account; «حذف داده‌هام» really deletes them (Task 4 test).

---

### Task 1: Catalog pages — pasazh, shop, product, category

**Files:**
- Modify: `api/catalog/api.py` (`GET /api/venues/{slug}`, `GET /api/shops/{id}`, `GET /api/categories/{slug}`)
- Create: `web/src/app/pasazh/[slug]/page.tsx`, `web/src/app/shop/[id]/page.tsx`, `web/src/app/product/[id]/page.tsx`, `web/src/app/c/[slug]/page.tsx`, `web/src/lib/seo.ts`, `web/e2e/catalog.spec.ts`, `api/tests/test_catalog_pages.py`

**Interfaces:**
- Produces: `VenueDetailOut{slug, name, address, lat, lng, verified_at, floors: list[{floor, label, shops: list[ShopOut]}], top_categories: list[{name, slug, count}]}` (floors sorted -1, 0, 1 …; shops without floor in a «طبقه نامشخص» group last); `CategoryOut{slug, name, price_quantiles, top_venues, popular_products}`; `seo.ts`: `jsonLdShop(shop)`, `jsonLdProduct(product, offers)`, `jsonLdVenue(venue)`, `metaFor(kind, entity) -> Metadata`. Pages ISR 1 h; product page CTA «پیدا کردن فروشگاه» → `/radar/[id]`; shop page has the three report buttons.

- [ ] **Step 1: Write the failing tests** — API: venue floors ordered `["-1","0","2","6", null]`; unknown slug → 404. e2e: `/pasazh/<slug>` lists floor groups; `/product/<id>` shows min/median/max with Persian digits and the price-age line; `/shop/missing` renders the 404 page.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** — `"Catalog pages with SEO"`

### Task 2: Search page, sitemap, robots

**Files:**
- Modify: `api/catalog/api.py` (`GET /api/search?q=`)
- Create: `web/src/app/search/page.tsx`, `web/src/app/sitemap.ts`, `web/src/app/robots.ts`, `api/tests/test_search_api.py`

**Interfaces:**
- Produces: `GET /api/search?q=&limit=20 -> {products: list[ProductHit], shops: list[ShopHit]}` (keyword only: `search_tsv` + trigram on shop `name_norm`; no LLM); sitemap with landing, about, every venue, every desk category, products with ≥ 2 offers (split into chunks of 10k), shops.

- [ ] **Step 1: Write the failing test** — `q="علاالدین"` returns shops in Aladdin; `q="آیفون ۱۳"` and `q="ایفون 13"` return the same first product.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** — `"Search, sitemap, robots"`

### Task 3: PWA and offline

**Files:**
- Create: `web/src/app/manifest.ts`, `web/public/sw.js`, `web/src/app/offline/page.tsx`, `web/e2e/offline.spec.ts`

**Interfaces:**
- Produces: manifest (name «ترب‌گرد», short_name «ترب‌گرد», `theme_color #fbf7f3`, icons from the mascot `icon` pose 192/512 + maskable, `dir: rtl`, `lang: fa`); service worker: precache shell + fonts + mascot, network-first for API, cache the last 3 `/trip/*` pages and their API responses; `/offline` with the stuck mascot.

- [ ] **Step 1: Write the failing e2e** — visit a trip, go offline (`context.setOffline(true)`), reload → trip and walk mode render; an uncached page shows `/offline`.
- [ ] **Step 2–4:** FAIL → implement → PASS; Lighthouse PWA installable.
- [ ] **Step 5: Commit** — `"PWA and offline trips"`

### Task 4: Phone login and `/me`

**Files:**
- Create: Django `api/people/` (`AppUser`, `NeedsProfile`, `ItemMemory` per DATA-MODEL, `otp.py`, `api.py`), `web/src/app/me/page.tsx`, `web/src/components/auth/OtpSheet.tsx`, `api/tests/test_otp.py`, `api/tests/test_me.py`

**Interfaces:**
- Produces: `POST /api/auth/otp/request {phone}` → 204 (Kavenegar `verify/lookup`, code 5 digits, TTL 2 min, Redis); `POST /api/auth/otp/verify {phone, code}` → session cookie, merges the guest's trips/reports/memory into the user; `GET /api/me -> {display_name, phone_masked, trips, memory, profile}`; `DELETE /api/me` → deletes user, trips, memory, anonymises messages. `/me`: trips list, liked/bought items, editable needs profile («چیزهایی که درباره‌ت می‌دونم»), «حذف داده‌هام». Guests see the OTP sheet only when they tap «ذخیره‌ی سفر».

- [ ] **Step 1: Write the failing tests** — 6th request in an hour → 429; 5 wrong codes → locked 15 min; verify merges a guest trip; `DELETE /api/me` leaves no `Trip` rows for that user; phone never appears in logs (caplog check).
- [ ] **Step 2–4:** FAIL → implement (`phone_hash` = HMAC-SHA256 with `PHONE_PEPPER`, `phone_enc` AES-GCM with `PHONE_KEY`) → PASS.
- [ ] **Step 5: Commit** — `"Phone login and my page"`

### Task 5: Production deploy and backups

**Files:**
- Create: `docker-compose.prod.yml`, `deploy/nginx/torobgard.conf`, `deploy/push-test.sh`, `deploy/backup.sh`, `docs/DEPLOY.md`

**Interfaces:**
- Produces: `make push-test` (git archive over SSH, build on the VPS from an Iranian registry mirror, `migrate`, restart, smoke `curl /api/health` and `/agent/health`); nginx TLS, `/api/` → api, `/agent/` → agent (SSE: `proxy_buffering off`), `/img/` → cached proxy of `image.torob.com` (7 days); nightly `pg_dump` → object storage, 14 kept; `DEPLOY.md` with first-time setup and restore steps.

- [ ] **Step 1:** Write `deploy/smoke.sh` that exits non-zero if either health check fails; run it against local prod compose → PASS.
- [ ] **Step 2:** `make push-test` to the VPS; smoke passes; restore yesterday's dump into a scratch DB and count shops = 6,476.
- [ ] **Step 3: Commit** — `"Production deploy and backups"`

### Task 6: Load and cost check

**Files:**
- Create: `deploy/k6/journey.js`, `docs/evidence/P3/load.md`

- [ ] **Step 1:** k6 script: stats → desk → offers rows → 3 agent turns, at 10/25/50 VUs for 5 min each.
- [ ] **Step 2:** Run against the VPS (students, T-13); record p95 first token, full answer, error rate, BoxAPI cost per conversation. Gate: p95 first token < 2.5 s at 50 VUs, errors < 1%, cost < $0.02 / conversation.
- [ ] **Step 3: Commit** — `"Load and cost check"`
