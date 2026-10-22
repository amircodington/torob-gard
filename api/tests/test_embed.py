from pathlib import Path
from types import SimpleNamespace

import httpx
import pytest
from django.core.management import call_command
from openai import APIStatusError

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
    only_first = {"BOXAPI_KEY": fake, "BOXAPI_KEY_SECOND": None}
    monkeypatch.setattr(embed, "make_client", lambda key="BOXAPI_KEY": only_first[key])

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


@pytest.mark.django_db
def test_embed_switches_to_second_key_on_quota_error(monkeypatch):
    call_command("load_csv", dir=str(MINI))
    call_command("price_stats")
    first, second = FakeClient(), FakeClient()

    def spent(model, input, dimensions):
        resp = httpx.Response(402, request=httpx.Request("POST", "http://x"))
        raise APIStatusError("no credit", response=resp, body={"error": {"message": "no credit"}})

    first.create = spent
    keys = {"BOXAPI_KEY": first, "BOXAPI_KEY_SECOND": second}
    monkeypatch.setattr(embed, "make_client", lambda key="BOXAPI_KEY": keys[key])
    monkeypatch.setattr(embed, "BATCH", 2)  # several chunks
    call_command("embed")
    assert second.inputs and not first.inputs
    priced = Product.objects.filter(min_price__isnull=False).count()
    assert ProductEmbedding.objects.count() == priced
