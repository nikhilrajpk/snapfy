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
    queryset = Post.objects.prefetch_related('hashtags', 'mentions').order_by('id')
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