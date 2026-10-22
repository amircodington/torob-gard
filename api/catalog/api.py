from django.db.models import Max
from django.shortcuts import get_object_or_404
from ninja import Router

from . import desk_config
from .desk import explain_tiers, pick_tiers
from .models import Offer, Product, Shop, Venue
from .rows import offer_rows, product_out, shop_out
from .schemas import DeskIn, DeskOut, OfferByIdOut, OfferRowOut, ProductOut, StatsOut, VenueOut

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
            # Age of the shown price: cheapest non-outlier offer, newest on a tie (PLAN §2 rule 1).
            "newest_price_at": Offer.objects.filter(product=t.product, is_outlier=False)
            .order_by("price_toman", "-last_price_changed_at")
            .values_list("last_price_changed_at", flat=True).first(),
            **ex[t.tier],
        }
        for t in tiers
    ]}


@router.get("/products/{product_id}", response=ProductOut)
def product(request, product_id: str):
    return product_out(get_object_or_404(Product, id=product_id))


@router.get("/products/{product_id}/offers", response=list[OfferRowOut])
def product_offers(request, product_id: str, lat: float | None = None, lng: float | None = None):
    get_object_or_404(Product, id=product_id)
    return offer_rows(product_id, lat, lng)


@router.get("/offers", response=list[OfferByIdOut])
def offers_by_id(request, ids: str):
    """The agent's shop_cards (offer ids) as radar rows, in the asked order; at most 3."""
    wanted = ids.split(",")[:3]
    qs = Offer.objects.filter(id__in=wanted, is_outlier=False).select_related("shop__venue")
    found = {o.id: o for o in qs}
    # ponytail: stock is always "unknown" (no report lookup); the radar row shows 48 h reports.
    return [{"offer_id": o.id, "product_id": o.product_id, "price": o.price_toman,
             "last_price_changed_at": o.last_price_changed_at, "stock": "unknown",
             "shop": shop_out(o.shop)}
            for i in wanted if (o := found.get(i))]
