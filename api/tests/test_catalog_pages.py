from urllib.parse import quote

import pytest
from django.contrib.gis.geos import Point

from catalog.models import Category, Offer, Product, Shop, Venue, persian_slug
from ingest.venues import build_venues

T = "2026-01-01T00:00:00Z"


@pytest.fixture
def world(db):
    cat = Category.objects.create(name="گوشی موبایل", name_norm="گوشی موبایل")
    v = Venue.objects.create(name="پاساژ علاءالدین ۲", name_norm="علاالدین2", kind="pasazh",
                             geom=Point(51.4071, 35.6950, srid=4326))
    ps = [Product.objects.create(id=f"p{i}", persian_title=f"گوشی {i}", title_norm="g",
                                 category=cat, min_price=100 * i, median_price=150 * i,
                                 max_price=200 * i, offer_count=2)
          for i in (1, 2)]
    for i, floor in enumerate(["6", "-1", None, "0", "2"]):
        s = Shop.objects.create(id=f"s{i}", name=f"مغازه {i}", name_norm="m", address_raw="a",
                                venue=v, floor=floor, geom=Point(51.4071, 35.6950, srid=4326))
        for p in ps:
            Offer.objects.create(id=f"o{i}{p.id}", product=p, shop=s, seller_title="x",
                                 price_toman=p.min_price + i, last_price_changed_at=T)
    return v, cat


def test_persian_slug_is_deterministic_and_non_empty():
    assert persian_slug("سیم و کابل برق ساختمان") == "سیم-و-کابل-برق-ساختمان"
    assert persian_slug("علاالدین2") == "علاالدین2"
    assert persian_slug("!!!") == persian_slug("!!!") != ""


def test_venue_floors_ordered_unknown_last(client, world):
    v, _ = world
    r = client.get(f"/api/venues/{quote(v.slug)}")
    assert r.status_code == 200
    body = r.json()
    assert [f["floor"] for f in body["floors"]] == ["-1", "0", "2", "6", None]
    assert body["floors"][-1]["label"] == "طبقه نامشخص"
    assert body["floors"][1]["label"] == "همکف"
    assert body["floors"][0]["shops"][0]["id"] == "s1"
    assert body["top_categories"] == [{"name": "گوشی موبایل", "slug": "گوشی-موبایل", "count": 2}]


def test_unknown_ids_are_404(client, world):
    assert client.get("/api/venues/nope").status_code == 404
    assert client.get("/api/shops/missing").status_code == 404
    assert client.get("/api/categories/nope").status_code == 404
    assert client.get("/api/products/missing").status_code == 404


@pytest.mark.django_db
def test_persian_venue_slug_survives_reingest(client):
    Shop.objects.create(id="s1", name="x", name_norm="x", address_raw="پاساژ علاءالدین ۲، طبقه ۱",
                        geom=Point(51.4, 35.7))
    build_venues()
    slug = Venue.objects.get().slug
    assert slug and not slug.startswith("venue-") and slug.isascii() is False
    Venue.objects.all().delete()  # a fresh database
    build_venues()
    assert Venue.objects.get().slug == slug
    assert client.get(f"/api/venues/{quote(slug)}").status_code == 200


def test_shop_detail_lists_offers(client, world):
    r = client.get("/api/shops/s0").json()
    assert r["venue_slug"] == world[0].slug and r["floor"] == "6"
    # most-listed models first, then priciest
    assert [o["product_id"] for o in r["offers"]] == ["p2", "p1"]
    assert r["offers"][0]["last_price_changed_at"].startswith("2026-01-01")


def test_category_page(client, world):
    v, _ = world
    r = client.get(f"/api/categories/{quote('گوشی-موبایل')}")
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "گوشی موبایل" and body["slug"] == "گوشی-موبایل"
    assert set(body["price_quantiles"]) == {"p10", "p25", "p50", "p75", "p90"}
    assert body["top_venues"] == [{"slug": v.slug, "name": v.name, "count": 5}]
    assert [p["id"] for p in body["popular_products"]] == ["p1", "p2"]
    assert body["popular_products"][0]["price_at"].startswith("2026-01-01")


def test_product_names_its_category(client, world):
    r = client.get("/api/products/p1").json()
    assert (r["category_name"], r["category_slug"]) == ("گوشی موبایل", "گوشی-موبایل")
