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
# honesty rules 1 and 4: a floor or unit the shopper will walk to must be in a tool result, hedged when the
# address parse was unsure. Floor words map to the stored values (api/ingest/address.py _FLOORS).
_T = r"طبقه\u200c?(?:\s*ی(?=[\s\u200c]))?[\s\u200c:]*"  # «طبقه»، «طبقه‌ی»، «طبقه ی»
_ORD = {"اول": 1, "یکم": 1, "دوم": 2, "سوم": 3, "چهارم": 4, "پنجم": 5,
        "ششم": 6, "هفتم": 7, "هشتم": 8, "نهم": 9, "دهم": 10}
_NUM = {"یک": "1", "دو": "2", "سه": "3"}
_FLOORS: list[tuple[re.Pattern, Callable[[re.Match], str]]] = [  # first match wins; each match is masked
    (re.compile(r"منفی[\s\u200c]*(\d+|یک|دو|سه)"), lambda m: f"-{_NUM.get(m[1], m[1])}"),
    (re.compile(r"زیر[\s\u200c]*هم[\s\u200c]*کف|زیر[\s\u200c]*زمین"), lambda m: "-1"),
    (re.compile(r"نیم[\s\u200c]*طبقه"), lambda m: "M"),
    (re.compile(r"هم[\s\u200c]*کف"), lambda m: "0"),
    (re.compile(_T + r"(-)?(\d+)(?!\d)"), lambda m: ("-" if m[1] else "") + str(int(m[2]))),
    (re.compile(_T + "(" + "|".join(_ORD) + r")(?![^\W\d_])"), lambda m: str(_ORD[m[1]])),
]
_UNIT = re.compile(r"(?:واحد|پلاک)[\s\u200c:]*(?:شماره[\s\u200c]*)?([A-Za-z]*\d[A-Za-z0-9]*)")
_HEDGE = re.compile(r"احتمال")
SURE = 0.8


@dataclass
class Violation:
    kind: str  # "id" | "price" | "stock" | "floor" | "unit" | "hedge" | "format"
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
            out += [b.question, *(o for o in b.options if not _BUDGET_BAND.search(o))]
    return out


# An ask option that is a budget range («تا ۵۰۰ هزار», «۲ تا ۵ میلیون», «بالای ۵ میلیون») is a choice
# for the shopper, not a price claim; a lone amount («۷۹۹ هزار تومان») is still checked.
_BUDGET_BAND = re.compile(r"(^\s*(تا|زیر|بالای|کمتر از|بیشتر از|حداکثر|حداقل)\s)|(\S\s+تا\s+\S)")


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


def floors(t: str) -> list[str]:
    t, out = normalize(t), []
    for rx, value in _FLOORS:
        out += [value(m) for m in rx.finditer(t)]
        t = rx.sub(lambda m: " " * len(m[0]), t)
    return out


def units(t: str) -> list[str]:
    return [u.upper() for u in _UNIT.findall(normalize(t))]


def _places(data: Any) -> list[dict]:
    """Shop rows with a location (search_shops, locate_shop, plan_trip, price_check's cheaper_nearby)."""
    if isinstance(data, list):
        return [p for x in data for p in _places(x)]
    if not isinstance(data, dict):
        return []
    return [data] * ("floor" in data) + [p for v in data.values() for p in _places(v)]


def _strings(data: Any) -> list[str]:
    if isinstance(data, str):
        return [data]
    items = data.values() if isinstance(data, dict) else data if isinstance(data, list) else []
    return [s for x in items for s in _strings(x)]


def _locations(answer: Answer, results: list[ToolResult]) -> list[Violation]:
    """Each «طبقه N» / «واحد N» in the answer's text must match a shop in the results; when the shops it can
    mean (the cited ones, else all with that value) were parsed with confidence < 0.8, its clause hedges."""
    places = [p for r in results for p in _places(r.data)]
    # a unit/plate may also come from address text (the building's «پلاک ۳۲»); that has no confidence
    plates = {u for r in results for s in _strings(r.data) for u in units(s)}
    cited = set(cited_ids(answer))
    said = normalize(" ".join(_texts(answer)))
    out: list[Violation] = []

    def check(kind: str, value: str, clause: str) -> None:
        same = [p for p in places if str(p.get(kind) or "").upper() == value]
        if not same and value not in (plates if kind == "unit" else ()):
            out.append(Violation(kind, value, f"{kind} {value} matches no shop in the tool results"))
            return
        named = [p for p in same if p.get("id", p.get("shop_id")) in cited
                 or len(normalize(p.get("name") or "")) > 2 and normalize(p["name"]) in said]
        sure = [p.get("parse_confidence", p.get("confidence", 1.0)) >= SURE for p in named or same]
        unsure = not all(sure) if named else bool(same) and not any(sure)
        if unsure and not _HEDGE.search(clause):
            out.append(Violation("hedge", value, f"the shop's address parse is unsure (confidence < {SURE}):"
                                 f" say «احتمالاً» before its {kind}"))
    for t in _texts(answer):
        for clause in _CLAUSE.split(_norm(t)):
            for f in floors(clause):
                check("floor", f, clause)
            for u in units(clause):
                check("unit", u, clause)
    return out


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
    out += _locations(answer, results)
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
