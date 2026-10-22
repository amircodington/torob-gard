import os
import random

import pytest
from sqlalchemy import text

from torobgard_agent import config
from torobgard_agent.db import make_engine
from torobgard_agent.persian import normalize
from torobgard_agent.tools.search import resolve_category, search_products, search_shops

T = "t_cable_mashhad"
NEAR = {"lat": 35.6950, "lng": 51.4100}


def onehot(i: int) -> list[float]:
    return [1.0 if d == i else 0.0 for d in range(config.EMBED_DIMS)]


PRODUCTS = [  # id, title, min_price
    ("t_cable_mashhad", "کابل افشان ۱۶×۵ مشهد", 500_000),  # ids sort so ties would hide a bug
    ("t_cable_2x5", "کابل افشان 2×5 مشهد", 300_000),
    ("t_cable_tehran", "کابل ۱۶×۵ تهران", 450_000),
    ("t_cable_gold", "کابل ۱۶×۵ ویژه", 5_000_000),
]
SQL = [
    "INSERT INTO catalog_category (name, name_norm, product_count, shop_count)"
    " VALUES ('کابل تست', 'کابل تست', 0, 0)",
    *[
        f"INSERT INTO catalog_product (id, persian_title, title_norm, category_id, image_urls, specs,"
        f" specs_text, min_price, median_price, max_price, offer_count) SELECT '{i}', '{t}',"
        f" '{normalize(t)}', id, '{{}}', '[]', '', {p}, {p}, {p}, 1"
        f" FROM catalog_category WHERE name = 'کابل تست'"
        for i, t, p in PRODUCTS
    ],
    *[
        f"INSERT INTO catalog_venue (id, name, name_norm, slug, aliases, kind, address, geom, floors,"
        f" directory_photo_ids, shop_count) VALUES ('{u}', '{n}', '{n}', '{n}', '{{}}', 'pasazh', '',"
        f" 'SRID=4326;POINT({lng} {lat})', '[]', '{{}}', 1)"
        for u, n, lng, lat in [
            ("00000000-0000-0000-0000-00000000000a", "t-venue-a", 51.4100, 35.6950),
            ("00000000-0000-0000-0000-00000000000b", "t-venue-b", 51.4103, 35.6952),
        ]
    ],
    *[
        f"INSERT INTO catalog_shop (id, name, name_norm, address_raw, venue_id, parse_confidence, geom,"
        f" location_label, category_names, contacts, weekly_hours, payment_options, offer_count)"
        f" VALUES ('{i}', '{i}', '{i}', 'addr', {v}, 1, 'SRID=4326;POINT({lng} 35.6950)', '', '{{}}',"
        f" '[{{\"display_number\": \"021\"}}]', '{{}}', '{{}}', 1)"
        for i, v, lng in [
            ("t_shop_a1", "'00000000-0000-0000-0000-00000000000a'", 51.4106),  # ~54 m, venue A
            ("t_shop_b1", "'00000000-0000-0000-0000-00000000000b'", 51.4101),  # ~9 m, venue B
            ("t_shop_far", "NULL", 51.4200),
            ("t_shop_outlier", "NULL", 51.4100),
        ]
    ],
    *[
        f"INSERT INTO catalog_offer (id, product_id, shop_id, seller_title, price_toman,"
        f" last_price_changed_at, description, is_outlier)"
        f" VALUES ('{o}', 't_cable_mashhad', '{s}', 'کابل', {p}, now(), '', {x})"
        for o, s, p, x in [
            ("t_o1", "t_shop_a1", 520_000, "false"), ("t_o2", "t_shop_b1", 500_000, "false"),
            ("t_o3", "t_shop_far", 510_000, "false"), ("t_o4", "t_shop_outlier", 9_000_000, "true"),
        ]
    ],
]


@pytest.fixture
async def conn():
    engine = make_engine(os.environ["TEST_DATABASE_URL"])
    async with engine.connect() as c:
        await c.begin()
        for s in SQL:
            await c.execute(text(s))
        for n, (pid, _, _) in enumerate(PRODUCTS):
            await c.execute(
                text("INSERT INTO catalog_productembedding VALUES (:p, :m, CAST(:v AS vector), 'h')"),
                {"p": pid, "m": config.EMBED_MODEL, "v": str(onehot(n))},
            )
        yield c
        await c.rollback()
    await engine.dispose()


async def near_target(q: str) -> list[float]:
    return onehot(0)


async def near_2x5(q: str) -> list[float]:
    return [a + b / 2 for a, b in zip(onehot(1), onehot(0), strict=True)]  # 2x5 first, target second


async def broken(q: str) -> list[float]:
    raise RuntimeError("BoxAPI down")


# near_2x5: keyword #1 and vector #1 tie on RRF score; the keyword match wins
@pytest.mark.parametrize("embed", [near_target, near_2x5, broken])
async def test_persian_and_latin_spelling_find_the_same_product(conn, embed):
    fa = await search_products("کابل ۱۶×۵ مشهد", db=conn, embed=embed)
    en = await search_products("کابل 16x5 مشهد", db=conn, embed=embed)
    assert fa[0]["id"] == en[0]["id"] == "t_cable_mashhad"
    assert set(fa[0]) == {"id", "title", "brand", "min_price", "median_price", "offer_count", "score"}


async def test_budget_max_filters(conn):
    hits = await search_products("کابل ۱۶×۵", budget_max=1_000_000, db=conn, embed=near_target)
    ids = [h["id"] for h in hits]
    assert "t_cable_mashhad" in ids and "t_cable_gold" not in ids
    assert all(h["min_price"] <= 1_000_000 for h in hits)


async def test_shops_same_venue_as_near_first(conn):
    hits = await search_shops([T], None, None, near=NEAR, db=conn)
    assert [h["id"] for h in hits] == ["t_shop_a1", "t_shop_b1", "t_shop_far"]  # outlier offer left out
    a1 = hits[0]
    assert (a1["venue_slug"], a1["offer_id"], a1["price"]) == ("t-venue-a", "t_o1", 520_000)
    assert a1["stock"] == "unknown"
    assert 40 < a1["distance_m"] < 70 and a1["contact"] == "021" and a1["weekly_hours"] == {}


async def test_shops_without_near_by_price(conn):
    hits = await search_shops([T], None, None, near=None, db=conn)
    assert [h["id"] for h in hits] == ["t_shop_b1", "t_shop_far", "t_shop_a1"]
    assert hits[0]["distance_m"] is None
    assert hits[0]["last_price_changed_at"] is not None and hits[0]["price_age_days"] == 0  # honesty rule 1
    venue = await search_shops([T], None, "t-venue-b", near=None, db=conn)
    assert [h["id"] for h in venue] == ["t_shop_b1"]


async def test_shops_empty_product_list_is_empty(conn):
    assert await search_shops([], None, None, near=NEAR, db=conn) == []


async def test_vector_pool_reaches_50_under_a_filter(conn):
    # 60 products around the query; the 30 over budget sit closest, so plain HNSW (ef_search 40)
    # fills its candidates with rows the filter then drops. Seeded noise: one-hot vectors made a
    # degenerate graph with flaky recall.
    def bulk_vec(n: int) -> list[float]:
        rnd, scale = random.Random(n), (0.02 if n % 2 == 0 else 0.1)
        return [a + scale * (rnd.random() - 0.5) for a in onehot(0)]

    for n in range(60):
        await conn.execute(text(
            "INSERT INTO catalog_product (id, persian_title, title_norm, category_id, image_urls, specs,"
            " specs_text, min_price, median_price, max_price, offer_count) SELECT :i, 'x', 'x', id, '{}',"
            " '[]', '', :p, :p, :p, 1 FROM catalog_category WHERE name = 'کابل تست'"),
            {"i": f"t_bulk_{n:02}", "p": 100 if n % 2 else 10_000_000})
        await conn.execute(
            text("INSERT INTO catalog_productembedding VALUES (:p, :m, CAST(:v AS vector), 'h')"),
            {"p": f"t_bulk_{n:02}", "m": config.EMBED_MODEL, "v": str(bulk_vec(n))},
        )
    # Rebuild the index inside this (rolled-back) transaction: rows rolled back by earlier runs stay
    # in an incrementally built HNSW graph and erode recall run after run.
    await conn.execute(text("SET CONSTRAINTS ALL IMMEDIATE"))  # Django FKs are deferred
    await conn.execute(text("DROP INDEX product_emb_hnsw"))
    await conn.execute(text(
        "CREATE INDEX product_emb_hnsw ON catalog_productembedding USING hnsw (embedding vector_cosine_ops)"))
    for off in ("enable_seqscan", "enable_sort"):  # tiny table: make the planner use HNSW
        await conn.execute(text(f"SET LOCAL {off} = off"))
    hits = await search_products("ناموجود", budget_max=1000, limit=100, db=conn, embed=near_target)
    # HNSW is approximate, so allow a little slack; without the ef_search/iterative_scan fix: ~10
    assert len(hits) >= 25 and all(h["min_price"] <= 1000 for h in hits)


ACCESSORY = ["هدفون، هدست و هندزفری", "شارژر گوشی", "کیف و کاور گوشی", "محافظ صفحه نمایش گوشی"]


# the values the model sent in eval run 1
@pytest.mark.parametrize("category, names", [
    ("accessory", ACCESSORY), ("لوازم جانبی", ACCESSORY), ("لپ‌تاپ", ["لپ تاپ و نوت بوک"]),
    ("Mobile", ["گوشی موبایل"]),
])
async def test_desk_words_mean_their_catalog_categories(conn, category, names):
    assert await resolve_category(category, db=conn) == names


async def test_category_matches_catalog_names_loosely(conn):
    assert await resolve_category("كابل‌تست", db=conn) == ["کابل تست"]  # Arabic kaf, ZWNJ for space
    await conn.execute(text("INSERT INTO catalog_category (name, name_norm, product_count, shop_count)"
                            " VALUES ('باتری کابل تست', 'باتری کابل تست', 0, 0)"))
    assert await resolve_category("کابل تست", db=conn) == ["کابل تست"]  # the exact name wins
    assert await resolve_category("کابل", db=conn) == ["باتری کابل تست", "کابل تست"]  # part of the name
    assert (await resolve_category("کابل تستی", db=conn))[0] == "کابل تست"  # near spelling (trigram)
    assert await resolve_category("هواشناسی", db=conn) is None
    assert await resolve_category(" - ", db=conn) is None  # nothing left to match: no filter, not all
    await conn.execute(text("INSERT INTO catalog_category (name, name_norm, product_count, shop_count)"
                            " VALUES ('Apple Watch', 'Apple Watch', 0, 0)"))
    assert await resolve_category("apple watch", db=conn) == ["Apple Watch"]  # Latin case ignored
    hits = await search_products("کابل ۱۶×۵ مشهد", category="کابل", db=conn, embed=near_target)
    assert hits[0]["id"] == T


async def test_category_boosts_but_never_hides_a_match(conn):
    # run 3: «لوازم جانبی موبایل» resolved to a real but wrong category and hid the exact model match
    await conn.execute(text("INSERT INTO catalog_category (name, name_norm, product_count, shop_count)"
                            " VALUES ('سایر لوازم جانبی تست', 'سایر لوازم جانبی تست', 0, 0)"))
    await conn.execute(text(
        "INSERT INTO catalog_product (id, persian_title, title_norm, category_id, image_urls, specs,"
        " specs_text, min_price, median_price, max_price, offer_count) SELECT 't_other', 'کابل دیگر',"
        " 'کابل دیگر', id, '{}', '[]', '', 100, 100, 100, 1 FROM catalog_category"
        " WHERE name = 'سایر لوازم جانبی تست'"))
    await conn.execute(
        text("INSERT INTO catalog_productembedding VALUES ('t_other', :m, CAST(:v AS vector), 'h')"),
        {"m": config.EMBED_MODEL, "v": str(onehot(9))})
    ids = [h["id"] for h in await search_products("کابل ۱۶×۵ مشهد", category="سایر لوازم جانبی", limit=2,
                                                  db=conn, embed=near_target)]
    assert T in ids and "t_other" in ids  # the match stays in even at limit 2; the category item is added
    plain = [h["id"] for h in await search_products("کابل", db=conn, embed=near_target)]
    boosted = [h["id"] for h in await search_products("کابل", category="سایر لوازم جانبی", db=conn,
                                                      embed=near_target)]
    assert boosted.index("t_other") < plain.index("t_other")
