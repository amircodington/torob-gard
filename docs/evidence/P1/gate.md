# P1 gate · Journey on real data

Date: 2026-10-22 · Commits: `209f933..HEAD` (P1 = `ce16e0c` … this commit, «P1 demo gate»)

## Journey e2e — `web/e2e/journey.spec.ts`

`/` → «شروع کن» → `/start` (real chat: «گوشی برای عکاسی» → «۵ تا ۵۰ میلیون» → «دوربین مهم‌تره», the same answers
the `?seed=phone-camera` link replays) → «نمایش گزینه‌های مناسب» → `/desk` (3 cards) → «متعادل و مناسب نیاز» →
`/radar/<id>` → «فاصله» → nearest row → «بسته بود» (POST `/api/reports`) → Plan B → «اطمینان بیشتر مهمه» → first
row → its sheet → «برو همین‌جا» (POST `/api/trips`) → `/trip/<id>` (product, shop, checklist) → «شروع مسیر» → walk
(unit number or «ثبت نشده»). Each stage asserts the TopBar step (۱→۲→۳→۴) and `scrollWidth <= innerWidth`.

| Project | Viewport | Result |
|---|---|---|
| phone | 390×844, touch | `1 passed (3.0s)` |
| tablet | 768×1024 | `1 passed (2.5s)` |
| desktop | 1440×900 | `1 passed (3.6s)` |

`make check; echo exit=$?` tail:

```
 Test Files  13 passed (13)
      Tests  84 passed (84)
$ eslint .
exit=0
```
(api: `100 passed in 0.82s`; typegen + `tsc --noEmit` clean.)

## mobile-native checklist

| Item | Status | Before → after |
|---|---|---|
| `100dvh` not `100vh` | ✅ | already: no `100vh`/`h-screen`; `/start` `100dvh`, Sheet `90dvh`, walk `85dvh` |
| Inputs ≥ 16 px (no iOS zoom) | ✅ / known | composer textarea `16px`; Checklist copy fallback textarea is `15px` → known issue 6 |
| Tap highlight | ✅ | none → `html { -webkit-tap-highlight-color: transparent }` (globals.css) |
| `touch-action: manipulation` | ✅ | none → on `button, a, [role=button]` (globals.css) |
| Long-press selects button text | ✅ | none → `button { user-select: none }` (globals.css) |
| Sticky hover | ✅ | already: no `hover:` classes in the app |
| Safe-area padding on fixed composer/sheets | ✅ | already: composer, Sheet, Plan B, walk sheet, compare tray use `env(safe-area-inset-bottom)` |
| `overscroll-behavior` on sheets | ✅ | already: `overscroll-contain` on Sheet, Plan B, walk sheet |
| `viewport-fit=cover` | ✅ | `width=device-width, initial-scale=1` → `…, viewport-fit=cover` (layout.tsx `viewport`) |
| `theme-color` = paper | ✅ | none → `<meta name="theme-color" content="#fbf7f3">` |
| Real hardware | ❌ | T-08 below |

## T-08 · round 1 (students) — see `docs/TASKS.md` T-08

دانشجوها: Chrome / Bale / Eitaa روی اندروید ≤ ۳ GB. Flows: ask, interview, price check, route, trip.

| Phone (model, RAM) | App | Flow | Works / broken | First text (s) | Screenshot | Note |
|---|---|---|---|---|---|---|
| | Chrome | | | | | |
| | Bale | | | | | |
| | Eitaa | | | | | |

## Known issues

1. Mascot art has an opaque backdrop (not transparent) — shows a box on the blush glow.
2. `?planb=` stays in history after «برگشت به میز تصمیم»; Back reopens Plan B.
3. e2e runs write real `shop_report` rows and trips into the local DB (accepted; no cleanup).
4. Port 3000 is held by an ssh tunnel on this Mac, so dev and Playwright run on 3100.
5. `API_URL` defaults to localhost in two server loaders; must be set in any deployed env.
6. Checklist's read-only address fallback textarea is `15px` — iOS may zoom on focus; needs `16px` (component edit).
7. TopBar has no `env(safe-area-inset-top)`; with `viewport-fit=cover` it only matters in standalone/PWA or landscape notch (component edit).
