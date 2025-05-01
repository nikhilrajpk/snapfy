from django.db import models
from user_app.models import User
from datetime import timedelta
from django.utils.timezone import now
from cloudinary.models import CloudinaryField

class MusicTrack(models.Model):
    title = models.CharField(max_length=100)
    file = CloudinaryField('audio', resource_type='video')  # Using video type for audio support
    duration = models.FloatField()
    start_time = models.FloatField(default=0)
    is_trending = models.BooleanField(default=False)

    def __str__(self):
        return self.title

class Story(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="stories")
    file = CloudinaryField('file', resource_type='auto')
    music = models.ForeignKey(MusicTrack, on_delete=models.SET_NULL, null=True, blank=True)
    caption = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(default=now() + timedelta(days=1))
    viewers = models.ManyToManyField(User, related_name="viewed_stories", blank=True)
    likes = models.ManyToManyField(User, related_name="liked_stories", blank=True)

    def __str__(self):
        return f"Story by {self.user.username}"

    @property
    def is_expired(self):
        return now() > self.expires_at

    class Meta:
        ordering = ['-created_at']
        
class LiveStream(models.Model):
    host = models.ForeignKey(User, on_delete=models.CASCADE, related_name="live_streams")
    title = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    viewers = models.ManyToManyField(User, related_name="watched_streams", blank=True)
    stream_key = models.CharField(max_length=100, unique=True, blank=True, null=True)  # WebRTC signaling
    recording_url = CloudinaryField('video', resource_type='video', blank=True, null=True)  

    def __str__(self):
        return f"Live Stream by {self.host.username}"

    @property
    def viewer_count(self):
        return self.viewers.count()