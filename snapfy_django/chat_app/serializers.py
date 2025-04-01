from rest_framework import serializers
from .models import *
from user_app.serializer import UserSerializer

class ChatRoomSerializer(serializers.ModelSerializer):
    users = UserSerializer(many=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    encryption_key = serializers.SerializerMethodField()
    admin = UserSerializer(read_only=True)

    class Meta:
        model = ChatRoom
        fields = ['id', 'users', 'created_at', 'last_message_at', 'last_message', 
                 'unread_count', 'encryption_key', 'is_group', 'group_name', 'admin']
        read_only_fields = ['id', 'created_at', 'last_message_at']

    def get_last_message(self, obj):
        last_msg = obj.messages.filter(is_deleted=False).order_by('-sent_at').first()
        if last_msg:
            return MessageSerializer(last_msg, context=self.context).data
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0

    def get_encryption_key(self, obj):
        return obj.encryption_key

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(data['id'])
        return data
    
class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    file_url = serializers.SerializerMethodField()
    is_read = serializers.BooleanField(read_only=True)
    is_deleted = serializers.BooleanField(read_only=True)
    tempId = serializers.CharField(required=False, write_only=True)  # Add tempId field

    class Meta:
        model = Message
        fields = ['id', 'room', 'sender', 'content', 'file_url', 'sent_at', 'is_read', 'read_at', 'is_deleted', 'tempId']
        read_only_fields = ['id', 'sender', 'sent_at', 'is_read', 'read_at']

    def get_file_url(self, obj):
        if obj.file:
            return obj.file.url
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(data['id'])
        data['room'] = str(instance.room.id)
        # Include tempId if it was provided during creation
        if hasattr(instance, 'tempId'):
            data['tempId'] = instance.tempId
        return data

class CallLogSerializer(serializers.ModelSerializer):
    caller = UserSerializer(read_only=True)
    receiver = UserSerializer(read_only=True)
    
    class Meta:
        model = CallLog
        fields = ['id', 'caller', 'receiver', 'call_type', 'call_status', 
                 'call_start_time', 'call_end_time', 'duration']
        read_only_fields = ['id', 'call_start_time', 'duration']