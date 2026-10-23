import pytest
from django.contrib.gis.geos import Point

from catalog.models import Category, Product, Shop, ShopReport, Venue
from people import otp


@pytest.fixture(autouse=True)
def _fresh_report_limit():
    r = otp.redis()
    for k in r.scan_iter("rl:report:*"):
        r.delete(k)


@pytest.fixture
def pair(db):
    v = Venue.objects.create(name="پاساژ", name_norm="pasazh", kind="pasazh")
    shop = Shop.objects.create(
        id="s1", name="shop", name_norm="shop", address_raw="addr", venue=v,
        contacts=[{"channel": "phone", "display_number": "۰۲۱۱۲۳۴۵۶۷۸"}],
        geom=Point(51.4, 35.7, srid=4326),
    )
    cat = Category.objects.create(name="c", name_norm="c")
    p = Product.objects.create(id="p1", persian_title="گوشی", title_norm="p", category=cat,
        brand_name="سامسونگ", image_urls=["http://i/1.jpg"],
    )
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
    assert (j["product"]["brand"], j["product"]["image_url"]) == ("سامسونگ", "http://i/1.jpg")
    sh = j["shop"]
    assert (sh["venue_name"], sh["venue_slug"], sh["address"]) == ("پاساژ", "pasazh", "addr")
    assert sh["contact"] == "۰۲۱۱۲۳۴۵۶۷۸"
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


def test_report_limit_holds_for_a_cookieless_client(client, pair):
    """A script that drops cookies gets a fresh session each time; the client IP still counts."""
    body, codes = {"shop_id": "s1", "kind": "no_item"}, []
    for _ in range(21):
        client.cookies.clear()
        codes.append(client.post("/api/reports", body, content_type="application/json",
                                 HTTP_X_FORWARDED_FOR="5.6.7.8").status_code)
    assert codes[:20] == [200] * 20 and codes[20] == 429
    other = client.post("/api/reports", body, content_type="application/json",
                        HTTP_X_FORWARDED_FOR="9.9.9.9")
    assert other.status_code == 200


def test_device_anchor_is_rounded_landmark_kept(client, pair):
    """R-P9, no location history: device positions kept to ~100 m, landmarks exact."""
    dev = post(client, "/api/trips", {"product_id": "p1",
               "anchor": {"lat": 35.6912345, "lng": 51.4123456, "acc": 5}}).json()
    assert dev["anchor"] == {"lat": 35.691, "lng": 51.412}
    saadi = {"lat": 35.6907, "lng": 51.413}
    kept = post(client, "/api/trips", {"product_id": "p1", "anchor": saadi}).json()
    assert kept["anchor"] == saadi
    assert post(client, "/api/trips", {"product_id": "p1", "anchor": {}}).json()["anchor"] == {}
