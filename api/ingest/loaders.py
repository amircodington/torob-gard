import csv
import json
import sys
from datetime import datetime
from itertools import islice

from django.contrib.gis.geos import Point
from django.db import connection

from catalog.models import Category, Offer, Product, Shop
from torobgard.persian import normalize

csv.field_size_limit(sys.maxsize)
BATCH = 5000


def cell(v):
    return None if v in (None, "", "null") else v


def js(v, default):
    v = cell(v)
    return default if v is None else json.loads(v)


def rows(path):
    with open(path, newline="", encoding="utf-8") as f:
        yield from csv.DictReader(f)


def upsert(model, objs, fields):
    it = iter(objs)
    while batch := list(islice(it, BATCH)):
        model.objects.bulk_create(
            batch, update_conflicts=True, unique_fields=["id"], update_fields=fields
        )


def fields_of(model, *skip):
    return [f.name for f in model._meta.concrete_fields if f.name not in ("id", *skip)]


def load_shops(path):
    def build(r):
        fast = cell(r["supports_fast_delivery"])
        return Shop(
            id=r["shop_id"], name=r["name"], name_norm=normalize(r["name"]),
            address_raw=cell(r["address"]) or "",
            geom=Point(float(r["lon"]), float(r["lat"]), srid=4326),
            location_label=cell(r["location_label"]) or "",
            category_names=js(r["category_names"], []), contacts=js(r["contacts"], []),
            instagram=cell(r["instagram"]), website_url=cell(r["website_url"]),
            weekly_hours=js(r["weekly_hours"], {}), payment_options=js(r["payment_options"], []),
            supports_fast_delivery=None if fast is None else fast.lower() == "true",
        )

    # ponytail: parse_*/venue/count columns are left out of update_fields so re-loads keep them.
    upsert(Shop, map(build, rows(path)), [
        "name", "name_norm", "address_raw", "geom", "location_label", "category_names",
        "contacts", "instagram", "website_url", "weekly_hours", "payment_options",
        "supports_fast_delivery",
    ])


def load_categories(path):
    names = {r["category_name"] for r in rows(path)}
    Category.objects.bulk_create(
        [Category(name=n, name_norm=normalize(n)) for n in names], ignore_conflicts=True
    )
    return dict(Category.objects.values_list("name", "id"))


def load_products(path):
    cats = load_categories(path)

    def build(r):
        specs = js(r["specs"], [])
        text = " · ".join(f"{s['key']}: {s['value']}" for s in specs)
        return Product(
            id=r["product_id"], persian_title=r["persian_title"],
            title_norm=normalize(r["persian_title"]), brand_name=cell(r["brand_name"]),
            category_id=cats[r["category_name"]], model=cell(r["model"]),
            image_urls=js(r["image_urls"], []), specs=specs, specs_text=normalize(text),
        )

    upsert(Product, map(build, rows(path)), [
        "persian_title", "title_norm", "brand_name", "category", "model", "image_urls",
        "specs", "specs_text",
    ])


def load_offers(path):
    products = set(Product.objects.values_list("id", flat=True))
    shops = set(Shop.objects.values_list("id", flat=True))
    skipped = {"no price": 0, "no date": 0, "orphan": 0}

    def build():
        # ponytail: a null price is not an offer (DATA-MODEL's count excludes them); a price
        # with no date can't show its age (honesty rule 1). Both skipped and counted.
        for r in rows(path):
            if cell(r["price_toman"]) is None:
                skipped["no price"] += 1
            elif cell(r["last_price_changed_at"]) is None:
                skipped["no date"] += 1
            elif r["product_id"] not in products or r["shop_id"] not in shops:
                skipped["orphan"] += 1
            else:
                yield Offer(
                    id=r["offer_id"], product_id=r["product_id"], shop_id=r["shop_id"],
                    seller_title=r["seller_title"], price_toman=int(r["price_toman"]),
                    last_price_changed_at=datetime.fromisoformat(r["last_price_changed_at"]),
                    warranty=cell(r["warranty"]), description=cell(r["description"]) or "",
                )

    upsert(Offer, build(), [
        "product", "shop", "seller_title", "price_toman", "last_price_changed_at",
        "warranty", "description",
    ])
    return skipped


def update_counts():
    # ponytail: category.shop_count stays 0; shop category_names are free text (T-04 maps them).
    with connection.cursor() as c:
        for table, col, src, key in [
            ("catalog_category", "product_count", "catalog_product", "category_id"),
            ("catalog_shop", "offer_count", "catalog_offer", "shop_id"),
            ("catalog_product", "offer_count", "catalog_offer", "product_id"),
        ]:
            c.execute(
                f"UPDATE {table} t SET {col} = COALESCE(s.n, 0) FROM {table} t2 "
                f"LEFT JOIN (SELECT {key} k, count(*) n FROM {src} GROUP BY {key}) s "
                f"ON s.k = t2.id WHERE t.id = t2.id"
            )
