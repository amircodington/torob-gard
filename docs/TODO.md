# ترب‌گرد — TODO

The build checklist. One line per plan task; tick it when the task's commit lands. Details, tests
and interfaces live in the linked plan. Student tasks (T-xx) are in `TASKS.md`.
Order inside a phase is the order to build in; student tasks run in parallel.

Plans: [P0](superpowers/plans/2026-10-22-p0-foundation.md) ·
[P1](superpowers/plans/2026-10-22-p1-journey.md) ·
[P2](superpowers/plans/2026-10-22-p2-agent.md) ·
[P3](superpowers/plans/2026-10-22-p3-public-harden.md) · Spec: [PLAN.md](PLAN.md)

## Planning (done 2026-10-22)

- [x] Rename to ترب‌گرد, folder `~/Workspace/torob-gard` (decision 9)
- [x] Study the UX prototype; make it the product spine (decision 10)
- [x] Brand book renamed, mascot section added (decision 11)
- [x] `PLAN.md`, four phase plans, this TODO, root `CLAUDE.md`

## P0 Foundation — gate: data loaded, parser ≥ 85%, `make check` green

- [x] P0.1 Repo, Compose (PostGIS + pgvector), Makefile, git init — Mohammad
- [x] P0.2 Django API skeleton + health — Mohammad
- [x] P0.3 Persian normalisation, shared case file — Mohammad
- [x] P0.4 Catalog models — Mohammad
- [x] P0.5 Load the CSVs — Mohammad
- [x] P0.6 Address parser — Mohammad · [ ] score against T-02 when the gold set lands
- [x] P0.7 Venues from addresses — Mohammad
- [x] P0.8 Price stats, outliers, budget band check — Mohammad
- [x] P0.9 Web shell: tokens, fonts, mascot WebP, Persian helpers — Mohammad
- [ ] T-01 BoxAPI capability check (tool calling? streaming? embeddings) — student
- [ ] T-02 Address gold set (300 rows) — student
- [ ] T-03 Field survey: Aladdin 1 + Charsoo — students
- [ ] T-04 Category tree (top 500) — student
- [ ] T-15 Competition brief digest (deadline, criteria) — student

## P1 Journey on real data — gate: full journey e2e at 390 px + T-08 on a cheap Android

- [x] P1.1 `/api/stats`, `/api/venues` — Mohammad
- [x] P1.2 Decision desk `pick_tiers` + `POST /api/desk` — Mohammad
- [x] P1.3 Product + offer rows (distance, stock from reports, installments) — Mohammad
- [x] P1.4 Reports + trips — Mohammad
- [x] P1.5 Web domain layer: api client, ranking, hours, geo — Mohammad
- [x] P1.6 Consult `/start` on the ported reducer — Mohammad
- [x] P1.7 Decision desk `/desk` + compare — Mohammad
- [x] P1.8 District map — Mohammad
- [x] P1.9 Store radar + store sheet + anchor picker — Mohammad
- [x] P1.10 Plan B overlay — Mohammad
- [x] P1.11 Trip checklist `/trip/[id]` + walk mode — Mohammad
- [x] P1.12 Landing `/`, about, privacy, 404 — Mohammad
- [x] P1.13 Demo gate (journey e2e at 390/768/1440) — Mohammad
- [ ] T-05 Eval set v1 (50 cases) — student
- [ ] T-07 Persian normalisation cases → 30 — student
- [ ] T-08 UI walk test round 1 (Chrome, Bale, Eitaa) — students · round 1 pending — gate.md has the table

## P2 Agent — gate: evals ≥ 85%, 0 grounding failures on known-item

- [x] P2.1 Agent service + LLMClient (tools or JSON-action) — Mohammad
- [x] P2.2 Hybrid search + embeddings — Mohammad
- [x] P2.3 price_check, locate_shop, plan_trip, remember — Mohammad
- [x] P2.4 Output contract + Grounder — Mohammad
- [x] P2.5 Orchestrator + `/agent/chat` SSE — Mohammad
- [x] P2.6 Consult on the agent with fallback; in-shop price check — Mohammad
- [x] P2.7 Agent-written desk explanations — Mohammad
- [x] P2.8 Evals (`make eval`) — Mohammad
  - [ ] gate: ≥ 85% pass, 0 known-item grounding failures (run 1: 42%, 1 known-item failure — [eval-run-1](evidence/P2/eval-run-1.md); run 2: 75%, 0 — [eval-run-2](evidence/P2/eval-run-2.md); run 3: 50%, 0 — [eval-run-3](evidence/P2/eval-run-3.md); run 4 × 3 at temperature 0: mean 75%, known-item failures 0/1/1 — [eval-run-4](evidence/P2/eval-run-4.md))
    - left (tuning stopped, R12): quoted-price guard refuses the quote when `say` names any cheaper shop (make it per clause — needs a ruling); consult needs (category + budget + priority) still search or re-ask instead of sending a desk
- [x] P2.9 Student admin + quality page — Mohammad
- [ ] T-06 Embedding bake-off — student
- [ ] T-09 Price sanity — student
- [ ] T-10 Shop verification round 1 (100 shops) — students
- [ ] T-11 Interview image cards — student
- [ ] T-12 Eval run triage (each run) — student

## P3 Public + harden — gate: deployed, backups restore, k6 at 50 sessions

- [ ] P3.1 Pasazh, shop, product, category pages + SEO — Mohammad
- [ ] P3.2 Search, sitemap, robots — Mohammad
- [ ] P3.3 PWA + offline trips — Mohammad
- [ ] P3.4 Phone login + `/me` — Mohammad
- [ ] P3.5 Production deploy + backups — Mohammad
- [ ] P3.6 Load and cost check — Mohammad + T-13
- [ ] T-14 Content and copy review — student

## Open questions

- Competition deadline and judging criteria (T-15) may reorder P2/P3; the landing is in P1 so a demo exists early.
- If BoxAPI has no tool calling (T-01), P2.1 ships the JSON-action path only.
