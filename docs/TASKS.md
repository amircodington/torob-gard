# Task book — team

For the two students. Each task: why, steps, what "done" looks like, where the evidence goes.
Evidence lives in `docs/evidence/<task-id>/` (notes as markdown, data as CSV, photos as JPG ≤ 1 MB).
Report in the project chat with the task id. Ask early when stuck; a wrong assumption costs a day.

Rules for all tasks: write in English or Persian, your choice; numbers in ASCII in CSV files;
never invent a value — write `unknown`; put your name and date at the top of every note.

Legend: **R&D** = research/experiment, **Data** = labelling/verification, **Test** = checking the product.

## P0 — Foundation (week 1)

### T-01 · BoxAPI capability check · R&D · 4 h
Why: the agent design depends on tool calling and streaming working on BoxAPI.
Steps: 1) get a key from Mohammad; 2) call `/chat/completions` with `anthropic/claude-haiku-5.5` and an OpenAI `tools` array (one tool: `get_weather`); 3) repeat with `stream: true`; 4) call `/embeddings` with `qwen/qwen3-embedding-8b` and `openai/text-embedding-3-small`, note dimensions and latency for 100 Persian titles; 5) try `cohere/rerank-v3.5` if an endpoint exists.
Done: `docs/evidence/T-01/report.md` with: which models return `tool_calls`, streaming works yes/no, embedding dims + ms per 100 texts, any errors verbatim, prices from the catalog page.

### T-02 · Address parser gold set · Data · 6 h
Why: floor/unit come from address text; we need a measured precision.
Steps: 1) open `docs/evidence/T-02/sample-300.csv` (Mohammad generates it: 300 random `address_raw`); 2) fill columns `venue_name, floor, unit, location_hint` by hand; `unknown` when absent; 3) note recurring patterns you see (e.g. «ط ۳», «همکف», «زیرهمکف», «پلاک» vs «واحد»).
Done: the CSV complete; `patterns.md` with ≥ 10 patterns and examples. Mohammad runs the parser against it and reports precision.

### T-03 · Pasazh field survey · Data · 1 day each, 2 pasazhs
Why: we need to know what the floors and directory boards look like before trusting parsed floors.
Steps: for Aladdin 1 and Charsoo: 1) photograph the directory board at each entrance and every floor sign; 2) count floors, note floor naming («همکف», «-1», «۱»); 3) pick 20 shops from our list for that pasazh (Mohammad gives the list), find them, record `found yes/no, floor, unit, open?, hours sign`; 4) note landmarks per floor (escalator, ATM, prayer room) for `location_hint`.
Done: photos in `docs/evidence/T-03/<pasazh>/`, `survey.csv` for 20 shops, `floors.json` per pasazh in the format in `DATA-MODEL.md › venue.floors`.

### T-04 · Category tree · Data · 6 h
Why: 3,428 flat category names; the interview needs ~40 parents.
Steps: 1) open `docs/evidence/T-04/categories.csv` (name, product_count, shop_count); 2) add a `parent` column from a list of ~40 parents you propose first (write the list, get a yes from Mohammad, then map); 3) map the top 500 by product count fully; the rest `unknown`.
Done: CSV with ≥ 500 mapped rows; `parents.md` with the 40 parents and a one-line definition each.

## P1 — Walkable demo (weeks 2–3)

### T-05 · Eval set v1 · R&D · 8 h
Why: we can't improve what we don't measure.
Steps: write 50 realistic shopper conversations in Persian, 10 per type: known item; vague need; in-shop price check; "where exactly is it"; adversarial (a pasazh that doesn't exist, a price far below market). For each: the user turns, and `expected`: shop ids that must be cited (look them up in admin), whether a floor must be mentioned, max acceptable price, must-not-say phrases.
Done: `docs/evidence/T-05/eval-cases.json` in the `eval_case` shape (DATA-MODEL.md); 50 cases; each tagged.

### T-06 · Embedding bake-off · R&D · 6 h
Why: pick the embedding model by Persian retrieval quality, not price alone.
Steps: 1) take 40 product queries you write (half with model numbers, half descriptive); 2) for each candidate model from T-01, embed the 226k titles (Mohammad runs it; you analyse) and record whether the correct product is in top 10; 3) compare with keyword search alone and with both merged.
Done: `report.md` with a table: model × hit@10, latency, cost; your recommendation in one paragraph.

### T-07 · Persian normalization tests · Test · 4 h
Why: «ي/ی», «ك/ک», digits and ZWNJ break search silently.
Steps: write 30 test pairs (input → expected normalized) covering Arabic letters, Persian/Arabic/ASCII digits, ZWNJ in «می‌خواهم», «×» vs «x» in sizes, extra spaces. Put them in `docs/evidence/T-07/cases.json`. Mohammad wires them into `persian.py` and `persian.ts` tests.
Done: 30 cases, all pass in both languages (Mohammad reports).

### T-08 · UI walk test · Test · 3 h per round
Why: the demo must work on cheap phones and in messenger webviews.
Steps: on a real Android (≤ 3 GB RAM) in Chrome, Bale and Eitaa: run the 5 scripted flows Mohammad gives (ask, interview, price check, route, trip); for each note: works / broken, screenshot, how long first text appeared. Also at 390/768 widths in desktop Chrome.
Done: `docs/evidence/T-08/round-N.md` with the table + screenshots. Repeat each milestone.

## P2 — Real agent (weeks 4–6)

### T-09 · Price sanity · Data · 4 h
Why: outlier offers (200,000,000 toman for a spark gap) poison "fair price".
Steps: Mohammad exports offers flagged `is_outlier` plus 200 random; you mark each `real / typo / unit error (rial?) / different product`; note patterns.
Done: CSV + `patterns.md`; a proposed rule set (e.g. "price ends with 0000000 and > 20× median → rial typo").

### T-10 · Shop verification round 1 · Data · 2 days
Why: `verified_at` is what lets us say "verified" in the UI.
Steps: in admin, work through 100 shops in Aladdin/Charsoo assigned to you: phone the shop (hours, still there, floor/unit) or visit; fill the verification form; attach a photo if visited.
Done: 100 verification rows; a note on how many were wrong and in what way.

### T-11 · Interview image cards · R&D · 6 h
Why: the needs interview uses pictures (lighting styles, phone tiers, cable types).
Steps: propose 6 card sets × 6 cards (title, one-line meaning, what it implies for `needs_profile`), write the Gemini prompts following the content rules in `docs/IMAGE_PACK.md` (modern Iran, no text in images). Mohammad generates and reviews.
Done: `docs/evidence/T-11/cards.md` with sets, prompts and the profile mapping.

### T-12 · Eval run and triage · Test · 3 h per run
Why: turn eval failures into issues.
Steps: after each `make eval` Mohammad posts results; for every failed case write: what the agent said, what was expected, your guess of the cause (search, grounding, prompt, data), severity.
Done: `docs/evidence/T-12/run-<date>.md`; failures filed as issues with the case id.

## P3 — Harden (weeks 7–8)

### T-13 · Load and cost check · Test · 4 h
Steps: run the provided `k6` script at 10/25/50 concurrent sessions against the test server; record p95 first-token and full-answer times, errors, and BoxAPI cost from the dashboard.
Done: `report.md` with the three rows and the cost per conversation.

### T-14 · Content and copy review · Test · 4 h
Steps: read every UI string in `web/src/strings.fa.json` and every agent reply template; fix tone (warm, plain, no formal «می‌باشد»), wrong digits, mixed scripts; flag anything that claims certainty we don't have.
Done: a PR of string edits or a list of changes for Mohammad.

### T-15 · Competition brief digest · R&D · 2 h (as soon as the brief exists)
Steps: read the Starcoach/Torob brief; list evaluation criteria, deliverables, deadlines, data-use rules; map each criterion to a feature or doc in this repo; flag gaps.
Done: `docs/evidence/T-15/brief-digest.md`; gaps posted in chat.

## Checklists used by every test task

**Before reporting a bug**: can you repeat it twice? phone model + browser + network; screenshot; exact text you typed; time.
**Before marking data done**: no empty cells (use `unknown`); ASCII digits; file opens in Excel/Numbers without errors; your name and date on top.
