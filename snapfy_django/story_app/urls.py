from django.urls import path
from .views import *
from .consumers import LiveStreamConsumer, GlobalLiveStreamConsumer

urlpatterns = [
    path('stories/', StoryListCreateView.as_view(), name='story-list-create'),
    path('stories/<int:story_id>/', StoryDetailView.as_view(), name='story-detail'),
    path('stories/<int:story_id>/like/', StoryLikeView.as_view(), name='story-like'),
    path('stories/<int:story_id>/viewers/', StoryViewersView.as_view(), name='story-viewers'),
    path('music-tracks/', MusicTrackListView.as_view(), name='music-tracks'),
    path('live/', LiveStreamView.as_view(), name='live-stream-list-create'),
    path('live/<int:live_id>/', LiveStreamDetailView.as_view(), name='live-stream-detail'),
    path('live/<int:live_id>/join/', LiveStreamJoinView.as_view(), name='live-stream-join'),
    path('live/<int:live_id>/leave/', LiveStreamLeaveView.as_view(), name='live-stream-leave'),
]

websocket_urlpatterns = [
    path('ws/live/<int:live_id>/', LiveStreamConsumer.as_asgi()),
    path('ws/live/global/', GlobalLiveStreamConsumer.as_asgi()),
]