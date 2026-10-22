from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline

from quality.models import Verification

from .models import Category, Offer, Product, Shop, ShopReport, Venue


@admin.register(Venue, Category)
class NamedAdmin(ModelAdmin):
    search_fields = ["name_norm"]


class VerifiedFilter(admin.SimpleListFilter):
    title = "تأیید میدانی"
    parameter_name = "verified"

    def lookups(self, request, model_admin):
        return [("yes", "تأییدشده"), ("no", "تأییدنشده")]

    def queryset(self, request, qs):
        if self.value():
            return qs.filter(verified_at__isnull=self.value() == "no")


class VerificationInline(TabularInline):
    model = Verification
    fields = ["exists", "floor_ok", "unit_ok", "hours_ok", "corrections", "photo_ids"]
    extra = 0
    verbose_name = "بررسی میدانی"
    verbose_name_plural = "بررسی‌های میدانی"


@admin.register(Shop)
class ShopAdmin(ModelAdmin):
    search_fields = ["name_norm"]
    list_display = ["name", "venue", "floor", "verified_at"]
    list_filter = ["venue", "floor", VerifiedFilter]
    inlines = [VerificationInline]


@admin.register(Product)
class ProductAdmin(ModelAdmin):
    search_fields = ["title_norm"]


@admin.register(Offer)
class OfferAdmin(ModelAdmin):
    search_fields = ["seller_title"]


@admin.register(ShopReport)
class ShopReportAdmin(ModelAdmin):
    pass
