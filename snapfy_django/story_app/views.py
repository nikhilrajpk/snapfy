from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils.timezone import now
from .models import Story
from user_app.models import User, BlockedUser
from .serializers import StorySerializer, StoryViewerSerializer
from django.db.models import Q

class StoryListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Get stories from users the current user follows, excluding blocked users
        following = request.user.following.all()
        blocked_by = User.objects.filter(blocked_users__blocked=request.user)
        visible_users = following.exclude(id__in=blocked_by.values('id'))
        stories = Story.objects.filter(
            user__in=visible_users, 
            expires_at__gt=now()
        ).select_related('user')
        
        # Include current user's stories
        my_stories = Story.objects.filter(user=request.user, expires_at__gt=now())
        all_stories = stories | my_stories
        
        serializer = StorySerializer(all_stories.distinct(), many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        file = request.FILES.get('file')
        caption = request.data.get('caption', '')
        if not file:
            return Response({"error": "File is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        story = Story(user=request.user, file=file, caption=caption)
        story.save()
        serializer = StorySerializer(story, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

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