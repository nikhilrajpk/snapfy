# story_app.routing.py
from django.urls import re_path
from .consumers import LiveStreamConsumer, GlobalLiveStreamConsumer, TestConsumer

websocket_urlpatterns = [
    re_path(r'ws/live/(?P<live_id>\d+)/$', LiveStreamConsumer.as_asgi()),
    re_path(r'ws/live/global/$', GlobalLiveStreamConsumer.as_asgi()),
    re_path(r'ws/test/$', TestConsumer.as_asgi()),
]