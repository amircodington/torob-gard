from typing import Annotated, Literal

from pydantic import BaseModel, Field

from .tools.trip import Stop


class AskBlock(BaseModel):
    type: Literal["ask"] = "ask"
    question: str
    options: list[str] = []


class DeskBlock(BaseModel):
    type: Literal["desk"] = "desk"
    category: str | None = None
    budget_min: int | None = None
    budget_max: int | None = None
    priority: str | None = None


class ShopCardsBlock(BaseModel):
    type: Literal["shop_cards"] = "shop_cards"
    shop_ids: list[str]
    offer_ids: list[str] = []
    why: dict[str, str] = {}  # shop_id -> reason


class PriceCheckBlock(BaseModel):
    type: Literal["price_check"] = "price_check"
    product_id: str
    min: int | None = None
    median: int | None = None
    max: int | None = None
    offer_ids: list[str] = []


class RouteBlock(BaseModel):
    type: Literal["route"] = "route"
    venue_slug: str | None = None
    stops: list[Stop]


Block = Annotated[
    AskBlock | DeskBlock | ShopCardsBlock | PriceCheckBlock | RouteBlock, Field(discriminator="type")
]


class Answer(BaseModel):
    say: str
    blocks: list[Block] = []
    profile_updates: dict = {}
