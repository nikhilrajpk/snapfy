from rest_framework import serializers
from .models import *
from user_app.models import User
from moviepy.editor import VideoFileClip
import os
import logging
import cloudinary.uploader
import tempfile
import requests, re

class HashtagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hashtag
        fields = ('name',)

class UsernameOnlySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('username', 'profile_picture') 
        
        
class CommentReplySerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    profile_picture = serializers.CharField(source='user.profile_picture', read_only=True)

    class Meta:
        model = CommentReply
        fields = ['id', 'user', 'profile_picture', 'comment', 'text', 'created_at']

    def create(self, validated_data):
        # Set the user from the request context
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

class CommentSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True, default=serializers.CurrentUserDefault())
    replies = CommentReplySerializer(many=True, read_only=True)
    likes = serializers.SerializerMethodField()
    username = serializers.CharField(source='user.username', read_only=True)
    profile_picture = serializers.CharField(source='user.profile_picture', read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'user', 'post', 'text', 'created_at', 'likes', 'replies', 'username', 'profile_picture']
    
    def create(self, validated_data):
        # Ensure the user is set from the request context
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

    def get_likes(self, obj):
        return Like.objects.filter(post=obj.post, user=obj.user).count()  # Simplified;

class PostSerializer(serializers.ModelSerializer):
    hashtags = HashtagSerializer(many=True)
    mentions = UsernameOnlySerializer(many=True)
    id = serializers.IntegerField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    user = UsernameOnlySerializer(read_only=True)
    likes = serializers.SerializerMethodField()
    comments = CommentSerializer(many=True, read_only=True)
    is_liked = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = ('id', 'caption', 'file', 'hashtags', 'mentions', 'created_at', 'user', 'likes', 'comments', 'is_liked', 'comment_count')
    
    def get_likes(self, obj):
        return Like.objects.filter(post=obj).count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Like.objects.filter(post=obj, user=request.user).exists()
        return False
    
    def get_comment_count(self, obj):
        return Comment.objects.filter(post=obj).count()



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
        if not value:
            return []
        mentions_ids = []
        for username in value:
            try:
                user = User.objects.get(username=username)
                mentions_ids.append(user.id)
            except User.DoesNotExist:
                raise serializers.ValidationError(f"User '{username}' does not exist")
        return mentions_ids

    def validate_hashtags(self, value):
        if not value:
            return []
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
        start_time = float(self.initial_data.get('videoStartTime', 0))
        end_time = float(self.initial_data.get('videoEndTime', 60))
        trimmed_duration = end_time - start_time

        if trimmed_duration < 10:
            raise serializers.ValidationError("Video duration after trimming must be at least 10 seconds.")
        if trimmed_duration > 60:
            raise serializers.ValidationError("Video duration after trimming must not exceed 60 seconds.")

        if value is None:
            return None
        if isinstance(value, str) and value.startswith('http'):
            return value
        if hasattr(value, 'name'):
            if value.name.lower().endswith(('.mp4', '.mov', '.avi', '.webm')):
                return value
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

        # Handle video trimming for existing file
        if instance.file and hasattr(instance.file, 'url') and (start_time is not None or end_time is not None) and not file:
            raw_url = str(instance.file.url)
            # Extract the Cloudinary URL by finding the first 'https://'
            match = re.search(r'https://res.cloudinary.com/[^ ]+', raw_url)
            clean_url = match.group(0) if match else raw_url
            logger.info(f"Raw URL: {raw_url}")
            logger.info(f"Cleaned URL for trimming: {clean_url}")
            try:
                response = requests.get(clean_url, stream=True)
                response.raise_for_status()
                with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_file:
                    temp_path = temp_file.name
                    for chunk in response.iter_content(chunk_size=8192):
                        temp_file.write(chunk)

                video = VideoFileClip(temp_path)
                current_duration = video.duration
                start = start_time if start_time is not None else 0
                end = end_time if end_time is not None else min(current_duration, 60)
                trimmed_duration = end - start

                if trimmed_duration < 10 or trimmed_duration > 60:
                    video.close()
                    os.unlink(temp_path)
                    raise serializers.ValidationError("Trimmed video duration must be between 10 and 60 seconds.")

                trimmed_video = video.subclip(start, end)
                trimmed_path = tempfile.mktemp(suffix='.mp4')
                trimmed_video.write_videofile(trimmed_path, codec='libx264', audio_codec='aac', logger=None)
                video.close()
                trimmed_video.close()

                upload_result = cloudinary.uploader.upload(
                    trimmed_path,
                    resource_type="video",
                    public_id=f"posts/trimmed_{instance.id}"
                )
                validated_data['file'] = upload_result['secure_url']

                os.unlink(temp_path)
                os.unlink(trimmed_path)
            except Exception as e:
                logger.error(f"Error trimming existing video: {e}")
                raise serializers.ValidationError(f"Failed to trim existing video: {str(e)}")

        elif file and not isinstance(file, str):  # New file upload
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
                    logger.error(f"Error trimming new video: {e}")
                    raise serializers.ValidationError(f"Failed to trim video: {str(e)}")
            else:
                upload_result = cloudinary.uploader.upload(file, resource_type="image")
                validated_data['file'] = upload_result['secure_url']

        # Preserve existing file if not updated
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
        
        
class SavedPostSerializer(serializers.ModelSerializer):
    post = PostSerializer()
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    class Meta:
        model = SavedPost
        fields = ('id', 'post', 'saved_at', 'user')
        
class CreateSavedPostSerializer(serializers.ModelSerializer):
    post = serializers.PrimaryKeyRelatedField(queryset=Post.objects.all())
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), default=serializers.CurrentUserDefault())

    class Meta:
        model = SavedPost
        fields = ('post', 'user')

    def create(self, validated_data):
        # Create the SavedPost instance with post and user from validated_data
        saved_post = SavedPost.objects.create(
            post=validated_data['post'],
            user=validated_data['user']
        )
        return saved_post
    
    
class RemoveSavedPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedPost
        fields = (id,)
    def delete(self, instance):
        instance.delete()
        
        
class ArchivedPostSerializer(serializers.ModelSerializer):
    post = PostSerializer()
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    
    class Meta:
        model = ArchivedPost
        fields = ('id', 'post', 'user', 'archived_at')
        
class CreateArchivedPostSerializer(serializers.ModelSerializer):
    post = serializers.PrimaryKeyRelatedField(queryset=Post.objects.all())
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    
    class Meta:
        model = ArchivedPost
        fields = ('id', 'post', 'user')
        
    def create(self, validated_data):
        archived_post = ArchivedPost.objects.create(
            post=validated_data['post'],
            user=validated_data['user']
        )
        return archived_post
    
    
class RemoveArchivedPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArchivedPost
        fields = ('id',)
    def delete(self,instance):
        instance.delete()