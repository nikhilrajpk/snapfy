# Generated by Django 5.1.6 on 2025-02-24 15:32

import datetime
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('story_app', '0006_alter_story_expires_at'),
    ]

    operations = [
        migrations.AlterField(
            model_name='story',
            name='expires_at',
            field=models.DateTimeField(default=datetime.datetime(2025, 2, 25, 15, 32, 43, 47673, tzinfo=datetime.timezone.utc)),
        ),
    ]
