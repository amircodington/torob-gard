from uuid import uuid4

from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models import Q
from django.db.models.functions import Now


class Verification(models.Model):
    """A student's field check of one shop or one venue."""

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    shop = models.ForeignKey("catalog.Shop", null=True, blank=True, on_delete=models.CASCADE)
    venue = models.ForeignKey("catalog.Venue", null=True, blank=True, on_delete=models.CASCADE)
    checked_by = models.UUIDField(null=True, blank=True)  # ponytail: no FK until app_user (P3.4)
    checked_at = models.DateTimeField(db_default=Now())
    exists = models.BooleanField()
    floor_ok = models.BooleanField(null=True, blank=True)
    unit_ok = models.BooleanField(null=True, blank=True)
    hours_ok = models.BooleanField(null=True, blank=True)
    corrections = models.JSONField(default=dict, blank=True)
    photo_ids = ArrayField(models.UUIDField(), default=list, blank=True)

    class Meta:
        constraints = [models.CheckConstraint(
            condition=Q(shop__isnull=False, venue__isnull=True)
            | Q(shop__isnull=True, venue__isnull=False),
            name="verification_shop_xor_venue")]


class EvalCase(models.Model):
    """One agent test. The agent's `make eval` upserts these by title from the case file."""

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    title = models.TextField(unique=True)
    user_turns = models.JSONField()  # ["…", …], sent in order in one session
    # must_cite_shop, must_mention_floor, max_price, must_not_say, must_block, judge (rubric)
    expected = models.JSONField()
    tags = ArrayField(models.TextField(), db_default=[], blank=True)
    author_id = models.UUIDField(null=True, blank=True)  # ponytail: no FK until app_user (P3.4)


class EvalRun(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    started_at = models.DateTimeField(db_default=Now())
    model = models.TextField()
    git_sha = models.TextField(blank=True)
    notes = models.TextField(blank=True)  # the printed summary line


class EvalResult(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    run = models.ForeignKey(EvalRun, on_delete=models.CASCADE, related_name="results")
    case = models.ForeignKey(EvalCase, on_delete=models.CASCADE, related_name="results")
    passed = models.BooleanField()
    score = models.FloatField(null=True)  # judge, 0–1
    transcript = models.JSONField()  # turns, blocks, receipts, violations, failures, cost
    judge_notes = models.TextField(blank=True)
