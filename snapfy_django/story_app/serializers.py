from rest_framework import serializers
from .models import Story, MusicTrack, LiveStream
from user_app.models import User
import cloudinary
import logging
from django.conf import settings


logger = logging.getLogger(__name__)

# CLOUD_NAME from settings
CLOUDINARY_CLOUD_NAME = settings.CLOUDINARY_STORAGE['CLOUD_NAME']

class MusicTrackSerializer(serializers.ModelSerializer):
    file = serializers.SerializerMethodField()

    class Meta:
        model = MusicTrack
        fields = ['id', 'title', 'file', 'duration', 'is_trending']

    def get_file(self, obj):
        if obj.file:
            # Convert CloudinaryResource to string first
            file_url = str(obj.file)
            # Ensure the URL includes /video/upload/
            if 'video/upload' not in file_url:
                return f"https://res.cloudinary.com/{settings.CLOUDINARY_STORAGE['CLOUD_NAME']}/video/upload/{file_url}"
            return file_url
        return None

class UserSerializer(serializers.ModelSerializer):
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'profile_picture']

    def get_profile_picture(self, obj):
        if obj.profile_picture:
            # Extract the public ID from the CloudinaryResource
            public_id = str(obj.profile_picture)  
            return cloudinary.utils.cloudinary_url(public_id)[0]
        return None

class StorySerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    file = serializers.SerializerMethodField()
    viewer_count = serializers.SerializerMethodField()
    like_count = serializers.SerializerMethodField()
    has_liked = serializers.SerializerMethodField()
    videoStartTime = serializers.FloatField(required=False, default=0)
    videoEndTime = serializers.FloatField(required=False, default=30)
    music = MusicTrackSerializer(read_only=True)

    class Meta:
        model = Story
        fields = ['id', 'user', 'file', 'caption', 'created_at', 'expires_at', 'viewer_count', 'like_count', 'has_liked', 'videoStartTime', 'videoEndTime', 'music']

    def get_file(self, obj):
        if obj.file:
            # Extract the public ID from the CloudinaryResource
            public_id = str(obj.file)
            return cloudinary.utils.cloudinary_url(public_id)[0]
        return None

    def get_viewer_count(self, obj):
        return obj.viewers.count()

    def get_like_count(self, obj):
        return obj.likes.count()

    def get_has_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(id=request.user.id).exists()
        return False

class StoryViewerSerializer(serializers.ModelSerializer):
    viewers = serializers.SerializerMethodField()

    class Meta:
        model = Story
        fields = ['id', 'viewers']

    def get_viewers(self, obj):
        viewers = obj.viewers.all()
        return [{
            'id': viewer.id,
            'username': viewer.username,
            'profile_picture': cloudinary.utils.cloudinary_url(str(viewer.profile_picture))[0] if viewer.profile_picture else None,
            'has_liked': obj.likes.filter(id=viewer.id).exists()
        } for viewer in viewers]
        

class LiveStreamSerializer(serializers.ModelSerializer):
    host = UserSerializer(read_only=True)
    viewer_count = serializers.SerializerMethodField()
    is_host = serializers.SerializerMethodField()
    stream_key = serializers.CharField(read_only=True)
    recording_url = serializers.SerializerMethodField()

    class Meta:
        model = LiveStream
        fields = ['id', 'host', 'title', 'created_at', 'is_active', 'viewer_count', 'is_host', 'ended_at', 'stream_key', 'recording_url']

    def get_viewer_count(self, obj):
        return obj.viewers.count()

    def get_is_host(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.host == request.user
        return False

    def get_recording_url(self, obj):
        if obj.recording_url:
            return cloudinary.utils.cloudinary_url(str(obj.recording_url))[0]
        return None