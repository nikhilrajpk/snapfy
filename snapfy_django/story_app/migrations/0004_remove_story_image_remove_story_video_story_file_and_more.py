# Generated by Django 5.1.6 on 2025-02-23 02:01

import cloudinary.models
import datetime
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('story_app', '0003_alter_story_expires_at'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='story',
            name='image',
        ),
        migrations.RemoveField(
            model_name='story',
            name='video',
        ),
        migrations.AddField(
            model_name='story',
            name='file',
            field=cloudinary.models.CloudinaryField(default='abc.png', max_length=255, verbose_name='file'),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='story',
            name='expires_at',
            field=models.DateTimeField(default=datetime.datetime(2025, 2, 24, 1, 59, 46, 646646, tzinfo=datetime.timezone.utc)),
        ),
    ]
