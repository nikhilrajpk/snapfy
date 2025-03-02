from django.urls import path
from . import views
from rest_framework.routers import DefaultRouter

urlpatterns = [
   path('create-post/', views.PostCreateAPIView.as_view(), name='create-post'),
]

router = DefaultRouter()
router.register('posts', viewset=views.PostAPIView, basename='posts')
urlpatterns+=router.urls