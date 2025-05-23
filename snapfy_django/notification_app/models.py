from django.db import models
from user_app.models import User

class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    from_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_notifications", null=True)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    live_id = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return f"Notification for {self.user.username}"
