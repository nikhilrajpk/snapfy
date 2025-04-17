# admin_app/serializers.py
from rest_framework import serializers
from story_app.models import MusicTrack

class MusicTrackSerializer(serializers.ModelSerializer):
    file = serializers.CharField(source='file.url', read_only=True)

    class Meta:
        model = MusicTrack
        fields = ['id', 'title', 'file', 'duration', 'start_time', 'is_trending']
        read_only_fields = ['id', 'file']