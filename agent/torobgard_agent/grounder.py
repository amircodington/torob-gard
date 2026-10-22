import re
from dataclasses import dataclass
from typing import Any

from .contract import Answer, AskBlock, PriceCheckBlock, RouteBlock, ShopCardsBlock
from .persian import to_ascii_digits
from .tools.registry import ToolResult

_ID = re.compile(r"\b(?:shop|product|offer)_[A-Za-z0-9_]+")
# ponytail: only numbers tagged تومان / هزار تومان / میلیون count as prices; bare numbers (floors, counts)
# are not checked. Upgrade if the model starts quoting prices without a unit.
_PRICE = re.compile(r"(\d+(?:\.\d+)?)\s*(هزار\s*تومان|هزار\s*تومن|میلیون(?:\s*تومان|\s*تومن)?|تومان|تومن)")
_SCALE = {"هزار": 1_000, "میلیون": 1_000_000}
_BUDGET = re.compile(r"(?:تا|زیر|حداکثر|بودجه\S*)\s+" + _PRICE.pattern)
# honesty rule 2: no tool knows stock, so «موجوده / موجود است» is never grounded («موجوده یا نه؟» is fine)
_STOCK = re.compile(r"(?<!نا)(?<!\u200c)موجود(?:ه|\s*(?:است|هست))(?!\s*یا)")


@dataclass
class Violation:
    kind: str  # "id" | "price" | "stock" | "format"
    value: str
    message: str


def _numbers(data: Any) -> set[float]:
    if isinstance(data, bool):
        return set()
    if isinstance(data, (int, float)):
        return {float(data)}
    items = data.values() if isinstance(data, dict) else data if isinstance(data, list) else []
    return set().union(*map(_numbers, items)) if items else set()


def _block_ids(answer: Answer) -> list[str]:
    out: list[str] = []
    for b in answer.blocks:
        if isinstance(b, ShopCardsBlock):
            out += [*b.shop_ids, *b.offer_ids, *b.why]
        elif isinstance(b, PriceCheckBlock):
            out += [b.product_id, *b.offer_ids]
        elif isinstance(b, RouteBlock):
            out += [s.get("shop_id") for s in b.stops]
    return out


def _texts(answer: Answer) -> list[str]:
    out = [answer.say]
    for b in answer.blocks:
        if isinstance(b, ShopCardsBlock):
            out += b.why.values()
        elif isinstance(b, AskBlock):
            out += [b.question, *b.options]
    return out


def _block_prices(answer: Answer) -> list[int]:
    return [v for b in answer.blocks if isinstance(b, PriceCheckBlock) for v in (b.min, b.median, b.max)
            if v is not None]


def _norm(t: str) -> str:
    t = to_ascii_digits(t).replace("٫", ".")
    # thousands separators, only inside a standalone number (never glued to an id like shop_1)
    return re.sub(r"\b\d{1,3}(?:[,٬ ]\d{3})+(?!\d)", lambda m: re.sub("[,٬ ]", "", m.group()), t)


def _toman(n: str, unit: str) -> int:
    return round(float(n) * _SCALE.get(unit.split()[0], 1))


def prices(say: str) -> list[int]:
    return [_toman(n, u) for n, u in _PRICE.findall(_norm(say))]


def _drop_budget_echo(say: str, user_prices: set[int]) -> str:
    """Drop «تا / زیر / بودجه‌ت ۳۰ میلیون» when the user typed that number; other mentions stay checked."""
    def keep(m: re.Match) -> str:
        return "" if _toman(m.group(1), m.group(2)) in user_prices else m.group(0)
    # a say that names a shop/product gets no exemption: the number could pass as that record's price
    return _BUDGET.sub(keep, _norm(say)) if user_prices and not _ID.search(say) else say


def cited_ids(answer: Answer) -> list[str]:
    """Every record id the answer names, in blocks or in its text (the message's receipts)."""
    ids = [i for t in _texts(answer) for i in _ID.findall(t)]
    return list(dict.fromkeys([*filter(None, _block_ids(answer)), *ids]))


def ground(answer: Answer, results: list[ToolResult], user_prices: set[int] = frozenset()) -> list[Violation]:
    """user_prices: numbers the shopper typed; they pass only as a budget echo in `say`, never in blocks."""
    known = set().union(*(r.ids for r in results)) if results else set()
    values = set().union(*(_numbers(r.data) for r in results)) if results else set()
    out: list[Violation] = []
    texts = _texts(answer)
    for i in cited_ids(answer):
        if i not in known:
            out.append(Violation("id", i, f"id {i} was not returned by any tool"))
    for t in texts:
        for m in _STOCK.findall(t):
            out.append(Violation("stock", m, "stock is unknown; say «موجودی رو قبل از رفتن بپرس» instead"))
    checked = [_drop_budget_echo(answer.say, user_prices), *texts[1:]]
    for p in dict.fromkeys([*_block_prices(answer), *(p for t in checked for p in prices(t))]):
        if p not in values:
            out.append(Violation("price", str(p), f"price {p} toman appears in no tool result"))
    return out
