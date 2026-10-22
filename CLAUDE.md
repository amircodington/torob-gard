# ترب‌گرد · Torob Gard

Persian, phone-first companion for in-person shopping in downtown Tehran's electronics district.
«از چی بخرم تا از کجا بخرم!» Built for the Torob/Starcoach challenge.

## Read first, in this order

1. `docs/PLAN.md` — the spec (journey, pages, functions, phases)
2. `docs/TODO.md` — what is next; tick a line when its commit lands
3. The current phase plan in `docs/superpowers/plans/`
4. `docs/decisions.md` — numbered; never reverse one without asking Mohammad
5. Reference: `docs/torob-gard-ux-prototype/` (the journey we port), `docs/design/brand/` (the look),
   `docs/ARCHITECTURE.md`, `docs/DATA-MODEL.md`, `docs/SYSTEM-DESIGN.md`, `docs/TASKS.md` (students)

## How to work

- Superpowers: execute plans with `subagent-driven-development` or `executing-plans`, TDD per task
  (`test-driven-development`), `systematic-debugging` for bugs, `verification-before-completion`
  before saying done, `requesting-code-review` at each phase gate.
- Ponytail on: smallest complete change; every deliberate shortcut gets a `ponytail:` comment.
- UI: `emil-design-eng` per screen, `apple-design` for the sheet and gestures, `mobile-native`
  before a gate, `break-ui` on cards and rows, `animate` / `gsap-*` for the four motion moments.
- Look = decision 8 + mascot (decision 11): light only, orange `#ee8a2a` active, black sheet, Vazirmatn.
  The prototype's red/cream/mint colours are not used.
- Honesty rules in `PLAN.md §2` apply to every screen and every agent answer.
- No runtime loads from outside Iran (fonts self-hosted) except BoxAPI and Torob images.
- No amox-os. Commits: short sentence case on `main`; pre-push runs `make check`.
- `graphify` after each phase; `graphify-out/` is gitignored.

## Commands (after P0.1)

`make dev` · `make down` · `make check` · `make test-api` · `make hooks` · `make psql` · `make ingest` · `make eval` (P2) · `make push-test` (P3)
