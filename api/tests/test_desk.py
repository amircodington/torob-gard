import pytest
from django.contrib.gis.geos import Point

from catalog.desk import explain_tiers, pick_tiers, spec_number
from catalog.models import Category, Offer, Product, Shop

M = 1_000_000


@pytest.fixture
def phones(db):
    shop = Shop.objects.create(
        id="s1", name="s", name_norm="s", address_raw="a", geom=Point(51.4, 35.7, srid=4326)
    )
    cat = Category.objects.create(name="گوشی موبایل", name_norm="گوشی موبایل")
    # (id, price, offers, camera MP, battery mAh | None)
    rows = [
        ("p1", 9, 3, "۱۳ مگاپیکسل", "۵۰۰۰ میلی‌آمپر ساعت"),
        ("p2", 16, 4, "۴۸ مگاپیکسل", "۵۰۰۰ میلی‌آمپر ساعت"),
        ("p3", 19, 2, "۲۰۰ مگاپیکسل", None),
        ("p4", 22, 5, "۶۴ مگاپیکسل", "۶۰۰۰ میلی‌آمپر ساعت"),
        ("p5", 27, 2, "۱۰۸ مگاپیکسل", "۴۵۰۰ میلی‌آمپر ساعت"),
        ("p6", 38, 3, "۲۰۰ مگاپیکسل", "۵۵۰۰ میلی‌آمپر ساعت"),
        ("single", 17, 1, "۵۰ مگاپیکسل", "۵۰۰۰ میلی‌آمپر ساعت"),
        ("outlier", 30, 2, "۵۰ مگاپیکسل", "۵۰۰۰ میلی‌آمپر ساعت"),
    ]
    for pid, price, n, cam, bat in rows:
        specs = [{"key": "دوربین اصلی", "section": "دوربین", "value": cam}]
        if bat:
            specs.append({"key": "ظرفیت باتری", "section": "باتری", "value": bat})
        # price_stats ignores outliers: the outlier product's 8M offer is not its min_price
        p = Product.objects.create(
            id=pid, persian_title=pid, title_norm=pid, category=cat, specs=specs,
            min_price=price * M, offer_count=n,
        )
        for i in range(n):
            Offer.objects.create(
                id=f"{pid}-{i}", product=p, shop=shop, seller_title="s",
                price_toman=price * M + i, last_price_changed_at="2026-01-01T00:00:00Z",
            )
    Offer.objects.create(
        id="outlier-cheap", product_id="outlier", shop=shop, seller_title="s",
        price_toman=8 * M, is_outlier=True, last_price_changed_at="2026-01-01T00:00:00Z",
    )


def test_spec_number():
    bat = [{"key": "ظرفیت باتری", "value": "۵۰۰۰ میلی‌آمپر ساعت"}]
    assert spec_number(bat, ["ظرفیت باتری"]) == 5000.0
    assert spec_number([{"key": "وزن", "value": "1.35 کیلوگرم"}], ["وزن"]) == 1.35
    assert spec_number([], ["ظرفیت باتری"]) is None


def test_three_distinct_tiers(phones):
    t = pick_tiers("mobile", 15 * M, 25 * M, "camera")
    assert [x.tier for x in t] == ["budget", "balanced", "feature"]
    assert len({x.product.id for x in t}) == 3
    assert t[0].price == min(x.price for x in t if 15 * M <= x.price <= 25 * M)
    assert t[2].price <= 25 * M * 1.15


def test_excludes_single_offer_and_outliers(phones):
    ids = {x.product.id for x in pick_tiers("mobile", 0, None, "camera")}
    assert not ids & {"single", "outlier"}
    # the outlier product's real min is 30M; its 8M outlier offer must not make it the cheapest
    assert pick_tiers("mobile", 0, 9 * M, "camera")[0].product.id == "p1"
    # only the single-offer phone sits at 17M, so no budget/balanced tier there
    assert [x.tier for x in pick_tiers("mobile", 17 * M, 17 * M, None)] == ["feature"]


def test_fewer_than_three(phones):
    t = pick_tiers("mobile", 8 * M, 10 * M, "camera")
    assert [(x.tier, x.product.id) for x in t] == [("budget", "p1")]
    assert explain_tiers(t, "camera")["budget"]["bullets"]


def test_missing_spec_becomes_tradeoff(phones):
    ex = explain_tiers(pick_tiers("mobile", 0, None, "battery"), "battery")
    assert any("ثبت نشده" in s for e in ex.values() for s in e["tradeoffs"])

