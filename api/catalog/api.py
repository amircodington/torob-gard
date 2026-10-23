from django.db.models import Count, Max, OuterRef, Q, Subquery
from django.http import Http404
from django.shortcuts import get_object_or_404
from ninja import Router

from ingest.prices import category_quantiles
from torobgard.persian import to_fa_digits

from . import desk_config
from .desk import explain_tiers, pick_tiers
from .models import Category, Offer, Product, Shop, Venue, persian_slug
from .rows import offer_rows, product_out, shop_out
from .schemas import (
    CategoryOut,
    DeskIn,
    DeskOut,
    OfferByIdOut,
    OfferRowOut,
    ProductOut,
    ShopDetailOut,
    StatsOut,
    VenueDetailOut,
    VenueOut,
)

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
    return product_out(get_object_or_404(Product.objects.select_related("category"), id=product_id))


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


def _floor_key(f: str | None):
    if f is None:
        return (2, 0, "")
    try:
        return (0, int(f), "")
    except ValueError:
        return (1, 0, f)  # «M» (mezzanine) and other words after the numbered floors


def _floor_label(f: str | None) -> str:
    if f is None:
        return "طبقه نامشخص"
    if f == "0":
        return "همکف"
    return "طبقه " + to_fa_digits(f.replace("-", "منفی ", 1) if f.startswith("-") else f)


@router.get("/venues/{slug}", response=VenueDetailOut)
def venue(request, slug: str):
    v = get_object_or_404(Venue, slug=slug)
    shops = sorted(v.shops.select_related("venue"),
                   key=lambda s: (_floor_key(s.floor), s.unit or "", s.name))
    floors: dict[str | None, list] = {}
    for s in shops:
        floors.setdefault(s.floor, []).append(shop_out(s))
    cats = (Category.objects
            .filter(products__offers__shop__venue=v, products__offers__is_outlier=False)
            .annotate(n=Count("products", distinct=True)).order_by("-n", "name")[:8])
    return {
        "slug": v.slug, "name": v.name, "address": v.address, "verified_at": v.verified_at,
        "lat": v.geom.y if v.geom else None, "lng": v.geom.x if v.geom else None,
        "floors": [{"floor": f, "label": _floor_label(f), "shops": rows}
                   for f, rows in floors.items()],
        "top_categories": [{"name": c.name, "slug": persian_slug(c.name_norm), "count": c.n}
                           for c in cats],
    }


@router.get("/shops/{shop_id}", response=ShopDetailOut)
def shop(request, shop_id: str):
    s = get_object_or_404(Shop.objects.select_related("venue"), id=shop_id)
    offers = (s.offers.filter(is_outlier=False).select_related("product")
              .order_by("-product__offer_count", "-price_toman")[:20])
    return {
        **shop_out(s), "offer_count": s.offer_count,
        "offers": [{"product_id": o.product_id, "title": o.product.persian_title,
                    "image_url": (o.product.image_urls or [None])[0], "price": o.price_toman,
                    "last_price_changed_at": o.last_price_changed_at} for o in offers],
    }


def _category_by_slug(slug: str) -> Category:
    # ponytail: no slug column; ~3.4k names scanned per ISR-cached page. Add one if it profiles hot.
    for c in Category.objects.order_by("-product_count").only("id", "name", "name_norm"):
        if persian_slug(c.name_norm) == slug:
            return c
    raise Http404


@router.get("/categories/{slug}", response=CategoryOut)
def category(request, slug: str):
    c = _category_by_slug(slug)
    fair = Q(shops__offers__is_outlier=False, shops__offers__product__category=c)
    venues = (Venue.objects.annotate(n=Count("shops", filter=fair, distinct=True))
              .filter(n__gt=0).order_by("-n", "name")[:6])
    cheapest = (Offer.objects.filter(product=OuterRef("pk"), is_outlier=False)
                .order_by("price_toman", "-last_price_changed_at")
                .values("last_price_changed_at")[:1])
    products = (Product.objects.filter(category=c, min_price__isnull=False)
                .annotate(price_at=Subquery(cheapest)).order_by("-offer_count", "min_price")[:12])
    return {
        "slug": slug, "name": c.name, "price_quantiles": category_quantiles(c.name),
        "top_venues": [{"name": v.name, "slug": v.slug, "count": v.n} for v in venues],
        "popular_products": [{"id": p.id, "title": p.persian_title, "brand": p.brand_name,
                              "image_url": (p.image_urls or [None])[0], "min_price": p.min_price,
                              "offer_count": p.offer_count, "price_at": p.price_at}
                             for p in products],
    }
