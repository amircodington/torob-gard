from uuid import uuid4

from django.db import models


class Trip(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    product = models.ForeignKey("catalog.Product", on_delete=models.PROTECT)
    chosen_shop = models.ForeignKey("catalog.Shop", null=True, on_delete=models.PROTECT)
    req = models.JSONField(default=dict)
    failures = models.JSONField(default=list)
    anchor = models.JSONField(default=dict)
    # ponytail: trips have no user yet; owner = session cookie; /me links them in P3
    owner_key = models.CharField(max_length=64, db_index=True)
