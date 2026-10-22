from datetime import datetime

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
    newest_price_at: datetime | None
    bullets: list[str]
    tradeoffs: list[str]
    fit_note: str
    fits_priority: bool


class DeskOut(Schema):
    tiers: list[TierOut]
