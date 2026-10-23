from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import OuterRef, Subquery
from django.utils import timezone

from conversation.models import ItemMemory, Session


class Command(BaseCommand):
    help = "Sessions older than 90 days lose their user (DATA-MODEL retention); messages are kept."

    @transaction.atomic
    def handle(self, *args, **opts):
        cutoff = timezone.now() - timedelta(days=90)
        old = Session.objects.filter(started_at__lt=cutoff, user_id__isnull=False)
        # The agent keys memory on the session id; hand it to the owner first so /me and
        # «حذف داده‌هام» still reach it once the session forgets its user.
        owner = Session.objects.filter(id=OuterRef("user_id")).values("user_id")[:1]
        ItemMemory.objects.filter(user_id__in=old.values("id")).update(user_id=Subquery(owner))
        n = old.update(user_id=None)
        self.stdout.write(f"anonymised {n} sessions")
