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
  mean the same thing: "this is selected or current". Text on orange is white, 15px bold or larger.
- `panel` is for the sheet, status pills and the composer bar. Inside the sheet, inactive
  segments are `panel-2`, the active one is `orange`, stat cards are `panel-brown` and
  `panel-plum` with a translucent white icon circle.
- `verified` and `signal` are the only semantic colours; both are used small (pill, micro text,
  icon) and always with a word.
- Contrast: `ink` on `paper` 15.6:1, `ink-muted` on `paper` 4.6:1, `on-orange` on `orange` 3.1:1
  (large/bold text only), `on-dark` on `panel` 17:1. Keep these when a value changes.

### Typography

- **Vazirmatn** for everything (Google Fonts here; self-hosted as Vazirmatn or IRANYekan in
  production). The reference's character comes from weight contrast: thin 300 with one bold 800
  phrase inside («امروز **کجا برم؟**», «کابل **۱۶×۵ مشهد**»). Persian has no italic, so this
  replaces the reference's italics.
- Big numbers everywhere: `stat` (30px/700) on the sheet, `price` (22px/700) in cards,
  `price-compact` (17px/800) in rows. All tabular.
- Body is 15px/24px; nothing on a phone is smaller than `micro` (11px/600), and micro is only a
  status word under a number.
- RTL throughout; logical properties; icons that imply direction are mirrored.

### The wordmark and the mark

Wordmark: «ترب‌گرد» in Vazirmatn, «ترب‌» at 300 and «گرد» at 800, `ink` on `paper`, or
white on `orange`. No outline, no gradient.

Mark: the mascot `icon` pose. Map pins keep the `orange` circle with the unit number «۶۲۲» in
`stat` weight, so "a place" and "the brand" never get confused.

### The mascot

**ترب‌گرد** is a red sprout with dark-red leaves, a navy backpack with brass buckles and a brass
compass: a small explorer who knows the bazaar. Five poses, one job each:

| Pose | File | Where |
|---|---|---|
| wave | `torob-gard-mascot-wave` | landing hero, first chat message |
| idle | `torob-gard-mascot-idle` | decision desk header, empty states that are fine |
| point | `torob-gard-mascot-point` | Plan B, "go here" moments |
| stuck | `torob-gard-mascot-stuck` | errors, no results, agent offline |
| icon | `torob-gard-icon` | app icon, favicon, chat avatar |

Rules: the mascot sits on `paper` or inside a `surface-tint` circle, never on orange or on the
black sheet; one mascot per screen; it never speaks in a speech bubble of its own (the assistant
voice is the chat). Ship as WebP ≤ 60 KB (the PNGs in the prototype are 1.4 MB each).

### Iconography and glass circles

Icons live in circles: `surface-tint` inside cards, translucent white (55%, blurred) over the
glow in the top bar and nav bar, translucent white (12%) inside the panel. Emoji are acceptable in
mockups; production uses outline icons at 1.75px stroke on a 24px grid, `ink` by default,
`orange` when active.

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

GSAP, `transform` and `opacity` only, `prefers-reduced-motion` respected. Four moments animate:
the sheet (spring, draggable, interruptible), the active chip sliding between pasazhs (220 ms
ease-out), bars growing on first paint (stagger 40 ms), and a reply streaming in. Nothing else.

## Components

- **ShopCard** — list row: icon circle, name, pasazh · floor · unit, compact price, status micro
  text. The active row is solid orange.
- **RouteStep** — the black sheet: floor segments, the big unit stat, time to next stop, two stat
  cards.

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
