from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("conversation", "0002_session_message_toolcall")]
    operations = [migrations.AddField(
        model_name="message", name="cost",
        field=models.DecimalField(decimal_places=5, max_digits=10, null=True))]
