from rest_framework import serializers
from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated

from .serializer import UserSerializer, UserCreateSerializer
from .models import User, Report



class UserAPIViewSet(viewsets.ModelViewSet):
    queryset = User.objects.prefetch_related('following')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create' or self.action == 'update':
            return UserCreateSerializer
        return super().get_serializer_class()
    
    def get_queryset(self):
        qs = super().get_queryset() 
        if not self.request.user.is_staff:
            qs = qs.filter(user = self.request.user)
        return qs