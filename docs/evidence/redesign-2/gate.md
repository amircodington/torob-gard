# Redesign 2 gate evidence

Each shot exists as `phone-<name>.webp` (375×812 viewport) and `desktop-<name>.webp` (1440×900), taken against the dev server and the real compose API.

- landing: full page, every band (scrolled through first so reveals have fired)
- consult: `/start?seed=phone-camera`, the needs summary
- desk: the three price boxes
- radar: the shop list (and map at desktop) for the chosen model
- pasazh: «علاءالدین ۲» page; the full page is cropped at 8000 px tall
- product: product page with offers
- search: results for «آیفون»
- me: guest state
- 404: the stuck mascot and the way home
- loader: the radar route held on a 4 s slow offers fetch, showing the card skeletons (the small "N" badge is the Next dev indicator)

## Checks

- `make check`: green (api 106 passed, agent ruff+pytest, web typecheck, vitest 151 passed in 31 files, eslint clean).
- Playwright, all 6 projects on the dev server: 117 passed, 33 skipped, 0 failed. Skips: shots spec (needs `SHOTS=`) and offline spec (needs `E2E_SW=1`).
- Offline spec on a prod build (`pnpm build`, `next start` :3300, `E2E_SW=1`, phone): 5 passed.

## Not checked

- Real phone feel: touch, momentum, sheet drag, haptics, status bar and notch, keyboard on inputs. Emulated viewports only.
- Prod-server screenshots: `next start` with `output: standalone` hung on server-side catalog fetches here, so shots come from the dev server.
- Real Persian-keyboard and low-end Android performance.
