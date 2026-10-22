import pytest
from django.contrib.gis.geos import Point

from catalog.models import Category, Product, Shop, ShopReport


@pytest.fixture
def pair(db):
    shop = Shop.objects.create(
        id="s1", name="shop", name_norm="shop", address_raw="a", geom=Point(51.4, 35.7, srid=4326)
    )
    cat = Category.objects.create(name="c", name_norm="c")
    p = Product.objects.create(id="p1", persian_title="گوشی", title_norm="p", category=cat)
    return p, shop


def post(client, url, body):
    return client.post(url, body, content_type="application/json")


def test_create_get_patch(client, pair):
    r = post(client, "/api/trips", {"product_id": "p1", "chosen_shop_id": "s1"})
    assert r.status_code == 200
    tid = r.json()["id"]
    j = client.get(f"/api/trips/{tid}").json()
    assert j["chosen_shop_id"] == "s1"
    assert j["product"]["title"] == "گوشی"
    assert j["shop"]["id"] == "s1"
    for f in ("a", "b"):
        r = client.patch(f"/api/trips/{tid}", {"failures": [f]}, content_type="application/json")
    assert r.json()["failures"] == ["a", "b"]


def test_unknown_trip_404(client, db):
    assert client.get("/api/trips/00000000-0000-0000-0000-000000000000").status_code == 404
    assert client.get("/api/trips/not-a-uuid").status_code == 404


def test_report_invalid_kind_422(client, pair):
    assert post(client, "/api/reports", {"shop_id": "s1", "kind": "bogus"}).status_code == 422


def test_report_unknown_shop_404(client, pair):
    assert post(client, "/api/reports", {"shop_id": "zz", "kind": "open"}).status_code == 404


def test_report_creates_row(client, pair):
    r = post(client, "/api/reports", {"shop_id": "s1", "product_id": "p1", "kind": "had_item"})
    assert r.status_code == 200
    assert ShopReport.objects.get(id=r.json()["id"]).kind == "had_item"


def test_report_rate_limit(client, pair):
    body = {"shop_id": "s1", "kind": "open"}
    codes = [post(client, "/api/reports", body).status_code for _ in range(21)]
    assert codes[:20] == [200] * 20
    assert codes[20] == 429
