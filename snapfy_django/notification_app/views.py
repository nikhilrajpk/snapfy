from rest_framework import status, viewsets
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import Notification
from .serializers import NotificationSerializer
import json
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')
    
    @action(detail=True, methods=['patch'])
    def read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'notification marked as read'})
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        queryset = self.get_queryset().filter(is_read=False)
        count = queryset.count()
        if count == 0:
            return Response({'message': 'No unread notifications to mark as read'}, status=status.HTTP_200_OK)
        queryset.update(is_read=True)
        return Response({'message': f'Marked {count} notifications as read'}, status=status.HTTP_200_OK)