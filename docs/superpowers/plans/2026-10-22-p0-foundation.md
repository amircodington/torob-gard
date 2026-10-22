# P0 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A running monorepo (`make dev`) with PostgreSQL + PostGIS + pgvector, the Django API, the Starcoach dataset loaded and parsed into venues / floors / units with price stats, and a Next.js shell carrying the brand tokens, fonts, mascot and Persian helpers.

**Architecture:** Docker Compose runs db + redis + api; web runs with pnpm on the host. Django owns the schema (`api/catalog`) and the ingest commands (`api/ingest`). Pure helpers (`persian.py` / `persian.ts`, `fa.ts`) are shared by contract through one JSON test-case file.

**Tech Stack:** Python 3.13 + uv, Django 5.2, django-ninja, django-unfold, psycopg 3, pytest-django; PostgreSQL 16 + PostGIS 3.5 + pgvector; Redis 7; Next.js 16 + TypeScript + Tailwind v4 + pnpm, vitest.

**Spec:** `docs/PLAN.md` (§4 data mapping, §5.5 API), `docs/DATA-MODEL.md` (schema), `docs/decisions.md`.

## Global Constraints

- Name «ترب‌گرد» / `torob-gard` (decision 9). No amox-os (decision 7).
- Money is `bigint` toman. Dataset ids stay verbatim text PKs. Timestamps `timestamptz`.
- Normalisation: ي→ی, ك→ک, Persian/Arabic digits → ASCII, ZWNJ kept, runs of spaces → one.
- No runtime loads from outside Iran: fonts self-hosted in `web/public/fonts/`, no CDNs.
- Migrations are additive only (ADR 7).
- The dataset CSVs are never committed (`.gitignore`), and never edited.
- Every deliberate shortcut gets a `# ponytail:` / `// ponytail:` comment naming its limit.
- Commits: short sentence case, on `main`; `.githooks/pre-push` runs `make check`.

## Review Focus

1. Address text with Persian digits, «ط ۳», «همکف», «زیرهمکف», «منفی ۱», «پلاک» instead of «واحد» → parser still finds floor/unit (Task 6 tests).
2. CSV literal `null` and empty strings in every column → stored as SQL NULL, not the string "null" (Task 5 test).
3. Offers whose price is a rial typo (200,000,000 for a 600k item) → flagged `is_outlier`, excluded from min/median (Task 8 test).
4. A product with a single offer → median = that price, no division errors (Task 8 test).
5. Same pasazh written three ways («علالدین 2», «علاءالدین ۲», «علاالدین2») → one venue (Task 7 test).

---

### Task 1: Repo, Compose, Makefile

**Files:**
- Create: `.gitignore`, `README.md`, `Makefile`, `docker-compose.yml`, `deploy/db/Dockerfile`, `.env.example`, `.githooks/pre-push`

**Interfaces:**
- Produces: `make dev` (compose up db redis api + `pnpm -C web dev`), `make down`, `make check` (api: ruff + pytest; web: tsc + vitest + eslint), `make ingest` (Task 5–8 commands in order), `make psql`. Env vars: `DATABASE_URL`, `REDIS_URL`, `BOXAPI_KEY`, `BOXAPI_BASE_URL=https://ai.boxapi.ir/ai/v1`, `DJANGO_SECRET_KEY`, `DATASET_DIR=docs/starcoach-dataset-v16-cap300-csv`.

- [ ] **Step 1:** `git init -b main`; `.gitignore` covers `docs/starcoach-dataset-*/*.csv`, `node_modules`, `.env`, `.venv`, `graphify-out/`, `.next/`, `docs/torob-gard-ux-prototype/node_modules`.
- [ ] **Step 2:** `deploy/db/Dockerfile`: `FROM postgis/postgis:16-3.5` + `apt-get install -y postgresql-16-pgvector`. Compose services `db` (port 5432, volume `pgdata`), `redis:7-alpine`, `api` (Task 2).
- [ ] **Step 3:** Root `CLAUDE.md` already exists (written with the plan); add any command that changed.
- [ ] **Step 4: Verify**
Run: `make dev` then `docker compose exec db psql -U torobgard -c "create extension if not exists postgis; create extension if not exists vector; create extension if not exists pg_trgm; select 1"`
Expected: `1` and no errors.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Repo skeleton, compose, makefile"`

### Task 2: Django API skeleton

**Files:**
- Create: `api/pyproject.toml`, `api/torobgard/settings.py`, `api/torobgard/urls.py`, `api/torobgard/api.py`, `api/Dockerfile`, `api/tests/test_health.py`, `api/conftest.py`

**Interfaces:**
- Produces: `NinjaAPI` instance `api` in `torobgard/api.py` mounted at `/api/`; `/admin/` with Unfold (RTL, `LANGUAGE_CODE="fa"`, `TIME_ZONE="Asia/Tehran"`); a migration that creates extensions `postgis`, `vector`, `pg_trgm`.

- [ ] **Step 1: Write the failing test**
```python
def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"ok": True}
```
- [ ] **Step 2:** Run `cd api && uv run pytest tests/test_health.py -v` → FAIL (404).
- [ ] **Step 3:** Implement `health() -> dict` on `api`; settings read env via `os.environ`; `INSTALLED_APPS` includes `unfold`, `django.contrib.gis`, `catalog`, `ingest`.
- [ ] **Step 4:** Run again → PASS.
- [ ] **Step 5: Commit** — `"API skeleton with health"`

### Task 3: Persian normalisation (Python + TypeScript, one case file)

**Files:**
- Create: `shared/persian-cases.json`, `api/torobgard/persian.py`, `api/tests/test_persian.py`
- (TS side is Task 9.)

**Interfaces:**
- Produces: `normalize(text: str | None) -> str` (`None` → `""`), `to_ascii_digits(text: str) -> str`, `to_fa_digits(text: str) -> str`. Case file shape: `[{"in": "...", "norm": "..."}]`, ≥ 20 cases now; students extend to 30 (T-07).

- [ ] **Step 1: Write the failing test**
```python
CASES = json.loads((ROOT / "shared/persian-cases.json").read_text("utf-8"))
@pytest.mark.parametrize("c", CASES)
def test_normalize(c):
    assert normalize(c["in"]) == c["norm"]

def test_digits_roundtrip():
    assert to_ascii_digits("طبقه ۶ واحد ٦٢٢") == "طبقه 6 واحد 622"
    assert to_fa_digits("622") == "۶۲۲"
```
Include cases: `"علي"→"علی"`, `"كابل"→"کابل"`, `"۱۶×۵"→"16×5"`, `"می‌خواهم"` unchanged (ZWNJ kept), `"  دو   فاصله "`→`"دو فاصله"`, `None`-like empty.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement with `str.translate` tables.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** — `"Persian normalisation with shared cases"`

### Task 4: Catalog models

**Files:**
- Create: `api/catalog/models.py`, `api/catalog/migrations/0001_initial.py`, `api/catalog/admin.py`, `api/tests/test_models.py`

**Interfaces:**
- Produces: `Venue`, `Shop`, `Category`, `Product`, `Offer`, `ShopReport` exactly as `DATA-MODEL.md` (catalog group + `shop_report`), with `ShopReport.kind` choices `open, closed, had_item, no_item, no_answer, price_ok, price_high`. `Venue.slug` (unique, ASCII transliteration fallback `venue-<8 hex>`). Indexes as listed in DATA-MODEL. Embedding tables come in P2.

- [ ] **Step 1: Write the failing test** — create a venue, shop (with `geom=Point(51.4071, 35.6950, srid=4326)`), product, offer; assert `Offer.objects.filter(shop__venue=venue).count() == 1` and that `ShopReport(kind="no_answer")` saves.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement models + `makemigrations`; register in Unfold admin with search on `name_norm`.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** — `"Catalog models"`

### Task 5: Load the CSVs

**Files:**
- Create: `api/ingest/management/commands/load_csv.py`, `api/ingest/loaders.py`, `api/tests/fixtures/mini/{shops,products,offers}.csv` (5 rows each, copied from the real files, including a `null` field), `api/tests/test_load_csv.py`

**Interfaces:**
- Consumes: models (Task 4), `normalize` (Task 3).
- Produces: `python manage.py load_csv --dir <path>`; idempotent (upsert by id); fills `name_norm`, `title_norm`, `specs_text`, `category_id`, `shop.geom`, counts. `loaders.cell(v: str) -> str | None` maps `"null"` / `""` → `None`.

- [ ] **Step 1: Write the failing test** — run the command on `fixtures/mini`; assert 5 shops, 5 products, 5 offers; a shop whose `instagram` is `null` has `instagram is None`; running twice keeps counts at 5.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement with `csv.DictReader` (`field_size_limit` raised), `bulk_create(update_conflicts=True)` in batches of 5,000.
- [ ] **Step 4:** Run → PASS; then `make ingest` on the real dataset and record row counts (expect 6,476 / 225,903 / the offers count printed) in the commit message.
- [ ] **Step 5: Commit** — `"Load Starcoach CSVs"`

### Task 6: Address parser

**Files:**
- Create: `api/ingest/address.py`, `api/tests/test_address.py`, `api/ingest/management/commands/parse_addresses.py`

**Interfaces:**
- Produces: `@dataclass ParsedAddress(venue_name: str | None, floor: str | None, unit: str | None, hint: str | None, confidence: float)`; `parse_address(raw: str | None) -> ParsedAddress`. Floor is normalised text: `"6"`, `"0"` for همکف, `"-1"` for زیرهمکف/منفی ۱/زیرزمین, `"M"` for نیم‌طبقه. Unit keeps digits/letters only (`"622"`, `"412"`).

- [ ] **Step 1: Write the failing test**
```python
@pytest.mark.parametrize("raw,venue,floor,unit", [
  ("خیابان جمهوری، نبش شیخ هادی، پاساژ علالدین 2، طبقه 6، واحد 622", "پاساژ علالدین 2", "6", "622"),
  ("خیابان جمهوری، نرسیده به پل حافظ، نبش کوچه کلانتری، پاساژ خانه موبایل، طبقه چهارم، پلاک 412", "پاساژ خانه موبایل", "4", "412"),
  ("لاله زار، پاساژ چارسو، همکف، واحد ۱۲", "پاساژ چارسو", "0", "12"),
  ("پاساژ بوشهری ط ۳ واحد 305", "پاساژ بوشهری", "3", "305"),
  ("پاساژ امجد، زیرهمکف، پلاک 8", "پاساژ امجد", "-1", "8"),
  ("خیابان فردوسی، کوچه بانک", None, None, None),
])
def test_parse(raw, venue, floor, unit):
    p = parse_address(raw)
    assert (p.venue_name, p.floor, p.unit) == (venue, floor, unit)

def test_confidence_drops_without_venue():
    assert parse_address("خیابان فردوسی، کوچه بانک").confidence < 0.5
```
Ordinal words اول…دهم and «طبقه دوم» → digits.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement regex on the normalised string: venue = `(پاساژ|مجتمع|ساختمان|سرای|تیمچه)\s+[^،,]+`; floor and unit patterns; confidence = 0.4 venue + 0.3 floor + 0.3 unit. `# ponytail: regex only; LLM fallback for confidence < 0.6 is P2 if T-02 precision < 85%.`
- [ ] **Step 4:** Run → PASS. Then score against the students' T-02 gold set: `uv run python -m ingest.score_address docs/evidence/T-02/sample-300.csv` prints precision per field; gate ≥ 0.85 on floor and unit.
- [ ] **Step 5: Commit** — `"Address parser"`

### Task 7: Venues

**Files:**
- Create: `api/ingest/venues.py`, `api/ingest/management/commands/build_venues.py`, `api/tests/test_venues.py`

**Interfaces:**
- Consumes: `parse_address` (Task 6).
- Produces: `venue_key(name: str) -> str` (normalise, drop «پاساژ», drop hamza/«ء», drop spaces between word and digit); `build_venues` creates one `Venue` per key with `aliases`, `geom` = centroid of member shops, `shop_count`, `slug`; sets `shop.venue/floor/unit/location_hint/parse_confidence`.

- [ ] **Step 1: Write the failing test** — `venue_key("پاساژ علالدین 2") == venue_key("پاساژ علاءالدین ۲") == venue_key("علاالدین2")`; after `build_venues` on three shops with those spellings, `Venue.objects.count() == 1` and `aliases` has 3 entries.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement; centroid via `Collect(...).centroid`.
- [ ] **Step 4:** Run → PASS. On real data print the top 20 venues by shop count; Aladdin, Bushehri, Charsoo must be in it.
- [ ] **Step 5: Commit** — `"Build venues from addresses"`

### Task 8: Price stats, outliers, budget bands check

**Files:**
- Create: `api/ingest/prices.py`, `api/ingest/management/commands/price_stats.py`, `api/tests/test_prices.py`, `docs/evidence/P0/budget-quantiles.md`

**Interfaces:**
- Produces: `price_stats()` sets `offer.is_outlier` (price > 10× or < 0.1× the product's raw median), then `product.min_price / median_price / max_price / offer_count` over non-outliers, then `shop.price_band` (1–5 by quintile of the shop's median offer ÷ category median). `category_quantiles(category_name: str) -> dict[str, int]` (`p10, p25, p50, p75, p90`).

- [ ] **Step 1: Write the failing test** — product with offers [600_000, 620_000, 200_000_000] → the 200M offer `is_outlier`, `min_price == 600_000`, `median_price == 610_000`; product with one offer [900_000] → min = median = max = 900_000, not outlier.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement in SQL (`percentile_cont` window) or Python per product; either is fine at 330k rows.
- [ ] **Step 4:** Run → PASS. Run on real data; write `budget-quantiles.md` with quantiles for mobile, laptop and the four accessory categories next to the prototype's `BUDGETS`; propose adjusted band edges if a band holds < 5 products with ≥ 2 offers.
- [ ] **Step 5: Commit** — `"Price stats, outliers, budget check"`

### Task 9: Web shell — tokens, fonts, mascot, Persian helpers

**Files:**
- Create: `web/` (Next.js 16 app router, TS, Tailwind v4, pnpm), `web/src/app/layout.tsx`, `web/src/app/globals.css`, `web/public/fonts/Vazirmatn[wght].woff2`, `web/public/mascot/*.webp`, `web/src/lib/persian.ts`, `web/src/lib/fa.ts`, `web/src/lib/persian.test.ts`, `web/src/lib/fa.test.ts`, `web/src/components/Mascot.tsx`, `.claude/launch.json`

**Interfaces:**
- Consumes: `shared/persian-cases.json`, `docs/design/brand/tokens.json`, the prototype's `lib/fa.ts`, `components/Mascot.tsx`, `public/mascot/*.png`.
- Produces: `@theme` colour/radius/shadow tokens named exactly as `tokens.json` (`--color-paper`, `--color-orange`, `--color-panel`, …); `<html lang="fa" dir="rtl">`; `normalize/toAsciiDigits/toFaDigits` in `persian.ts`; `faNum, faGroup, faPrice, faPriceFull, faKm, faWalk, faFreshness, freshnessLabel, isStale` in `fa.ts` with `STALE_DAYS = 60`; `<Mascot pose="wave|idle|point|stuck|icon" />`.

- [ ] **Step 1: Write the failing tests** — `persian.test.ts` runs every case in `shared/persian-cases.json`; `fa.test.ts`: `faPrice(23_500_000) === "۲۳٫۵ میلیون تومان"`, `faPrice(610_000) === "۶۱۰٬۰۰۰ تومان"`, `isStale(59*24*60) === false`, `isStale(61*24*60) === true`, `faWalk(1) === "حدود ۱۲ دقیقه پیاده"`.
- [ ] **Step 2:** Run `pnpm -C web vitest run` → FAIL.
- [ ] **Step 3:** Copy the prototype's `fa.ts` (drop `isOpenNow`, it moves in P1 Task 5); convert mascot PNGs to WebP ≤ 60 KB (`cwebp -q 80 -resize 512 0`); body background = `paper` + the blush radial glow from the brand README.
- [ ] **Step 4:** Run → PASS; `make dev`, open `http://localhost:3000`, see an RTL page in Vazirmatn with the wave mascot and no network requests outside localhost (DevTools → Network).
- [ ] **Step 5: Commit** — `"Web shell with brand tokens and Persian helpers"`
