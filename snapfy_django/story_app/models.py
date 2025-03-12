from django.db import models
from user_app.models import User
from datetime import timedelta
from django.utils.timezone import now
from cloudinary.models import CloudinaryField

class Story(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="stories")
    file = CloudinaryField('file', resource_type='auto')
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