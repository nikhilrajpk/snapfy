# Generated by Django 5.1.6 on 2025-04-27 06:00

import datetime
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('story_app', '0026_musictrack_start_time_alter_story_expires_at'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name='story',
            name='expires_at',
            field=models.DateTimeField(default=datetime.datetime(2025, 4, 28, 6, 0, 47, 173562, tzinfo=datetime.timezone.utc)),
        ),
        migrations.CreateModel(
            name='LiveStream',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(blank=True, max_length=100, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('is_active', models.BooleanField(default=True)),
                ('host', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='live_streams', to=settings.AUTH_USER_MODEL)),
                ('viewers', models.ManyToManyField(blank=True, related_name='watched_streams', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
