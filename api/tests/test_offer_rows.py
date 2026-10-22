from datetime import timedelta

import pytest
from django.contrib.gis.geos import Point
from django.utils import timezone

from catalog.models import Category, Offer, Product, Shop, ShopReport
from catalog.rows import installment_of

T = "2026-01-01T00:00:00Z"


@pytest.fixture
def world(db):
    cat = Category.objects.create(name="c", name_norm="c")
    p = Product.objects.create(id="p1", persian_title="گوشی", title_norm="p", category=cat)
    # Aladdin 2 (35.6950, 51.4071); s3 has no floor/unit
    shops = [
        Shop.objects.create(id=f"s{i}", name=f"s{i}", name_norm=f"s{i}", address_raw="a",
                            geom=Point(51.4071, 35.6950, srid=4326),
                            floor="1" if i < 3 else None, unit="5" if i < 3 else None,
                            payment_options=["snapp"] if i == 1 else [])
        for i in (1, 2, 3)
    ]
    for s, price, out in zip(shops, (100, 200, 50), (False, False, True), strict=True):
        Offer.objects.create(id=f"o{s.id}", product=p, shop=s, seller_title="x",
                             price_toman=price, is_outlier=out, last_price_changed_at=T)
    return p, shops


def rows(client, **q):
    return client.get("/api/products/p1/offers", q).json()


def test_outlier_dropped_and_ordered(client, world):
    r = rows(client)
    assert [x["shop"]["id"] for x in r] == ["s1", "s2"]
    assert r[0]["stock"] == "unknown" and r[0]["shop"]["distance_m"] is None
    assert r[0]["shop"]["installment"] is True and r[1]["shop"]["installment"] is None


def test_reports(client, world):
    p, (s1, s2, _) = world
    ShopReport.objects.create(shop=s1, product=p, kind="had_item")
    ShopReport.objects.create(shop=s2, product=p, kind="no_item")
    r = rows(client)
    assert [(x["shop"]["id"], x["stock"]) for x in r] == [("s1", "confirmed")]
    old = ShopReport.objects.create(shop=s1, product=p, kind="no_item")
    ShopReport.objects.filter(id=old.id).update(created_at=timezone.now() - timedelta(hours=60))
    assert rows(client)[0]["stock"] == "confirmed"  # 60 h old report ignored


def test_distance(client, world):
    d = rows(client, lat=35.6907, lng=51.4130)[0]["shop"]["distance_m"]
    assert 600 <= d <= 800


def test_null_floor_and_confidence(client, world):
    p, (s1, *_) = world
    s1.floor = s1.unit = None
    s1.save()
    sh = rows(client)[0]["shop"]
    assert sh["floor"] is None and sh["unit"] is None
    assert isinstance(sh["parse_confidence"], float)


def test_product_and_404(client, world):
    assert client.get("/api/products/p1").json()["title"] == "گوشی"
    assert client.get("/api/products/nope").status_code == 404
    assert client.get("/api/products/nope/offers").status_code == 404


def test_installment_of():
    assert installment_of([]) is None and installment_of(None) is None
    assert installment_of(["snapp"]) is True


def test_offers_by_id_keep_order_and_skip_outliers(client, world):
    r = client.get("/api/offers", {"ids": "os2,os3,os1,nope"}).json()  # os3: outlier; 3 at most
    assert [(x["offer_id"], x["product_id"], x["shop"]["id"], x["stock"]) for x in r] == [
        ("os2", "p1", "s2", "unknown"), ("os1", "p1", "s1", "unknown")]
