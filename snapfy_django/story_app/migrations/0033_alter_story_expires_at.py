# Generated by Django 5.1.6 on 2025-05-12 15:47

import datetime
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('story_app', '0032_alter_story_expires_at'),
    ]

    operations = [
        migrations.AlterField(
            model_name='story',
            name='expires_at',
            field=models.DateTimeField(default=datetime.datetime(2025, 5, 13, 15, 47, 13, 73088, tzinfo=datetime.timezone.utc)),
        ),
    ]
