import csv
from pathlib import Path

import pytest
from django.core.management import call_command

from catalog.models import Category, Offer, Product, Shop
from ingest.loaders import cell

MINI = Path(__file__).parent / "fixtures" / "mini"


def test_cell():
    assert cell("null") is None and cell("") is None and cell(None) is None
    assert cell("x") == "x"


@pytest.mark.django_db
def test_load_csv_idempotent():
    for _ in range(2):
        call_command("load_csv", dir=str(MINI))
        assert (Shop.objects.count(), Product.objects.count(), Offer.objects.count()) == (5, 5, 5)
    assert Shop.objects.filter(instagram__isnull=True).exists()
    assert Shop.objects.first().geom.srid == 4326
    with open(MINI / "products.csv", newline="", encoding="utf-8") as f:
        names = {r["category_name"] for r in csv.DictReader(f)}
    assert Category.objects.count() == len(names)
    p = Product.objects.get(id=Offer.objects.first().product_id)
    assert p.offer_count == p.offers.count() >= 1
    assert p.specs_text and sum(Shop.objects.values_list("offer_count", flat=True)) == 5
