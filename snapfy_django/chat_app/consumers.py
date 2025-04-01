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
            headers = dict(self.scope['headers'])
            print("WebSocket Headers:", headers)

            token = self.scope['query_string'].decode().split('token=')[1] if b'token=' in self.scope['query_string'] else None
            if not token:
                cookie_header = headers.get(b'cookie', b'').decode('utf-8')
                if not cookie_header:
                    print("No cookies or token provided")
                    await self.close(code=4003, reason="No cookies or token provided")
                    return
                for cookie in cookie_header.split('; '):
                    if cookie.startswith('access_token='):
                        token = cookie.split('=')[1]
                        break
                if not token:
                    print("No access token found in cookies:", cookie_header)
                    await self.close(code=4003, reason="No access token found")
                    return

            print("Access Token:", token)
            self.user = await self.get_user_from_token(token)
            if not self.user:
                print("Invalid token or user not found")
                await self.close(code=4003, reason="Invalid token")
                return

            self.user_id = str(self.user.id)
            self.group_name = f"user_{self.user_id}"
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.accept()
            await self.send(text_data=json.dumps({"type": "connection_established", "user_id": self.user_id}))

            # Broadcast user online status
            await self.broadcast_user_status(True)
            print(f"User {self.user.username} connected to WebSocket")
        except Exception as e:
            print(f"WebSocket connection error: {str(e)}")
            await self.close(code=4001, reason=f"Connection error: {str(e)}")

    @database_sync_to_async
    def get_user_from_token(self, token):
        try:
            access_token = AccessToken(token)
            user = User.objects.get(id=access_token['user_id'])
            user.is_online = True
            user.last_seen = timezone.now()
            user.save()
            print(f"User authenticated: {user.username}")
            return user
        except Exception as e:
            print(f"Token validation error: {str(e)}")
            return None

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
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
        except json.JSONDecodeError as e:
            await self.send(text_data=json.dumps({"error": "Invalid message format"}))
        except Exception as e:
            await self.send(text_data=json.dumps({"error": f"Processing error: {str(e)}"}))

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
                    "room_id": str(room_id)
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
            }
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
        await self.send(text_data=json.dumps({
            "type": "chat_message",
            "message": event["message"],
            "room_id": event["room_id"]
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