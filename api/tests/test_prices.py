from datetime import UTC, datetime

import pytest
from django.contrib.gis.geos import Point

from catalog.models import Category, Offer, Product, Shop
from ingest.prices import category_quantiles, price_stats


def mk(cat, pid, prices, *shops):
    p = Product.objects.create(id=pid, persian_title=pid, title_norm=pid, category=cat)
    for i, price in enumerate(prices):
        Offer.objects.create(id=f"{pid}-{i}", product=p, shop=shops[i % len(shops)],
                             seller_title="x",
                             price_toman=price, last_price_changed_at=datetime.now(UTC))
    return p


@pytest.mark.django_db
def test_price_stats_and_quantiles():
    cat = Category.objects.create(name="c", name_norm="c")
    empty = Category.objects.create(name="e", name_norm="e")
    shop = Shop.objects.create(id="s", name="s", name_norm="s", address_raw="", geom=Point(51, 35))
    shop2 = Shop.objects.create(id="s2", name="s2", name_norm="s2", address_raw="",
                                geom=Point(51, 35))
    mk(cat, "A", [600_000, 620_000, 200_000_000], shop, shop2)
    mk(cat, "B", [900_000], shop)
    mk(cat, "C", [1_000_000, 1_100_000], shop, shop2)
    mk(cat, "D", [600_000, 200_000_000], shop)
    price_stats()
    assert Offer.objects.get(id="A-2").is_outlier
    assert not Offer.objects.filter(product_id="B", is_outlier=True).exists()
    a, b = Product.objects.get(id="A"), Product.objects.get(id="B")
    assert (a.min_price, a.median_price, a.max_price, a.offer_count) == (
        600_000, 610_000, 620_000, 2)
    assert (b.min_price, b.median_price, b.max_price, b.offer_count) == (
        900_000, 900_000, 900_000, 1)
    d = Product.objects.get(id="D")
    assert Offer.objects.get(id="D-1").is_outlier and not Offer.objects.get(id="D-0").is_outlier
    assert (d.min_price, d.median_price, d.offer_count) == (600_000, 600_000, 1)
    assert Shop.objects.get(id="s").price_band is not None
    # A and C have offer_count >= 2: p50 = mean(600k, 1M)
    assert category_quantiles("c")["p50"] == 800_000
    assert category_quantiles("e") == {} and empty


@pytest.mark.django_db
def test_offer_count_counts_shops_not_offers():
    cat = Category.objects.create(name="c", name_norm="c")
    shop = Shop.objects.create(id="s", name="s", name_norm="s", address_raw="", geom=Point(51, 35))
    mk(cat, "P", [1_000_000, 1_050_000], shop)
    price_stats()
    assert Product.objects.get(id="P").offer_count == 1
