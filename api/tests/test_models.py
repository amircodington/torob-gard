import pytest
from django.contrib.gis.geos import Point

from catalog.models import Category, Offer, Product, Shop, ShopReport, Venue


@pytest.mark.django_db
def test_catalog_chain():
    venue = Venue.objects.create(name="Aladdin 2", name_norm="aladdin 2", kind="pasazh")
    shop = Shop.objects.create(
        id="shop_1", name="s", name_norm="s", address_raw="a", venue=venue,
        geom=Point(51.4071, 35.6950, srid=4326),
    )
    cat = Category.objects.create(name="mobile", name_norm="mobile")
    product = Product.objects.create(
        id="product_1", persian_title="p", title_norm="p", category=cat
    )
    Offer.objects.create(
        id="offer_1", product=product, shop=shop, seller_title="p", price_toman=1000,
        last_price_changed_at="2026-01-01T00:00:00Z",
    )
    assert venue.slug == "aladdin-2"
    assert Offer.objects.filter(shop__venue=venue).count() == 1
    ShopReport(kind="no_answer", shop=shop).save()
    assert ShopReport.objects.filter(kind="no_answer").count() == 1


@pytest.mark.django_db
def test_persian_venue_slug_from_name_norm():
    v = Venue.objects.create(name="پاساژ علاءالدین", name_norm="علاالدین", kind="pasazh")
    assert v.slug == "علاالدین"


@pytest.mark.django_db
def test_venue_slugs_unique_and_stable():
    a = Venue.objects.create(name="پاساژ 2", name_norm="الف.2", kind="pasazh")
    b = Venue.objects.create(name="پاساژ 2", name_norm="الف2", kind="pasazh")
    assert a.slug == "الف2" and b.slug.startswith("الف2-") and len(b.slug) == len("الف2-") + 6
    a.save()
    a.refresh_from_db()
    assert a.slug == "الف2"
