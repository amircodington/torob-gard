from datetime import timedelta

from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.geos import Point
from django.utils import timezone

from .models import Offer, Product, Shop, ShopReport, persian_slug

STOCK_WINDOW = timedelta(hours=48)


def installment_of(payment_options) -> bool | None:
    # ponytail: any provider counts; per-provider list in P3
    return True if payment_options else None


def product_out(p: Product) -> dict:
    return {
        "id": p.id, "title": p.persian_title, "brand": p.brand_name,
        "image_urls": p.image_urls or [], "specs": p.specs or [],
        "min_price": p.min_price, "median_price": p.median_price,
        "max_price": p.max_price, "offer_count": p.offer_count,
        "category_name": p.category.name, "category_slug": persian_slug(p.category.name_norm),
    }


def shop_out(s: Shop, distance_m: int | None = None) -> dict:
    return {
        "id": s.id, "name": s.name, "floor": s.floor, "unit": s.unit,
        "location_hint": s.location_hint, "parse_confidence": s.parse_confidence,
        "location_label": s.location_label, "weekly_hours": s.weekly_hours,
        "venue_name": s.venue.name if s.venue else None,
        "venue_slug": s.venue.slug if s.venue else None,
        "address": s.address_raw, "distance_m": distance_m,
        "installment": installment_of(s.payment_options),
        "contact": next((c["display_number"] for c in s.contacts), None),
        "lat": s.geom.y if s.geom else None, "lng": s.geom.x if s.geom else None,
    }


def offer_rows(product_id: str, lat: float | None, lng: float | None) -> list[dict]:
    qs = Offer.objects.filter(product_id=product_id, is_outlier=False).select_related("shop__venue")
    here = lat is not None and lng is not None
    if here:
        qs = qs.annotate(dist=Distance("shop__geom", Point(lng, lat, srid=4326)))
    since = timezone.now() - STOCK_WINDOW
    latest: dict[str, str] = {}  # newest report per shop wins
    for shop_id, kind in ShopReport.objects.filter(
        product_id=product_id, kind__in=("had_item", "no_item"), created_at__gte=since
    ).order_by("created_at").values_list("shop_id", "kind"):
        latest[shop_id] = kind
    out, seen = [], set()
    for o in qs.order_by("price_toman"):
        if o.shop_id in seen or latest.get(o.shop_id) == "no_item":
            continue
        seen.add(o.shop_id)
        out.append({
            "offer_id": o.id, "price": o.price_toman,
            "last_price_changed_at": o.last_price_changed_at,
            "stock": "confirmed" if latest.get(o.shop_id) == "had_item" else "unknown",
            "shop": shop_out(o.shop, int(o.dist.m) if here else None),
        })
    return out
