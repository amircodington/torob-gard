from django.core.management.base import BaseCommand

from catalog.models import Venue
from ingest.venues import build_venues


class Command(BaseCommand):
    """Create/update venues from parsed addresses and link shops to them."""

    def handle(self, *args, **opts):
        venues, linked = build_venues()
        self.stdout.write(f"venues: {venues} · shops linked: {linked}")
        for v in Venue.objects.order_by("-shop_count")[:20]:
            self.stdout.write(f"{v.shop_count:4d}  {v.name}  ({'، '.join(v.aliases)})")
