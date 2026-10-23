from uuid import uuid4

from django.contrib.postgres.fields import ArrayField
from django.db import models


class AppUser(models.Model):
    """A shopper who logged in with their phone. Guests have no row (trips keep a session key)."""

    class Role(models.TextChoices):
        SHOPPER = "shopper"
        STUDENT = "student"
        ADMIN = "admin"

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    phone_hash = models.TextField(unique=True, null=True)  # HMAC-SHA256 with PHONE_PEPPER
    phone_enc = models.BinaryField(null=True)  # nonce + AES-GCM with PHONE_KEY
    display_name = models.TextField(null=True)
    role = models.TextField(choices=Role.choices, default=Role.SHOPPER)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now=True)


class NeedsProfile(models.Model):
    """What the agent has learned about a shopper; shown on /me and editable there."""

    user = models.OneToOneField(AppUser, primary_key=True, on_delete=models.CASCADE,
                                related_name="profile")
    budget_min = models.BigIntegerField(null=True)
    budget_max = models.BigIntegerField(null=True)
    preferred_brands = ArrayField(models.TextField(), default=list)
    avoided_brands = ArrayField(models.TextField(), default=list)
    categories_of_interest = ArrayField(models.IntegerField(), default=list)
    style_tags = ArrayField(models.TextField(), default=list)
    constraints = models.JSONField(default=dict)
    notes = models.TextField(default="")
    updated_at = models.DateTimeField(auto_now=True)
