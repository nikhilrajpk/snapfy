# chat_app/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChatAPIViewSet

router = DefaultRouter()
router.register(r'chatrooms', ChatAPIViewSet, basename='chatroom')

urlpatterns = [
    path('', include(router.urls)),
]