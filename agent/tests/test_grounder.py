from torobgard_agent.contract import Answer, ShopCardsBlock
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
