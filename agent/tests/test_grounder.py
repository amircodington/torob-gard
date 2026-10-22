from torobgard_agent.contract import Answer, AskBlock, PriceCheckBlock, RouteBlock, ShopCardsBlock
from torobgard_agent.grounder import ground
from torobgard_agent.tools.registry import ToolResult

DATA = {"product_id": "product_1", "median": 610000, "min": 600000}
R = [ToolResult("price_check", DATA, {"product_1", "shop_1"})]


def test_unknown_id_in_block():
    a = Answer(say="x", blocks=[ShopCardsBlock(shop_ids=["shop_x"])])
    v = ground(a, R)
    assert [(i.kind, i.value) for i in v] == [("id", "shop_x")]


def test_known_id_and_id_in_say():
    assert ground(Answer(say="shop_1", blocks=[ShopCardsBlock(shop_ids=["shop_1"])]), R) == []
    assert len(ground(Answer(say="برو shop_9"), R)) == 1


def test_price_grounded_and_not():
    assert ground(Answer(say="قیمت ۶۱۰٬۰۰۰ تومان است"), R) == []
    v = ground(Answer(say="قیمت ۶۵۰٬۰۰۰ تومان است"), R)
    assert [(i.kind, i.value) for i in v] == [("price", "650000")]


def test_price_scales_and_bare_numbers():
    assert ground(Answer(say="۶۱۰ هزار تومان؛ ۰٫۶ میلیون"), R) == []
    assert ground(Answer(say="طبقه ۲، ۳ تا مغازه"), R) == []
    assert len(ground(Answer(say="۱٫۵ میلیون"), R)) == 1


def test_price_block_values_checked():
    ok = Answer(say="x", blocks=[PriceCheckBlock(product_id="product_1", min=600000, median=610000)])
    assert ground(ok, R) == []
    bad = Answer(say="x", blocks=[PriceCheckBlock(product_id="product_1", max=999000)])
    assert [(i.kind, i.value) for i in ground(bad, R)] == [("price", "999000")]


def test_why_and_ask_text_scanned():
    a = Answer(say="x", blocks=[ShopCardsBlock(shop_ids=["shop_1"], why={"shop_1": "فقط ۴۵۰ هزار تومان"})])
    assert [(i.kind, i.value) for i in ground(a, R)] == [("price", "450000")]
    q = Answer(say="x", blocks=[AskBlock(question="shop_7 خوبه؟", options=["۱٫۵ میلیون تومن"])])
    assert [(i.kind, i.value) for i in ground(q, R)] == [("id", "shop_7"), ("price", "1500000")]


def test_route_stop_ids():
    stop = {"shop_id": "shop_zz", "venue_slug": None, "floor": None, "unit": None, "seq": 1}
    assert [i.value for i in ground(Answer(say="x", blocks=[RouteBlock(stops=[stop])]), R)] == ["shop_zz"]


def test_stock_claims_are_ungrounded():
    assert [v.kind for v in ground(Answer(say="آره موجوده"), R)] == ["stock"]
    assert len(ground(Answer(say="موجود است"), R)) == 1
    assert ground(Answer(say="ناموجوده؛ موجودی رو بپرس؛ نمی‌دونم موجوده یا نه"), R) == []
