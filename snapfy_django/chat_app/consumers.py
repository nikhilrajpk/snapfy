from channels.generic.websocket import AsyncWebsocketConsumer
import json
from django.core.exceptions import PermissionDenied
from channels.db import database_sync_to_async
from .models import ChatRoom
from user_app.models import User

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f"chat_{self.room_id}"
        query_string = self.scope['query_string'].decode()
        try:
            token = query_string.split('token=')[1].split('&')[0]  # Handle extra params
        except IndexError:
            print("No token provided in query string")
            raise PermissionDenied("No token provided")

        user = await self.get_user_from_token(token)
        if not user or not await self.is_user_in_room(user):
            print(f"User validation failed for token: {token}")
            raise PermissionDenied("Invalid token or access denied")

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        if data.get('mark_read'):
            await self.mark_messages_read()
        await self.channel_layer.group_send(
            self.room_group_name,
            {"type": "chat_message", "message": data.get('message', {})}
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({"message": event["message"]}))

    @database_sync_to_async
    def get_user_from_token(self, token):
        from rest_framework_simplejwt.tokens import AccessToken, TokenError
        try:
            token_obj = AccessToken(token)
            return User.objects.get(id=token_obj['user_id'])
        except TokenError as e:
            print(f"Token error: {e}")
            return None
        except User.DoesNotExist:
            print(f"User not found for token: {token}")
            return None

    @database_sync_to_async
    def is_user_in_room(self, user):
        try:
            return ChatRoom.objects.filter(id=self.room_id, users=user).exists()
        except ChatRoom.DoesNotExist:
            print(f"ChatRoom {self.room_id} does not exist")
            return False

    @database_sync_to_async
    def mark_messages_read(self):
        from .models import Message
        Message.objects.filter(room_id=self.room_id, is_read=False).update(is_read=True)