from pathlib import Path
from types import SimpleNamespace

import pytest
from django.core.management import call_command

from catalog.models import Product, ProductEmbedding, Shop, ShopEmbedding
from ingest.management.commands import embed
from torobgard.persian import normalize

MINI = Path(__file__).parent / "fixtures" / "mini"


class FakeClient:
    def __init__(self):
        self.inputs: list[str] = []
        self.embeddings = self

    def create(self, model, input, dimensions):
        self.inputs += input
        vecs = [SimpleNamespace(index=i, embedding=[0.5] * dimensions) for i in range(len(input))]
        return SimpleNamespace(
            data=vecs[::-1],  # API order is not guaranteed
            usage=SimpleNamespace(total_tokens=10 * len(input)),
        )


@pytest.mark.django_db
def test_embed_skips_unchanged_and_redoes_changed(monkeypatch):
    call_command("load_csv", dir=str(MINI))
    call_command("price_stats")
    fake = FakeClient()
    monkeypatch.setattr(embed, "make_client", lambda: fake)

    call_command("embed")
    priced = Product.objects.filter(min_price__isnull=False).count()
    assert ProductEmbedding.objects.count() == priced > 0
    assert ShopEmbedding.objects.count() == Shop.objects.count()
    assert len(ProductEmbedding.objects.first().embedding) == 1024
    shop = Shop.objects.filter(offers__isnull=False).first()
    seller = normalize(shop.offers.first().seller_title)
    assert any(normalize(shop.name) in t and seller in t for t in fake.inputs)

    fake.inputs.clear()
    call_command("embed")
    assert fake.inputs == []

    Product.objects.filter(min_price__isnull=False).update(title_norm="تازه")
    call_command("embed")
    assert len(fake.inputs) == priced
