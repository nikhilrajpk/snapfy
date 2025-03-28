from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from cryptography.fernet import Fernet
from .models import *
from .serializers import *
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
        return Response(serializer.data)

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

    @action(detail=True, methods=['get'], url_path='messages')
    def get_messages(self, request, pk=None):
        chat_room = self.get_object()
        messages = chat_room.messages.filter(is_deleted=False).order_by('sent_at')
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='send-message')
    def send_message(self, request, pk=None):
        chat_room = self.get_object()
        if request.user not in chat_room.users.all():
            return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

        content = request.data.get('content', '')
        file = request.FILES.get('file')
        temp_id = request.data.get('tempId')  # Get tempId from the frontend
        
        print(f"Received: content={content}, file={file}, tempId={temp_id}")  # Debug
        
        message = Message.objects.create(
            room=chat_room,
            sender=request.user,
            content=content,
            file=file if file else None
        )
        print(f"Message created: id={message.id}, file={message.file}")  # Debug
        
        serializer = MessageSerializer(message, context={'request': request})
        message_data = serializer.data
        message_data['id'] = str(message_data['id'])
        message_data['room'] = str(message_data['room'])
        message_data['sender']['id'] = str(message_data['sender']['id'])
        if temp_id:  # Include tempId in the response if provided
            message_data['tempId'] = temp_id

        # Update room metadata
        chat_room.last_message = message
        chat_room.last_message_at = message.sent_at
        chat_room.unread_count = chat_room.messages.filter(is_read=False).exclude(sender=request.user).count()
        chat_room.save()

        # Send WebSocket message to all clients in the room
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"chat_{chat_room.id}",
            {"type": "chat_message", "message": message_data}
        )

        # Notify all room users about the chat room update
        for user in chat_room.users.all():
            async_to_sync(channel_layer.group_send)(
                f"user_{user.id}",
                {
                    "type": "chat_room_update",
                    "room_id": str(chat_room.id),
                    "last_message": message_data,
                    "unread_count": chat_room.messages.filter(is_read=False).exclude(sender=user).count()
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
            message.save()

            message_data = MessageSerializer(message).data
            message_data['id'] = str(message_data['id'])
            message_data['room'] = str(message_data['room'])
            message_data['sender']['id'] = str(message_data['sender']['id'])

            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"chat_{pk}",
                {"type": "chat_message", "message": message_data}
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
        messages = chat_room.messages.filter(is_read=False).exclude(sender=request.user)
        updated_ids = list(messages.values_list('id', flat=True))
        
        # Mark messages as read and set read_at timestamp
        messages.update(is_read=True, read_at=timezone.now())
        
        # Update room's unread count
        chat_room.unread_count = 0
        chat_room.save()
        
        # Notify all clients in the room
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"chat_{chat_room.id}",
            {
                "type": "mark_as_read",
                "room_id": str(chat_room.id),
                "user_id": str(request.user.id),
                "updated_ids": updated_ids,
                "read_at": timezone.now().isoformat()
            }
        )
        
        return Response({
            "message": "Messages marked as read",
            "count": len(updated_ids),
            "updated_ids": updated_ids
        }, status=status.HTTP_200_OK)