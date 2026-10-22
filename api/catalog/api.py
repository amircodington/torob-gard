from django.db.models import Max
from ninja import Router

from . import desk_config
from .desk import explain_tiers, pick_tiers
from .models import Offer, Product, Shop, Venue
from .schemas import DeskIn, DeskOut, StatsOut, VenueOut

router = Router(tags=["catalog"])


@router.get("/stats", response=StatsOut)
def stats(request):
    # ponytail: live counts, no caching; fine at ~6k shops.
    return {
        "shops": Shop.objects.count(),
        "venues": Venue.objects.count(),
        "products": Product.objects.count(),
        "offers": Offer.objects.count(),
        "newest_price_at": Offer.objects.aggregate(m=Max("last_price_changed_at"))["m"],
    }


@router.get("/venues", response=list[VenueOut])
def venues(request, limit: int = 12):
    # ponytail: no pagination, just a clamped top-N.
    limit = max(1, min(limit, 100))
    return [
        {
            "slug": v.slug, "name": v.name, "shop_count": v.shop_count,
            "lat": v.geom.y if v.geom else None, "lng": v.geom.x if v.geom else None,
        }
        for v in Venue.objects.order_by("-shop_count", "name")[:limit]
    ]


def _top3(category: str, specs: list[dict]) -> list[dict]:
    keys = desk_config.TOP_SPECS.get(category)
    by_key = {s.get("key"): s for s in reversed(specs)}
    picked = specs if keys is None else [by_key[k] for k in keys if k in by_key]
    return [{"label": s.get("key", ""), "value": str(s.get("value", ""))} for s in picked[:3]]


@router.post("/desk", response=DeskOut)
def desk(request, body: DeskIn):
    tiers = pick_tiers(body.category, body.budget_min, body.budget_max, body.priority)
    ex = explain_tiers(tiers, body.priority)
    # ponytail: one freshness query per tier (≤ 3).
    return {"tiers": [
        {
            "tier": t.tier, "product_id": t.product.id, "title": t.product.persian_title,
            "brand": t.product.brand_name,
            "image_url": t.product.image_urls[0] if t.product.image_urls else None,
            "specs_top3": _top3(body.category, t.product.specs),
            "price": t.price, "offer_count": t.offer_count,
            "newest_price_at": Offer.objects.filter(product=t.product, is_outlier=False)
            .aggregate(m=Max("last_price_changed_at"))["m"],
            **ex[t.tier],
        }
        for t in tiers
    ]}
