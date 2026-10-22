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
    assert spec_number([{"key": "وزن", "value": "۱٫۳۵ کیلوگرم"}], ["وزن"]) == 1.35
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



@pytest.fixture
def laptops(db):
    cat = Category.objects.create(name="لپ تاپ و نوت بوک", name_norm="لپ تاپ و نوت بوک")
    for pid, price, w in [("heavy", 20, "۲ کیلوگرم"), ("kg", 30, "1.23 کیلوگرم"),
                          ("grams", 35, "۶۰۰ گرم")]:
        Product.objects.create(
            id=pid, persian_title=pid, title_norm=pid, category=cat, min_price=price * M,
            offer_count=2, specs=[{"key": "وزن", "section": "", "value": w}],
        )


def test_weight_in_grams(laptops):
    t = pick_tiers("laptop", 0, None, "weight")
    assert [x.product.id for x in t][:2] == ["heavy", "grams"]


def test_balanced_copy_is_honest(phones):
    # band 19–25M: the budget pick (p3, 200MP) has the best camera, so balanced must not claim it
    ex = explain_tiers(pick_tiers("mobile", 19 * M, 25 * M, "camera"), "camera")
    assert not any("بهترین دوربین" in b for b in ex["balanced"]["bullets"])
    # weight does not apply to phones: no missing-spec noise, no weight claims
    ex = explain_tiers(pick_tiers("mobile", 15 * M, 25 * M, "weight"), "weight")
    assert not any("وزن" in s for e in ex.values() for s in e["bullets"] + e["tradeoffs"])


def test_desk_endpoint(client, phones):
    other = client.post("/api/desk", {"category": "other"}, content_type="application/json")
    assert other.status_code == 200 and other.json() == {"tiers": []}
    r = client.post(
        "/api/desk",
        {"category": "mobile", "budget_min": 15 * M, "budget_max": 25 * M, "priority": "camera"},
        content_type="application/json",
    )
    assert r.status_code == 200
    tiers = r.json()["tiers"]
    assert len(tiers) == 3
    keys = {"tier", "product_id", "title", "price", "offer_count", "specs_top3", "newest_price_at",
            "bullets", "tradeoffs", "fit_note", "fits_priority"}
    assert all(keys <= set(t) for t in tiers)


def test_desk_price_age_is_the_min_price_offers(client, db):
    # PLAN §2 rule 1: the age shown next to min_price must be that offer's age, not a pricier one's.
    shop = Shop.objects.create(
        id="s1", name="s", name_norm="s", address_raw="a", geom=Point(51.4, 35.7, srid=4326)
    )
    cat = Category.objects.create(name="گوشی موبایل", name_norm="گوشی موبایل")
    p = Product.objects.create(
        id="cheap", persian_title="cheap", title_norm="cheap", category=cat, specs=[],
        min_price=600_000, offer_count=3,
    )
    for oid, price, at in [
        ("old-cheap", 600_000, "2026-07-24T00:00:00Z"),
        ("new-cheap", 600_000, "2026-07-25T00:00:00Z"),  # tie on price → the newer one
        ("pricier", 700_000, "2026-10-21T00:00:00Z"),
    ]:
        Offer.objects.create(id=oid, product=p, shop=shop, seller_title="s", price_toman=price,
                             last_price_changed_at=at)
    Offer.objects.create(id="junk", product=p, shop=shop, seller_title="s", price_toman=1,
                         is_outlier=True, last_price_changed_at="2026-10-22T00:00:00Z")
    r = client.post("/api/desk", {"category": "mobile", "budget_min": 0, "budget_max": M},
                    content_type="application/json")
    tier = next(t for t in r.json()["tiers"] if t["product_id"] == "cheap")
    assert tier["newest_price_at"].startswith("2026-07-25")
