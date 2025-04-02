from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Notification
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .serializers import NotificationSerializer

@receiver(post_save, sender=Notification)
def notification_post_save(sender, instance, created, **kwargs):
    if created:
        channel_layer = get_channel_layer()
        notification_data = NotificationSerializer(instance).data
        
        async_to_sync(channel_layer.group_send)(
            f'user_{instance.user.username}_notifications',
            {
                'type': 'notification_message',
                'notification': notification_data
            }
        )