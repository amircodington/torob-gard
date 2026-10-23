# ترب‌گرد · Torob Gard

The brand book for **ترب‌گرد** (Torob Gard), the in-person shopping companion built on the
Starcoach dataset for the Torob challenge. Tagline: **«از چی بخرم تا از کجا بخرم!»** Visual direction set by Mohammad on 2026-10-22 from a reference UI: a light,
airy fitness-app look with a peach glow, white rounded cards, one vivid orange for everything
active, and a black sheet for the "in motion" part of the experience. The name is final (decision 9); the
mascot comes from the UX prototype (`docs/torob-gard-ux-prototype/public/mascot/`).

Screens in this style: [UI mockups](https://claude.ai/artifact/GafMfeQg7v9CgtAstfKjsV).

## What the brand is

A knowledgeable friend who knows the bazaar. Not a search engine, not a chatty bot. The kind
of person you'd call from the ground floor of Aladdin and say «کجا برم؟», and they'd answer
«طبقه ۶، واحد ۶۲۲، کنار پله‌برقی. قیمتش هم منصفانه‌ست.»

Promise, in one line: **می‌گم دقیقاً کجا بری، و چرا.**

Three principles every screen and sentence follow:

1. **Say the floor.** An answer without a place is not an answer. Floor and unit are the big
   number on screen, the way a fitness app shows steps.
2. **Show the receipt.** Every claim carries its source and date. Unverified things say
   «احتمالاً». The brand never pretends.
3. **Short on the way, long when asked.** Replies fit a phone held in one hand. Detail lives one
   tap down, in the sheet.

## Voice

Persian, warm colloquial, second person singular (تو), the way a friend texts. Never formal
(«می‌باشد», «جهت»), never salesy, never apologetic filler. A little energy is welcome on the home
screen («آماده‌ی خرید؟ 🔥»), none in a warning.

| Do | Don't |
|---|---|
| «سه تا مغازه تو همین پاساژ ارزون‌تر دارن. نزدیک‌ترینش طبقه ۴.» | «با توجه به بررسی‌های انجام‌شده، سه فروشگاه در این مجتمع تجاری…» |
| «این قیمت از میانه‌ی بازار ۴۰٪ بالاتره.» | «متأسفانه قیمت اعلام‌شده کمی بالاست.» |
| «نتونستم تأیید کنم این مغازه هنوز بازه.» | «این مغازه قطعاً باز است.» (when we don't know) |
| «بودجه‌ت حدوداً چقدره؟» | «لطفاً محدوده‌ی بودجه‌ی خود را وارد نمایید.» |

Numbers: Persian digits in the UI, ASCII in data. Prices in lists are in thousands of toman
(«۵۹۰»); in cards the full number with the unit after it. Dates in Jalali.

## Visual foundations

The reference, translated: **light mode only**. The page is warm near-white (`paper`) with a
radial peach glow (`blush` → `blush-soft`) behind the top of home and result screens. Content
sits in white cards with big radii and an orange-tinted shadow, never a border. One colour,
`orange`, means "active" everywhere: the selected pasazh chip, the active shop row, the current
floor segment, the bars that matter, the ring, the map pin, the send button. The route and the
in-shop mode live on a **black sheet** (`panel`) that slides over the map, with the floor
segments in it and two stat cards in `panel-brown` and `panel-plum`.

### Colour rules

- `paper` + the glow is the ground. The glow is a radial gradient at the top centre, about 520px
  tall, and fades to transparent; it never tints the sheet.
- `surface` cards: `radius-lg`, `shadow-card`, `space-5` padding, no border. Inside a card the
  icon sits in a `surface-tint` circle; a status pill in `panel` (or `orange` for a live state)
  sits top-left.
- `orange` is the only active colour. One screen may have several orange elements, but they all
  mean the same thing: "this is selected or current". Text on orange is white, 15px bold or larger (~2.5:1, see Contrast).
- `panel` is for the sheet, status pills and the composer bar. Inside the sheet, inactive
  segments are `panel-2`, the active one is `orange`, stat cards are `panel-brown` and
  `panel-plum` with a translucent white icon circle.
- `verified` and `signal` are the only semantic colours; both are used small (pill, micro text,
  icon) and always with a word.
- Contrast: `ink` on `paper` 15.6:1, `ink-muted` on `paper` 5.7:1 (4.6:1 on `blush`, darkened in Redesign 2), `on-orange` on `orange` ~2.5:1
  (#fff on #ee8a2a: below AA, so large/bold text only, 15px bold or larger; decision 8's accepted trade-off for the one orange), `on-dark` on `panel` 17:1. Keep these when a value changes.

### Typography

- **Dana** for everything (decision 13; self-hosted woff2, one file per weight 300/400/500/600/700/800
  in `web/public/fonts/`, `font-display: swap`; Persian digits built in). Headlines still get their
  character from weight contrast: thin 300 with one bold 800 phrase inside («امروز **کجا برم؟**»).
  Persian has no italic, so this replaces the reference's italics. The wordmark is the exception
  (one weight, below).
- Big numbers everywhere: `stat` (30px/700) on the sheet, `price` (22px/700) in cards,
  `price-compact` (17px/800) in rows. All tabular.
- Body is 15px/24px; nothing on a phone is smaller than `micro` (11px/600), and micro is only a
  status word under a number.
- RTL throughout; logical properties; icons that imply direction are mirrored.

### The wordmark and the mark

Wordmark: the icon tile (`torob-gard-icon`, 32 px, 10 px radius) beside «ترب‌گرد» in Dana
ExtraBold 800, 18 px, `ink` on `paper`. One weight, no thin/bold split, no orange accent (orange
means "active", decision 8). No outline, no gradient. Component: `web/src/components/Wordmark.tsx`.

Logo motion (CSS, `globals.css`): on the first paint of a visit the tile pops in (`scale .8→1`,
`rotate -8°→0`, opacity) and sways once from its base (the leaves wiggle: `+5°`, `-3°`, rest),
600 ms `--ease-out`; client-side page changes do not replay it. On hover (hover devices only) the
tile hops (`y -4px`, `rotate -6°`, back) in 300 ms. Reduced motion: static.

Mark: the mascot `icon` pose. Map pins keep the `orange` circle with the unit number «۶۲۲» in
`stat` weight, so "a place" and "the brand" never get confused.

### The mascot

**ترب‌گرد** is a 3D radish (decision 13) with a backpack and a brass compass: a small explorer who
knows the bazaar. Eleven poses plus the icon, one job each (`web/public/mascot/`, transparent
640×640 WebP plus a 320 px copy (`-320`, the icon tile `-96`) that `srcset` picks for small uses, `<Mascot pose>` in `web/src/components/Mascot.tsx`):

| Pose | Means | Where | Motion (once; reduced motion: none or a fade) |
|---|---|---|---|
| wave | hello | landing hero, `/me` header, "your data is deleted" | wave after the hero rise; `/me` waves once |
| idle | standing by | product/catalog image fallback | none |
| think | weighing options | decision desk header, the agent's "thinking" avatar, landing FAQ, "no desk for this category yet" | desk header hops |
| point | go here | trip checklist header (the route to walk), Plan B, landing step «پلن B» | hop |
| search | looking / no results | page loader, search no-results, radar "no shops" and "no filter match", desk "nothing in this budget", checklist "no shop chosen", landing step «رادار» | loader hop; empty states pop in |
| stuck | something broke | 404, offline, error and global error, "server unreachable" and "model not found" states | one shake |
| celebrate | it worked | trip saved / logged in after the SMS code (`SaveTrip`) | pop + one 8-dot burst (600 ms) |
| bags | ready to shop | landing closing band | none |
| phone | talk to me | consult intro (`/start` header on phone, summary rail on lg), desk "needs not told yet", `/me` logged out, landing step «مشاوره» | pop |
| walk | on the way | walk mode, on the paper above the black sheet; landing step «چک‌لیست» | pop |
| check | honest checklist | trip «چک‌لیست واقع‌بینانه» card, landing honesty section | pop |
| icon | the brand | app icon, favicon, wordmark, chat avatar | wordmark logo-in |

Rules: the mascot sits on `paper`, `surface` or inside a `surface-tint` circle, never on orange or on
the black sheet; at most one hero-size mascot (≥ 144 px) per screen, any others secondary (≤ 112 px)
beside a heading, a step or a status; the landing is the exception, one per section (hero, steps,
FAQ, closing band) and the `idle` image fallback, which takes the product image's box; an empty state inside a page uses `<EmptyState compact>` (80 px); decorative (`alt=""`) unless it carries meaning; it never blocks content or taps, and
its caption never claims more than happened (a shared trip says «وارد شدی!», not «ذخیره شد»). It
never speaks in a speech bubble of its own (the assistant voice is the chat). Ship as WebP ≤ 60 KB (the PNGs in the prototype are 1.4 MB each).

### Iconography and glass circles

Icons live in circles: `surface-tint` inside cards, translucent white (55%, blurred) over the
glow in the top bar and nav bar, translucent white (12%) inside the panel. Emoji are acceptable in
mockups; production uses outline icons at 1.75px stroke on a 24px grid, `ink` by default,
`orange` when active.

Production icons are **lucide-react** (decision 12), bundled per icon, never a font, sprite or
CDN. The 1.75 stroke is set once in `globals.css` (`svg.lucide`), so call sites pass no
`strokeWidth`. Icon colours: `ink`, `ink-muted`, `orange`, `verified`, `signal`, `on-dark` only.
An icon is `aria-hidden` and always sits next to a word or inside a control with an
`aria-label`. Draw icons in their LTR meaning; ones that imply direction or progress
(`ArrowRight`, `ArrowLeft`, `ChevronRight`, `ChevronLeft`, `SendHorizontal`, `Undo2`, `LogOut`)
take `className="flip-rtl"` so they mirror under `dir="rtl"` ("next" = `ArrowRight flip-rtl`,
"back" = `ArrowLeft flip-rtl`). Never mirror clocks, `RotateCcw`, `Footprints`, checkmarks,
phone, map pin, store, camera, battery or numbers.

### Data shapes

Two shapes from the reference carry our numbers: **rounded bars with a dot tip** (price per
floor, offers per shop; active bars `orange`, others `orange-tint`) and the **progress ring**
(route progress, budget used). Bars are labelled with the floor, not an axis.

### Imagery

Real photographs of pasazh directory boards, shop fronts and products, taken by the team, shown
in circles or behind the glow with a `verified` date. Generated image cards for the needs
interview follow the content rules of the owner's other projects (modern Iran, no text in the
image, no logos). No stock photos, no illustrations.

### Motion

`transform`/`translate`/`scale` and `opacity` only; every moment has a
`prefers-reduced-motion: reduce` variant. CSS does entrances, presses and hovers (tokens and
`animate-page-in` / `animate-rise` / `animate-fade` / `stagger` in `web/src/app/globals.css`);
GSAP only does what CSS cannot (sheets, Flip, pill slide, pin drop, count-ups, two mascot/success
timelines). UI durations ≤ 320 ms, the two rare moments ≤ 600 ms; stagger capped at 8 items;
nothing loops except the map's anchor ping; no animation on a keyboard action. The four P1
moments (sheet spring/drag, active chip slide 220 ms, bars growing with 40 ms stagger, reply
streaming) stay and are the first entries below. This widens the earlier "four moments, nothing
else" rule (decision 12).

| Token | Value | Used for |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | every entrance, press release, chip pill |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | on-screen moves (Flip re-rank, tier lift) |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | sheets open/close/snap |
| `--duration-press` | `120ms` | `:active` scale 0.97 |
| `--duration-fast` | `180ms` | chip colour, icon swap, badge pop |
| `--duration-base` | `240ms` | bubble/card/row entrance, page-in |
| `--duration-sheet` | `320ms` | sheet open; close = 240 ms |
| `--duration-slow` | `600ms` | hero entrance, trip success (rare only) |
| `--stagger` | `40ms` (lists) / `60ms` (desk cards) | |

GSAP (`web/src/lib/motion.ts`) gets the same curves as `CustomEase` names `tg.out`, `tg.inOut`, `tg.drawer`, and `DUR = { press: 0.12, fast: 0.18, base: 0.24, sheet: 0.32, slow: 0.6 }`.

| Screen | Moment | Tool | Values | Reduced motion |
|---|---|---|---|---|
| all journey pages | page-in | CSS `animate-page-in` on the page head | opacity 0→1 on `main`; `translate 0 8px`→0 on `[data-page-head]` only, 240 ms `--ease-out` | opacity only |
| all | press | CSS | `active:scale-[0.97]` 120 ms (exists; tokenised) | kept (not motion-sickness relevant) |
| consult | bubble in | CSS `@starting-style` | opacity 0, `translate 0 8px`, 240 ms; user bubbles from the start side, assistant from the end | opacity only |
| consult | chips in / select | CSS | stagger 40 ms; selected chip bg/colour 180 ms, siblings → 50% opacity 180 ms | colour only |
| consult, radar | active chip slides (P1 moment 2) | GSAP Flip | one `[data-pill]` per `ChipGroup`, 220 ms `tg.out` | jump |
| desk | tier cards in | CSS | stagger 60 ms, `translate 0 12px` + opacity, 240 ms | opacity only |
| desk | balanced lift (lg) | static | `lg:-translate-y-2` + `ring-2 ring-orange` | same |
| desk | compare toggle | CSS | `Plus`→`Check` swap scale 0.9→1 + opacity 180 ms; tray `@starting-style` `translate 0 100%`→0, 320 ms `--ease-drawer` | opacity only |
| landing | hero | GSAP timeline, once | mascot `y 24→0, opacity`, 600 ms `tg.out`, then one wave `rotation ±6°` ×2 in 600 ms; headline/CTA CSS stagger 60 ms | static |
| landing | live numbers count-up | GSAP | 0→value, 900 ms `tg.out`, starts when in view (IntersectionObserver, once); SSR renders the final number | final number, no tween |
| landing | pasazh bars grow (P1 moment 3) | CSS | `scale 0 1`→`1 1`, origin inline-start, 400 ms, stagger 40 ms | static |
| radar | rows in | CSS | stagger 40 ms, first 8 rows, 240 ms | opacity only |
| radar | map pin drop | GSAP | on first load per product+anchor only: `y -12→0, opacity 0→1`, 320 ms `back.out(1.4)`, stagger 30 ms | none |
| radar | row ↔ pin link (pointer: fine) | CSS | hovered row's pin `scale 1.12` 180 ms | none |
| radar, desk | sheet (P1 moment 1) | GSAP | phone: `yPercent 100→0` 320 ms `tg.drawer`, drag-to-dismiss with velocity; lg: side panel `xPercent` from the inline-start edge | opacity 180 ms |
| Plan B | overlay in | CSS | opacity + `translate 0 24px`, 280 ms `--ease-out` | opacity only |
| Plan B | re-rank on priority change | GSAP Flip | rows move 320 ms `tg.inOut`, new rows fade in | instant |
| Plan B, trip, empty states | mascot reaction | GSAP, once per mount | point: hop `y 12→0` + `rotation -4→0` 420 ms `back.out(1.6)`; stuck: `x` shake ±4 px ×2 in 300 ms | none |
| trip | checklist items in | CSS | stagger 40 ms; status icon `scale 0.8→1` + opacity 180 ms | opacity only |
| walk | sheet rise/drag (exists) | GSAP | unchanged; snap gains velocity projection | unchanged |
| walk | success («داشت؟» → بله) | GSAP timeline | `verified` check circle `scale 0.9→1` + opacity 240 ms, 6 orange dots `translate` 28 px out + fade, 600 ms; `navigator.vibrate?.(12)` | check fades in, no dots, no vibrate |

## Components

- **ShopCard** — list row: icon circle, name, pasazh · floor · unit, compact price, status micro
  text. The active row is solid orange.
- **RouteStep** — the black sheet: floor segments, the big unit stat, time to next stop, two stat
  cards.
- **ChipGroup** — a labelled row of chips with one orange pill that slides to the selected chip
  (220 ms `tg.out`, GSAP Flip; reduced motion jumps). The selected chip stays orange before
  hydration. `useSlidingPill` drives the same pill in the top bar's steps.
- **Sheet** — the black sheet, `side="auto"`: a bottom sheet below lg (drag the handle down to
  dismiss, rubber-band up), a side panel docked to the inline-start edge at lg. Modal: the page is
  inert, Tab cycles inside, focus returns to the opener; `max-h-[90dvh]`, `overscroll-contain`,
  safe-area bottom padding. `side="bottom"` keeps it a bottom sheet at every width.

Planned: HomeCard (icon, status pill, headline, price, bars), RingCard, PasazhChips, MapPin,
Composer (black pill with orange send), InterviewCard.

## Accessibility

- Touch targets ≥ 44px; the composer and the sheet actions sit in the bottom third.
- Text contrast ≥ 4.5:1 except bold text on orange (≥ 3:1, 15px+ only); status never by colour
  alone.
- Works at 200% zoom and in Bale/Eitaa webviews; no hover-only affordances; every drag has a tap.

## Don'ts

- No dark theme (the black sheet is a component, not a theme).
- No borders on cards, no grey shadows, no square corners.
- No second accent colour; brown and plum exist only inside the panel.
- No certainty we don't have: old or unverified data says so.
- No English in the UI except brand names that are English.
