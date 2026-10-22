from uuid import uuid4

from django.db import models


class ItemMemory(models.Model):
    class State(models.TextChoices):
        SEEN = "seen"
        LIKED = "liked"
        TRIED = "tried"
        BOUGHT = "bought"
        SKIPPED = "skipped"

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    # ponytail: app_user table arrives in P3; plain uuid until then.
    user_id = models.UUIDField()
    product = models.ForeignKey("catalog.Product", null=True, on_delete=models.SET_NULL)
    shop = models.ForeignKey("catalog.Shop", null=True, on_delete=models.SET_NULL)
    state = models.TextField(choices=State.choices)
    price_seen = models.BigIntegerField(null=True)
    note = models.TextField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
