from django.db import models
from user_app.models import User
from datetime import timedelta
from django.utils.timezone import now
from cloudinary.models import CloudinaryField

class Story(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="stories")
    file = CloudinaryField('file', resource_type='auto')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(default=now() + timedelta(days=1))

    def __str__(self):
        return f"Story by {self.user.username}"