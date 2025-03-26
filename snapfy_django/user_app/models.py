from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid
from django.core.cache import cache
from cloudinary.models import CloudinaryField
from django.utils import timezone

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    bio = models.TextField(blank=True)
    profile_picture = CloudinaryField("profile_pics", blank=True, null=True)
    followers = models.ManyToManyField("self", symmetrical=False, related_name="following", blank=True)
    is_blocked = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    email = models.EmailField(max_length=255)
    is_google_signIn = models.BooleanField(default=False)
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = [['username', 'is_verified'], ['email', 'is_verified']]
    
    def set_otp(self, otp):
        cache.set(f'otp_{self.email}', otp, timeout=300)  # Store OTP for 5 minutes

    def verify_otp(self, otp):
        stored_otp = cache.get(f'otp_{self.email}')
        return stored_otp == otp

    def update_last_seen(self):
        self.last_seen = timezone.now()
        self.save()

    def __str__(self):
        return self.username


class BlockedUser(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    blocker = models.ForeignKey(User, on_delete=models.CASCADE, related_name="blocked_users")
    blocked = models.ForeignKey(User, on_delete=models.CASCADE, related_name="blocked_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['blocker', 'blocked']]  # Prevent duplicate blocks
        verbose_name = "Blocked User"
        verbose_name_plural = "Blocked Users"

    def __str__(self):
        return f"{self.blocker.username} blocked {self.blocked.username}"

class Report(models.Model):
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reports_made")
    reported_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reports_received")
    reason = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Report by {self.reporter.username} against {self.reported_user.username}"
