from hashlib import sha1

from django.db import migrations, models

from catalog.models import persian_slug


def reslug(apps, schema_editor):
    # Old slugs were random hex for Persian-only names; recompute them the way Venue.save does.
    Venue = apps.get_model("catalog", "Venue")
    venues = list(Venue.objects.order_by("name_norm"))
    for v in venues:  # clear first so a new slug never clashes with an old one
        Venue.objects.filter(pk=v.pk).update(slug=f"tmp-{v.pk.hex}")
    seen = set()
    for v in venues:
        base = persian_slug(v.name_norm)
        slug = f"{base}-{sha1(v.name_norm.encode()).hexdigest()[:6]}" if base in seen else base
        seen.add(base)
        Venue.objects.filter(pk=v.pk).update(slug=slug)


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0003_search'),
    ]

    operations = [
        migrations.AlterField(
            model_name='venue',
            name='slug',
            field=models.SlugField(allow_unicode=True, max_length=100, unique=True),
        ),
        migrations.RunPython(reslug, migrations.RunPython.noop),
    ]
