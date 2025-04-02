import json
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Notification
from user_app.models import User

channel_layer = get_channel_layer()

def create_follow_notification(to_user, from_user):
    if to_user.id == from_user.id:
        return
    
    profile_picture = str(from_user.profile_picture) if from_user.profile_picture else None
    message = json.dumps({
        'type': 'follow',
        'from_user': {
            'username': from_user.username,
            'profile_picture': profile_picture,
        }
    })
    
    notification = Notification.objects.create(user=to_user, message=message)
    async_to_sync(channel_layer.group_send)(
        f'user_{to_user.username}_notifications',
        {
            'type': 'notification_message',
            'notification': {
                'id': notification.id,
                'message': message,
                'created_at': notification.created_at.isoformat(),
                'is_read': notification.is_read
            }
        }
    )

def create_mention_notification(to_user, from_user, post_id):
    if to_user.id == from_user.id:
        return
    
    profile_picture = str(from_user.profile_picture) if from_user.profile_picture else None
    message = json.dumps({
        'type': 'mention',
        'from_user': {
            'username': from_user.username,
            'profile_picture': profile_picture,
        },
        'post_id': post_id
    })
    
    notification = Notification.objects.create(user=to_user, message=message)
    async_to_sync(channel_layer.group_send)(
        f'user_{to_user.username}_notifications',
        {
            'type': 'notification_message',
            'notification': {
                'id': notification.id,
                'message': message,
                'created_at': notification.created_at.isoformat(),
                'is_read': notification.is_read
            }
        }
    )

def create_like_notification(to_user, from_user, post_id):
    if to_user.id == from_user.id:
        return
    
    profile_picture = str(from_user.profile_picture) if from_user.profile_picture else None
    message = json.dumps({
        'type': 'like',
        'from_user': {
            'username': from_user.username,
            'profile_picture': profile_picture,
        },
        'post_id': post_id
    })
    
    notification = Notification.objects.create(user=to_user, message=message)
    async_to_sync(channel_layer.group_send)(
        f'user_{to_user.username}_notifications',
        {
            'type': 'notification_message',
            'notification': {
                'id': notification.id,
                'message': message,
                'created_at': notification.created_at.isoformat(),
                'is_read': notification.is_read
            }
        }
    )

def create_comment_notification(to_user, from_user, post_id, comment_text):
    if to_user.id == from_user.id:
        return
    
    profile_picture = str(from_user.profile_picture) if from_user.profile_picture else None
    message = json.dumps({
        'type': 'comment',
        'from_user': {
            'username': from_user.username,
            'profile_picture': profile_picture,
        },
        'post_id': post_id,
        'content': comment_text
    })
    
    notification = Notification.objects.create(user=to_user, message=message)
    async_to_sync(channel_layer.group_send)(
        f'user_{to_user.username}_notifications',
        {
            'type': 'notification_message',
            'notification': {
                'id': notification.id,
                'message': message,
                'created_at': notification.created_at.isoformat(),
                'is_read': notification.is_read
            }
        }
    )