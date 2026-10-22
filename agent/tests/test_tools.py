import test_search
from sqlalchemy import text
from test_search import NEAR, T

from torobgard_agent.llm import ToolCall
from torobgard_agent.tools.locate import locate_shop
from torobgard_agent.tools.memory import remember
from torobgard_agent.tools.price import price_check
from torobgard_agent.tools.registry import TOOLS, run_tool, serialise
from torobgard_agent.tools.trip import plan_trip

conn = test_search.conn  # reuse the fixture (rollback-per-test DB connection)
USER = "00000000-0000-0000-0000-0000000000f1"


async def add_p610(conn):
    await conn.execute(text(
        "INSERT INTO catalog_product (id, persian_title, title_norm, category_id, image_urls, specs,"
        " specs_text, min_price, median_price, max_price, offer_count) SELECT 't_p610', 'x', 'x', id, '{}',"
        " '[]', '', 600000, 610000, 620000, 3 FROM catalog_category WHERE name = 'کابل تست'"))
    offers = [("t_q1", "t_shop_a1", 600_000), ("t_q2", "t_shop_b1", 610_000), ("t_q3", "t_shop_far", 620_000)]
    for o, s, p in offers:
        await conn.execute(text(
            "INSERT INTO catalog_offer (id, product_id, shop_id, seller_title, price_toman,"
            " last_price_changed_at, description, is_outlier)"
            " VALUES (:o, 't_p610', :s, 'x', :p, now(), '', false)"),
            {"o": o, "s": s, "p": p})


async def test_price_check_high(conn):
    await add_p610(conn)
    r = await price_check("t_p610", 900_000, "t-venue-b", db=conn)
    assert (r["min"], r["median"], r["max"]) == (600_000, 610_000, 620_000)
    assert r["verdict"] == "high" and r["pct_vs_median"] == 48
    assert r["offer_ids"] == ["t_q1", "t_q2", "t_q3"]
    assert [s["id"] for s in r["cheaper_nearby"]] == ["t_shop_b1", "t_shop_a1", "t_shop_far"]


async def test_price_check_cheaper_nearby_fair_below_unknown(conn):
    await add_p610(conn)
    r = await price_check("t_p610", 615_000, "t-venue-b", db=conn)
    assert r["verdict"] == "fair" and r["pct_vs_median"] == 1
    assert [s["id"] for s in r["cheaper_nearby"]] == ["t_shop_b1", "t_shop_a1"]  # same venue first
    assert (await price_check("t_p610", 400_000, None, db=conn))["verdict"] == "below"
    assert (await price_check("t_p610", None, None, db=conn))["verdict"] == "unknown"
    assert (await price_check("nope", 5, None, db=conn))["verdict"] == "unknown"


async def test_locate_and_plan_trip_floor_order(conn):
    for shop, floor in [("t_shop_a1", "6"), ("t_shop_b1", "0")]:
        await conn.execute(
            text("UPDATE catalog_shop SET floor = :f, unit = '12' WHERE id = :i"), {"f": floor, "i": shop})
    await conn.execute(text("UPDATE catalog_shop SET venue_id = '00000000-0000-0000-0000-00000000000a',"
                            " floor = '4' WHERE id = 't_shop_far'"))
    await conn.execute(text("UPDATE catalog_shop SET venue_id = '00000000-0000-0000-0000-00000000000a',"
                            " floor = '0' WHERE id = 't_shop_b1'"))
    stops = await plan_trip(["t_shop_a1", "t_shop_far", "t_shop_b1", "t_shop_outlier"], db=conn)
    assert [(s["shop_id"], s["seq"]) for s in stops] == [
        ("t_shop_b1", 1), ("t_shop_far", 2), ("t_shop_a1", 3), ("t_shop_outlier", 4)]  # no venue last
    loc = await locate_shop("t_shop_a1", db=conn)
    assert loc == {"shop_id": "t_shop_a1", "venue_name": "t-venue-a", "venue_slug": "t-venue-a", "floor": "6",
                   "unit": "12", "hint": None, "confidence": 1.0}
    assert await locate_shop("nope", db=conn) is None


async def test_remember_writes_a_row(conn):
    assert await remember(USER, shop_id="t_shop_a1", state="liked", db=conn) == {"ok": True}
    row = (await conn.execute(text("SELECT state, product_id, shop_id FROM conversation_itemmemory"))).one()
    assert tuple(row) == ("liked", None, "t_shop_a1")


async def test_run_tool_ids_and_errors(conn):
    r = await run_tool(ToolCall("1", "search_shops", {"product_ids": [T], "near": NEAR}), db=conn)
    assert r.ids == {"t_shop_a1", "t_shop_b1", "t_shop_far", "t_o1", "t_o2", "t_o3"}
    assert "<data>t_shop_a1</data>" in serialise(r) and "t_o1" in serialise(r)
    bad = await run_tool(ToolCall("2", "remember", {"state": "liked", "shop_id": "t_shop_a1"}), db=conn)
    assert "error" in bad.data and bad.ids == set()
    assert "error" in (await run_tool(ToolCall("3", "nope", {}), db=conn)).data
    mem = ToolCall("4", "remember", {"state": "seen", "shop_id": "t_shop_a1"})
    ok = await run_tool(mem, user_id=USER, db=conn)
    assert ok.data == {"ok": True}
    assert {t["function"]["name"] for t in TOOLS} == {
        "search_products", "search_shops", "price_check", "locate_shop", "plan_trip", "remember"}


async def test_remember_unknown_id_is_data_not_a_crash(conn):
    r = await run_tool(ToolCall("1", "remember", {"state": "seen", "shop_id": "hallucinated"}),
                       user_id=USER, db=conn)
    assert "unknown shop_id" in r.data["error"]
    ok = await run_tool(ToolCall("2", "remember", {"state": "seen", "product_id": T}), user_id=USER, db=conn)
    assert ok.data == {"ok": True}  # the connection is still usable


async def test_price_check_ignores_outliers_and_ids_cover_price_and_trip(conn):
    r = await run_tool(ToolCall("1", "price_check", {"product_id": T, "quoted_price": 600_000}), db=conn)
    assert r.data["max"] == 520_000 and "t_o4" not in r.data["offer_ids"]
    assert {T, "t_o1", "t_o2", "t_o3", "t_shop_b1"} <= r.ids
    t = await run_tool(ToolCall("2", "plan_trip", {"shop_ids": ["t_shop_a1", "t_shop_b1"]}), db=conn)
    assert t.ids == {"t_shop_a1", "t_shop_b1"}


async def test_all_shop_text_is_wrapped(conn):
    r = await run_tool(ToolCall("1", "search_shops", {"product_ids": [T]}), db=conn)
    out = serialise(r)
    assert '"contact": "<data>021</data>"' in out and '"unit": null' in out
    assert '"floor": null' in out and "<data>t-venue-a</data>" in out  # venue_name
    n = serialise(type(r)("x", {"seller_title": "s", "note": "n", "floor": "2", "unit": "3"}))
    assert n.count("<data>") == 4
