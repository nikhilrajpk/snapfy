from rest_framework import serializers
from .models import *
from user_app.serializer import UserSerializer

class ChatRoomSerializer(serializers.ModelSerializer):
    users = UserSerializer(many=True)
    last_message = serializers.SerializerMethodField()
    encryption_key = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = ('id', 'users', 'created_at', 'last_message_at', 'last_message', 'encryption_key')

    def get_last_message(self, obj):
        msg = obj.messages.filter(is_deleted=False).order_by('-sent_at').first()
        return MessageSerializer(msg).data if msg else None

    def get_encryption_key(self, obj):
        return obj.get_encryption_key()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Convert UUID fields to strings
        data['id'] = str(data['id'])
        return data
    
    
class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'room', 'sender', 'content', 'file_url', 'sent_at', 'is_read', 'is_deleted']
        read_only_fields = ['id', 'sender', 'sent_at', 'is_read']

    def get_file_url(self, obj):
        return obj.file.url if obj.file else None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Convert UUID fields to strings
        data['id'] = str(data['id'])
        data['room'] = str(data['room'])
        data['sender']['id'] = str(data['sender']['id'])
        return data