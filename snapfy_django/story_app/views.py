import tempfile
import os
import logging
import uuid
from datetime import datetime, timedelta
from django.utils.timezone import now
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from .models import Story, MusicTrack, LiveStream
from moviepy.editor import VideoFileClip
import cloudinary.uploader
from user_app.models import User, BlockedUser
from .serializers import StorySerializer, StoryViewerSerializer, MusicTrackSerializer, LiveStreamSerializer
from django.db.models import Q
from notification_app.utils import create_live_notification
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from channels.db import database_sync_to_async
from django.utils import timezone

logger = logging.getLogger(__name__)

class StoryPagination(PageNumberPagination):
    page_size = 10  # Number of stories per page
    page_size_query_param = 'page_size'
    max_page_size = 100

class MusicTrackListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tracks = MusicTrack.objects.all()
        serializer = MusicTrackSerializer(tracks, many=True)
        return Response(serializer.data)

class StoryListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = StoryPagination

    def get(self, request):
        following = request.user.following.all()
        
        stories = Story.objects.filter(
            Q(user__in=following) | Q(user=request.user),
            expires_at__gt=now()
        ).exclude(
            user__in=BlockedUser.objects.filter(blocked=request.user).values('blocker')
        ).order_by('created_at')

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(stories, request)
        serializer = StorySerializer(page, many=True, context={'request': request})
        
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        file = request.FILES.get('file')
        caption = request.data.get('caption', '')
        music_id = request.data.get('music_id')
        start_time = float(request.data.get('videoStartTime', 0))
        end_time = float(request.data.get('videoEndTime', 30))

        if not file:
            return Response({"error": "File is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        temp_path = None
        trimmed_path = None

        try:
            if file.name.lower().endswith(('.mp4', '.mov', '.webm')):
                # Create temporary file for the uploaded video
                with tempfile.NamedTemporaryFile(delete=False, suffix=file.name) as temp_file:
                    temp_path = temp_file.name
                    for chunk in file.chunks():
                        temp_file.write(chunk)

                # Process the video
                video = VideoFileClip(temp_path)
                trimmed_duration = min(end_time, video.duration) - start_time
                if trimmed_duration > 30:
                    end_time = start_time + 30
                elif trimmed_duration < 3:
                    video.close()
                    return Response({"error": "Video duration must be at least 3 seconds."}, status=status.HTTP_400_BAD_REQUEST)
                
                trimmed_video = video.subclip(start_time, end_time)
                trimmed_path = tempfile.mktemp(suffix=file.name)
                
                
                trimmed_video.write_videofile(trimmed_path, codec='libx264', audio_codec='aac', logger=None)
                video.close()
                trimmed_video.close()

                # Upload to Cloudinary
                upload_result = cloudinary.uploader.upload(
                    trimmed_path,
                    resource_type="video",
                    public_id=f"stories/trimmed_{file.name.split('.')[0]}"
                )
                file_url = upload_result['secure_url']
            else:
                # Handle image upload
                upload_result = cloudinary.uploader.upload(file, resource_type="image")
                file_url = upload_result['secure_url']

            # Create the story with music
            music = MusicTrack.objects.get(id=music_id) if music_id else None
            story = Story(user=request.user, file=file_url, music=music, caption=caption)
            story.save()
            serializer = StorySerializer(story, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        except MusicTrack.DoesNotExist:
            return Response({"error": "Selected music track not found"}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Error trimming video: {e}")
            return Response({"error": f"Failed to process video: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        
        finally:
            # Clean up temporary files
            if temp_path and os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except Exception as e:
                    logger.warning(f"Failed to delete temp file {temp_path}: {e}")
            if trimmed_path and os.path.exists(trimmed_path):
                try:
                    os.unlink(trimmed_path)
                except Exception as e:
                    logger.warning(f"Failed to delete trimmed file {trimmed_path}: {e}")
                    
                    
    
class StoryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, story_id):
        try:
            story = Story.objects.get(id=story_id, expires_at__gt=now())
            if story.user == request.user or (story.user in request.user.following.all() and not BlockedUser.objects.filter(blocker=story.user, blocked=request.user).exists()):
                if story.user != request.user:
                    story.viewers.add(request.user)
                serializer = StorySerializer(story, context={'request': request})
                return Response(serializer.data)
            return Response({"error": "Not authorized to view this story"}, status=status.HTTP_403_FORBIDDEN)
        except Story.DoesNotExist:
            return Response({"error": "Story not found or expired"}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, story_id):
        try:
            story = Story.objects.get(id=story_id, user=request.user)
            story.delete()
            return Response({"message": "Story deleted"}, status=status.HTTP_200_OK)
        except Story.DoesNotExist:
            return Response({"error": "Story not found"}, status=status.HTTP_404_NOT_FOUND)

class StoryLikeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, story_id):
        try:
            story = Story.objects.get(id=story_id, expires_at__gt=now())
            if story.user == request.user or (story.user in request.user.following.all() and not BlockedUser.objects.filter(blocker=story.user, blocked=request.user).exists()):
                if story.likes.filter(id=request.user.id).exists():
                    story.likes.remove(request.user)
                    action = "unliked"
                else:
                    story.likes.add(request.user)
                    action = "liked"
                serializer = StorySerializer(story, context={'request': request})
                return Response({"message": f"Story {action}", "story": serializer.data})
            return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)
        except Story.DoesNotExist:
            return Response({"error": "Story not found or expired"}, status=status.HTTP_404_NOT_FOUND)

class StoryViewersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, story_id):
        try:
            story = Story.objects.get(id=story_id, user=request.user, expires_at__gt=now())
            serializer = StoryViewerSerializer(story)
            return Response(serializer.data)
        except Story.DoesNotExist:
            return Response({"error": "Story not found or not yours"}, status=status.HTTP_404_NOT_FOUND)
  
class LiveStreamView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        live_streams = LiveStream.objects.filter(is_active=True).exclude(
            host__in=BlockedUser.objects.filter(blocked=request.user).values('blocker')
        )
        serializer = LiveStreamSerializer(live_streams, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        title = request.data.get('title', '')
        end_existing = request.data.get('endExisting', False)

        if not title:
            return Response(
                {"error": "Title is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Initialize channel_layer at the start
        channel_layer = get_channel_layer()

        # Check for existing stream
        existing_stream = LiveStream.objects.filter(
            host=request.user, 
            is_active=True
        ).first()

        if existing_stream and not end_existing:
            return Response(
                {
                    "error": "You already have an active live stream",
                    "live_stream_id": existing_stream.id
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # End existing stream if requested
        if existing_stream and end_existing:
            existing_stream.is_active = False
            existing_stream.ended_at = timezone.now()
            existing_stream.save()
            
            # Notify viewers
            async_to_sync(channel_layer.group_send)(
                f'live_{existing_stream.id}',
                {
                    'type': 'stream_ended',
                    'live_id': existing_stream.id
                }
            )

        # Create new stream
        stream_key = str(uuid.uuid4())
        live_stream = LiveStream.objects.create(
            host=request.user,
            title=title,
            stream_key=stream_key,
            is_active=True
        )

        # Notify followers
        followers = request.user.followers.all()
        for follower in followers:
            # Skip if follower has blocked the host
            if BlockedUser.objects.filter(blocker=follower, blocked=request.user).exists():
                continue
            create_live_notification(follower, request.user, live_stream.id)

        # Notify global listeners
        async_to_sync(channel_layer.group_send)(
            'live_global',
            {
                'type': 'live_stream_update',
                'live_stream': LiveStreamSerializer(live_stream, context={'request': request}).data
            }
        )

        return Response(
            LiveStreamSerializer(live_stream, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

class LiveStreamDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, live_id):
        try:
            live_stream = LiveStream.objects.get(id=live_id, is_active=True)
            serializer = LiveStreamSerializer(live_stream, context={'request': request})
            return Response(serializer.data)
        except LiveStream.DoesNotExist:
            logger.warning(f"Live stream {live_id} not found or inactive")
            return Response({"error": "Live stream not found or inactive"}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, live_id):
        try:
            live_stream = LiveStream.objects.get(id=live_id, host=request.user, is_active=True)
            live_stream.is_active = False
            live_stream.ended_at = timezone.now()
            live_stream.save()
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'live_{live_id}',
                {
                    'type': 'stream_ended',
                    'live_id': live_id
                }
            )
            async_to_sync(channel_layer.group_send)(
                'live_global',
                {
                    'type': 'live_stream_update',
                    'live_stream': LiveStreamSerializer(live_stream, context={'request': request}).data
                }
            )
            return Response({"message": "Live stream ended"}, status=status.HTTP_200_OK)
        except LiveStream.DoesNotExist:
            return Response({"error": "Live stream not found or not yours"}, status=status.HTTP_404_NOT_FOUND)

class LiveStreamJoinView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, live_id):
        try:
            live_stream = LiveStream.objects.get(id=live_id, is_active=True)
            if BlockedUser.objects.filter(blocker=live_stream.host, blocked=request.user).exists():
                return Response({"error": "You are blocked from joining this stream"}, status=status.HTTP_403_FORBIDDEN)
            live_stream.viewers.add(request.user)
            serializer = LiveStreamSerializer(live_stream, context={'request': request})
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'live_{live_id}',
                {
                    'type': 'viewer_update',
                    'viewer_count': live_stream.viewer_count,
                    'viewer_id': str(request.user.id),
                    'viewer_username': request.user.username
                }
            )
            return Response(serializer.data)
        except LiveStream.DoesNotExist:
            return Response({"error": "Live stream not found or inactive"}, status=status.HTTP_404_NOT_FOUND)

class LiveStreamLeaveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, live_id):
        try:
            live_stream = LiveStream.objects.get(id=live_id, is_active=True)
            live_stream.viewers.remove(request.user)
            serializer = LiveStreamSerializer(live_stream, context={'request': request})
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'live_{live_id}',
                {
                    'type': 'viewer_update',
                    'viewer_count': live_stream.viewer_count,
                    'viewer_id': str(request.user.id),
                    'viewer_username': request.user.username
                }
            )
            return Response(serializer.data)
        except LiveStream.DoesNotExist:
            return Response({"error": "Live stream not found or inactive"}, status=status.HTTP_404_NOT_FOUND)