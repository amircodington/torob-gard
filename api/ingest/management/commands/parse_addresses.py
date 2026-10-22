from django.core.management.base import BaseCommand

from catalog.models import Shop
from ingest.address import parse_address

FIELDS = ["floor", "unit", "location_hint", "parse_confidence"]


class Command(BaseCommand):
    """Fill floor/unit/location_hint/parse_confidence from address_raw (venue is Task 7)."""

    def handle(self, *args, **opts):
        shops, venues = [], 0
        for shop in Shop.objects.all().iterator(chunk_size=2000):
            p = parse_address(shop.address_raw)
            shop.floor, shop.unit, shop.location_hint = p.floor, p.unit, p.hint
            shop.parse_confidence = p.confidence
            venues += p.venue_name is not None
            shops.append(shop)
        # ponytail: all shops in memory (6.5k rows); stream batches if the catalog grows 100x.
        Shop.objects.bulk_update(shops, FIELDS, batch_size=2000)
        n = len(shops) or 1
        pct = lambda k: f"{k} ({k / n:.0%})"  # noqa: E731
        self.stdout.write(
            f"shops: {len(shops)} · with floor: {pct(sum(s.floor is not None for s in shops))}"
            f" · with unit: {pct(sum(s.unit is not None for s in shops))}"
            f" · with venue name: {pct(venues)}"
            f" · mean confidence: {sum(s.parse_confidence for s in shops) / n:.2f}"
        )
