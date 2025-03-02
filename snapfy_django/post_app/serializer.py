from rest_framework import serializers
from .models import Post, Hashtag
from user_app.models import User
from moviepy.editor import VideoFileClip
import os
import logging
import cloudinary.uploader
import tempfile

class HashtagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hashtag
        fields = ('name',)

class UsernameOnlySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('username',)  

class PostSerializer(serializers.ModelSerializer):
    hashtags = HashtagSerializer(many=True) 
    mentions = UsernameOnlySerializer(many=True)  
    id = serializers.IntegerField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Post
        fields = ('id', 'caption', 'file', 'hashtags', 'mentions', 'created_at')



logger = logging.getLogger(__name__)

class PostCreateSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    file = serializers.FileField(required=True)
    mentions = serializers.ListField(child=serializers.CharField(), required=False)
    hashtags = serializers.ListField(child=serializers.CharField(), required=False)
    videoStartTime = serializers.FloatField(required=False, default=0)
    videoEndTime = serializers.FloatField(required=False, default=60)

    class Meta:
        model = Post
        fields = ('id', 'file', 'created_at', 'user', 'mentions', 'hashtags', 'caption', 'videoStartTime', 'videoEndTime')
        extra_kwargs = {'user': {'required': False}}

    def validate_mentions(self, value):
        mentions_ids = []
        for username in value:
            try:
                user = User.objects.get(username=username)
                mentions_ids.append(user.id)
            except User.DoesNotExist:
                raise serializers.ValidationError(f"User '{username}' does not exist")
        return mentions_ids

    def validate_hashtags(self, value):
        hashtag_ids = []
        for name in value:
            hashtag, _ = Hashtag.objects.get_or_create(name=name)
            hashtag_ids.append(hashtag.id)
        return hashtag_ids

    def validate_file(self, value):
        if value.name.lower().endswith(('.mp4', '.mov', '.avi', '.webm')):
            start_time = float(self.initial_data.get('videoStartTime', 0))
            end_time = float(self.initial_data.get('videoEndTime', 60))
            if end_time - start_time > 60:
                raise serializers.ValidationError("Video duration after trimming must not exceed 60 seconds.")
        return value

    def create(self, validated_data):
        mentions = validated_data.pop('mentions', [])
        hashtags = validated_data.pop('hashtags', [])
        start_time = validated_data.pop('videoStartTime', 0)
        end_time = validated_data.pop('videoEndTime', 60)
        file = validated_data.pop('file')

        if file.name.lower().endswith(('.mp4', '.mov', '.avi', '.webm')):
            try:
                with tempfile.NamedTemporaryFile(delete=False, suffix=file.name) as temp_file:
                    temp_path = temp_file.name
                    for chunk in file.chunks():
                        temp_file.write(chunk)

                video = VideoFileClip(temp_path)
                trimmed_duration = min(end_time, video.duration) - start_time
                if trimmed_duration > 60:
                    end_time = start_time + 60
                trimmed_video = video.subclip(start_time, end_time)
                trimmed_path = tempfile.mktemp(suffix=file.name)
                trimmed_video.write_videofile(trimmed_path, codec='libx264', audio_codec='aac', logger=None)
                video.close()
                trimmed_video.close()

                upload_result = cloudinary.uploader.upload(
                    trimmed_path,
                    resource_type="video",
                    public_id=f"posts/trimmed_{file.name.split('.')[0]}"
                )
                validated_data['file'] = upload_result['secure_url']

                os.unlink(temp_path)
                os.unlink(trimmed_path)
            except Exception as e:
                logger.error(f"Error trimming video: {e}")
                raise serializers.ValidationError(f"Failed to trim video: {str(e)}")
        else:
            upload_result = cloudinary.uploader.upload(file, resource_type="image")
            validated_data['file'] = upload_result['secure_url']

        post = Post.objects.create(**validated_data)
        post.mentions.set(mentions)
        post.hashtags.set(hashtags)
        return post