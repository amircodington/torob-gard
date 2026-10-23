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
    assert ground(Answer(say="۳ تا مغازه، ۲ تا پاساژ"), R) == []  # bare counts stay unchecked
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


def test_budget_band_options_are_choices_not_prices():
    # the turn that answered «نتونستم تأیید کنم…» (2026-10-23): a budget ask, not a price claim
    bands = ["تا ۵۰۰ هزار تومان", "۵۰۰ هزار تا ۲ میلیون", "بالای ۵ میلیون", "زیر ۱ میلیون",
             "کمتر از ۳ میلیون", "بیشتر از ۵ میلیون تومان"]
    a = Answer(say="بودجه‌ات چقدره؟", blocks=[AskBlock(question="بودجه‌ات چقدره؟", options=bands)])
    assert ground(a, R) == []
    lone = Answer(say="x", blocks=[AskBlock(question="کدوم؟", options=["تا ۵ میلیون", "۷۹۹ هزار تومان"])])
    assert [(i.kind, i.value) for i in ground(lone, R)] == [("price", "799000")]


def test_route_stop_ids():
    stop = {"shop_id": "shop_zz", "venue_slug": None, "floor": None, "unit": None, "seq": 1}
    assert [i.value for i in ground(Answer(say="x", blocks=[RouteBlock(stops=[stop])]), R)] == ["shop_zz"]


def test_stock_claims_are_ungrounded():
    assert [v.kind for v in ground(Answer(say="آره موجوده"), R)] == ["stock"]
    assert len(ground(Answer(say="موجود است"), R)) == 1
    assert ground(Answer(say="ناموجوده؛ موجودی رو بپرس؛ نمی‌دونم موجوده یا نه"), R) == []


def test_user_numbers_only_pass_as_a_budget_echo_in_say():
    user = {30_000_000, 100_000}
    assert ground(Answer(say="باشه، گوشی تا ۳۰ میلیون تومان"), [], user) == []
    assert ground(Answer(say="بودجه‌ت ۳۰ میلیون تومان"), [], user) == []
    assert len(ground(Answer(say="تا ۳۰ میلیون تومان"), [])) == 1  # not typed by the user
    v = ground(Answer(say="shop_1 ۱۰۰ هزار تومنه"), R, user)  # a shop price, not a budget
    assert [(i.kind, i.value) for i in v] == [("price", "100000")]
    assert len(ground(Answer(say="shop_1 تا ۱۰۰ هزار تومان"), R, user)) == 1
    blk = Answer(say="تا ۱۰۰ هزار تومان", blocks=[PriceCheckBlock(product_id="product_1", min=100_000)])
    assert [(i.kind, i.value) for i in ground(blk, R, user)] == [("price", "100000")]


def test_quoted_price_of_this_turns_price_check_passes_in_say_only():
    pc = ToolResult("price_check", DATA, {"product_1", "shop_1"},
                    {"product_id": "product_1", "quoted_price": 120_000_000})
    user = {120_000_000}
    assert ground(Answer(say="بهت ۱۲۰ میلیون تومان گفتن؛ از میانه‌ی بازار بالاتره"), [pc], user) == []
    assert len(ground(Answer(say="۱۲۰ میلیون تومان گفتن"), [pc])) == 1  # the shopper never typed it
    assert len(ground(Answer(say="۱۲۰ میلیون تومان گفتن"), R, user)) == 1  # no price_check quoted it
    assert len(ground(Answer(say="shop_1 ۱۲۰ میلیون تومنه"), [pc], user)) == 1  # dictated shop price
    blk = Answer(say="x", blocks=[PriceCheckBlock(product_id="product_1", max=120_000_000)])
    assert [(i.kind, i.value) for i in ground(blk, [pc], user)] == [("price", "120000000")]
    why = Answer(say="x", blocks=[ShopCardsBlock(shop_ids=["shop_1"], why={"shop_1": "۱۲۰ میلیون تومان"})])
    assert len(ground(why, [pc], user)) == 1


def test_quoted_price_passes_only_inside_a_quote():
    shop = ToolResult("search_shops", [{"id": "shop_2", "name": "موبایل پارسیان", "price": 92_000_000}],
                      {"shop_2"})
    pc = ToolResult("price_check", DATA, {"product_1"}, {"quoted_price": 120_000_000})
    user = {120_000_000}
    assert ground(Answer(say="بهت ۱۲۰ میلیون گفتن؛ زیاده"), [pc, shop], user) == []
    assert ground(Answer(say="قیمتی که بهت گفتن، ۱۲۰ میلیون تومان، بالاست"), [pc], user) == []
    v = ground(Answer(say="بهت ۱۲۰ میلیون گفتن؛ موبایل پارسیان ۱۲۰ میلیون تومن میده"), [pc, shop], user)
    assert [(i.kind, i.value) for i in v] == [("price", "120000000")]  # a named shop in the say
    assert len(ground(Answer(say="میانه‌ی بازار ۱۲۰ میلیونه"), [pc], user)) == 1
    assert len(ground(Answer(say="بهت گفتن میانه‌ی بازار ۱۲۰ میلیونه"), [pc], user)) == 1
    [v] = ground(Answer(say="۱۲۰ میلیون برای این مدل بالاست"), [pc], user)  # not a quote
    assert "بهت … گفتن" in v.message  # the retry learns how to repeat the quote
    pc15 = ToolResult("price_check", DATA, {"product_1"}, {"quoted_price": 1_500_000})
    assert ground(Answer(say="بهت ۱٫۵ میلیون تومان گفتن."), [pc15], {1_500_000}) == []  # decimal point


def test_failed_price_check_grants_no_quote():
    err = ToolResult("price_check", {"error": "unknown product_id x"}, set(), {"quoted_price": 120_000_000})
    assert len(ground(Answer(say="بهت ۱۲۰ میلیون گفتن"), [err], {120_000_000})) == 1


SHOPS = [ToolResult("search_shops", [
    {"id": "shop_1", "name": "موبایل رضا", "floor": "4", "unit": "12", "parse_confidence": 1.0,
     "address": "پاساژ علاءالدین طبقه ۴ واحد ۱۲ پلاک ۳۲", "price": 610_000},
    {"id": "shop_2", "name": "دیجی پارس", "floor": "0", "unit": "B3", "parse_confidence": 0.6,
     "price": 600_000},
    {"id": "shop_3", "name": "تک سل", "floor": "-1", "unit": None, "parse_confidence": 1.0, "price": None},
], {"shop_1", "shop_2", "shop_3"})]


def kinds(answer, results=SHOPS):
    return [(v.kind, v.value) for v in ground(answer, results)]


def test_floors_and_units_must_come_from_a_tool_result():
    assert kinds(Answer(say="موبایل رضا طبقه ۴، واحد ۱۲")) == []
    assert kinds(Answer(say="موبایل رضا طبقه‌ی چهارم، پلاک ۳۲")) == []  # ordinal; plate from the address
    assert kinds(Answer(say="تک سل طبقه منفی یک")) == []
    assert kinds(Answer(say="تک سل زیرزمینه")) == []
    assert kinds(Answer(say="موبایل رضا طبقه ۵، واحد ۹")) == [("floor", "5"), ("unit", "9")]
    assert kinds(Answer(say="طبقه سوم")) == [("floor", "3")]
    assert kinds(Answer(say="x", blocks=[AskBlock(question="طبقه ۷؟")])) == [("floor", "7")]
    assert kinds(Answer(say="طبقه ۲"), R) == [("floor", "2")]  # no shop in the results has a floor


def test_low_confidence_location_needs_a_hedge():
    assert kinds(Answer(say="دیجی پارس همکفه")) == [("hedge", "0")]
    assert kinds(Answer(say="دیجی پارس احتمالاً همکفه؛ واحد B3")) == [("hedge", "B3")]
    assert kinds(Answer(say="دیجی پارس احتمالاً همکفه؛ احتمالاً واحد B3")) == []
    cards = Answer(say="طبقه همکف", blocks=[ShopCardsBlock(shop_ids=["shop_2"])])
    assert kinds(cards) == [("hedge", "0")]  # cited by id, not by name
    sure = [ToolResult("search_shops", [*SHOPS[0].data, {"id": "shop_4", "name": "آوا", "floor": "0",
                                                          "unit": "1", "parse_confidence": 0.9}], set())]
    assert kinds(Answer(say="آوا همکفه"), sure) == []  # the named shop is sure, another isn't
    assert kinds(Answer(say="یه مغازه همکفه"), sure) == []  # unnamed: one sure shop is enough


def test_price_age_numbers_are_not_prices_or_floors():
    say = "۶۱۰ هزار تومان، ۱۲ روز پیش به‌روز شده؛ ۹۰ روز پیش ۶۰۰ هزار تومان بود، ممکن است تغییر کرده باشد"
    assert ground(Answer(say=say), R) == []
