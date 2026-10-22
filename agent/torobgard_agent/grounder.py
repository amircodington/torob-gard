import re
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from .contract import Answer, AskBlock, PriceCheckBlock, RouteBlock, ShopCardsBlock
from .persian import normalize, to_ascii_digits
from .tools.registry import ToolResult

_ID = re.compile(r"\b(?:shop|product|offer)_[A-Za-z0-9_]+")
# ponytail: only numbers tagged تومان / هزار تومان / میلیون count as prices; bare numbers (floors, counts)
# are not checked. Upgrade if the model starts quoting prices without a unit.
_PRICE = re.compile(r"(\d+(?:\.\d+)?)\s*(هزار\s*تومان|هزار\s*تومن|میلیون(?:\s*تومان|\s*تومن)?|تومان|تومن)")
_SCALE = {"هزار": 1_000, "میلیون": 1_000_000}
_BUDGET = re.compile(r"(?:تا|زیر|حداکثر|بودجه\S*)\s+" + _PRICE.pattern)
# honesty rule 2: no tool knows stock, so «موجوده / موجود است» is never grounded («موجوده یا نه؟» is fine)
# the shopper's quoted price may be echoed only as a quote («بهت ۱۲۰ میلیون گفتن», «قیمتی که گفتن»), in a
# clause with no market word: never as the market's or a shop's price
_CLAUSE = re.compile(r"[؛;!?؟\n]|(?<!\d)\.(?!\d)|\s(?:ولی|اما)\s")
_QUOTE = re.compile(r"گفت|گفته|پیشنهاد")
_MARKET = re.compile(r"میانه|میانگین|کمترین|بیشترین|ارزون|بازار|مغازه|فروشگاه")
_NAME_KEYS = {"name", "title"}
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


def _names(data: Any) -> set[str]:
    """Shop names and product titles in a tool result (a say naming one gets no user-number exemption)."""
    if isinstance(data, list):
        return set().union(*map(_names, data)) if data else set()
    if not isinstance(data, dict):
        return set()
    out = {normalize(v) for k, v in data.items() if k in _NAME_KEYS and isinstance(v, str) and len(v) > 2}
    return out.union(*(_names(v) for v in data.values()))


def _drop_user_echo(say: str, user_prices: set[int], quoted: set[int], names: set[str]) -> str:
    """Drop numbers the user typed that `say` only echoes: «تا / زیر / بودجه‌ت ۳۰ میلیون», or the price the
    shopper was quoted (`quoted`: this turn's price_check) inside a quote clause. Others stay checked."""
    # a say naming a shop/product: the number could pass as its price
    if not user_prices or _ID.search(say) or any(n in normalize(say) for n in names):
        return say

    def drop(allowed: set[int]) -> Callable[[re.Match], str]:
        return lambda m: "" if _toman(m.group(1), m.group(2)) in allowed else m.group(0)

    def quote(clause: str) -> str:
        ok = _QUOTE.search(clause) and not _MARKET.search(clause)
        return _PRICE.sub(drop(quoted & user_prices), clause) if ok else clause
    said = _BUDGET.sub(drop(user_prices), _norm(say))
    return "|".join(quote(c) for c in _CLAUSE.split(said))


def cited_ids(answer: Answer) -> list[str]:
    """Every record id the answer names, in blocks or in its text (the message's receipts)."""
    ids = [i for t in _texts(answer) for i in _ID.findall(t)]
    return list(dict.fromkeys([*filter(None, _block_ids(answer)), *ids]))


def ground(answer: Answer, results: list[ToolResult], user_prices: set[int] = frozenset()) -> list[Violation]:
    """user_prices: numbers the shopper typed; they pass only in `say`, as a budget echo or as the quoted
    price of this turn's price_check, never in blocks."""
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
    quoted = {r.args.get("quoted_price") for r in results  # a failed price_check judged nothing
              if r.name == "price_check" and not (isinstance(r.data, dict) and "error" in r.data)}
    names = set().union(*(_names(r.data) for r in results)) if results else set()
    checked = [_drop_user_echo(answer.say, user_prices, quoted, names), *texts[1:]]
    for p in dict.fromkeys([*_block_prices(answer), *(p for t in checked for p in prices(t))]):
        if p in values:
            continue
        if p in quoted & user_prices:
            out.append(Violation("price", str(p), f"price {p} toman is the shopper's quote: repeat it only as"
                                 " their quote («بهت … گفتن»), with no shop, product or market"))
        else:
            out.append(Violation("price", str(p), f"price {p} toman appears in no tool result"))
    return out
