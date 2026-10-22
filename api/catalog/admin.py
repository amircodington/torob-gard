from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Category, Offer, Product, Shop, ShopReport, Venue


@admin.register(Venue, Shop, Category)
class NamedAdmin(ModelAdmin):
    search_fields = ["name_norm"]


@admin.register(Product)
class ProductAdmin(ModelAdmin):
    search_fields = ["title_norm"]


@admin.register(Offer)
class OfferAdmin(ModelAdmin):
    search_fields = ["seller_title"]


@admin.register(ShopReport)
class ShopReportAdmin(ModelAdmin):
    pass
