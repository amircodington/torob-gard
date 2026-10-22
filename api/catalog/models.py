from uuid import uuid4

from django.contrib.gis.db import models
from django.contrib.postgres.fields import ArrayField
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField
from django.utils.text import slugify

# ponytail: no __str__/managers/abstract bases; embedding tables arrive in P2.


def text_array():
    return ArrayField(models.TextField(), default=list)


class Venue(models.Model):
    class Kind(models.TextChoices):
        PASAZH = "pasazh"
        BAZAAR = "bazaar"
        BUILDING = "building"
        STREET = "street"

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    name = models.TextField()
    name_norm = models.TextField(unique=True)
    slug = models.SlugField(unique=True, allow_unicode=False, max_length=100)
    aliases = text_array()
    kind = models.TextField(choices=Kind.choices)
    address = models.TextField(blank=True, default="")
    geom = models.PointField(geography=True, srid=4326, null=True)
    floors = models.JSONField(default=list)
    directory_photo_ids = ArrayField(models.UUIDField(), default=list)
    shop_count = models.IntegerField(default=0)
    verified_at = models.DateTimeField(null=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            # Pure-Persian names slugify to "", so fall back to a random id.
            self.slug = slugify(self.name, allow_unicode=False) or f"venue-{uuid4().hex[:8]}"
        super().save(*args, **kwargs)


class Shop(models.Model):
    id = models.CharField(primary_key=True, max_length=64)
    name = models.TextField()
    name_norm = models.TextField()
    address_raw = models.TextField()
    venue = models.ForeignKey(Venue, null=True, on_delete=models.SET_NULL, related_name="shops")
    floor = models.TextField(null=True)
    unit = models.TextField(null=True)
    location_hint = models.TextField(null=True)
    parse_confidence = models.FloatField(default=0)
    geom = models.PointField(geography=True, srid=4326)
    location_label = models.TextField(blank=True, default="")
    category_names = text_array()
    contacts = models.JSONField(default=list)
    instagram = models.TextField(null=True)
    website_url = models.TextField(null=True)
    weekly_hours = models.JSONField(default=dict)
    payment_options = text_array()
    supports_fast_delivery = models.BooleanField(null=True)
    offer_count = models.IntegerField(default=0)
    price_band = models.SmallIntegerField(null=True)
    verified_at = models.DateTimeField(null=True)
    # ponytail: app_user table arrives in P3; plain uuid until then.
    verified_by = models.UUIDField(null=True)

    class Meta:
        indexes = [
            models.Index(fields=["venue", "floor"]),
            GinIndex(fields=["category_names"]),
            GinIndex(name="shop_name_norm_trgm", fields=["name_norm"], opclasses=["gin_trgm_ops"]),
        ]


class Category(models.Model):
    name = models.TextField(unique=True)
    name_norm = models.TextField()
    parent = models.ForeignKey(
        "self", null=True, on_delete=models.SET_NULL, related_name="children"
    )
    product_count = models.IntegerField(default=0)
    shop_count = models.IntegerField(default=0)


class Product(models.Model):
    id = models.CharField(primary_key=True, max_length=64)
    persian_title = models.TextField()
    title_norm = models.TextField()
    brand_name = models.TextField(null=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    model = models.TextField(null=True)
    image_urls = text_array()
    specs = models.JSONField(default=list)
    specs_text = models.TextField(blank=True, default="")
    search_tsv = SearchVectorField(null=True)
    min_price = models.BigIntegerField(null=True)
    median_price = models.BigIntegerField(null=True)
    max_price = models.BigIntegerField(null=True)
    offer_count = models.IntegerField(default=0)

    class Meta:
        indexes = [
            GinIndex(fields=["search_tsv"]),
            models.Index(fields=["category"]),
            models.Index(fields=["brand_name"]),
        ]


class Offer(models.Model):
    id = models.CharField(primary_key=True, max_length=64)
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="offers")
    shop = models.ForeignKey(Shop, on_delete=models.PROTECT, related_name="offers")
    seller_title = models.TextField()
    price_toman = models.BigIntegerField()
    last_price_changed_at = models.DateTimeField()
    warranty = models.TextField(null=True)
    description = models.TextField(blank=True, default="")
    is_outlier = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=["product", "price_toman"]),
            models.Index(fields=["shop"]),
            models.Index(fields=["last_price_changed_at"]),
        ]


class ShopReport(models.Model):
    class Kind(models.TextChoices):
        OPEN = "open"
        CLOSED = "closed"
        HAD_ITEM = "had_item"
        NO_ITEM = "no_item"
        NO_ANSWER = "no_answer"
        PRICE_OK = "price_ok"
        PRICE_HIGH = "price_high"

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    # ponytail: app_user table arrives in P3; plain uuid until then.
    user_id = models.UUIDField(null=True)
    shop = models.ForeignKey(Shop, on_delete=models.PROTECT, related_name="reports")
    kind = models.TextField(choices=Kind.choices)
    product = models.ForeignKey(Product, null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
