# notifcation_app.utils.py
import json
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Notification
from user_app.models import User
from story_app.models import LiveStream
from story_app.serializers import LiveStreamSerializer
import logging

logger = logging.getLogger(__name__)

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
    
def create_call_notification(to_user, from_user, call_id, room_id, call_type, call_status):
    if to_user.id == from_user.id:
        return
    
    profile_picture = str(from_user.profile_picture) if from_user.profile_picture else None
    message = json.dumps({
        'type': 'call',
        'from_user': {
            'username': from_user.username,
            'profile_picture': profile_picture,
        },
        'call_id': str(call_id),
        'room_id': str(room_id),
        'call_type': call_type,
        'call_status': call_status,
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
    
def create_new_chat_notification(to_user, from_user, room_id):
    if to_user.id == from_user.id:
        return
    
    profile_picture = str(from_user.profile_picture) if from_user.profile_picture else None
    message = json.dumps({
        'type': 'new_chat',
        'from_user': {
            'username': from_user.username,
            'profile_picture': profile_picture,
        },
        'room_id': str(room_id)
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
    

def create_live_notification(to_user, from_user, live_id):
    try:
        if to_user.id == from_user.id:
            return
        
        profile_picture = str(from_user.profile_picture) if from_user.profile_picture else None
        message = json.dumps({
            'type': 'live',
            'from_user': {
                'username': from_user.username,
                'profile_picture': profile_picture,
            },
            'live_id': str(live_id),
            'stream_url': f'/live/{live_id}'  # Add direct URL to stream
        })
        
        notification = Notification.objects.create(user=to_user, message=message)
        
        # Send via WebSocket if user is connected
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
        
        # Also send via global live updates
        async_to_sync(channel_layer.group_send)(
            'live_global',
            {
                'type': 'live_stream_update',
                'live_stream': LiveStreamSerializer(
                    LiveStream.objects.get(id=live_id),
                    context={'request': None}
                ).data
            }
        )
    except Exception as e:
        logger.error(f"Error creating live notification: {str(e)}")