# Budget quantiles vs prototype BUDGETS (P0.8)

Source: real data after `price_stats` (outliers 1137 · products with price 218325 · shops with band 3630).
Quantiles = `category_quantiles()`: `min_price` of products with `offer_count >= 2` (Toman, rounded).
All six category names exist exactly as given; none is a nearest match.

## Quantiles

| Category | Pool (≥2 non-outlier offers) | p10 | p25 | p50 | p75 | p90 |
|---|---:|---:|---:|---:|---:|---:|
| گوشی موبایل | 338 | 2188900 | 2800000 | 42100000 | 158125000 | 321510000 |
| لپ تاپ و نوت بوک | 194 | 133650000 | 181594735 | 240000000 | 380750000 | 528400000 |
| هدفون، هدست و هندزفری | 358 | 1146300 | 2388500 | 4671650 | 12375000 | 42240000 |
| شارژر گوشی | 166 | 627950 | 1611350 | 2439500 | 4410500 | 6872000 |
| کیف و کاور گوشی | 88 | 222700 | 309150 | 356000 | 400000 | 2300000 |
| محافظ صفحه نمایش گوشی | 45 | 120000 | 189000 | 199000 | 299000 | 785200 |

The pool is `product.offer_count >= 2` (offer_count counts non-outlier offers only).

## Prototype bands: products per band (pool, `min_price` inside [min, max])

Mobile bands use گوشی موبایل, laptop bands use لپ تاپ و نوت بوک, accessory bands apply to the other four.

| Category | Band | Edges (M Toman) | Products | < 5 ? |
|---|---|---|---:|---|
| گوشی موبایل | m1 | 0–15 | 154 | |
| | m2 | 15–25 | 3 | yes |
| | m3 | 25–40 | 8 | |
| لپ تاپ و نوت بوک | l1 | 0–25 | 0 | yes |
| | l2 | 25–40 | 1 | yes |
| | l3 | 40–60 | 0 | yes |
| هدفون، هدست و هندزفری | a1 / a2 / a3 | 0–1 / 1–2 / 2+ | 32 / 35 / 292 | |
| شارژر گوشی | a1 / a2 / a3 | 0–1 / 1–2 / 2+ | 22 / 41 / 104 | |
| کیف و کاور گوشی | a1 / a2 / a3 | 0–1 / 1–2 / 2+ | 73 / 3 / 12 | a2 |
| محافظ صفحه نمایش گوشی | a1 / a2 / a3 | 0–1 / 1–2 / 2+ | 44 / 1 / 0 | a2, a3 |

## Proposed (edges in M Toman; counts re-checked on the data)

| Category | Proposed edges | Products per band |
|---|---|---|
| گوشی موبایل | 0–5 / 5–50 / 50+ | 141 / 35 / 162 |
| لپ تاپ و نوت بوک | 0–180 / 180–240 / 240–380 / 380+ | 48 / 49 / 48 / 49 |
| کیف و کاور گوشی | 0–1 / 1+ (drop a2 split) | 73 / 15 |
| محافظ صفحه نمایش گوشی | one band, or 0–0.25 / 0.25+ (below the 1M rounding rule) | 45 total |

## Findings

- Laptop prices sit at 130M–530M (p10–p90) against a prototype top band of 60M, and mobile has a long tail
  (p50 42M, p90 321M). Prices look like a mix of Toman and Rial-scale values (about 10x), or the
  products are mis-categorised. Worth a spot check before fixing band edges. Mobile also has a cluster
  near 2M (141 products at or under 5M) that is almost certainly accessories filed under گوشی موبایل.
- The prototype edges are not usable for laptops as they stand (2 of 194 products fall in any band).
