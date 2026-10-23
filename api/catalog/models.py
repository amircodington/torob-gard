from hashlib import sha1
from uuid import uuid4

from django.contrib.gis.db import models
from django.contrib.postgres.fields import ArrayField
from django.contrib.postgres.indexes import GinIndex, PostgresIndex
from django.contrib.postgres.search import SearchVectorField
from django.db.models.expressions import RawSQL
from django.utils.text import slugify

# ponytail: no __str__/managers/abstract bases.


def persian_slug(text: str) -> str:
    """URL slug from a normalised Persian name, kept Persian so it is stable across re-ingest."""
    return slugify(text, allow_unicode=True)[:90] or f"x-{sha1(text.encode()).hexdigest()[:8]}"


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
    slug = models.SlugField(unique=True, allow_unicode=True, max_length=100)
    aliases = text_array()
    kind = models.TextField(choices=Kind.choices)
    address = models.TextField(blank=True, default="")
    geom = models.PointField(geography=True, srid=4326, null=True)
    floors = models.JSONField(default=list)
    directory_photo_ids = ArrayField(models.UUIDField(), default=list)
    shop_count = models.IntegerField(default=0)
    verified_at = models.DateTimeField(null=True)

    def save(self, *args, **kwargs):
        # From name_norm (the merge key), never ids or the display spelling: same venue, same URL.
        base = persian_slug(self.name_norm)
        taken = Venue.objects.filter(slug=base).exclude(pk=self.pk).exists()
        # ponytail: keys differing only in letter case collide; the hash suffix is per key.
        self.slug = f"{base}-{sha1(self.name_norm.encode()).hexdigest()[:6]}" if taken else base
        if kwargs.get("update_fields") is not None:  # update_or_create saves only its defaults
            kwargs["update_fields"] = {*kwargs["update_fields"], "slug"}
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


SEARCH_TSV_SQL = (
    "to_tsvector('simple'::regconfig, translate(coalesce(title_norm, '') || ' ' || "
    "coalesce(brand_name, '') || ' ' || coalesce(specs_text, ''), "
    "'يكةى×۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', 'یکهیx01234567890123456789'))"
)


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
    # × -> x so «16×5» and «16x5» are one lexeme; translate also normalises brand_name.
    search_tsv = models.GeneratedField(
        expression=RawSQL(SEARCH_TSV_SQL, ()), output_field=SearchVectorField(), db_persist=True
    )
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


EMBED_DIMS = 1024  # EMBED_DIMS in .env; changing it needs a migration


class VectorField(models.Field):
    """pgvector column; values are lists of floats. ponytail: no pgvector/numpy dependency."""

    def __init__(self, *args, dimensions=EMBED_DIMS, **kwargs):
        self.dimensions = dimensions
        super().__init__(*args, **kwargs)

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        return name, path, args, {**kwargs, "dimensions": self.dimensions}

    def db_type(self, connection):
        return f"vector({self.dimensions})"

    def get_prep_value(self, value):
        return None if value is None else "[" + ",".join(map(str, value)) + "]"

    def from_db_value(self, value, expression, connection):
        return None if value is None else [float(x) for x in value.strip("[]").split(",")]


class HnswIndex(PostgresIndex):
    suffix = "hnsw"


class ProductEmbedding(models.Model):
    product = models.OneToOneField(Product, primary_key=True, on_delete=models.CASCADE)
    model = models.TextField()
    embedding = VectorField()
    text_hash = models.TextField()

    class Meta:
        indexes = [HnswIndex(name="product_emb_hnsw", fields=["embedding"],
                             opclasses=["vector_cosine_ops"])]


class ShopEmbedding(models.Model):
    shop = models.OneToOneField(Shop, primary_key=True, on_delete=models.CASCADE)
    model = models.TextField()
    embedding = VectorField()
    text_hash = models.TextField()

    class Meta:
        indexes = [HnswIndex(name="shop_emb_hnsw", fields=["embedding"],
                             opclasses=["vector_cosine_ops"])]
