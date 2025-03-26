from rest_framework import serializers
from .models import *
from user_app.serializer import UserSerializer

class ChatRoomSerializer(serializers.ModelSerializer):
    users = UserSerializer(many=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    encryption_key = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = ('id', 'users', 'created_at', 'last_message_at', 'last_message', 'unread_count', 'encryption_key')

    def get_last_message(self, obj):
        msg = obj.messages.filter(is_deleted=False).order_by('-sent_at').first()
        return MessageSerializer(msg).data if msg else None

    def get_unread_count(self, obj):
        count = obj.messages.filter(is_read=False).exclude(sender=self.context['request'].user).count()
        print(f"Unread count for room {obj.id}: {count}")
        return count

    def get_encryption_key(self, obj):
        key = obj.get_encryption_key()
        print(f"Room {obj.id} encryption key: {key}")
        return key

    def to_representation(self, instance):
        data = super().to_representation(instance)
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
        print(f"File in obj: {obj.file}")  # Debug
        return obj.file.url if obj.file else None

    def create(self, validated_data):
        file = validated_data.pop('file', None)
        message = Message.objects.create(**validated_data)
        if file:
            message.file = file
            message.save()
        return message

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(data['id'])
        data['room'] = str(data['room'])
        if data['sender']:
            data['sender']['id'] = str(data['sender']['id'])
        else:
            data['sender'] = {'id': None, 'username': 'Unknown', 'profile_picture': None}
        return data