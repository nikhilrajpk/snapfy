# Generated by Django 5.1.6 on 2025-03-27 05:19

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chat_app', '0004_chatroom_encryption_key_chatroom_last_message_at_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='message',
            name='read_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
