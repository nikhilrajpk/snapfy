from channels.generic.websocket import AsyncWebsocketConsumer
import json
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from channels.db import database_sync_to_async
from django.utils import timezone
from .models import ChatRoom, Message
from cryptography.fernet import Fernet

User = get_user_model()

class UserChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = None
        try:
            token = self.scope['query_string'].decode().split('token=')[1] if b'token=' in self.scope['query_string'] else None
            if not token:
                await self.close(code=4003, reason="No token provided")
                return

            self.user = await self.get_user_from_token(token)
            if not self.user:
                await self.close(code=4003, reason="Invalid token")
                return

            self.user_id = str(self.user.id)
            self.group_name = f"user_{self.user_id}"
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.channel_layer.group_add("all_users", self.channel_name)
            await self.accept()
            await self.send(text_data=json.dumps({"type": "connection_established", "user_id": self.user_id}))
            await self.broadcast_user_status(True)
        except Exception as e:
            await self.close(code=4001, reason=f"Connection error: {str(e)}")

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

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            await self.channel_layer.group_discard("all_users", self.channel_name)
            await self.broadcast_user_status(False)
        print(f"User disconnected with code {close_code}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            if message_type == 'chat_message':
                await self.handle_chat_message(data)
            elif message_type == 'mark_as_read':
                await self.handle_mark_as_read(data)
            elif message_type == 'join_all_users':
                await self.channel_layer.group_add("all_users", self.channel_name)
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
            await self.send(text_data=json.dumps({"error": "Room ID and content required"}))
            return

        if not await self.is_user_in_room(room_id):
            await self.send(text_data=json.dumps({"error": "Not authorized for this room"}))
            return

        message_data = await self.save_message(room_id, content, temp_id)
        room_users = await self.get_room_users(room_id)
        for user in room_users:
            await self.channel_layer.group_send(
                f"user_{user.id}",
                {
                    "type": "chat_message",
                    "message": message_data,
                    "room_id": str(room_id),
                    "unread_count": message_data.get('unread_count', 0)
                }
            )

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
        message_data = {
            "type": "chat_message",
            "message": event["message"],
            "room_id": event["room_id"],
            "unread_count": event.get("unread_count", 0)  # Default to 0 if missing
        }
        await self.send(text_data=json.dumps(message_data))

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
        
        if not target_user_id or not room_id or not await self.is_user_in_room(room_id):
            await self.send(text_data=json.dumps({"error": "Invalid call data"}))
            return

        payload = {
            "type": signal_type,
            "call_id": data.get('call_id'),
            "room_id": room_id,
            "target_user_id": target_user_id,
            "caller": {
                "id": str(self.user.id),
                "username": self.user.username,
                "profile_picture": self.user.profile_picture.url if self.user.profile_picture else None
            },
            "call_status": data.get('call_status', 'ongoing')
        }
        
        if signal_type in ["call_offer", "call_answer"]:
            payload["sdp"] = data.get('sdp')
        elif signal_type == "ice_candidate":
            payload["candidate"] = data.get('candidate')
        elif signal_type == "call_ended":
            payload["duration"] = data.get('duration', 0)

        await self.channel_layer.group_send(f"user_{target_user_id}", payload)

    # WebSocket message handlers
    async def call_offer(self, event):
        if all(k in event for k in ['call_id', 'room_id', 'caller', 'sdp']):
            await self.send(text_data=json.dumps({
                "type": "call_offer",
                "call_id": event["call_id"],
                "room_id": event["room_id"],
                "caller": event["caller"],
                "sdp": event["sdp"],
                "call_type": event.get("call_type", "audio")
            }))
            # Send notification
            await self.channel_layer.group_send(
                f"user_{event['target_user_id']}_notifications",
                {
                    "type": "notification_message",
                    "notification": {
                        "id": f"call-{event['call_id']}",
                        "message": json.dumps({
                            "type": "call",
                            "from_user": event["caller"],
                            "room_id": event["room_id"],
                            "call_id": event["call_id"]
                        }),
                        "created_at": timezone.now().isoformat(),
                        "is_read": False
                    }
                }
            )

    async def call_answer(self, event):
        await self.send(text_data=json.dumps(event))

    async def ice_candidate(self, event):
        await self.send(text_data=json.dumps(event))

    async def call_ended(self, event):
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