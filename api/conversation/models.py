from uuid import uuid4

from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models.functions import Now


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


class Session(models.Model):
    """One agent conversation. The agent writes these rows with plain SQL, hence db_default."""

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    user_id = models.UUIDField(null=True)  # ponytail: no FK until app_user (P3.4)
    started_at = models.DateTimeField(db_default=Now())
    ended_at = models.DateTimeField(null=True)
    context = models.JSONField(db_default={})  # where the shopper says they are + profile
    model = models.TextField()


class Message(models.Model):
    class Role(models.TextChoices):
        USER = "user"
        ASSISTANT = "assistant"
        SYSTEM = "system"
        TOOL = "tool"

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name="messages")
    seq = models.IntegerField()
    role = models.TextField(choices=Role.choices)
    content = models.JSONField()  # text + blocks; assistant rows also keep grounding violations
    receipt_ids = ArrayField(models.TextField(), db_default=[])
    tokens_in = models.IntegerField(null=True)
    tokens_out = models.IntegerField(null=True)
    latency_ms = models.IntegerField(null=True)
    cost = models.DecimalField(max_digits=10, decimal_places=5, null=True)  # USD, assistant rows
    created_at = models.DateTimeField(db_default=Now())

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["session", "seq"], name="message_session_seq"),
        ]


class ToolCall(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="tool_calls")
    name = models.TextField()
    args = models.JSONField()
    result_summary = models.JSONField()  # ids + counts, not the payload
    duration_ms = models.IntegerField()
    error = models.TextField(null=True)
