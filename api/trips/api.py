import time
from datetime import datetime
from typing import Literal
from uuid import UUID

from django.shortcuts import get_object_or_404
from ninja import Router, Schema
from ninja.errors import HttpError

from catalog.models import Product, Shop, ShopReport

from .models import Trip

router = Router()


# ponytail: Task 3 adds the shared ProductOut/ShopOut in catalog/schemas.py; switch to them then
class TripProductOut(Schema):
    id: str
    title: str
    brand: str | None = None
    image_url: str | None = None
    min_price: int | None = None
    median_price: int | None = None
    max_price: int | None = None
    offer_count: int = 0


class TripShopOut(Schema):
    id: str
    name: str
    venue_name: str | None = None
    venue_slug: str | None = None
    floor: str | None = None
    unit: str | None = None
    location_hint: str | None = None
    parse_confidence: float | None = None
    address: str | None = None
    location_label: str | None = None
    lat: float | None = None
    lng: float | None = None
    weekly_hours: dict | list | None = None
    contact: dict | str | None = None


class TripOut(Schema):
    id: UUID
    created_at: datetime
    product_id: str
    chosen_shop_id: str | None
    req: dict
    failures: list
    anchor: dict
    product: TripProductOut
    shop: TripShopOut | None


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


def _opt(obj, name):
    return getattr(obj, name, None)


def _out(t: Trip) -> dict:
    p, s = t.product, t.chosen_shop
    prod = {
        "id": p.id, "title": p.persian_title, "brand": _opt(p, "brand"),
        "image_url": _opt(p, "image_url"), "min_price": _opt(p, "min_price"),
        "median_price": _opt(p, "median_price"), "max_price": _opt(p, "max_price"),
        "offer_count": _opt(p, "offer_count") or 0,
    }
    shop = None
    if s:
        keys = ("name venue_name venue_slug floor unit location_hint parse_confidence "
                "address location_label weekly_hours contact").split()
        shop = {"id": s.id, **{k: _opt(s, k) for k in keys}}
        shop["lat"], shop["lng"] = (s.geom.y, s.geom.x) if s.geom else (None, None)
    return {
        "id": t.id, "created_at": t.created_at, "product_id": t.product_id,
        "chosen_shop_id": t.chosen_shop_id, "req": t.req, "failures": t.failures,
        "anchor": t.anchor, "product": prod, "shop": shop,
    }


def _get(trip_id: str) -> Trip:
    try:
        UUID(trip_id)
    except ValueError:
        raise HttpError(404, "not found") from None
    return get_object_or_404(Trip.objects.select_related("product", "chosen_shop"), id=trip_id)


@router.post("/reports")
def create_report(request, body: ReportIn) -> dict:
    # ponytail: per-session counter, not per-IP; Redis-backed limiter in P3
    now = time.time()
    times = [t for t in request.session.get("report_times", []) if now - t < 600]
    if len(times) >= 20:
        raise HttpError(429, "too many reports")
    shop = get_object_or_404(Shop, id=body.shop_id)
    product = Product.objects.filter(id=body.product_id).first() if body.product_id else None
    r = ShopReport.objects.create(shop=shop, product=product, kind=body.kind, user_id=None)
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
        anchor=body.anchor, owner_key=request.session.session_key,
    )
    return _out(t)


@router.get("/trips/{trip_id}", response=TripOut)
def get_trip(request, trip_id: str):
    return _out(_get(trip_id))


@router.patch("/trips/{trip_id}", response=TripOut)
def patch_trip(request, trip_id: str, body: TripPatch):
    # ponytail: no ownership check until /me in P3
    t = _get(trip_id)
    if body.chosen_shop_id:
        t.chosen_shop = get_object_or_404(Shop, id=body.chosen_shop_id)
    if body.failures:
        t.failures = t.failures + body.failures
    t.save()
    return _out(t)
