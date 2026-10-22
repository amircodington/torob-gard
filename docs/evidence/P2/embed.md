# P2.2 embeddings run (real data)

- Model `openai/text-embedding-3-small` on BoxAPI, `dimensions=1024`, batches of 128, 8 parallel calls per wave.
- Scope (ruling R2): products with `min_price` not null (218,325 of 225,903) and all 6,476 shops.
- Text: product = title_norm + brand + category + first 2,000 chars of specs_text;
  shop = name + categories + 20 most recently priced seller titles. Normalised, sha256 `text_hash` skip.
- Migration `0003_search` on the dev DB: 12 s, `search_tsv` filled for all 225,903 products (generated column).

## Run, 2026-10-22

- 16:30–16:34 UTC first run, sequential: 6,016 products in 3.5 min (~28/s, ≈ 2 h projected). Stopped.
- 16:34 UTC resumed with 8 parallel calls: skipped the 6,016 done (resumability check), then ~72 products/s.
- The resumed run stopped silently at 214,912 products (container gone, no traceback; likely killed from
  outside while other work used Docker). Its token total was never printed.
- 17:42–17:47 UTC third run: skipped 214,912, embedded the last 3,413 products and all 6,476 shops
  in 276 s, 2,905,130 tokens, $0.058 (measured).

## Result

- **218,325 product and 6,476 shop embeddings** (all in scope), `model = openai/text-embedding-3-small`.
- Wall time ≈ 73 min over three resumable runs (3.5 + ~65 + 4.6 min).
- Tokens / cost: only the last run is measured (above). Estimate for all: last run was ~0.71 tokens per
  character; products are 49.95 M characters, shops 3.31 M, so ≈ 38 M tokens ≈ **$0.76** at $0.02 / 1M.
