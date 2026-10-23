import hashlib
import logging
import os
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor

from django.core.management.base import BaseCommand
from django.db import connection
from openai import APIStatusError, OpenAI

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


log = logging.getLogger(__name__)
_QUOTA = re.compile(r"credit|quota|balance|insufficient|billing", re.I)


def is_quota_error(e: Exception) -> bool:
    """Same rule as agent/torobgard_agent/llm.py (separate image); keep in sync."""
    if not isinstance(e, APIStatusError):
        return False
    text = f"{e.message} {e.body}"
    return e.status_code == 402 or (e.status_code in (401, 403, 429) and bool(_QUOTA.search(text)))


def make_client(key_var: str = "BOXAPI_KEY") -> OpenAI | None:
    key = os.environ.get(key_var, "")
    if not key and key_var != "BOXAPI_KEY":
        return None
    return OpenAI(
        base_url=os.environ.get("BOXAPI_BASE_URL", "https://api.gapgpt.app/v1"),
        api_key=key, max_retries=5,
    )


class Command(BaseCommand):
    """Embed priced products and all shops. Resumable: unchanged text (text_hash) is skipped."""

    def handle(self, *args, **opts):
        model = os.environ.get("EMBED_MODEL", "text-embedding-3-small")
        dims = int(os.environ.get("EMBED_DIMS", "1024"))
        clients = [make_client()]
        if second := make_client("BOXAPI_KEY_SECOND"):
            clients.append(second)
        active, lock = [0], threading.Lock()  # key index in use, shared by the workers
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
                i = active[0]
                try:
                    return clients[i].embeddings.create(model=model, input=texts, dimensions=dims)
                except APIStatusError as e:
                    if i + 1 >= len(clients) or not is_quota_error(e):
                        raise
                    with lock:
                        if active[0] == i:
                            active[0] = i + 1
                            log.warning("BoxAPI key out of credit (HTTP %s); using the second key",
                                        e.status_code)
                    nxt = clients[i + 1]
                    return nxt.embeddings.create(model=model, input=texts, dimensions=dims)

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
