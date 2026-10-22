import json
from dataclasses import dataclass, field
from typing import Any

from pydantic import BaseModel, Field, ValidationError
from sqlalchemy.ext.asyncio import AsyncConnection

from ..llm import ToolCall
from .locate import locate_shop
from .memory import State, remember
from .price import price_check
from .search import LatLng, search_products, search_shops
from .trip import plan_trip


class SearchProductsArgs(BaseModel):
    q: str
    category: str | None = None
    budget_max: int | None = None
    near: LatLng | None = None
    limit: int = 10


class SearchShopsArgs(BaseModel):
    product_ids: list[str] | None = None
    category: str | None = None
    venue_slug: str | None = None
    near: LatLng | None = None
    limit: int = 10


class PriceCheckArgs(BaseModel):
    product_id: str
    quoted_price: int | None = Field(None, gt=0, description="toman the shopper was quoted; > 0")
    venue_slug: str | None = None


class LocateShopArgs(BaseModel):
    shop_id: str


class PlanTripArgs(BaseModel):
    shop_ids: list[str]


class RememberArgs(BaseModel):  # user_id is the session's, never the model's: run_tool injects it
    product_id: str | None = None
    shop_id: str | None = None
    state: State
    price_seen: int | None = None
    note: str | None = None


# name -> (args model, description, fn(args dict, db))
_TOOLS: dict[str, tuple[type[BaseModel], str, Any]] = {
    "search_products": (SearchProductsArgs, "Find products by words (hybrid keyword + meaning search).",
                        lambda a, db, u: search_products(**a, db=db)),
    "search_shops": (SearchShopsArgs, "Find shops holding products, or matching a category or venue.",
                     lambda a, db, u: search_shops(a["product_ids"], a["category"], a["venue_slug"],
                                                   a["near"], a["limit"], db=db)),
    "price_check": (PriceCheckArgs, "Judge a quoted price against the market and list cheaper shops.",
                    lambda a, db, u: price_check(a["product_id"], a["quoted_price"], a["venue_slug"], db=db)),
    "locate_shop": (LocateShopArgs, "Floor, unit and hint of a shop inside its venue.",
                    lambda a, db, u: locate_shop(a["shop_id"], db=db)),
    "plan_trip": (PlanTripArgs, "Order shops into a walk: venue by venue, floor ascending.",
                  lambda a, db, u: plan_trip(a["shop_ids"], db=db)),
    "remember": (RememberArgs, "Remember that the user saw/liked/tried/bought/skipped a product or shop.",
                 lambda a, db, u: remember(u, **a, db=db)),
}

TOOLS: list[dict] = [
    {"type": "function", "function": {"name": n, "description": d, "parameters": m.model_json_schema()}}
    for n, (m, d, _) in _TOOLS.items()
]

_ID_KEYS = {"id", "shop_id", "product_id", "offer_id"}
# free text that came from sellers/shops: the model must read it as data, not instructions
_TEXT_KEYS = {"name", "venue_name", "title", "brand", "hint", "location_hint", "address", "location_label",
              "contact", "seller_title", "note", "floor", "unit"}


@dataclass
class ToolResult:
    name: str
    data: Any
    ids: set[str] = field(default_factory=set)
    args: dict = field(default_factory=dict)  # the validated call args (the grounder reads quoted_price)


def _ids(data: Any) -> set[str]:
    if isinstance(data, list):
        return set().union(*map(_ids, data)) if data else set()
    if not isinstance(data, dict):
        return set()
    out: set[str] = set()
    for k, v in data.items():
        if k in _ID_KEYS and isinstance(v, str):
            out.add(v)
        elif k == "offer_ids":
            out.update(v)
        else:
            out |= _ids(v)
    return out


def serialise(result: ToolResult) -> str:
    """The tool message content for the LLM: shop/seller text wrapped in <data>…</data>."""
    def wrap(x: Any) -> Any:
        if isinstance(x, list):
            return [wrap(i) for i in x]
        if isinstance(x, dict):
            return {k: f"<data>{v}</data>" if k in _TEXT_KEYS and isinstance(v, str) else wrap(v)
                    for k, v in x.items()}
        return x
    return json.dumps(wrap(result.data), ensure_ascii=False, default=str)


async def run_tool(
    call: ToolCall, *, user_id: str | None = None, db: AsyncConnection | None = None,
) -> ToolResult:
    """Validate the model's args and run the tool. Bad calls come back as {"error": …} for the model."""
    if call.name not in _TOOLS:
        return ToolResult(call.name, {"error": f"unknown tool {call.name}"})
    model, _, fn = _TOOLS[call.name]
    try:
        args = model(**call.args).model_dump()
        if call.name == "remember" and not user_id:
            raise ValueError("no user to remember for")
        data = await fn(args, db, user_id)
    except (ValidationError, ValueError) as e:
        return ToolResult(call.name, {"error": str(e)})
    return ToolResult(call.name, data, _ids(data), args)
