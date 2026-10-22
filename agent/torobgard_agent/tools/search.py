import logging
import re
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from functools import cache
from typing import TypedDict

from openai import AsyncOpenAI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from .. import config, db
from ..persian import normalize

log = logging.getLogger(__name__)

POOL = 50  # candidates per ranker before fusion
RRF_K = 60
NEAR_VENUE_M = 150  # the shopper "is in" the nearest venue within this radius
Embedder = Callable[[str], Awaitable[list[float]]]

# ponytail: copy of api/catalog/desk_config.py DESK_CATEGORIES (the agent image has no api/); keep in sync
DESK_CATEGORIES: dict[str, list[str]] = {
    "mobile": ["گوشی موبایل"],
    "laptop": ["لپ تاپ و نوت بوک"],
    "accessory": [
        "هدفون، هدست و هندزفری", "شارژر گوشی", "کیف و کاور گوشی", "محافظ صفحه نمایش گوشی",
    ],
}
# desk ids and their everyday Persian names, keyed by _compact(); the model often sends these
_DESK_WORDS = {"mobile": "mobile", "موبایل": "mobile", "گوشی": "mobile", "laptop": "laptop",
               "لپتاپ": "laptop", "accessory": "accessory", "accessories": "accessory",
               "لوازمجانبی": "accessory"}
_SEPARATORS = "[\\s\u200c،,_-]"  # spaces, ZWNJ, punctuation: «لپ‌تاپ» == «لپ تاپ»
MIN_TRIGRAM = 0.5
# ponytail: half an RRF vote per in-category ranker is a guess; tune it once the eval set grows
CATEGORY_BOOST = 0.5


class LatLng(TypedDict):
    lat: float
    lng: float


class ProductHit(TypedDict):
    id: str
    title: str
    brand: str | None
    min_price: int | None
    median_price: int | None
    offer_count: int
    score: float


class ShopHit(TypedDict):
    """P1 ShopOut fields + the shop's cheapest non-outlier offer for the asked products."""

    id: str
    name: str
    venue_name: str | None
    venue_slug: str | None
    floor: str | None
    unit: str | None
    location_hint: str | None
    parse_confidence: float
    address: str
    location_label: str
    lat: float | None
    lng: float | None
    distance_m: int | None
    weekly_hours: dict
    installment: bool | None
    contact: str | None
    offer_id: str | None
    price: int | None
    stock: str  # "confirmed" | "unknown", as in P1 offer rows


@cache
def _client() -> AsyncOpenAI:
    return AsyncOpenAI(base_url=config.BOXAPI_BASE_URL, api_key=config.BOXAPI_KEY)


async def embed_query(q: str) -> list[float]:
    r = await _client().embeddings.create(model=config.EMBED_MODEL, input=[q], dimensions=config.EMBED_DIMS)
    return r.data[0].embedding


@asynccontextmanager
async def _connect(conn: AsyncConnection | None) -> AsyncIterator[AsyncConnection]:
    if conn is not None:
        yield conn
        return
    async with db.engine().connect() as c:
        yield c


def _query_text(q: str) -> str:
    # same rules as product.search_tsv: normalise, then × -> x («16×5» == «16x5»)
    return normalize(q).replace("×", "x")


def _compact(t: str) -> str:
    return re.sub(_SEPARATORS, "", normalize(t).lower())


async def resolve_category(category: str, *, db: AsyncConnection | None = None) -> list[str] | None:
    """The catalog category names (name_norm) a loose `category` means; None when none match.

    Desk ids / their Persian names first, then the exact name, else names containing it (separators
    ignored), else trigram neighbours.
    """
    c = _compact(category)
    if not c:
        return None
    if desk := _DESK_WORDS.get(c):
        return [normalize(n) for n in DESK_CATEGORIES[desk]]
    async with _connect(db) as conn:
        rows = (await conn.execute(text("""
            SELECT name_norm, lower(regexp_replace(name_norm, :sep, '', 'g')) = :c AS exact
            FROM catalog_category
            WHERE position(:c IN lower(regexp_replace(name_norm, :sep, '', 'g'))) > 0 ORDER BY name_norm"""),
            {"c": c, "sep": _SEPARATORS})).all()
        names = [n for n, exact in rows if exact] or [n for n, _ in rows]  # «گوشی موبایل» not its batteries
        if not names:
            names = (await conn.execute(text("""
                SELECT name_norm FROM catalog_category WHERE similarity(name_norm, :q) >= :min
                ORDER BY similarity(name_norm, :q) DESC, name_norm LIMIT 5"""),
                {"q": normalize(category), "min": MIN_TRIGRAM})).scalars().all()
    return list(names) or None


async def search_products(
    q: str, category: str | None = None, budget_max: int | None = None, near: LatLng | None = None,
    limit: int = 10, *, db: AsyncConnection | None = None, embed: Embedder | None = None,
) -> list[ProductHit]:
    """Hybrid search: tsvector top 50 ∪ vector top 50, reciprocal-rank fusion, top `limit`.
    `category` (resolved loosely, resolve_category) is a boost, not a filter: the same two rankers run again
    inside it at half weight, so a wrong category never hides an exact model match.

    ponytail: `near` is accepted but unused here; distance ranking lives in search_shops.
    """
    q = _query_text(q)
    where = ["p.min_price IS NOT NULL"]
    params: dict = {"q": q, "pool": POOL, "model": config.EMBED_MODEL}
    if budget_max is not None:
        where.append("p.min_price <= :budget_max")
        params["budget_max"] = budget_max
    conds = [(" AND ".join(where), 1.0)]
    if category and (names := await resolve_category(category, db=db)):
        params["categories"] = names
        conds.append((" AND ".join([*where, "c.name_norm = ANY(:categories)"]), CATEGORY_BOOST))
    base = "catalog_product p JOIN catalog_category c ON c.id = p.category_id"
    try:
        params["vec"] = str(await (embed or embed_query)(q))
    except Exception:
        log.warning("query embedding failed; keyword-only search", exc_info=True)
    async with _connect(db) as conn:
        ranked: list[tuple[list[str], float]] = []  # (ids in rank order, weight)
        if "vec" in params:
            # ef_search defaults to 40 (< POOL); iterative scan keeps going when filters drop rows.
            # SET LOCAL lasts for this transaction (the connection autobegins on first execute).
            await conn.execute(text("SET LOCAL hnsw.ef_search = 100"))
            await conn.execute(text("SET LOCAL hnsw.iterative_scan = relaxed_order"))
        for cond, weight in conds:
            # OR the words (plainto_tsquery ANDs them); ts_rank prefers titles matching more of them
            kw = await conn.execute(text(f"""
                SELECT p.id FROM {base},
                    to_tsquery('simple', replace(plainto_tsquery('simple', :q)::text, '&', '|')) tq
                WHERE p.search_tsv @@ tq AND {cond}
                ORDER BY ts_rank(p.search_tsv, tq) DESC, p.offer_count DESC, p.id LIMIT :pool"""), params)
            ranked.append((kw.scalars().all(), weight))
            if "vec" in params:
                vec = await conn.execute(text(f"""
                    SELECT p.id FROM catalog_productembedding e JOIN {base} ON p.id = e.product_id
                    WHERE e.model = :model AND {cond}
                    ORDER BY e.embedding <=> CAST(:vec AS vector) LIMIT :pool"""), params)
                ranked.append((vec.scalars().all(), weight))
        plain: dict[str, float] = {}  # without the category
        scores: dict[str, float] = {}
        for ids, weight in ranked:
            for rank, pid in enumerate(ids, 1):
                scores[pid] = scores.get(pid, 0) + weight / (RRF_K + rank)
                if weight == 1.0:
                    plain[pid] = plain.get(pid, 0) + 1 / (RRF_K + rank)
        kw_rank = {pid: n for n, pid in enumerate(ranked[0][0])}  # ties go to the exact-word match

        def order(s: dict[str, float]) -> list[str]:
            return sorted(s, key=lambda i: (-s[i], kw_rank.get(i, POOL), i))
        # the best half without the category always stays in, so a wrong category cannot push it out
        keep = order(plain)[:max(1, limit // 2)]
        rest = [i for i in order(scores) if i not in keep][:limit - len(keep)]
        top = order({i: scores[i] for i in [*keep, *rest]})
        rows = await conn.execute(text("""
            SELECT id, persian_title AS title, brand_name AS brand, min_price, median_price, offer_count
            FROM catalog_product WHERE id = ANY(:ids)"""), {"ids": top})
        by_id = {r["id"]: dict(r) for r in rows.mappings()}
    return [{**by_id[i], "score": round(scores[i], 5)} for i in top]


async def search_shops(
    product_ids: list[str] | None, category: str | None, venue_slug: str | None,
    near: LatLng | None, limit: int = 10, *, db: AsyncConnection | None = None,
) -> list[ShopHit]:
    """Shops holding the products (cheapest non-outlier offer each), or matching category/venue.

    With `near`: shops in the venue the shopper stands in first, then by distance.
    """
    if product_ids is not None and not product_ids:
        return []  # no products asked: never fall back to unpriced busiest shops
    params: dict = {"limit": limit}
    where, order = ["true"], []
    if product_ids:
        best = """JOIN (
            SELECT DISTINCT ON (o.shop_id) o.shop_id, o.id, o.product_id, o.price_toman
            FROM catalog_offer o WHERE o.product_id = ANY(:pids) AND NOT o.is_outlier
            ORDER BY o.shop_id, o.price_toman
        ) o ON o.shop_id = s.id
        LEFT JOIN LATERAL (
            SELECT r.kind FROM catalog_shopreport r
            WHERE r.shop_id = s.id AND r.product_id = o.product_id AND r.kind IN ('had_item', 'no_item')
                AND r.created_at >= now() - interval '48 hours'
            ORDER BY r.created_at DESC LIMIT 1
        ) r ON true"""
        params["pids"] = product_ids
        where.append("r.kind IS DISTINCT FROM 'no_item'")
        offer = "o.id AS offer_id, o.price_toman AS price, coalesce(r.kind = 'had_item', false) AS confirmed"
    else:
        best = ""
        offer = "NULL AS offer_id, NULL::bigint AS price, false AS confirmed"
    if category:
        where.append(":category = ANY(s.category_names)")
        params["category"] = category
    if venue_slug:
        where.append("v.slug = :venue_slug")
        params["venue_slug"] = venue_slug
    pt = "ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography"
    if near:
        params |= {"lat": near["lat"], "lng": near["lng"], "near_m": NEAR_VENUE_M}
        dist = f"ST_Distance(s.geom, {pt})::int"
        order += [f"""coalesce(s.venue_id = (
            SELECT id FROM catalog_venue WHERE geom IS NOT NULL AND ST_DWithin(geom, {pt}, :near_m)
            ORDER BY ST_Distance(geom, {pt}) LIMIT 1), false) DESC""", "distance_m"]
    else:
        dist = "NULL::int"
    order += ["price", "s.offer_count DESC", "s.id"] if product_ids else ["s.offer_count DESC", "s.id"]
    async with _connect(db) as conn:
        rows = await conn.execute(text(f"""
            SELECT s.id, s.name, v.name AS venue_name, v.slug AS venue_slug, s.floor, s.unit,
                s.location_hint, s.parse_confidence, s.address_raw AS address, s.location_label,
                ST_Y(s.geom::geometry) AS lat, ST_X(s.geom::geometry) AS lng, {dist} AS distance_m,
                s.weekly_hours, CASE WHEN cardinality(s.payment_options) > 0 THEN true END AS installment,
                s.contacts -> 0 ->> 'display_number' AS contact, {offer}
            FROM catalog_shop s LEFT JOIN catalog_venue v ON v.id = s.venue_id {best}
            WHERE {" AND ".join(where)}
            ORDER BY {", ".join(order)} LIMIT :limit"""), params)
        out = []
        for r in rows.mappings():
            d = dict(r)
            d["stock"] = "confirmed" if d.pop("confirmed") else "unknown"
            out.append(d)
    return out
