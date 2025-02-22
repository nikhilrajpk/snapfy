from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid
from django.core.cache import cache

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    bio = models.TextField(blank=True)
    profile_picture = models.ImageField(upload_to="profile_pics/", blank=True, null=True)
    followers = models.ManyToManyField("self", symmetrical=False, related_name="following", blank=True)
    is_blocked = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    
    def set_otp(self, otp):
        cache.set(f'otp_{self.email}', otp, timeout=300)  # Store OTP for 5 minutes

    def verify_otp(self, otp):
        stored_otp = cache.get(f'otp_{self.email}')
        return stored_otp == otp

    def __str__(self):
        return self.username


class Report(models.Model):
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reports_made")
    reported_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reports_received")
    reason = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Report by {self.reporter.username} against {self.reported_user.username}"
