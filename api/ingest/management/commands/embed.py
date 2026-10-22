import hashlib
import os
import time
from concurrent.futures import ThreadPoolExecutor

from django.core.management.base import BaseCommand
from django.db import connection
from openai import OpenAI

from catalog.models import ProductEmbedding, ShopEmbedding
from torobgard.persian import normalize

BATCH = 128
WORKERS = 8  # one call takes ~4 s; sequential would be ~2 h for 218k products
USD_PER_MTOK = 0.02  # text-embedding-3-small list price

# Ruling R2: only priced products; every shop.
PRODUCTS = """
SELECT p.id, concat_ws(' ', p.title_norm, p.brand_name, c.name, left(p.specs_text, 2000))
FROM catalog_product p JOIN catalog_category c ON c.id = p.category_id
WHERE p.min_price IS NOT NULL ORDER BY p.id
"""
# DATA-MODEL: name + categories + top 20 seller titles (most recently priced first).
SHOPS = """
SELECT s.id, concat_ws(' ', s.name, array_to_string(s.category_names, ' '), (
    SELECT string_agg(t.seller_title, ' ') FROM (
        SELECT o.seller_title FROM catalog_offer o WHERE o.shop_id = s.id AND NOT o.is_outlier
        GROUP BY o.seller_title ORDER BY max(o.last_price_changed_at) DESC LIMIT 20
    ) t))
FROM catalog_shop s ORDER BY s.id
"""


def make_client() -> OpenAI:
    return OpenAI(
        base_url=os.environ.get("BOXAPI_BASE_URL", "https://ai.boxapi.ir/ai/v1"),
        api_key=os.environ.get("BOXAPI_KEY", ""), max_retries=5,
    )


class Command(BaseCommand):
    """Embed priced products and all shops. Resumable: unchanged text (text_hash) is skipped."""

    def handle(self, *args, **opts):
        model = os.environ.get("EMBED_MODEL", "openai/text-embedding-3-small")
        dims = int(os.environ.get("EMBED_DIMS", "1024"))
        client = make_client()
        t, tokens = time.time(), 0
        jobs = [(ProductEmbedding, "product", PRODUCTS), (ShopEmbedding, "shop", SHOPS)]
        for table, fk, sql in jobs:
            with connection.cursor() as cur:
                cur.execute(sql)
                rows = [(i, normalize(text)) for i, text in cur.fetchall()]
            have = dict(table.objects.filter(model=model).values_list(f"{fk}_id", "text_hash"))
            todo = []
            for i, text in rows:
                h = hashlib.sha256(text.encode()).hexdigest()[:16]
                if have.get(i) != h:
                    todo.append((i, text, h))
            chunks = [todo[n:n + BATCH] for n in range(0, len(todo), BATCH)]

            def call(chunk):
                texts = [c[1] for c in chunk]
                return client.embeddings.create(model=model, input=texts, dimensions=dims)

            # waves of WORKERS parallel calls; each wave is written before the next starts
            with ThreadPoolExecutor(WORKERS) as pool:
                for w in range(0, len(chunks), WORKERS):
                    wave = chunks[w:w + WORKERS]
                    for chunk, r in zip(wave, pool.map(call, wave), strict=True):
                        tokens += r.usage.total_tokens
                        vecs = [d.embedding for d in sorted(r.data, key=lambda d: d.index)]
                        table.objects.bulk_create(
                            [table(**{f"{fk}_id": i}, model=model, embedding=v, text_hash=h)
                             for (i, _, h), v in zip(chunk, vecs, strict=True)],
                            update_conflicts=True, unique_fields=[fk],
                            update_fields=["model", "embedding", "text_hash"],
                        )
                    if (w // WORKERS) % 10 == 0:
                        done = min((w + WORKERS) * BATCH, len(todo))
                        self.stdout.write(f"{fk}: {done}/{len(todo)} {time.time() - t:.0f}s")
                        self.stdout.flush()
            self.stdout.write(f"{fk}s: {len(rows)} total, {len(todo)} embedded")
        self.stdout.write(
            f"{time.time() - t:.0f}s · {tokens} tokens · ${tokens * USD_PER_MTOK / 1e6:.3f}"
        )
