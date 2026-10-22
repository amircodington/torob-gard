from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import EvalCase, EvalResult, EvalRun, Verification


@admin.register(Verification)
class VerificationAdmin(ModelAdmin):
    list_display = ["shop", "venue", "exists", "floor_ok", "unit_ok", "hours_ok", "checked_at"]
    list_filter = ["exists", "floor_ok"]


@admin.register(EvalCase)
class EvalCaseAdmin(ModelAdmin):
    list_display = ["title", "tags"]
    search_fields = ["title"]


class ResultInline(admin.TabularInline):
    model = EvalResult
    extra = 0
    can_delete = False
    fields = ["case", "passed", "score", "judge_notes"]
    readonly_fields = fields

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(EvalRun)
class EvalRunAdmin(ModelAdmin):
    list_display = ["started_at", "model", "git_sha", "notes"]
    inlines = [ResultInline]
