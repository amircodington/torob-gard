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
