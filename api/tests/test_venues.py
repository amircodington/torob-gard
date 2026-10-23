import pytest
from django.contrib.gis.geos import Point

from catalog.models import Shop, Venue
from ingest.venues import build_venues, venue_key


def test_venue_key_merges_spellings():
    keys = {venue_key(n) for n in ["پاساژ علالدین 2", "پاساژ علاءالدین ۲", "علاالدین2"]}
    assert len(keys) == 1
    assert venue_key("پاساژ علائدین") == venue_key("پاساژ علاالدین")
    assert venue_key("علائدین 2") == venue_key("پاساژ علاالدین دو") == venue_key("علاالدین 2")
    assert venue_key("علاالدین") != venue_key("علاالدین 2")


@pytest.mark.django_db
def test_build_venues_groups_spellings_and_is_idempotent():
    # the bare «علاالدین2» has no keyword and the parser needs one, so the third has پاساژ
    addrs = ["پاساژ علالدین 2، طبقه ۱، واحد ۱", "پاساژ علاءالدین ۲، طبقه ۲، واحد ۲",
             "پاساژ علاالدین2 طبقه 3 واحد 3"]
    pts = [(51.0, 35.0), (51.2, 35.2), (51.4, 35.4)]
    for i, (a, p) in enumerate(zip(addrs, pts, strict=True)):
        Shop.objects.create(id=f"s{i}", name="x", name_norm="x", address_raw=a,
                            geom=Point(*p))
    for _ in range(2):
        build_venues()
    (v,) = Venue.objects.all()
    assert len(v.aliases) == 3 and v.shop_count == 3 and v.kind == "pasazh"
    assert {s.venue_id for s in Shop.objects.all()} == {v.id}
    assert (v.geom.x, v.geom.y) == pytest.approx((51.2, 35.2))


@pytest.mark.django_db
def test_rebuild_moves_shops_and_prunes_stale_venues():
    addrs = ["پاساژ امجد، طبقه ۱", "پاساژ امجد، طبقه ۲", "پاساژ چارسو، طبقه ۳"]
    for i, a in enumerate(addrs):
        Shop.objects.create(id=f"s{i}", name="x", name_norm="x", address_raw=a, geom=Point(51, 35))
    build_venues()
    # چارسو loses its only shop
    Shop.objects.filter(id="s2").update(address_raw="پاساژ بوشهری، طبقه ۳")
    build_venues()
    counts = dict(Venue.objects.values_list("name", "shop_count"))
    assert counts == {"پاساژ امجد": 2, "پاساژ بوشهری": 1}
    assert Shop.objects.get(id="s2").venue.name == "پاساژ بوشهری"
    Shop.objects.filter(id="s1").update(address_raw="خیابان جمهوری، پلاک ۷")  # no venue any more
    build_venues()
    assert Shop.objects.get(id="s1").venue is None
    counts = dict(Venue.objects.values_list("name", "shop_count"))
    assert counts == {"پاساژ امجد": 1, "پاساژ بوشهری": 1}


def test_venue_key_drops_punctuation_and_harakat():
    # live twins from the dev DB: «کیان» split 74/4/1, «علالدین(1)» stole the clean slug
    assert venue_key("پاساژ کیان٬") == venue_key("پاساژ کیان)") == venue_key("پاساژ کیان")
    assert venue_key("پاساژ علالدین(1)") == venue_key("پاساژ علالدین 1")
    assert venue_key("پاساژ اُپال") == venue_key("پاساژ اپال")
    assert venue_key("پاساژ کاشانی.") == venue_key("پاساژ کاشانی")


@pytest.mark.django_db
def test_punctuation_twins_merge_and_slugs_survive_a_fresh_rebuild():
    addrs = ["پاساژ کیان، طبقه ۱", "پاساژ کیان٬ طبقه ۲", "پاساژ کیان)، طبقه ۳",
             "پاساژ ABC، طبقه ۱", "پاساژ abc، طبقه ۲"]  # case-only twins still share a slug
    for i, a in enumerate(addrs):
        Shop.objects.create(id=f"s{i}", name="x", name_norm="x", address_raw=a, geom=Point(51, 35))
    build_venues()
    slugs = dict(Venue.objects.values_list("name_norm", "slug"))
    assert slugs["کیان"] == "کیان" and Venue.objects.get(name_norm="کیان").shop_count == 3
    Venue.objects.all().delete()  # a fresh DB: who gets the base slug must not depend on heap order
    build_venues()
    assert dict(Venue.objects.values_list("name_norm", "slug")) == slugs


@pytest.mark.django_db
def test_rebuild_frees_a_stale_twins_slug_in_one_run():
    # the pre-fix dev DB: the stray «علالدین(1)» owned the clean slug, the real one had a hash
    Venue.objects.create(name="x", name_norm="علالدین(1)", kind="pasazh")
    Venue.objects.create(name="x", name_norm="علالدین1", kind="pasazh")
    Shop.objects.create(id="s0", name="x", name_norm="x", address_raw="پاساژ علالدین 1، طبقه ۱",
                        geom=Point(51, 35))
    build_venues()
    assert list(Venue.objects.values_list("slug", flat=True)) == ["علالدین1"]
