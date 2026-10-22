import re
from dataclasses import dataclass
from typing import Any

from .contract import Answer, PriceCheckBlock, RouteBlock, ShopCardsBlock
from .persian import to_ascii_digits
from .tools.registry import ToolResult

_ID = re.compile(r"\b(?:shop|product|offer)_[A-Za-z0-9_]+")
# ponytail: only numbers tagged تومان / هزار تومان / میلیون count as prices; bare numbers (floors, counts)
# are not checked. Upgrade if the model starts quoting prices without a unit.
_PRICE = re.compile(r"(\d+(?:\.\d+)?)\s*(هزار\s*تومان|میلیون(?:\s*تومان)?|تومان)")
_SCALE = {"هزار": 1_000, "میلیون": 1_000_000}


@dataclass
class Violation:
    kind: str  # "id" | "price"
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
            out += [s["shop_id"] for s in b.stops]
    return out


def _prices(say: str) -> list[int]:
    t = to_ascii_digits(say).replace("٫", ".")
    t = re.sub(r"(?<=\d)[,٬ ](?=\d{3}(?!\d))", "", t)  # thousands separators
    return [round(float(n) * _SCALE.get(u.split()[0], 1)) for n, u in _PRICE.findall(t)]


def ground(answer: Answer, results: list[ToolResult]) -> list[Violation]:
    known = set().union(*(r.ids for r in results)) if results else set()
    values = set().union(*(_numbers(r.data) for r in results)) if results else set()
    out: list[Violation] = []
    for i in dict.fromkeys([*_block_ids(answer), *_ID.findall(answer.say)]):
        if i not in known:
            out.append(Violation("id", i, f"id {i} was not returned by any tool"))
    for p in dict.fromkeys(_prices(answer.say)):
        if p not in values:
            out.append(Violation("price", str(p), f"price {p} toman appears in no tool result"))
    return out
