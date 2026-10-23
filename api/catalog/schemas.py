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
    category_name: str
    category_slug: str
    seller_notes: int = 0  # the product page only: offers whose seller wrote a note or a warranty


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


class FloorOut(Schema):
    floor: str | None
    label: str
    shops: list[ShopOut]


class NamedCountOut(Schema):
    name: str
    slug: str
    count: int


class VenueDetailOut(Schema):
    slug: str
    name: str
    address: str
    lat: float | None
    lng: float | None
    verified_at: datetime | None
    floors: list[FloorOut]
    top_categories: list[NamedCountOut]


class ShopOfferOut(Schema):
    product_id: str
    title: str
    image_url: str | None
    price: int
    last_price_changed_at: datetime


class ShopDetailOut(ShopOut):
    offer_count: int
    offers: list[ShopOfferOut]


class ProductCardOut(Schema):
    id: str
    title: str
    brand: str | None
    image_url: str | None
    min_price: int
    offer_count: int
    price_at: datetime | None  # the cheapest offer's date (PLAN §2 rule 1)


class CategoryOut(Schema):
    slug: str
    name: str
    price_quantiles: dict[str, int]
    top_venues: list[NamedCountOut]
    popular_products: list[ProductCardOut]


class ShopHitOut(Schema):
    id: str
    name: str
    venue_name: str | None
    venue_slug: str | None
    floor: str | None
    unit: str | None
    parse_confidence: float


class SearchOut(Schema):
    products: list[ProductCardOut]
    shops: list[ShopHitOut]


class SitemapOut(Schema):
    venues: list[str]
    categories: list[str]
    shops: list[str]
    product_pages: int
