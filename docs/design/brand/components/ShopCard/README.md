# ShopCard

One shop as a list row: icon circle, name, where it is inside the building, the compact price, and a one-word status under the price.

Rules: the place line (pasazh · floor · unit) is never dropped; an unknown floor reads «طبقه نامشخص» in `ink-muted`. Prices are thousands of toman in `price-compact`; the list header states the unit once. The status under the price is `verified` (green), `signal` (red, closed or far above market) or `ink-muted` («تأییدنشده»). The active row (the one the assistant recommends, or the one tapped) is solid `orange` with white text; only one row is active. White rows: `radius-lg`, `shadow-card`, no border. The whole row is the tap target.

Consumer provides: `name`, `venue`, `floor`, `unit`, `priceThousands`, `status` (`verified` | `unverified` | `closed` | `high`), `statusText`, `icon`, `active`, `onOpen`.
