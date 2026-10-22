from datetime import datetime

import pytest
from django.contrib.gis.geos import Point

from catalog.models import Category, Offer, Product, Shop, Venue


@pytest.mark.django_db
def test_venues_limit_and_order(client):
    Venue.objects.create(name="small", name_norm="small", kind="pasazh", shop_count=3)
    Venue.objects.create(
        name="big", name_norm="big", kind="pasazh", shop_count=10, geom=Point(51.4, 35.7, srid=4326)
    )
    r = client.get("/api/venues?limit=1")
    assert r.status_code == 200
    assert [v["name"] for v in r.json()] == ["big"]
    v = r.json()[0]
    assert (v["lng"], v["lat"]) == (51.4, 35.7)
    assert client.get("/api/venues").json()[1]["lat"] is None


@pytest.mark.django_db
def test_stats_counts(client):
    shop = Shop.objects.create(
        id="s1", name="s", name_norm="s", address_raw="a", geom=Point(51.4, 35.7, srid=4326)
    )
    cat = Category.objects.create(name="c", name_norm="c")
    p = Product.objects.create(id="p1", persian_title="p", title_norm="p", category=cat)
    Offer.objects.create(
        id="o1", product=p, shop=shop, seller_title="p", price_toman=1,
        last_price_changed_at="2026-01-01T00:00:00Z",
    )
    j = client.get("/api/stats").json()
    assert (j["shops"], j["venues"], j["products"], j["offers"]) == (1, 0, 1, 1)
    want = datetime.fromisoformat("2026-01-01T00:00:00+00:00")
    assert datetime.fromisoformat(j["newest_price_at"]) == want
