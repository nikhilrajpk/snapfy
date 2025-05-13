from channels.generic.websocket import AsyncWebsocketConsumer
import json
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from channels.db import database_sync_to_async
from django.db import models
from django.utils import timezone
from .models import ChatRoom, Message, CallLog
from cryptography.fernet import Fernet
import logging
import redis.asyncio as redis
import uuid
import asyncio
import datetime

logger = logging.getLogger(__name__)
User = get_user_model()

class UserChatConsumer(AsyncWebsocketConsumer):
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.redis_client = None
    
    async def connect(self):
        self.user = None
        self.connection_id = str(uuid.uuid4())
        self.session_id = None
        self.redis_client = redis.from_url("redis://redis:6379/0")

        query_string = self.scope.get('query_string', b'').decode()
        if 'session_id=' in query_string:
            self.session_id = query_string.split('session_id=')[1].split('&')[0]
        else:
            self.session_id = str(uuid.uuid4())

        try:
            token = query_string.split('token=')[1].split('&')[0] if 'token=' in query_string else None
            if not token:
                logger.warning("No token provided")
                await self.close(code=4003, reason="No token provided")
                return

            self.user = await self.get_user_from_token(token)
            if not self.user:
                logger.warning("Invalid token")
                await self.close(code=4003, reason="Invalid token")
                return

            self.user_id = str(self.user.id)
            self.group_name = f"user_{self.user_id}"

            await self.add_connection_to_redis()
            connections = await self.get_user_connections()
            # Only replace connections that are not handling active calls
            active_call = await self.check_active_call()
            other_connections = [
                conn for conn in connections
                if conn.get('session_id') != self.session_id
                and not active_call  # Skip replacement if this connection is part of an active call
            ]
            if other_connections and not active_call:
                logger.info(f"User {self.user_id} has stale connections, notifying others")
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        "type": "connection_replace",
                        "user_id": self.user_id,
                        "except_connection": self.connection_id
                    }
                )
                await asyncio.sleep(0.5)

            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.channel_layer.group_add("all_users", self.channel_name)
            await self.accept()
            await self.send(text_data=json.dumps({"type": "connection_established", "user_id": self.user_id}))
            await self.update_user_status(True)
            await self.broadcast_user_status(True)
        except Exception as e:
            logger.error(f"Connection error: {str(e)}")
            await self.close(code=4001, reason=f"Connection error: {str(e)}")
        finally:
            if self.redis_client:
                await self.redis_client.close()
                
    @database_sync_to_async
    def check_active_call(self):
        # Check if the user is part of an active call
        return CallLog.objects.filter(
            models.Q(caller=self.user) | models.Q(receiver=self.user),
            call_status='ongoing',
            call_end_time__isnull=True
        ).exists()

    @database_sync_to_async
    def get_user_from_token(self, token):
        try:
            access_token = AccessToken(token)
            user = User.objects.get(id=access_token['user_id'])
            user.is_online = True
            user.last_seen = timezone.now()
            user.save()
            return user
        except Exception:
            return None
        
    @database_sync_to_async
    def update_user_status(self, is_online):
        if self.user:
            self.user.is_online = is_online
            self.user.last_seen = timezone.now() if not is_online else None
            self.user.save()
            logger.info(f"User {self.user_id} status updated: is_online={is_online}")
            
    async def add_connection_to_redis(self):
        try:
            conn_data = json.dumps({
                "conn_id": self.connection_id,
                "session_id": self.session_id or "",
                "timestamp": timezone.now().isoformat()
            })
            await self.redis_client.sadd(f"user_connections:{self.user_id}", conn_data)
            await self.redis_client.expire(f"user_connections:{self.user_id}", 3600)
        except Exception as e:
            logger.error(f"Error adding connection to Redis: {e}")

    async def remove_connection_from_redis(self):
        try:
            conn_data = json.dumps({"conn_id": self.connection_id, "session_id": self.session_id or ""})
            await self.redis_client.srem(f"user_connections:{self.user_id}", conn_data)
        except Exception as e:
            logger.error(f"Error removing connection from Redis: {e}")

    async def get_user_connections(self):
        redis_client = redis.from_url("redis://redis:6379/0")
        try:
            connections = await redis_client.smembers(f"user_connections:{self.user_id}")
            result = []
            for conn in connections:
                try:
                    conn_data = conn.decode('utf-8')
                    if not conn_data:
                        logger.warning(f"Empty connection data in Redis for user {self.user_id}")
                        continue
                    parsed_data = json.loads(conn_data)
                    result.append(parsed_data)
                except (json.JSONDecodeError, UnicodeDecodeError) as e:
                    logger.warning(f"Invalid connection data in Redis for user {self.user_id}: {e}")
                    # Remove corrupted data
                    await redis_client.srem(f"user_connections:{self.user_id}", conn)
                    continue
            return result
        except Exception as e:
            logger.error(f"Error fetching connections from Redis: {e}")
            return []
        finally:
            await redis_client.close()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            await self.channel_layer.group_discard("all_users", self.channel_name)
            await self.remove_connection_from_redis()

            await asyncio.sleep(1)
            remaining_connections = await self.get_user_connections()
            if not remaining_connections:
                await self.update_user_status(False)
                await self.broadcast_user_status(False)

        if self.redis_client:
            await self.redis_client.close()

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            if message_type == 'chat_message':
                await self.handle_chat_message(data)
            elif message_type == 'mark_as_read':
                await self.handle_mark_as_read(data)
            elif message_type == 'call_offer':
                await self.forward_call_signal(data, 'call_offer')
            elif message_type == 'call_answer':
                await self.forward_call_signal(data, 'call_answer')
            elif message_type == 'ice_candidate':
                await self.forward_call_signal(data, 'ice_candidate')
            elif message_type == 'call_ended':
                await self.forward_call_signal(data, 'call_ended')
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({"error": "Invalid message format"}))

    async def handle_chat_message(self, data):
        room_id = data.get('room_id')
        content = data.get('content')
        temp_id = data.get('tempId')

        if not room_id or not content:
            logger.error(f"Invalid message data: room_id={room_id}, content={content}")
            await self.send(text_data=json.dumps({"error": "Room ID and content required"}))
            return

        if not await self.is_user_in_room(room_id):
            logger.error(f"User {self.user_id} not authorized for room {room_id}")
            await self.send(text_data=json.dumps({"error": "Not authorized for this room"}))
            return

        message_data = await self.save_message(room_id, content, temp_id)
        logger.info(f"Saved message for room {room_id}: {message_data}")

        room_users = await self.get_room_users(room_id)
        for user in room_users:
            user_specific_unread_count = (
                0 if user == self.user
                else await database_sync_to_async(
                    lambda: Message.objects.filter(room_id=room_id, is_read=False).exclude(sender=user).count()
                )()
            )
            logger.info(f"Broadcasting to user {user.id} in room {room_id}, unread_count={user_specific_unread_count}")
            await self.channel_layer.group_send(
                f"user_{user.id}",
                {
                    "type": "chat_message",
                    "message": message_data,
                    "room_id": str(room_id),
                    "unread_count": user_specific_unread_count
                }
            )
            
    async def connection_replace(self, event):
        if event.get("except_connection") != self.connection_id:
            active_call = await self.check_active_call()
            if not active_call:
                await self.close(code=1000, reason="Connection replaced by new session")

    async def handle_mark_as_read(self, data):
        room_id = data.get('room_id')
        if not await self.is_user_in_room(room_id):
            return

        result = await self.mark_messages_read(room_id)
        room_users = await self.get_room_users(room_id)
        for user in room_users:
            await self.channel_layer.group_send(
                f"user_{user.id}",
                {
                    "type": "mark_as_read",
                    "room_id": str(result["room_id"]),
                    "user_id": str(result["user_id"]),
                    "updated_ids": result["updated_ids"],
                    "read_at": result["read_at"]
                }
            )

    async def broadcast_user_status(self, is_online):
        await self.channel_layer.group_send(
            "all_users",
            {
                "type": "user_status",
                "user_id": str(self.user.id),
                "is_online": is_online,
                "last_seen": timezone.now().isoformat() if not is_online else None
            }
        )

    @database_sync_to_async
    def is_user_in_room(self, room_id):
        return ChatRoom.objects.filter(id=room_id, users=self.user).exists()

    @database_sync_to_async
    def get_room_users(self, room_id):
        room = ChatRoom.objects.get(id=room_id)
        return list(room.users.all())

    @database_sync_to_async
    def save_message(self, room_id, content, temp_id=None):
        room = ChatRoom.objects.get(id=room_id)
        fernet = Fernet(room.encryption_key.encode())
        encrypted_content = fernet.encrypt(content.encode()).decode()

        message = Message.objects.create(
            room=room,
            sender=self.user,
            content=encrypted_content
        )

        room.last_message_at = message.sent_at
        room.unread_count = room.messages.filter(is_read=False).exclude(sender=self.user).count()
        room.save()

        message_data = {
            "id": str(message.id),
            "room": str(room.id),
            "content": content,
            "encrypted_content": encrypted_content,
            "sent_at": message.sent_at.isoformat(),
            "is_read": message.is_read,
            "is_deleted": message.is_deleted,
            "sender": {
                "id": str(self.user.id),
                "username": self.user.username,
                "profile_picture": self.user.profile_picture.url if self.user.profile_picture else None
            },
            "unread_count": room.unread_count
        }
        if temp_id:
            message_data['tempId'] = temp_id
        return message_data

    @database_sync_to_async
    def mark_messages_read(self, room_id):
        room = ChatRoom.objects.get(id=room_id)
        messages = room.messages.filter(is_read=False).exclude(sender=self.user)
        updated_ids = list(messages.values_list('id', flat=True))

        if updated_ids:
            messages.update(is_read=True, read_at=timezone.now())
            room.unread_count = 0
            room.save()

        return {
            "room_id": str(room_id),
            "user_id": str(self.user.id),
            "updated_ids": [str(id) for id in updated_ids],
            "read_at": timezone.now().isoformat() if updated_ids else None
        }

    async def chat_message(self, event):
        room_id = event["room_id"]
        message = event["message"]
        unread_count = event.get("unread_count", 0)

        if await self.is_user_in_room(room_id):
            await self.send(text_data=json.dumps({
                "type": "chat_message",
                "message": message,
                "room_id": room_id,
                "unread_count": unread_count
            }))
        else:
            await self.send(text_data=json.dumps({
                "type": "chat_list_update",
                "room_id": room_id,
                "unread_count": unread_count
            }))
            
    async def chat_list_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "chat_list_update",
            "room_id": event["room_id"],
            "unread_count": event["unread_count"]
        }))

    async def mark_as_read(self, event):
        await self.send(text_data=json.dumps({
            "type": "mark_as_read",
            "room_id": event["room_id"],
            "user_id": event["user_id"],
            "updated_ids": event["updated_ids"],
            "read_at": event["read_at"]
        }))

    async def user_status(self, event):
        await self.send(text_data=json.dumps({
            "type": "user_status",
            "user_id": event["user_id"],
            "is_online": event["is_online"],
            "last_seen": event["last_seen"]
        }))
        
        
    # Call functionality
    async def forward_call_signal(self, data, signal_type):
        room_id = data.get('room_id')
        target_user_id = data.get('target_user_id')
        call_type = data.get('call_type', 'audio')  # Default to audio if not provided
        
        if not target_user_id or not room_id or not await self.is_user_in_room(room_id):
            await self.send(text_data=json.dumps({"type": "error", "error": "Invalid call data"}))
            return
        
        # Prevent duplicate call_offer signals
        if signal_type == "call_offer":
            signal_key = f"call_offer:{data.get('call_id')}:{target_user_id}"
            if await self.redis_client.get(signal_key):
                logger.info(f"Skipping duplicate call_offer for call_id {data.get('call_id')}")
                return
            await self.redis_client.setex(signal_key, 60, "sent")

        payload = {
            "type": signal_type,
            "call_id": data.get('call_id'),
            "room_id": room_id,
            "target_user_id": target_user_id,
            "caller": {
                "id": str(self.user.id),
                "username": self.user.username,
                "profile_picture": self.user.profile_picture.url if self.user.profile_picture else None,
            },
            "call_status": data.get('call_status', 'ongoing'),
            "call_type": call_type,
        }
        
        if signal_type in ["call_offer", "call_answer"]:
            payload["sdp"] = data.get('sdp')
        elif signal_type == "ice_candidate":
            payload["candidate"] = data.get('candidate')
            payload["call_id"] = data.get('call_id')
        elif signal_type == "call_ended":
            payload["duration"] = data.get('duration', 0)

        await self.channel_layer.group_send(f"user_{target_user_id}", payload)

    # WebSocket message handlers
    async def call_offer(self, event):
        logger.info(f"Sending call_offer for call_id {event['call_id']} to user {event['target_user_id']}")
        required_fields = ['call_id', 'room_id', 'caller', 'sdp']
        if not all(k in event for k in required_fields):
            logger.info(f"Sending call_offer for call_id {event['call_id']} to user {event['target_user_id']}")
            await self.send(text_data=json.dumps({"type": "error", "error": "Missing call offer data"}))
            return

        await self.send(text_data=json.dumps({
            "type": "call_offer",
            "call_id": event["call_id"],
            "room_id": event["room_id"],
            "caller": event["caller"],
            "sdp": event["sdp"],
            "call_type": event["call_type"],
            "target_user_id": event.get("target_user_id"),
        }))

    async def call_answer(self, event):
        await self.send(text_data=json.dumps(event))

    async def ice_candidate(self, event):
        await self.send(text_data=json.dumps(event))

    async def call_ended(self, event):
        logger.info(f"Sending call_ended for call_id {event['call_id']} with status {event['call_status']}")
        await self.send(text_data=json.dumps({
            "type": "call_ended",
            "call_id": event["call_id"],
            "room_id": event["room_id"],
            "call_status": event["call_status"],
            "duration": event.get("duration", 0)
        }))

    async def call_history_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "call_history_update",
            "call_data": event["call_data"]
        }))