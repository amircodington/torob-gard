import os
import time
from pathlib import Path

from django.core.management.base import BaseCommand

from catalog.models import Offer, Product, Shop
from ingest import loaders


class Command(BaseCommand):
    """Upsert the Starcoach CSVs by id.

    ponytail: no raw_* tables (DATA-MODEL mentions them, the plan's Task 5 does not).
    """

    def add_arguments(self, parser):
        parser.add_argument(
            "--dir", default=os.environ.get("DATASET_DIR", "docs/starcoach-dataset-v16-cap300-csv")
        )

    def handle(self, *args, dir, **opts):
        d = Path(dir)
        skipped = {}
        for model, fn in [
            (Shop, lambda: loaders.load_shops(d / "shops.csv")),
            (Product, lambda: loaders.load_products(d / "products.csv")),
            (Offer, lambda: loaders.load_offers(d / "offers.csv")),
        ]:
            t = time.time()
            r = fn()
            if model is Offer:
                skipped = r
            extra = ""
            if model is Offer:
                extra = " (skipped: " + ", ".join(f"{v} {k}" for k, v in skipped.items()) + ")"
            self.stdout.write(
                f"{model._meta.model_name}s: {model.objects.count()}{extra} {time.time() - t:.1f}s"
            )
        loaders.update_counts()
