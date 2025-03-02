from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from .models import Post
from .serializer import PostSerializer, PostCreateSerializer

class PostAPIView(ModelViewSet):
    queryset = Post.objects.prefetch_related('hashtags', 'mentions').order_by('-created_at')
    permission_classes = [IsAuthenticated]
    serializer_class = PostSerializer

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