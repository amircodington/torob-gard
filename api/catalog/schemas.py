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
