# Generated by Django 5.1.6 on 2025-03-06 07:43

import datetime
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('story_app', '0010_alter_story_expires_at'),
    ]

    operations = [
        migrations.AlterField(
            model_name='story',
            name='expires_at',
            field=models.DateTimeField(default=datetime.datetime(2025, 3, 7, 7, 43, 34, 972465, tzinfo=datetime.timezone.utc)),
        ),
    ]
