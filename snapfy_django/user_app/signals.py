# user_app/signals.py
from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

@receiver(user_logged_in)
def set_user_online(sender, request, user, **kwargs):
    user.is_online = True
    user.last_seen = timezone.now()
    user.save()
    print(f"User {user.username} logged in: last_seen={user.last_seen}")
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"user_{user.id}",
        {
            "type": "user_status_update",
            "user_id": str(user.id),
            "is_online": True,
            "last_seen": user.last_seen.isoformat(),
        }
    )

@receiver(user_logged_out)
def set_user_offline(sender, request, user, **kwargs):
    user.is_online = False
    user.last_seen = timezone.now()
    user.save()
    print(f"User {user.username} logged out: last_seen={user.last_seen}")
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"user_{user.id}",
        {
            "type": "user_status_update",
            "user_id": str(user.id),
            "is_online": False,
            "last_seen": user.last_seen.isoformat(),
        }
    )
# @receiver(user_logged_out)
# def update_last_seen(sender, request, user, **kwargs):
#     user.last_seen = timezone.now()
#     user.save()