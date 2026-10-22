import json

from torobgard_agent.explain import ExplainIn, Tier, explain
from torobgard_agent.llm import ChatResult

TIER = Tier(
    tier="balanced", product_id="product_1", title="گوشی تست", price=12_500_000, offer_count=7,
    specs_top3=[{"label": "ظرفیت باتری", "value": "5000 میلی‌آمپر ساعت"}],
    bullets=["بیشترین باتری تو این بودجه", "۷ فروشنده تو بازار دارنش"],
    tradeoffs=["۲ میلیون تومان گرون‌تر از گزینه‌ی اقتصادی"], fit_note="پیشنهاد ترب‌گرد: تعادل خوبی داره.",
)


class LLM:
    def __init__(self, out=None, exc=None):
        self.out, self.exc = out, exc

    async def chat(self, messages, tools, model, stream=False):
        if self.exc:
            raise self.exc
        return ChatResult(self.out if isinstance(self.out, str) else json.dumps(self.out, ensure_ascii=False))


def good(**kw):
    return {"bullets": ["باتری ۵۰۰۰ میلی‌آمپر؛ بیشترین باتری تو این بودجه", "۷ فروشنده دارنش"],
            "tradeoffs": ["۲ میلیون تومان گرون‌تر از اقتصادی"],
            "fit_note": "تعادل خوبی بین قیمت و باتری داره.",
            **kw}


async def run(llm):
    return await explain(ExplainIn(tiers=[TIER], req={"category": "mobile"}), llm)


async def test_grounded_text_replaces_template():
    out = await run(LLM(good()))
    assert out["product_1"]["bullets"][0].startswith("باتری ۵۰۰۰")


async def test_spec_number_not_in_specs_is_rejected():
    assert await run(LLM(good(bullets=["باتری ۶۰۰۰ میلی‌آمپر", "۷ فروشنده"]))) == {}


async def test_price_count_stock_and_superlative_are_rejected():
    for bad in (
        good(fit_note="فقط ۱۳ میلیون تومان"),
        good(bullets=["۹ فروشنده", "x"]),
        good(fit_note="الان موجوده"),
        good(fit_note="سبک‌ترین گوشی بازار"),
        good(bullets=["فقط یکی"]),
    ):
        assert await run(LLM(bad)) == {}


async def test_failures_keep_templates():
    assert await run(LLM("not json")) == {}
    assert await run(LLM(exc=TimeoutError())) == {}
