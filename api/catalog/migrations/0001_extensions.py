from django.contrib.postgres.operations import CreateExtension, TrigramExtension
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = []
    operations = [
        CreateExtension("postgis"),
        migrations.RunSQL("CREATE EXTENSION IF NOT EXISTS vector", migrations.RunSQL.noop),
        TrigramExtension(),
    ]
