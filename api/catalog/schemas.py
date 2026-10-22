from datetime import datetime
from typing import Literal

from ninja import Schema


class StatsOut(Schema):
    shops: int
    venues: int
    products: int
    offers: int
    newest_price_at: datetime | None


class VenueOut(Schema):
    slug: str
    name: str
    shop_count: int
    lat: float | None
    lng: float | None


class DeskIn(Schema):
    category: str
    budget_min: int = 0
    budget_max: int | None = None
    priority: str | None = None


class SpecOut(Schema):
    label: str
    value: str


class TierOut(Schema):
    tier: str
    product_id: str
    title: str
    brand: str | None
    image_url: str | None
    specs_top3: list[SpecOut]
    price: int
    offer_count: int
    newest_price_at: datetime | None  # the min-price offer's date, not the newest offer's
    bullets: list[str]
    tradeoffs: list[str]
    fit_note: str
    fits_priority: bool


class DeskOut(Schema):
    tiers: list[TierOut]


class ProductOut(Schema):
    id: str
    title: str
    brand: str | None
    image_urls: list[str]
    specs: list[dict]
    min_price: int | None
    median_price: int | None
    max_price: int | None
    offer_count: int


class ShopOut(Schema):
    id: str
    name: str
    venue_name: str | None
    venue_slug: str | None
    floor: str | None
    unit: str | None
    location_hint: str | None
    parse_confidence: float
    address: str
    location_label: str
    lat: float | None
    lng: float | None
    distance_m: int | None
    weekly_hours: dict
    installment: bool | None
    contact: str | None


class OfferRowOut(Schema):
    offer_id: str
    price: int
    last_price_changed_at: datetime
    stock: Literal["confirmed", "unknown"]
    shop: ShopOut


class OfferByIdOut(OfferRowOut):
    product_id: str
