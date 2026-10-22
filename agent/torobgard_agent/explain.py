"""Desk explanations: FAST_MODEL rewrites the P1 template text per tier; any doubt keeps the template."""
import asyncio
import json
import logging
import re

from pydantic import BaseModel

from . import config
from .grounder import _PRICE, _STOCK, _norm, prices
from .llm import LLMClient

log = logging.getLogger(__name__)
TIMEOUT_S = 7
_NUM = re.compile(r"\d+(?:\.\d+)?")
# honesty rule: a superlative is allowed only if the template (whose logic proves it) already says it
_SUPERLATIVE = re.compile(r"بهترین|بیشترین|سبک‌ترین|ارزون‌ترین|گرون‌ترین|کمترین|مناسب‌ترین")

SYSTEM = """\
تو نویسنده‌ی متن کارت‌های «میز تصمیم» ترب‌گردی. متن آماده‌ی هر گزینه رو با لحن گرم و محاوره‌ای فارسی بازنویسی کن.
قانون‌ها:
- فقط از عددها و مشخصاتی که تو داده‌ی گزینه هست استفاده کن؛ هیچ عدد، قیمت یا مشخصه‌ی تازه‌ای نساز.
- درباره‌ی موجودی کالا چیزی نگو.
- صفت برتری («بهترین»، «بیشترین»، ...) فقط اگه تو متن آماده هست.
- تعداد bullets و tradeoffs دقیقا مثل متن آماده باشه و هر خط کوتاه بمونه.
- خروجی فقط یک JSON: {"bullets": [...], "tradeoffs": [...], "fit_note": "..."}"""


class Tier(BaseModel):
    tier: str
    product_id: str
    title: str = ""
    specs_top3: list[dict] = []
    price: int
    offer_count: int
    bullets: list[str]
    tradeoffs: list[str]
    fit_note: str


class ExplainIn(BaseModel):
    tiers: list[Tier]
    req: dict = {}


def _bare(text: str) -> set[float]:
    return {float(n) for n in _NUM.findall(_PRICE.sub(" ", _norm(text)))}


def _texts(*parts) -> list[str]:
    return [t for p in parts for t in ([p] if isinstance(p, str) else p)]


def _violates(t: Tier, out: dict) -> bool:
    bullets, tradeoffs, note = out.get("bullets"), out.get("tradeoffs"), out.get("fit_note")
    ok = (isinstance(bullets, list) and isinstance(tradeoffs, list) and isinstance(note, str)
          and len(bullets) == len(t.bullets) and len(tradeoffs) == len(t.tradeoffs)
          and all(isinstance(x, str) and x for x in [*bullets, *tradeoffs, note]))
    if not ok:
        return True
    old = _texts(t.bullets, t.tradeoffs, t.fit_note)
    new = _texts(bullets, tradeoffs, note)
    shown = [t.title, *(str(s.get("value", "")) for s in t.specs_top3), *old]
    allowed_bare = {float(t.offer_count), float(t.price)} | set().union(*map(_bare, shown))
    allowed_price = {t.price} | {p for s in old for p in prices(s)}
    joined_old = " ".join(old)
    for s in new:
        if _STOCK.search(s) or any(w not in joined_old for w in _SUPERLATIVE.findall(s)):
            return True
        if not set(prices(s)) <= allowed_price or not _bare(s) <= allowed_bare:
            return True
    return False


async def _one(llm, t: Tier, req: dict) -> dict | None:
    payload = {"tier": t.tier, "title": t.title, "specs": t.specs_top3, "price_toman": t.price,
               "offer_count": t.offer_count, "needs": req, "template": {
                   "bullets": t.bullets, "tradeoffs": t.tradeoffs, "fit_note": t.fit_note}}
    try:
        r = await asyncio.wait_for(llm.chat(
            [{"role": "system", "content": SYSTEM},
             {"role": "user", "content": json.dumps(payload, ensure_ascii=False)}],
            None, config.FAST_MODEL), TIMEOUT_S)
        m = re.search(r"\{.*\}", r.content or "", re.S)
        out = json.loads(m.group()) if m else None
        if not isinstance(out, dict) or _violates(t, out):
            return None
        return {k: out[k] for k in ("bullets", "tradeoffs", "fit_note")}
    except Exception:  # timeout, BoxAPI error, bad JSON: the P1 template stays
        log.warning("explain failed for %s", t.product_id, exc_info=True)
        return None


async def explain(body: ExplainIn, llm=None) -> dict[str, dict]:
    llm = llm or LLMClient()
    res = await asyncio.gather(*(_one(llm, t, body.req) for t in body.tiers))
    return {t.product_id: r for t, r in zip(body.tiers, res, strict=True) if r}
