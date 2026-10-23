from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from conversation.models import Session


class Command(BaseCommand):
    help = "Sessions older than 90 days lose their user (DATA-MODEL retention); messages are kept."

    def handle(self, *args, **opts):
        cutoff = timezone.now() - timedelta(days=90)
        old = Session.objects.filter(started_at__lt=cutoff, user_id__isnull=False)
        n = old.update(user_id=None)
        self.stdout.write(f"anonymised {n} sessions")
