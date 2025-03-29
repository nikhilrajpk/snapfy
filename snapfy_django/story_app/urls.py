from django.urls import path
from .views import *

urlpatterns = [
    path('stories/', StoryListCreateView.as_view(), name='story-list-create'),
    path('stories/<int:story_id>/', StoryDetailView.as_view(), name='story-detail'),
    path('stories/<int:story_id>/like/', StoryLikeView.as_view(), name='story-like'),
    path('stories/<int:story_id>/viewers/', StoryViewersView.as_view(), name='story-viewers'),
    path('music-tracks/', MusicTrackListView.as_view(), name='music-tracks'),
]