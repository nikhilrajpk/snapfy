from django.urls import path
from . import views
from rest_framework.routers import DefaultRouter

urlpatterns = [
   path('create-post/', views.PostCreateAPIView.as_view(), name='create-post'),
   path('edit-post/<int:pk>/', views.PostUpdateAPIView.as_view(), name='post-update'),
   path('delete-post/<int:pk>/', views.PostDeleteAPIView.as_view(), name='post-delete'),
]

router = DefaultRouter()
router.register('posts', viewset=views.PostAPIView, basename='posts')
urlpatterns+=router.urls