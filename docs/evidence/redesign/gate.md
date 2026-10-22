# Redesign gate — 2026-10-23

Plan: [`docs/superpowers/plans/2026-10-22-redesign.md`](../../superpowers/plans/2026-10-22-redesign.md) ·
branch `redesign` (worktree), Tasks 1–10.

## Not done here (controller, after the merge into main)

- `make check` (this worktree must not start a second compose project — conventions).
- Whole-branch code review (`requesting-code-review`).
- `graphify`.

## Test results (2026-10-23, dev server :3200, shared API :8000 / agent :8001)

| Check | Result |
|---|---|
| `next typegen && tsc --noEmit` | ✅ |
| `vitest run` | ✅ 23 files, 127 tests |
| `eslint .` | ✅ |
| Playwright phone (390×844, touch) | ✅ 23 passed, 5 skipped |
| Playwright tablet (768×1024) | ✅ 23 passed, 5 skipped |
| Playwright desktop (1440×900) | ✅ 26 passed, 2 skipped |
| `make check` | ⏳ controller, after merge |

Skips are by design: `shots.spec` (2 tests) runs only with `SHOTS=<set>`; the desk price-box
alignment and the two radar split-view/fill-map tests exist at lg only, so they skip on phone and
tablet.

New in the gate: `e2e/motion.spec.ts`. With `reducedMotion: "reduce"` the first desk card and the
first radar row have `translate: none` and do not run `rise` (they fade only — reduced motion is
"gentler, not zero", decision 12 / brand Motion table), their opacity settles at 1, and the store
sheet's panel has no transform 50 ms after it opens. Without reduced motion the desk card's
`animation-name` is `rise`. Deviation from the brief: it asked for `opacity: 1` on the first
frame; that contradicts the shipped reduced-motion rule (opacity fade kept), so the spec checks
"no movement" and "opacity ends at 1" instead.

## Fixed in the gate (deferred minors)

| From | Issue | Fix |
|---|---|---|
| T9 | Plan B priority Flip ran on Enter/Space | `choose(p, e.detail === 0)` skips `Flip.getState`; rows swap. Unit test for both paths. |
| T9 | Floor pills tight at 360 px («منفی ۲» broke onto two lines) | Floor icon circle hidden under 380 px when pills show (`max-[379px]:hidden`); list keeps its «طبقه‌ها» label. Shot: `gate/phone360-walk-floors.webp`. |
| T9 | Trip map pin focusable with a no-op `onSelect` | `DistrictMap.onSelect` optional; without it pins are `span role="img"` with the same label. Unit test. |
| T6 | Typing left the `aria-live` region empty when status was empty | Fallback «دارم فکر می‌کنم…». Unit test. |
| gate | A shared `/trip/:id` link (no journey state) styled the *current* step ۴ as dead (40 % opacity) — visible in every trip/walk shot since before the redesign | The current step is never dead (`TopBar.tsx`). e2e assertion in `trip.spec`. |
| gate (mobile-native) | Copy-address fallback textarea is focused and selected at 15 px → iOS zooms | 16 px. |

## mobile-native pass (from code + Playwright emulation)

| Item | State |
|---|---|
| Viewport | `width=device-width, initial-scale=1, viewport-fit=cover`; zoom not disabled; `theme-color` = paper (light only, decision 8) |
| Tap highlight / text-size-adjust / tap delay | `html` transparent highlight + 100 %; `touch-action: manipulation` on buttons, links, `[role=button]`; `user-select: none` on buttons only |
| Hover | Tailwind v4 `hover:` compiles under `(hover: hover)`; no raw `:hover` in `src/` |
| dvh | Sheet `max-h-[90dvh]`, walk sheet `h-[85dvh]`, `/start` `min-h-[calc(100dvh-60px)]`, radar map `100dvh` cap; hero `100svh` |
| Inputs ≥ 16 px | Composer textarea 16 px (`enterKeyHint="send"`), price check 16 px (`inputMode="numeric"`), copy fallback now 16 px |
| Safe areas | Sheet body, walk sheet, desk compare tray, `/start` composer, Plan B all pad `env(safe-area-inset-bottom)` |
| Overscroll | `overscroll-contain` on Sheet body, walk sheet body, Plan B overlay |
| Needs a phone | sticky hover, keyboard + composer, safe areas on a notched device, sheet drag feel, 60 fps — T-08 below |

review-animations sweep: no `transition-all`, no `ease-in` UI curves, no `scale(0)`; transitions name
their properties; every movement has a reduced-motion branch. Approved; the one keyboard-triggered
animation (Plan B Flip) is fixed above.

## Before / after (t1 = before, not committed per Ruling D5; gate = after, committed)

| Route | t1 (before, described) | gate (after) |
|---|---|---|
| landing | phone column at every width; no icons | `gate/{phone,desktop}-landing.webp` — wide hero with mascot beside the CTA, icons, bars, count-ups |
| start | `max-w-md` column under the bar | `gate/*-start.webp` — animated bubbles, chip icons, desktop summary rail |
| desk | three cards in a narrow row, digit-only steps, no icons, uneven price boxes | `gate/*-desk.webp` — full-width bar with step labels, aligned tier columns, icons, lifted recommended card |
| radar | stacked chip rows (anchor, view, sort, filters) above a plain list | `gate/*-radar.webp` — one-row phone toolbar, sticky split view with the map at lg, pin drop |
| sheet | bottom sheet at every width | `gate/*-sheet.webp` — docked side panel at lg, drag-to-dismiss below |
| Plan B | list without priorities' icons | `gate/*-planb.webp`, `gate/*-planb-ranked.webp` — priority cards with icons, Flip re-rank |
| trip | single column | `gate/*-trip.webp` — grid with a sticky one-pin map at lg |
| walk | stat rows without icons | `gate/*-walk.webp`, `gate/*-walk-success.webp` — icon circles, success moment |
| 404 | stuck mascot | `gate/*-404.webp` |

23 WebP files, 0.78 MB total, largest 90 KB (`cwebp -q 80`).

## T-08 · redesign re-run (students) — see `docs/TASKS.md` T-08

دانشجوها: Chrome / Bale / Eitaa روی اندروید ≤ ۳ GB، با پنل Performance کروم از راه USB.
Check: page-in, desk stagger, sheet drag, Plan B Flip at 60 fps; widths 360 px and 430 px.

| Phone (model, RAM) | App | Page-in | Desk stagger | Sheet drag | Plan B Flip | 60 fps? | 360 px | 430 px | Note |
|---|---|---|---|---|---|---|---|---|---|
| | Chrome | | | | | | | | |
| | Bale | | | | | | | | |
| | Eitaa | | | | | | | | |

## Known issues (deferred minors still open)

1. Sheet: two stacked sheets closed in open order un-inert `main` early; Next's route announcer is inert while a sheet is open; a parent-driven close (FilterPanel «دیدن») is instant; snap-back is a fixed 240 ms; drag/keyboard not verified on a real phone (T-08).
2. Chip pill ease-out ≈ `tg.out` (curves differ slightly).
3. Tests: honesty and trip specs POST a real trip on each run; landing scroll check is viewport-relative; hero e2e checks only vertical overlap; desk rail assertion checks only the priority chip; pin-bounds e2e was never seen failing on the old geometry.
4. Step pill unmount capture includes ancestor transforms.
5. Landing: CountUp skips numbers already in view at load; a bare `svg` inside `dl > div` (axe); mascot wave delay 0.6 s hard-coded against the CSS rise.
6. Consult: skip link «←» glyph; some un-indented JSX; ReqChips icons on the desk.
7. Desk: the compare table scrolls sideways on a phone; Torob product images are absent in headless shots.
8. Radar: ShopRow and pins not memoised (35 rows fine); shops at identical coordinates overlap (out of scope); the lg map letterboxes on blush when the height cap binds.
9. Walk: stat titles wrap at lg; `Success`'s `role="status"` mounts with its content, so some screen readers skip it.
10. Real hardware not exercised (Ruling D3): everything above was verified in Playwright emulation only.
