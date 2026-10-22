# Torob Gard (ترب‌گرد) — brainstorm and plan

Written 2026-10-22. This is the first document of the project: ideas, the stack choices to agree on,
the architecture sketch, data sources, roadmap, and how Claude Code works in this repo. It is a
working draft for discussion. Decisions go to `docs/decisions.md` once agreed.

Working name: **ترب‌گرد** (working title; the brand book will settle it).

---

## 1. What this is

A Persian, mobile-first assistant for *in-person* shopping in Tehran. It walks with the shopper
from "I don't know what I want" to "go to shop 214 on floor 2, west wing, next to the escalator".

The gap today: Torob tells you *what it costs* online. Google/Neshan tell you *where the mall is*.
Nobody tells you **which shop inside which mall has the thing you'd actually like, right now, and
how to walk there.** That last mile is the product.

Shopper moments it must cover:

1. **Discovery** — "I need something for a wedding, I don't know my style." → taste interview,
   not a form.
2. **Shortlist** — "Show me 3 directions and where each lives in the city."
3. **Routing** — "I'm at Kourosh mall, floor 3. Where now?"
4. **In the shop** — "Is this a fair price? Does the shop next door have it cheaper?"
5. **After** — remember what I saw, tried, bought; learn my taste.

## 2. Brainstorm — ideas, ranked

Scored on: value to a shopper **now**, buildable in a first release, data we can actually get.

### Tier 1 — the core (v1)

| # | Idea | Why it matters |
|---|------|----------------|
| 1 | **Taste interview** ("سلیقه‌یاب"): swipe-through image cards (styles, colors, budgets) → a taste profile. No text forms. | Solves the "I don't know what I want" entry. Images beat words for style. |
| 2 | **Mall-aware answers**: every recommendation is `product → shop → mall → floor/unit`. | The differentiator. Nothing else does the last 50 metres. |
| 3 | **Static indoor map per mall** (SVG floor plan, units tagged) with a "you are here" set by tapping/QR, and a highlighted path. | Real indoor positioning is hard; a tapped floor plan is 80% of the value at 5% of the cost. |
| 4 | **Price check in the shop**: photo or name → Torob price range + "is this fair here". | Instant, visible value; uses Torob's strength. |
| 5 | **Trip plan**: "I have 2 hours at Palladium" → ordered list of shops, grouped by floor. | Turns a chat into something you can walk. |
| 6 | **Memory**: "seen / tried / bought / skipped" per item, taste profile that updates. | Makes the second visit better than the first. |

### Tier 2 — strong, after v1

| # | Idea |
|---|------|
| 7 | **Shop cards with vibe**: price band, style tags, crowd, "good for", opening hours, phone, last-verified date. Crowd-sourced edits by team/users. |
| 8 | **Photo-to-style**: shopper photographs an outfit/shelf → agent names the style and finds matching shops. (Vision model.) |
| 9 | **"Walk with me" mode**: voice in, short voice out, big buttons, screen stays on. Hands full of bags. |
| 10 | **Mall QR anchors**: stickers at escalators/entrances set location in one scan (if malls cooperate; else our own tagging). |
| 11 | **Group shopping**: share a trip plan; split "you take floor 2, I take floor 3". |
| 12 | **Bargain coach**: typical negotiation room for this category/mall (from community data). |

### Tier 3 — later / business

| # | Idea |
|---|------|
| 13 | Shop-side panel: a shop updates its own stock/photos; paid "featured in route". |
| 14 | Mall-side analytics: which categories people search but can't find. |
| 15 | Torob integration both ways: "available in-store near you" badge on Torob listings. |
| 16 | Multi-city (Mashhad, Isfahan). |

### Anti-goals (would make v1 a failure even if it "works")

- Pretending to know a shop's stock when we don't. Every claim carries a `verified_at` and a source.
- A chat box with nothing else. Chat is one input; cards, maps and lists are the output.
- Loading anything from outside Iran at runtime (fonts, CDNs, analytics). Same rule as your other projects.
- Collecting personal data we don't need. Phone optional, no location history stored without consent.

## 3. Stack — options to discuss

What your repos already use (so the team doesn't learn two of everything):

- **Web**: Next.js 15/16 App Router + TypeScript + Tailwind v4 + pnpm (wealth-club, diarman); Vite + Preact for the game (fm2d).
- **API**: Django + DRF/Ninja on uv, PostgreSQL 16, Redis, Celery (diarman, fm2d).
- **AI**: Python; local Persian RAG research (`rnd/persian-rag`: BGE-M3, Qdrant/pgvector, reranker, MLX).
- **Ops**: Docker Compose, Makefile (`dev / check / push-test`), nginx/Caddy edge, GitHub only for deploy, Playwright at 390/768/1440.

### Option A — recommended: Next.js PWA + Python agent service

```
web/     Next.js 16 (App Router, TS, Tailwind v4, pnpm) — PWA, RTL, offline map tiles
agent/   Python 3.13 (uv) — FastAPI, the agent loop, tools, retrieval (pgvector)
api/     Django 5.2 + Ninja (uv) — data, admin for the team (Unfold, RTL), auth, jobs (Celery)
db/      PostgreSQL 16 + pgvector + PostGIS, Redis 7
deploy/  Docker Compose, nginx edge, push-test.sh
```

- Why two Python services: the **admin + data entry** workload is Django's sweet spot (your team will
  spend months tagging shops; Unfold admin is free and RTL-ready). The **agent loop** wants async,
  streaming, and the Python AI ecosystem; FastAPI keeps it small. They share one Postgres.
- Why Next.js over Vite+Preact: this app is content + forms + maps + chat, not a game. SSR for shop/mall
  pages gives SEO (a real acquisition channel: "مغازه کفش پالادیوم"). You already have the design tooling
  for it.
- Cost: three deployable units. Mitigation: one Compose file, one Makefile, `make dev` starts all.

### Option B — leaner: Next.js + Django only (agent inside Django)

Same as A but the agent runs as Django views + Celery for long tool calls. One Python service.
Good if the team is small and the agent stays simple (≤ 5 tools). Harder to stream and to swap
LLM providers later. Easy to split into A when it hurts.

### Option C — mobile-web first: Vite + Preact + FastAPI

The fm2d shape. Lightest bundle, best on cheap Androids and messenger webviews. Loses SSR/SEO and
a lot of ready-made Next ecosystem (maps, auth). Pick this only if the primary surface is a
link shared inside Bale/Eitaa rather than a site people find.

### The LLM question (decide this first)

| Choice | Pros | Cons |
|--------|------|------|
| **Claude API** (via Agent SDK / Messages API) | Best tool use, vision, long context. | Reachable from Iran only through a proxy/relay; cost in USD. |
| **Iranian relay providers** (OpenAI/Claude-compatible endpoints sold in rial) | Rial billing, local latency ok. | Model lag, quotas, provider risk; test Persian quality. |
| **Local open models** (Qwen3 / Gemma 3 on a GPU box; MLX on Macs for dev) | Zero per-token cost, data stays in Iran. | Weaker tool use; needs a GPU server; your persian-rag notes already cover this path. |

Recommendation: **provider-agnostic agent layer from day one** (one `LLMClient` interface, OpenAI-compatible
wire format), develop with Claude, ship behind whichever endpoint is reliable at launch. Embeddings:
**BGE-M3** self-hosted (from your persian-rag research) so retrieval never depends on a foreign API.

### Other choices (my defaults; say if you disagree)

- **Maps**: Neshan or Balad SDK for outdoor (Iranian, rial). Indoor: our own SVG floor plans per mall.
- **Vector search**: pgvector in the main Postgres (one DB, one backup). Qdrant only if >5M vectors.
- **Auth**: phone OTP via an Iranian SMS gateway (Kavenegar), optional guest mode.
- **Design**: tokens in Tailwind `@theme`, IRANYekan/Vazirmatn self-hosted, GSAP for motion.
- **Tests**: vitest + Playwright (web), pytest (python), one economy-style "agent eval" suite with
  recorded conversations.

## 4. Architecture sketch (to be drawn properly in the architecture artifact)

```
 Shopper (phone browser / PWA)
      │  HTTPS, SSE for streaming
      ▼
 nginx edge ──► web (Next.js) ──► api (Django Ninja)  ──► PostgreSQL (+pgvector, +PostGIS)
                     │                   │                      ▲
                     │ /agent/*          │ Celery jobs          │
                     ▼                   ▼                      │
                 agent (FastAPI) ── tools ──────────────────────┘
                     │                 ├─ search_shops / search_products (pgvector + SQL)
                     │                 ├─ price_check (Torob)
                     │                 ├─ route_in_mall (floor graph)
                     │                 ├─ taste_profile (read/write)
                     ▼                 └─ remember (seen/tried/bought)
                 LLM endpoint (Claude / relay / local)
```

Agent loop: **plan → call tools → ground every claim in a record id → render structured output**
(cards, map highlight, steps), never free prose for facts. Each answer carries the record ids it used
(the "receipt"), so the UI can show "source: shop #214, verified 1405/07/20".

## 5. Data — where it comes from

| Data | Source | How we get it | Risk |
|------|--------|---------------|------|
| Products & prices | **Torob** | Their public search endpoints (used by the app); cache aggressively; respect rate limits. | No official API; ToS. Talk to Torob — this project is in their interest. |
| Malls, floors, units | Mall websites, on-site photos of directories, team visits | Team digitizes floor plans to SVG + a units table; one JSON graph per mall for routing. | Manual; needs the task book. Start with 3 malls. |
| Shops (category, style, price band, hours) | Team visits + Neshan/Balad POI + Instagram pages | Admin panel data entry with photos; `verified_at` on every row. | Freshness. Monthly re-verify loop. |
| Shop ↔ product availability | Shopper reports + shop self-service (later) | "Did they have it?" one-tap after a visit. | Sparse at first; show as "likely" not "in stock". |
| Taste images for the interview | Generated (Gemini pipeline like diarman) + licensed | Image pack with prompts, content rules as in fm2d. | Must look Iranian-modern, not catalog-generic. |
| Outdoor geo | Neshan / Balad | SDK + reverse geocoding. | Rial cost, fine. |

First 3 malls (proposal): **Palladium** (upscale, compact), **Kourosh** (mass, big, confusing — the best
test of routing), **Iran Mall** (huge; only one zone in v1).

## 6. Roadmap — phases

| Phase | Weeks | Outcome |
|-------|-------|---------|
| **P0 Foundation** | 1 | Repo, Compose, Makefile, CI check, design tokens, brand book v1, DB schema v1, 1 mall digitized by hand. |
| **P1 Walkable demo** | 2–3 | Taste interview → 3 shop cards in Kourosh → floor map with highlighted unit. Hard-coded data, real UI. Demo to 5 real shoppers. |
| **P2 Real agent** | 4–6 | Agent service with tools, Torob price check, memory, streaming UI, admin data entry; 3 malls. |
| **P3 Harden** | 7–8 | Agent evals, offline map, PWA, phone auth, analytics (self-hosted), load test, deploy to VPS. |
| **P4 Grow** | 9+ | Photo-to-style, voice mode, shop self-service, Torob partnership. |

Milestone gate: each phase ends with a `/graphify` run, a code review, a changelog, and a short
Persian "what's new".

## 7. How Claude Code works in this repo (the automation)

Taken from your global config and diarman / fm2d; amox-os is **not** used.

- **Method**: superpowers — `brainstorming` → `writing-plans` → `executing-plans` /
  `subagent-driven-development`; `test-driven-development` for the agent tools, routing graph and API;
  `systematic-debugging`; `verification-before-completion`; `requesting-code-review` per milestone.
- **ponytail** always on: smallest change; every deliberate shortcut gets a `ponytail:` comment.
- **graphify** after each milestone; `graphify-out/` gitignored.
- **UI & design skills (global, use these)**: `emil-design-eng` (polish and critique), `apple-design`
  (gesture, springs, sheets), `mobile-native` (feels installed on a phone), `prototype` (several UI
  variants behind a picker — use for the taste interview and the map screen), `break-ui` (worst-case
  Persian data), `animate` / `gsap-*` / `review-animations` / `animation-performance`, `pick-ui-library`,
  `ask-sonner` (toasts). Account skills: `design-foundation` (brief → references → design.md → staged
  prompts), `dataviz` for the admin charts.
- **Project skills** (to write in `skills/`): `torob-data` (how we query/caches), `mall-maps` (SVG +
  graph format), `agent-tools` (tool contract, grounding rule), `brand` (tokens, voice).
- **Git**: `main`, short sentence-case commits, `.githooks/pre-push` → `make check`. GitHub for
  deploy only.
- **Makefile**: `make dev / down / check / push-test` exactly like fm2d.
- **Docs**: `docs/PLAN.md`, `docs/decisions.md` (numbered, never reversed silently), `docs/WORKFLOW.md`,
  `docs/STATUS.md`, `docs/design/`, `docs/IMAGE_PACK.md`.
- **Claude preview**: `.claude/launch.json` for `web` dev server.

## 8. Deliverables you asked for — how each will be produced

| Artifact | Form | Depends on |
|----------|------|------------|
| Brand book | Published artifact (name, voice, logo direction, tokens, type, color, motion, imagery rules) via `design-foundation` → Claude Design | Name + audience answer |
| System design | Artifact: context, containers, flows, agent loop, sequence diagrams | Stack decision (§3) |
| Database design | Artifact: ERD, every table, indexes, vector/geo columns, migrations plan | Stack decision |
| Software architecture | Artifact: C4 levels, module map, API contracts, deployment diagram, ADRs | Stack + LLM decision |
| Task book | Artifact + `docs/TASKS.md`: team tasks (mall digitizing, shop verification, test checklists, data QA), each with steps, done-criteria, evidence | Roadmap §6 |

## 9. Answers (2026-10-22) — see `decisions.md`

Stack A. LLM + embeddings via BoxAPI. Team = Mohammad + 2 students (R&D, testing). Name «ترب‌گرد» for now.
Data = the Starcoach dataset in `docs/`: downtown Tehran electronics/lighting/mobile pasazhs, not fashion malls.
Competition challenge sponsored by Torob. First target area: Lalezar–Ferdowsi (Aladdin, Charsoo, Bushehri).

### What the dataset changes

- "Which shop, which floor, which unit" is **already in the address text** for ~65% of shops
  (`پاساژ علاءالدین 2، طبقه 6، واحد 622`). P0 job: parse `pasazh / floor / unit` into columns.
- Pasazh floor plans still don't exist: the students photograph directory boards and we draw a simple
  per-floor unit list (no SVG needed for v1: a floor + unit number + "near X" string is enough).
- Taste interview becomes a **needs interview** for electronics: "for what, budget, brand feeling, warranty".
  Image cards still work (lighting styles, phone tiers) but are secondary.
- Price check is first-class: 316k offers with `price_toman` and `last_price_changed_at`.

## 10. Artifacts (2026-10-22)

| Artifact | Link | Source in repo |
|---|---|---|
| Brand book (Design System) | https://claude.ai/artifact/R6NVNVdrBpXjW5tz6bjZ7u | `docs/design/brand/` |
| System design | https://claude.ai/artifact/H6ArccrgXLYVHc8T1fumqq | `docs/SYSTEM-DESIGN.md` |
| Database design | https://claude.ai/artifact/LHnkMukdCz3zcjUsXfSdyJ | `docs/DATA-MODEL.md` |
| Software architecture | https://claude.ai/artifact/YZmki2n9u1dXCCZy8H9E4y | `docs/ARCHITECTURE.md` |
| Task book | https://claude.ai/artifact/7mV1R9E5Te9CJKFoiyqT3L | `docs/TASKS.md` |

## 11. Renamed and planned (2026-10-22)

Name is now **ترب‌گرد** (decision 9); the UX prototype in `docs/torob-gard-ux-prototype/` is the
product spine (decision 10). The build plan is `docs/PLAN.md` with phase plans in
`docs/superpowers/plans/` and the checklist in `docs/TODO.md`.
