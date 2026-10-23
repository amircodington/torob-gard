import pytest
from django.contrib.gis.geos import Point

from catalog.models import Category, Offer, Product, Shop, Venue

T = "2026-01-01T00:00:00Z"


@pytest.fixture
def world(db):
    cat = Category.objects.create(name="گوشی موبایل", name_norm="گوشی موبایل")
    v = Venue.objects.create(name="پاساژ علاءالدین", name_norm="علالدین2", kind="pasazh")
    other = Venue.objects.create(name="پاساژ دیگر", name_norm="دیگر", kind="pasazh")
    pt = Point(51.4, 35.7, srid=4326)
    shops = [Shop.objects.create(id=i, name=n, name_norm=n, address_raw="a", venue=ven, geom=pt)
             for i, n, ven in [("s1", "موبایل نوین", v), ("s2", "مغازه بیرون", other)]]
    for pid, title, n in [("p1", "گوشی اپل آیفون 13 128 گیگ", 2), ("p2", "گوشی سامسونگ گلکسی", 2),
                          ("p3", "کابل آیفون", 1)]:
        p = Product.objects.create(id=pid, persian_title=title, title_norm=title, category=cat,
                                   min_price=1000, offer_count=n)
        for i in range(n):
            Offer.objects.create(id=f"o{pid}{i}", product=p, shop=shops[i % 2], seller_title="x",
                                 price_toman=1000 + i, last_price_changed_at=T)
    return v


def test_shops_found_by_venue_name(client, world):
    for q in ("علاالدین", "علاءالدین", "پاساژ علاءالدین ۲"):
        assert [s["id"] for s in client.get("/api/search", {"q": q}).json()["shops"]] == ["s1"]


def test_alef_madda_and_digits_give_same_first_product(client, world):
    a = client.get("/api/search", {"q": "آیفون ۱۳"}).json()["products"]
    b = client.get("/api/search", {"q": "ایفون 13"}).json()["products"]
    assert a and a[0]["id"] == b[0]["id"] == "p1"


def test_empty_and_junk_queries(client, world):
    assert client.get("/api/search", {"q": "  "}).json() == {"products": [], "shops": []}
    assert client.get("/api/search", {"q": "'&|!:("}).json() == {"products": [], "shops": []}


def test_sitemap_lists(client, world):
    s = client.get("/api/sitemap").json()
    assert s["shops"] == ["s1", "s2"] and "علالدین2" in s["venues"] and s["product_pages"] == 1
    # ≥ 2 offers only
    assert client.get("/api/sitemap/products", {"page": 0}).json() == ["p1", "p2"]
    assert client.get("/api/sitemap/products", {"page": 1}).json() == []
