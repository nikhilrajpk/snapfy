from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from cryptography.fernet import Fernet, InvalidToken
import base64
import binascii
from .models import ChatRoom, Message, User
from .serializers import ChatRoomSerializer, MessageSerializer, UserSerializer
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone

class ChatAPIViewSet(viewsets.ModelViewSet):
    queryset = ChatRoom.objects.all()
    permission_classes = [IsAuthenticated]
    serializer_class = ChatRoomSerializer

    def get_queryset(self):
        return ChatRoom.objects.filter(users=self.request.user)

    @action(detail=False, methods=['get'], url_path='my-chats')
    def my_chats(self, request):
        chat_rooms = self.get_queryset().prefetch_related('users', 'messages').order_by('-last_message_at')
        serializer = self.get_serializer(chat_rooms, many=True, context={'request': request})
        data = serializer.data

        for room_data in data:
            if room_data['last_message'] and not room_data['last_message']['is_deleted']:
                try:
                    fernet = Fernet(room_data['encryption_key'].encode())
                    room_data['last_message']['content'] = fernet.decrypt(
                        room_data['last_message']['content'].encode()
                    ).decode()
                except (InvalidToken, ValueError, binascii.Error):
                    room_data['last_message']['content'] = '[Decryption Error]'
        return Response(data)

    @action(detail=False, methods=['post'], url_path='start-chat')
    def start_chat(self, request):
        username = request.data.get('username')
        if not username:
            return Response({"error": "Username required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            other_user = User.objects.get(username=username)
            if other_user == request.user:
                return Response({"error": "Cannot chat with yourself"}, status=status.HTTP_400_BAD_REQUEST)
            
            chat_room = ChatRoom.objects.filter(users=request.user).filter(users=other_user).first()
            if not chat_room:
                chat_room = ChatRoom.objects.create()
                chat_room.users.add(request.user, other_user)
            return Response(ChatRoomSerializer(chat_room, context={'request': request}).data, status=status.HTTP_201_CREATED)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'], url_path='create-group')
    def create_group(self, request):
        group_name = request.data.get('group_name')
        usernames = request.data.get('usernames', [])  # List of usernames to add

        if not group_name:
            return Response({"error": "Group name required"}, status=status.HTTP_400_BAD_REQUEST)

        chat_room = ChatRoom.objects.create(is_group=True, group_name=group_name, admin=request.user)  # Set creator as admin
        chat_room.users.add(request.user)  # Add creator to the group

        for username in usernames:
            try:
                user = User.objects.get(username=username)
                if user != request.user:
                    chat_room.users.add(user)
            except User.DoesNotExist:
                pass  # Silently skip invalid usernames

        serializer = ChatRoomSerializer(chat_room, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='add-user')
    def add_user(self, request, pk=None):
        chat_room = self.get_object()
        if not chat_room.is_group or request.user not in chat_room.users.all():
            return Response({"error": "Not authorized or not a group"}, status=status.HTTP_403_FORBIDDEN)

        username = request.data.get('username')
        if not username:
            return Response({"error": "Username required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(username=username)
            if user in chat_room.users.all():
                return Response({"error": "User already in group"}, status=status.HTTP_400_BAD_REQUEST)
            chat_room.add_user(user)
            return Response(ChatRoomSerializer(chat_room, context={'request': request}).data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='remove-user')
    def remove_user(self, request, pk=None):
        chat_room = self.get_object()
        if not chat_room.is_group or request.user != chat_room.admin:  # Only admin can remove users
            return Response({"error": "Not authorized or not a group admin"}, status=status.HTTP_403_FORBIDDEN)

        username = request.data.get('username')
        if not username:
            return Response({"error": "Username required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(username=username)
            if user not in chat_room.users.all():
                return Response({"error": "User not in group"}, status=status.HTTP_400_BAD_REQUEST)
            if user == chat_room.admin:
                return Response({"error": "Cannot remove the admin"}, status=status.HTTP_400_BAD_REQUEST)
            if chat_room.users.count() <= 2:  # Prevent emptying group
                return Response({"error": "Cannot remove last member"}, status=status.HTTP_400_BAD_REQUEST)
            chat_room.remove_user(user)
            return Response(ChatRoomSerializer(chat_room, context={'request': request}).data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='leave-group')
    def leave_group(self, request, pk=None):
        chat_room = self.get_object()
        if not chat_room.is_group or request.user not in chat_room.users.all():
            return Response({"error": "Not authorized or not a group"}, status=status.HTTP_403_FORBIDDEN)

        if request.user == chat_room.admin:
            return Response({"error": "Admin cannot leave the group"}, status=status.HTTP_400_BAD_REQUEST)

        chat_room.remove_user(request.user)
        return Response({"message": "You have left the group"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='update-group-name')
    def update_group_name(self, request, pk=None):
        chat_room = self.get_object()
        if not chat_room.is_group or request.user not in chat_room.users.all():
            return Response({"error": "Not authorized or not a group"}, status=status.HTTP_403_FORBIDDEN)

        group_name = request.data.get('group_name')
        if not group_name:
            return Response({"error": "Group name required"}, status=status.HTTP_400_BAD_REQUEST)

        chat_room.group_name = group_name
        chat_room.save()
        return Response(ChatRoomSerializer(chat_room, context={'request': request}).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='messages')
    def get_messages(self, request, pk=None):
        chat_room = self.get_object()
        messages = chat_room.messages.all().order_by('sent_at')
        serializer = MessageSerializer(messages, many=True, context={'request': request})
        data = serializer.data

        try:
            fernet = Fernet(chat_room.encryption_key.encode())
            for msg in data:
                if not msg['is_deleted'] and msg['content']:
                    try:
                        msg['content'] = fernet.decrypt(msg['content'].encode()).decode()
                    except (InvalidToken, ValueError):
                        msg['content'] = '[Decryption Error]'
        except (ValueError, binascii.Error) as e:
            return Response({"error": f"Invalid encryption key: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(data)

    @action(detail=True, methods=['post'], url_path='send-message')
    def send_message(self, request, pk=None):
        chat_room = self.get_object()
        if request.user not in chat_room.users.all():
            return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

        content = request.data.get('content', '')
        file = request.FILES.get('file')
        temp_id = request.data.get('tempId')

        fernet = Fernet(chat_room.encryption_key.encode())
        encrypted_content = fernet.encrypt(content.encode()).decode() if content else ''

        message = Message.objects.create(
            room=chat_room,
            sender=request.user,
            content=encrypted_content,
            file=file if file else None
        )

        serializer = MessageSerializer(message, context={'request': request})
        message_data = serializer.data
        message_data['content'] = content
        message_data['encrypted_content'] = encrypted_content
        message_data['id'] = str(message.id)
        message_data['room'] = str(chat_room.id)
        message_data['sender'] = {
            'id': str(request.user.id),
            'username': request.user.username,
            'profile_picture': request.user.profile_picture.url if request.user.profile_picture else None
        }
        if temp_id:
            message_data['tempId'] = temp_id
        if file:
            message_data['file_url'] = message.file.url if message.file else None
            message_data['file_type'] = 'audio' if file.name.endswith(('.mp3', '.wav', '.ogg', '.webm')) else 'other'

        chat_room.last_message_at = message.sent_at
        chat_room.unread_count = chat_room.messages.filter(is_read=False).exclude(sender=request.user).count()
        chat_room.save()
        message_data['unread_count'] = chat_room.unread_count

        channel_layer = get_channel_layer()
        if channel_layer:
            for user in chat_room.users.all():
                user_specific_unread_count = (
                    0 if user == request.user
                    else chat_room.messages.filter(is_read=False).exclude(sender=user).count()
                )
                async_to_sync(channel_layer.group_send)(
                    f"user_{user.id}",
                    {
                        "type": "chat_message",
                        "message": message_data,
                        "room_id": str(chat_room.id),
                        "unread_count": user_specific_unread_count
                    }
                )
        return Response(message_data, status=status.HTTP_201_CREATED)
    
    
    @action(detail=True, methods=['post'], url_path='delete-message')
    def delete_message(self, request, pk=None):
        message_id = request.data.get('message_id')
        try:
            message = Message.objects.get(id=message_id, room__id=pk, sender=request.user)
            message.is_deleted = True
            message.content = "[Deleted]"
            message.file = None  # Clear file if present
            message.save()

            message_data = MessageSerializer(message, context={'request': request}).data
            message_data['id'] = str(message.id)
            message_data['room'] = str(message.room.id)
            message_data['sender'] = {
                'id': str(message.sender.id),
                'username': message.sender.username,
                'profile_picture': message.sender.profile_picture.url if message.sender.profile_picture else None
            }
            message_data['file_url'] = None

            chat_room = message.room
            chat_room.unread_count = chat_room.messages.filter(is_read=False).exclude(sender=request.user).count()
            chat_room.save()
            message_data['unread_count'] = chat_room.unread_count

            channel_layer = get_channel_layer()
            if channel_layer:
                for user in chat_room.users.all():
                    async_to_sync(channel_layer.group_send)(
                        f"user_{user.id}",
                        {
                            "type": "chat_message",
                            "message": message_data,
                            "room_id": str(pk),
                            "unread_count": chat_room.unread_count
                        }
                    )
            return Response({"message": "Message deleted"}, status=status.HTTP_200_OK)
        except Message.DoesNotExist:
            return Response({"error": "Message not found or not yours"}, status=status.HTTP_404_NOT_FOUND)
    
    
    @action(detail=False, methods=['get'], url_path='search-users')
    def search_users(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({"error": "Search term required"}, status=status.HTTP_400_BAD_REQUEST)
        users = User.objects.filter(username__icontains=query).exclude(id=request.user.id)
        serializer = UserSerializer(users, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='mark-as-read')
    def mark_as_read(self, request, pk=None):
        chat_room = self.get_object()
        if request.user not in chat_room.users.all():
            return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

        messages = chat_room.messages.filter(is_read=False).exclude(sender=request.user)
        updated_ids = list(messages.values_list('id', flat=True))

        if updated_ids:
            messages.update(is_read=True, read_at=timezone.now())
            chat_room.unread_count = 0
            chat_room.save()

            channel_layer = get_channel_layer()
            if channel_layer:
                for user in chat_room.users.all():
                    async_to_sync(channel_layer.group_send)(
                        f"user_{user.id}",
                        {
                            "type": "mark_as_read",
                            "room_id": str(chat_room.id),
                            "user_id": str(request.user.id),
                            "updated_ids": [str(id) for id in updated_ids],
                            "read_at": timezone.now().isoformat()
                        }
                    )
            else:
                print("Channel layer not available")

        return Response({
            "message": "Messages marked as read",
            "count": len(updated_ids),
            "updated_ids": [str(id) for id in updated_ids]
        }, status=status.HTTP_200_OK)