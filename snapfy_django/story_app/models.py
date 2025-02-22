from django.db import models
from user_app.models import User
from datetime import timedelta
from django.utils.timezone import now

class Story(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="stories")
    image = models.ImageField(upload_to="stories/", blank=True, null=True)
    video = models.FileField(upload_to="stories/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(default=now() + timedelta(days=1))

    def __str__(self):
        return f"Story by {self.user.username}"