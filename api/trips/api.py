import time
from datetime import datetime
from typing import Literal
from uuid import UUID

from django.shortcuts import get_object_or_404
from ninja import Router, Schema
from ninja.errors import HttpError

from catalog.models import Product, Shop, ShopReport
from catalog.rows import shop_out
from catalog.schemas import ShopOut
from people.api import current_user

from .models import Trip

router = Router()


# ponytail: trip keeps its flat image_url product shape (client contract)
class TripProductOut(Schema):
    id: str
    title: str
    brand: str | None = None
    image_url: str | None = None
    min_price: int | None = None
    median_price: int | None = None
    max_price: int | None = None
    offer_count: int = 0


class TripOut(Schema):
    id: UUID
    created_at: datetime
    product_id: str
    chosen_shop_id: str | None
    req: dict
    failures: list
    anchor: dict
    product: TripProductOut
    shop: ShopOut | None


class TripIn(Schema):
    product_id: str
    chosen_shop_id: str | None = None
    req: dict = {}
    failures: list = []
    anchor: dict = {}


class TripPatch(Schema):
    chosen_shop_id: str | None = None
    failures: list | None = None


class ReportIn(Schema):
    shop_id: str
    product_id: str | None = None
    kind: Literal["no_answer", "no_item", "closed", "had_item", "open"]


def _out(t: Trip) -> dict:
    p, s = t.product, t.chosen_shop
    prod = {
        "id": p.id, "title": p.persian_title, "brand": p.brand_name,
        "image_url": p.image_urls[0] if p.image_urls else None,
        "min_price": p.min_price, "median_price": p.median_price,
        "max_price": p.max_price, "offer_count": p.offer_count,
    }
    shop = shop_out(s) if s else None
    return {
        "id": t.id, "created_at": t.created_at, "product_id": t.product_id,
        "chosen_shop_id": t.chosen_shop_id, "req": t.req, "failures": t.failures,
        "anchor": t.anchor, "product": prod, "shop": shop,
    }


# ponytail: mirrors LANDMARKS in web/src/lib/geo.ts; keep the two lists in step
LANDMARKS = {(35.6907, 51.413), (35.692, 51.431), (35.6935, 51.418), (35.695, 51.4071)}


def _anchor(a: dict) -> dict:
    """R-P9, no location history: a landmark stays exact, any other point is kept to ~100 m."""
    lat, lng = a.get("lat"), a.get("lng")
    if not all(isinstance(x, int | float) for x in (lat, lng)):
        return {}
    if (lat, lng) in LANDMARKS:
        return {"lat": lat, "lng": lng}
    return {"lat": round(lat, 3), "lng": round(lng, 3)}


def _get(trip_id: str) -> Trip:
    try:
        UUID(trip_id)
    except ValueError:
        raise HttpError(404, "not found") from None
    qs = Trip.objects.select_related("product", "chosen_shop__venue")
    return get_object_or_404(qs, id=trip_id)


@router.post("/reports")
def create_report(request, body: ReportIn) -> dict:
    # ponytail: per-session counter, not per-IP; Redis-backed limiter in P3
    now = time.time()
    times = [t for t in request.session.get("report_times", []) if now - t < 600]
    if len(times) >= 20:
        raise HttpError(429, "too many reports")
    shop = get_object_or_404(Shop, id=body.shop_id)
    product = Product.objects.filter(id=body.product_id).first() if body.product_id else None
    u = current_user(request)
    r = ShopReport.objects.create(shop=shop, product=product, kind=body.kind, user_id=u and u.id)
    request.session["report_times"] = times + [now]
    return {"id": str(r.id)}


@router.post("/trips", response=TripOut)
def create_trip(request, body: TripIn):
    if not request.session.session_key:
        request.session.save()
    product = get_object_or_404(Product, id=body.product_id)
    shop = get_object_or_404(Shop, id=body.chosen_shop_id) if body.chosen_shop_id else None
    t = Trip.objects.create(
        product=product, chosen_shop=shop, req=body.req, failures=body.failures,
        anchor=_anchor(body.anchor), owner_key=request.session.session_key,
        user_id=(u := current_user(request)) and u.id,
    )
    return _out(t)


@router.get("/trips/{trip_id}", response=TripOut)
def get_trip(request, trip_id: str):
    return _out(_get(trip_id))


@router.patch("/trips/{trip_id}", response=TripOut)
def patch_trip(request, trip_id: str, body: TripPatch):
    # ponytail: trips are editable by anyone with the link (privacy page says so); owner check later
    t = _get(trip_id)
    if body.chosen_shop_id:
        t.chosen_shop = get_object_or_404(Shop, id=body.chosen_shop_id)
    if body.failures:
        t.failures = t.failures + body.failures
    t.save()
    return _out(t)
