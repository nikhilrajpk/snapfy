from channels.generic.websocket import AsyncWebsocketConsumer
import json
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from .models import ChatRoom, Message
from channels.db import database_sync_to_async

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f"chat_{self.room_id}"
        try:
            token = self.scope['query_string'].decode().split('token=')[1].split('&')[0]
            user = await self.get_user_from_token(token)
            if not user or not await self.is_user_in_room(user):
                await self.close(code=4003, reason="Invalid token or not in room")
                return
            self.scope['user'] = user
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.accept()
            print(f"User {user.username} connected to room {self.room_id}")
        except Exception as e:
            await self.close(code=4001, reason=f"Connection error: {str(e)}")

    @database_sync_to_async
    def get_user_from_token(self, token):
        try:
            access_token = AccessToken(token)
            return User.objects.get(id=access_token['user_id'])
        except Exception:
            return None

    @database_sync_to_async
    def is_user_in_room(self, user):
        return ChatRoom.objects.filter(id=self.room_id, users=user).exists()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            if message_type == 'chat_message':
                message = data.get('message')
                if message:
                    saved_message = await self.save_message(message)
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {"type": "chat_message", "message": saved_message}
                    )
            elif message_type == 'mark_as_read':
                user_id = await self.mark_messages_read()
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {"type": "mark_as_read", "user_id": user_id}
                )
        except json.JSONDecodeError as e:
            print(f"Invalid JSON: {str(e)}")
            await self.send(text_data=json.dumps({"error": "Invalid message format"}))
        except Exception as e:
            print(f"Error in receive: {str(e)}")
            await self.close(code=1011, reason=f"Processing error: {str(e)}")

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "type": "chat_message",
            "message": event["message"]
        }))

    async def mark_as_read(self, event):
        await self.send(text_data=json.dumps({
            "type": "mark_as_read",
            "user_id": event["user_id"]
        }))

    @database_sync_to_async
    def save_message(self, message_data):
        room = ChatRoom.objects.get(id=self.room_id)
        sender = self.scope['user']
        message = Message.objects.create(
            room=room,
            sender=sender,
            content=message_data.get('content', ''),
            file_url=message_data.get('file_url', '')
        )
        room.last_message = message
        room.last_message_at = message.sent_at
        room.unread_count = room.messages.filter(is_read=False).exclude(sender=sender).count()
        room.save()
        return {
            "id": str(message.id),
            "room": str(room.id),
            "content": message.content,
            "file_url": message.file_url,
            "sent_at": message.sent_at.isoformat(),
            "is_read": message.is_read,
            "is_deleted": message.is_deleted,
            "sender": {
                "id": str(sender.id),
                "username": sender.username,
                "profile_picture": sender.profile_picture.url if sender.profile_picture else None
            }
        }

    @database_sync_to_async
    def mark_messages_read(self):
        room = ChatRoom.objects.get(id=self.room_id)
        messages = room.messages.filter(is_read=False).exclude(sender=self.scope['user'])
        messages.update(is_read=True)
        room.unread_count = 0
        room.save()
        return str(self.scope['user'].id)

class StatusConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.group_name = f"user_{self.user_id}"
        try:
            token = self.scope['query_string'].decode().split('token=')[1].split('&')[0]
            user = await self.get_user_from_token(token)
            if not user or str(user.id) != self.user_id:
                await self.close(code=4003, reason="Invalid token or user mismatch")
                return
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.accept()
            print(f"User {user.username} connected to status {self.user_id}")
        except Exception as e:
            await self.close(code=4001, reason=f"Connection error: {str(e)}")

    @database_sync_to_async
    def get_user_from_token(self, token):
        try:
            access_token = AccessToken(token)
            return User.objects.get(id=access_token['user_id'])
        except Exception:
            return None

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def user_status_update(self, event):
        await self.send(text_data=json.dumps(event))