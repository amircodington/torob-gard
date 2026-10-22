import pytest
from django.contrib.gis.geos import Point

from catalog.models import Shop, Venue
from ingest.venues import build_venues, venue_key


def test_venue_key_merges_spellings():
    keys = {venue_key(n) for n in ["پاساژ علالدین 2", "پاساژ علاءالدین ۲", "علاالدین2"]}
    assert len(keys) == 1


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
