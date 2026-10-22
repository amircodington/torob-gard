# P2.2 embeddings run (real data)

- Model `openai/text-embedding-3-small` on BoxAPI, `dimensions=1024`, batches of 128, 8 parallel calls per wave.
- Scope (ruling R2): products with `min_price` not null (218,325 of 225,903) and all 6,476 shops.
- Text: product = title_norm + brand + category + first 2,000 chars of specs_text;
  shop = name + categories + 20 most recently priced seller titles. Normalised, sha256 `text_hash` skip.
- Migration `0003_search` on the dev DB: 12 s, `search_tsv` filled for all 225,903 products (generated column).

## Run, 2026-10-22

- 16:30–16:34 UTC first run, sequential: 6,016 products in 3.5 min (~28/s, ≈ 2 h projected). Stopped.
- 16:34 UTC resumed with 8 parallel calls: skipped the 6,016 done (resumability check), then ~72 products/s.
- Status at commit time (16:37 UTC): ~16k / 218k products, run still going; projected finish ≈ 17:25 UTC.
- Final count, time, tokens and cost: _pending — the command prints `Ns · T tokens · $C` at the end._
  Expected cost ≈ $0.3 at $0.02 / 1M tokens.
