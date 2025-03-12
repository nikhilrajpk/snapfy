from rest_framework import serializers
from .models import Story
from user_app.models import User
import cloudinary

class UserSerializer(serializers.ModelSerializer):
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'profile_picture']

    def get_profile_picture(self, obj):
        if obj.profile_picture:
            # Extract the public ID from the CloudinaryResource
            public_id = str(obj.profile_picture)  # or obj.profile_picture.public_id
            return cloudinary.utils.cloudinary_url(public_id)[0]
        return None

class StorySerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    file = serializers.SerializerMethodField()
    viewer_count = serializers.SerializerMethodField()
    like_count = serializers.SerializerMethodField()
    has_liked = serializers.SerializerMethodField()

    class Meta:
        model = Story
        fields = ['id', 'user', 'file', 'caption', 'created_at', 'expires_at', 'viewer_count', 'like_count', 'has_liked']

    def get_file(self, obj):
        if obj.file:
            # Extract the public ID from the CloudinaryResource
            public_id = str(obj.file)  # or obj.file.public_id
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