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
        fields = ('username', 'profile_picture') 

class PostSerializer(serializers.ModelSerializer):
    hashtags = HashtagSerializer(many=True)
    mentions = UsernameOnlySerializer(many=True)
    id = serializers.IntegerField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    user = UsernameOnlySerializer(read_only=True)

    class Meta:
        model = Post
        fields = ('id', 'caption', 'file', 'hashtags', 'mentions', 'created_at', 'user')



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

class PostUpdateSerializer(serializers.ModelSerializer):
    file = serializers.FileField(required=False, allow_null=True)
    mentions = serializers.ListField(child=serializers.CharField(), required=False, allow_null=True)
    hashtags = serializers.ListField(child=serializers.CharField(), required=False, allow_null=True)
    videoStartTime = serializers.FloatField(required=False, default=0)
    videoEndTime = serializers.FloatField(required=False, default=60)

    class Meta:
        model = Post
        fields = ('file', 'user', 'mentions', 'hashtags', 'caption', 'videoStartTime', 'videoEndTime')
        extra_kwargs = {'user': {'required': False}}

    def validate_mentions(self, value):
        logger.info(f"Validating mentions: {value}")
        if value is None:
            return []
        mentions_ids = []
        for username in value:
            try:
                user = User.objects.get(username=username)
                mentions_ids.append(user.id)
            except User.DoesNotExist:
                logger.error(f"User '{username}' does not exist")
                raise serializers.ValidationError(f"User '{username}' does not exist")
        return mentions_ids

    def validate_hashtags(self, value):
        logger.info(f"Validating hashtags: {value}")
        if value is None:
            return []
        hashtag_ids = []
        for name in value:
            hashtag, _ = Hashtag.objects.get_or_create(name=name)
            hashtag_ids.append(hashtag.id)
        return hashtag_ids

    def validate_file(self, value):
        logger.info(f"Validating file: {type(value)} - {value}")
        if value is None:
            return None  # Allow no file change
        if isinstance(value, str) and value.startswith('http'):
            return value  # Accept existing URL
        if hasattr(value, 'name'):  # Check if it's a file
            if value.name.lower().endswith(('.mp4', '.mov', '.avi', '.webm')):
                start_time = float(self.initial_data.get('videoStartTime', 0))
                end_time = float(self.initial_data.get('videoEndTime', 60))
                if end_time - start_time > 60:
                    raise serializers.ValidationError("Video duration after trimming must not exceed 60 seconds.")
            return value
        raise serializers.ValidationError("Invalid file data provided.")

    def update(self, instance, validated_data):
        logger.info(f"Updating post {instance.id} with validated_data: {validated_data}")
        logger.info(f"Current instance.file before update: {instance.file}")
        mentions = validated_data.pop('mentions', None)
        hashtags = validated_data.pop('hashtags', None)
        start_time = validated_data.pop('videoStartTime', None)
        end_time = validated_data.pop('videoEndTime', None)
        file = validated_data.pop('file', None)

        if file and not isinstance(file, str):  # New file upload
            if file.name.lower().endswith(('.mp4', '.mov', '.avi', '.webm')):
                try:
                    with tempfile.NamedTemporaryFile(delete=False, suffix=file.name) as temp_file:
                        temp_path = temp_file.name
                        for chunk in file.chunks():
                            temp_file.write(chunk)

                    video = VideoFileClip(temp_path)
                    trimmed_duration = min(end_time or 60, video.duration) - (start_time or 0)
                    if trimmed_duration > 60:
                        end_time = (start_time or 0) + 60
                    trimmed_video = video.subclip(start_time or 0, end_time or 60)
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
        else:
            # Explicitly preserve the existing file if not provided
            if 'file' not in validated_data:
                validated_data['file'] = instance.file

        # Update instance fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        logger.info(f"Post {instance.id} saved with file: {instance.file}")

        if mentions is not None:
            logger.info(f"Clearing and setting new mentions with IDs: {mentions}")
            instance.mentions.clear()
            instance.mentions.set(mentions)
        if hashtags is not None:
            logger.info(f"Clearing and setting new hashtags with IDs: {hashtags}")
            instance.hashtags.clear()
            instance.hashtags.set(hashtags)

        return instance
    
    
class PostDeleteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = ('id',)
    
    def delete(self, instance):
        instance.delete()