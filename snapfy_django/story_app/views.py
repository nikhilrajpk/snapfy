import tempfile
import os
import logging
from datetime import datetime, timedelta
from django.utils.timezone import now
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import Story
from .serializers import StorySerializer
from moviepy.editor import VideoFileClip
import cloudinary.uploader
from user_app.models import User, BlockedUser
from .serializers import StorySerializer, StoryViewerSerializer
from django.db.models import Q

logger = logging.getLogger(__name__)

class StoryListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Get users the requesting user follows
        following = request.user.following.all()
        
        # Filter stories:
        # 1. Stories from users the requester follows or their own stories
        # 2. Exclude stories from users who have blocked the requester
        stories = Story.objects.filter(
            Q(user__in=following) | Q(user=request.user),  # Followed users or self
            expires_at__gt=now()  # Active stories only
        ).exclude(
            user__in=BlockedUser.objects.filter(blocked=request.user).values('blocker')
        ).order_by('created_at')

        serializer = StorySerializer(stories, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        file = request.FILES.get('file')
        caption = request.data.get('caption', '')
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

            # Create the story
            story = Story(user=request.user, file=file_url, caption=caption)
            story.save()
            serializer = StorySerializer(story, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)

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