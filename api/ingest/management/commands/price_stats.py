import time

from django.core.management.base import BaseCommand

from ingest.prices import price_stats


class Command(BaseCommand):
    """Flag outlier offers, refresh product price stats and shop price bands."""

    def handle(self, *args, **opts):
        t = time.time()
        outliers, priced, banded = price_stats()
        self.stdout.write(
            f"outliers: {outliers} · products with price: {priced} · shops with band: {banded}"
        )
        self.stdout.write(f"{time.time() - t:.1f}s")
