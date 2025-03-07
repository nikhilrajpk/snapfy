from django.urls import path
from . import views
from rest_framework.routers import DefaultRouter

urlpatterns = [
   path('create-post/', views.PostCreateAPIView.as_view(), name='create-post'),
   path('edit-post/<int:pk>/', views.PostUpdateAPIView.as_view(), name='post-update'),
   path('delete-post/<int:pk>/', views.PostDeleteAPIView.as_view(), name='post-delete'),
   path('save-post/', views.CreateSavedPostAPIView.as_view(), name='save-post'),
   path('is-saved-post/', views.IsSavedPostAPIView.as_view(), name='is-saved-post'),
   path('remove-saved-post/<int:pk>/', views.RemoveSavedPostAPIView.as_view(), name='remove-saved-post'),
   path('post/archive/', views.CreateArchivedPostAPIView.as_view(), name='archive-post'),
   path('post/archive/<int:pk>/', views.RemoveArchivedPostAPIView.as_view(), name='remove-archived-post'),
   path('post/is-archived/', views.IsArchivedPostAPIView.as_view(), name='is-post-archived'),
]

router = DefaultRouter()
router.register('posts', viewset=views.PostAPIView, basename='posts')
urlpatterns+=router.urls