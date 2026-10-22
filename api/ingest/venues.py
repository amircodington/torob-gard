import re
from collections import Counter, defaultdict

from django.contrib.gis.geos import Point

from catalog.models import Shop, Venue
from ingest.address import parse_address
from torobgard.persian import normalize

# «پاساز» is the common typo the parser also accepts.
_KW = r"پاساژ|پاساز|مجتمع تجاری|مجتمع|ساختمان|سرای|تیمچه|بازار"
_LEAD = re.compile(rf"^(?:{_KW})\s+")
_HAMZA = str.maketrans("أإآؤ", "اااو", "ءئ‌ ")
_KIND = {"پاساژ": "pasazh", "پاساز": "pasazh", "مجتمع": "building", "ساختمان": "building"}


def venue_key(name: str) -> str:
    # ponytail: spelling drift only (hamza, spaces, doubled alef); no fuzzy/typo matching.
    s = _LEAD.sub("", normalize(name)).translate(_HAMZA)
    return re.sub("ا+", "ا", s)


def build_venues() -> tuple[int, int]:
    """Upsert one Venue per venue_key and link member shops. Returns (venues, shops linked)."""
    groups = defaultdict(list)  # key -> [(shop, normalised name)]
    shops = Shop.objects.only("id", "address_raw", "geom", "venue_id")
    for shop in shops.iterator(chunk_size=2000):
        if name := parse_address(shop.address_raw).venue_name:
            groups[venue_key(name)].append((shop, name))
    stale, linked = [], 0
    for key, members in groups.items():
        if not key:
            continue
        names = Counter(n for _, n in members)
        top = names.most_common(1)[0][0]
        # ponytail: planar mean of points, fine over a ~2 km district.
        xs, ys = [s.geom.x for s, _ in members], [s.geom.y for s, _ in members]
        venue, _ = Venue.objects.update_or_create(
            name_norm=key,
            defaults={
                "name": top, "aliases": sorted(names), "shop_count": len(members),
                "kind": _KIND.get(top.split()[0], "bazaar"),
                "geom": Point(sum(xs) / len(xs), sum(ys) / len(ys), srid=4326),
            },
        )
        for s, _ in members:
            if s.venue_id != venue.id:
                s.venue_id = venue.id
                stale.append(s)
        linked += len(members)
    Shop.objects.bulk_update(stale, ["venue"], batch_size=2000)
    return len(groups), linked
