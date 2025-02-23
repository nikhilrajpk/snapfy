# Generated by Django 5.1.6 on 2025-02-23 02:01

import cloudinary.models
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('post_app', '0002_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='post',
            name='image',
        ),
        migrations.RemoveField(
            model_name='post',
            name='video',
        ),
        migrations.AddField(
            model_name='post',
            name='file',
            field=cloudinary.models.CloudinaryField(default='abc.png', max_length=255, verbose_name='file'),
            preserve_default=False,
        ),
    ]
