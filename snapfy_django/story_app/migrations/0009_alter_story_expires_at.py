# Generated by Django 5.1.6 on 2025-02-26 12:13

import datetime
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('story_app', '0008_alter_story_expires_at'),
    ]

    operations = [
        migrations.AlterField(
            model_name='story',
            name='expires_at',
            field=models.DateTimeField(default=datetime.datetime(2025, 2, 27, 12, 13, 46, 478117, tzinfo=datetime.timezone.utc)),
        ),
    ]
