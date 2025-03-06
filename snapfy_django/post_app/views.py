from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from .models import Post
from .serializer import *
import logging

class PostAPIView(ModelViewSet):
    queryset = Post.objects.prefetch_related('hashtags', 'mentions').order_by('-id')
    permission_classes = [IsAuthenticated]
    serializer_class = PostSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        hashtag = self.request.query_params.get('hashtag', None)
        if hashtag:
            # Remove '#' if present and filter posts containing the hashtag
            hashtag = hashtag.lstrip('#')
            queryset = queryset.filter(hashtags__name__icontains=hashtag)
        return queryset

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
        data = request.data.copy()  # Make a mutable copy of request.data
        data['user'] = user.id      # Set user ID as a single value
        logger.info(f"Received data for saving post: {data}")
        serializer = CreateSavedPostSerializer(data=data)
        if serializer.is_valid():
            saved_post = serializer.save()
            logger.info(f"Saved post created: {saved_post.id}")
            return Response({
                "message": "Post saved successfully."
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
            is_saved = SavedPost.objects.filter(post=post_id, user=user_id).exists()
            logger.info(f"Post {post_id} saved status for user {user_id}: {is_saved}")
            return Response({"message": is_saved}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error checking saved status: {str(e)}")
            return Response({"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)