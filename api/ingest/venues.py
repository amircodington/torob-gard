import re
from collections import Counter, defaultdict

from django.contrib.gis.geos import Point
from django.db import transaction

from catalog.models import Shop, Venue
from ingest.address import parse_address
from torobgard.persian import normalize

# «پاساز» is the common typo the parser also accepts.
_KW = r"پاساژ|پاساز|مجتمع تجاری|مجتمع|ساختمان|سرای|تیمچه|بازار"
_LEAD = re.compile(rf"^(?:{_KW})\s+")
_HAMZA = str.maketrans("أإآؤ", "اااو", "ءئ‌ ")
_NUMW = {"یک": "1", "دو": "2", "سه": "3", "چهار": "4", "پنج": "5"}
_TAIL = re.compile(rf"\s+({'|'.join(_NUMW)})$")  # «علاالدین دو» -> «علاالدین 2»
_KIND = {"پاساژ": "pasazh", "پاساز": "pasazh", "مجتمع": "building", "ساختمان": "building"}


def venue_key(name: str) -> str:
    # ponytail: spelling drift only (hamza, spaces, alef runs, number words); no fuzzy matching.
    s = _TAIL.sub(lambda m: " " + _NUMW[m[1]], _LEAD.sub("", normalize(name)))
    s = s.replace("ائ", "اال").translate(_HAMZA)  # «علائدین» is «علاالدین» typed with hamza
    # letters and digits only: «کیان٬», «علالدین(1)», «اُپال» (harakat are not alnum) were twins
    return re.sub("ا+", "ا", "".join(filter(str.isalnum, s)))


@transaction.atomic
def build_venues() -> tuple[int, int]:
    """Upsert one Venue per venue_key, link member shops, unlink the rest and drop empty venues.
    Returns (venues, shops linked)."""
    groups = defaultdict(list)  # key -> [(shop, normalised name)]
    # ordered so a fresh build hands a shared base slug to the same venue every time
    shops = Shop.objects.only("id", "address_raw", "geom", "venue_id").order_by("id")
    for shop in shops.iterator(chunk_size=2000):
        if name := parse_address(shop.address_raw).venue_name:
            groups[venue_key(name)].append((shop, name))
    # Stale venues go first so a merged-away twin frees its slug before the survivor saves.
    # ponytail: venues are derived-only in P0; once students add floors/photos, merge not delete
    Venue.objects.exclude(name_norm__in=[k for k in groups if k]).delete()
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
    grouped = [s.id for key, members in groups.items() if key for s, _ in members]
    Shop.objects.exclude(id__in=grouped).exclude(venue=None).update(venue=None)
    return len(groups), linked
