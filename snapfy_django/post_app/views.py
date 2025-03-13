from django.shortcuts import get_object_or_404
from django.db.models import Case, When, IntegerField, Q
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Post
from .serializer import *
import logging


class PostAPIView(ModelViewSet):
    queryset = Post.objects.prefetch_related('hashtags', 'mentions')
    permission_classes = [IsAuthenticated]
    serializer_class = PostSerializer

    def get_queryset(self):
        user = self.request.user
        archived_posts = ArchivedPost.objects.values_list('post_id', flat=True)
        following = user.following.all()
        liked_posts = Like.objects.filter(user=user).values_list('post_id', flat=True)

        # Base queryset
        queryset = super().get_queryset()

        # Annotate posts for ordering
        queryset = queryset.annotate(
            is_followed=Case(
                When(user__in=following, then=1),
                default=0,
                output_field=IntegerField()
            ),
            is_liked_by_user=Case(
                When(id__in=liked_posts, then=1),
                default=0,
                output_field=IntegerField()
            )
        )

        # Exclude archived posts from others
        queryset = queryset.exclude(~Q(user=user) & Q(id__in=archived_posts))

        # Handle explore vs home mode
        if self.request.query_params.get('explore', 'false') == 'true':
            # Explore mode: only unfollowed users' posts, exclude liked
            queryset = queryset.filter(
                ~Q(user__in=following) & ~Q(user=user)
            ).exclude(id__in=liked_posts)
        else:
            # Home mode: all posts, followed at top, unfollowed at bottom
            pass  # No additional filter, just ordering

        # Ordering: followed first, then unliked vs liked, then recency
        queryset = queryset.order_by(
            '-is_followed',  # Followed (1) before unfollowed (0)
            'is_liked_by_user',  # Unliked (0) before liked (1)
            '-created_at'  # Newest first
        )

        # Filter for shorts (videos only)
        if self.request.query_params.get('shorts', 'false') == 'true':
            queryset = queryset.filter(file__contains='/video/upload/')

        # Filter by hashtag (for profile or hashtag pages, unaffected)
        hashtag = self.request.query_params.get('hashtag', None)
        if hashtag:
            hashtag = hashtag.lstrip('#')
            queryset = queryset.filter(Q(hashtags__name__icontains=hashtag) & ~Q(id__in=archived_posts))

        return queryset.distinct()

    # Like a post
    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        post = self.get_object()
        user = request.user
        like, created = Like.objects.get_or_create(user=user, post=post)
        if not created:
            like.delete()
            return Response({'message': 'Post unliked', 'likes': Like.objects.filter(post=post).count(), 'is_liked': False}, status=status.HTTP_200_OK)
        return Response({'message': 'Post liked', 'likes': Like.objects.filter(post=post).count(), 'is_liked': True}, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'], url_path='liked_users')
    def liked_users(self, request, pk=None):
        post = self.get_object()
        likes = Like.objects.filter(post=post).select_related('user')
        users = [
            {
                'id': like.user.id,
                'username': like.user.username,
                'profile_picture': str(like.user.profile_picture)
            }
            for like in likes
        ]
        return Response(users)

    @action(detail=True, methods=['get'])
    def like_count(self, request, pk=None):
        post = self.get_object()
        count = Like.objects.filter(post=post).count()
        return Response({'likes': count})
    
    @action(detail=True, methods=['get'], url_path='is_liked')
    def is_liked(self, request, pk=None):
        post = self.get_object()
        user = request.user
        exists = Like.objects.filter(user=user, post=post).exists()
        return Response({'exists': exists})
    
    @action(detail=True, methods=['post'])
    def comment(self, request, pk=None):
        post = self.get_object()
        serializer = CommentSerializer(
            data={'post': post.id, 'text': request.data.get('text')},
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], url_path='comment/(?P<comment_id>\d+)/reply')
    def reply(self, request, pk=None, comment_id=None):
        post = self.get_object()
        try:
            comment = Comment.objects.get(id=comment_id, post=post)
        except Comment.DoesNotExist:
            return Response({'error': 'Comment not found'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = CommentReplySerializer(
            data={'comment': comment.id, 'text': request.data.get('text')},
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'], url_path='comments')
    def get_comments(self, request, pk=None):
        post = self.get_object()
        comments = Comment.objects.filter(post=post)
        serializer = CommentSerializer(comments, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], url_path='comment/(?P<comment_id>\d+)/replies')
    def get_replies(self, request, pk=None, comment_id=None):
        post = self.get_object()
        try:
            comment = Comment.objects.get(id=comment_id, post=post)
        except Comment.DoesNotExist:
            return Response({'error': 'Comment not found'}, status=status.HTTP_404_NOT_FOUND)
        
        replies = CommentReply.objects.filter(comment=comment)
        serializer = CommentReplySerializer(replies, many=True)
        return Response(serializer.data)

class PostCreateAPIView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PostCreateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)  # Set user from request
            return Response({"message": "Post created successfully"}, status=status.HTTP_201_CREATED)
        print('serializer errors ::', serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

logger = logging.getLogger(__name__)

class PostUpdateAPIView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]
    
    def put(self, request, *args, **kwargs):
        post_id = request.data.get('id')
        logger.info(f"Received PUT request for post {post_id} with data: {dict(request.data)}")
        if not post_id:
            return Response({"error": "Post ID is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        post = get_object_or_404(Post, id=post_id)
        if post.user != request.user:
            return Response({"error": "You can only edit your own posts"}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = PostUpdateSerializer(instance=post, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Post updated successfully"}, status=status.HTTP_200_OK)
        logger.error(f"Serializer errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    
class PostDeleteAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            post = Post.objects.get(id=pk)
            # Ensure only the post owner can delete it
            if post.user != request.user:
                return Response({"detail": "You do not have permission to delete this post."}, status=status.HTTP_403_FORBIDDEN)
            serializer = PostDeleteSerializer(post)
            serializer.delete(post)
            return Response({"message": "Post deleted successfully"}, status=status.HTTP_204_NO_CONTENT)
        except Post.DoesNotExist:
            return Response({"detail": "Post not found"}, status=status.HTTP_404_NOT_FOUND)
        
        
        
        
class CreateSavedPostAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        data = request.data.copy()
        data['user'] = user.id
        logger.info(f"Received data for saving post: {data}")
        serializer = CreateSavedPostSerializer(data=data)
        if serializer.is_valid():
            saved_post = serializer.save()
            logger.info(f"Saved post created: {saved_post.id}")
            return Response({
                "message": "Post saved successfully.",
                "id": saved_post.id  # Include the SavedPost ID
            }, status=status.HTTP_201_CREATED)
        logger.error(f"Serializer errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    
class RemoveSavedPostAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, pk):
        try:
            saved_post = SavedPost.objects.get(id=pk)
            if saved_post.user.id != request.user.id:  # Compare user IDs directly
                return Response({"detail": "You do not have permission to delete this saved post."}, status=status.HTTP_403_FORBIDDEN)
            saved_post.delete()
            return Response({"message": "Saved post removed successfully"}, status=status.HTTP_204_NO_CONTENT)
        except SavedPost.DoesNotExist:
            return Response({"detail": "Saved post not found"}, status=status.HTTP_404_NOT_FOUND)
    
class IsSavedPostAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        logger.info(f"Received GET request with query params: {request.GET}")
        post_id = request.GET.get('post')
        user_id = request.GET.get('user')
        
        if not post_id or not user_id:
            logger.warning("Missing 'post' or 'user' parameter in request")
            return Response({"error": "Missing 'post' or 'user' parameter"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            saved_post = SavedPost.objects.filter(post=post_id, user=user_id).first()
            is_saved = saved_post is not None
            logger.info(f"Post {post_id} saved status for user {user_id}: {is_saved}")
            return Response({
                "exists": is_saved,
                "savedPostId": saved_post.id if is_saved else None  # Include SavedPost ID if exists
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error checking saved status: {str(e)}")
            return Response({"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        
     
class CreateArchivedPostAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        data = request.data.copy()
        data['user'] = user.id
        logger.info(f"Received data for archiving post: {data}")
        serializer = CreateArchivedPostSerializer(data=data)
        if serializer.is_valid():
            archived_post = serializer.save()
            logger.info(f"Saved post created: {archived_post.id}")
            return Response({
                "message": "Post archived successfully.",
                "id": archived_post.id
            }, status=status.HTTP_201_CREATED)
        logger.error(f"Serializer errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    
class RemoveArchivedPostAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, pk):
        try:
            archived_post = ArchivedPost.objects.get(id=pk)
            if archived_post.user.id != request.user.id:  # Compare user IDs directly
                return Response({"detail": "You do not have permission to delete this archived post."}, status=status.HTTP_403_FORBIDDEN)
            archived_post.delete()
            return Response({"message": "Archived post removed successfully"}, status=status.HTTP_204_NO_CONTENT)
        except SavedPost.DoesNotExist:
            return Response({"detail": "Archived post not found"}, status=status.HTTP_404_NOT_FOUND)
    
    
class IsArchivedPostAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        logger.info(f"Received GET request with query params: {request.GET}")
        post_id = request.GET.get('post')
        user_id = request.GET.get('user')
        
        if not post_id or not user_id:
            logger.warning("Missing 'post' or 'user' parameter in request")
            return Response({"error": "Missing 'post' or 'user' parameter"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            archived_post = ArchivedPost.objects.filter(post=post_id, user=user_id).first()
            is_archived = archived_post is not None
            logger.info(f"Post {post_id} saved status for user {user_id}: {is_archived}")
            return Response({
                "exists": is_archived,
                "savedPostId": archived_post.id if is_archived else None  # Include archive post ID if exists
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error checking archived status: {str(e)}")
            return Response({"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        