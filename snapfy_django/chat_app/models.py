from django.db import models
from django.utils.timezone import now
from user_app.models import User
from cloudinary.models import CloudinaryField
import os

def generate_encryption_key_salt():
    """Generate a random 32-character hex string for encryption key salt."""
    return os.urandom(16).hex()

class ChatRoom(models.Model):
    users = models.ManyToManyField(User, related_name="chat_rooms")
    created_at = models.DateTimeField(auto_now_add=True)
    last_message_at = models.DateTimeField(null=True, blank=True)
    encryption_key_salt = models.CharField(max_length=32, default=generate_encryption_key_salt)  # Use function instead of lambda

    def update_last_message_at(self):
        latest_message = self.messages.filter(is_deleted=False).order_by('-sent_at').first()
        self.last_message_at = latest_message.sent_at if latest_message else self.created_at
        self.save()

    def get_encryption_key(self):
        user_ids = ''.join(sorted(str(user.id) for user in self.users.all()))
        return f"{user_ids}-{self.encryption_key_salt}"[:32]  # Truncate/pad to 32 bytes

    def __str__(self):
        return f"ChatRoom {self.id} with users {', '.join(user.username for user in self.users.all())}"

class Message(models.Model):
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField(blank=True, null=True)  # Encrypted text
    file = CloudinaryField('file', resource_type='auto', blank=True, null=True)
    sent_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)  # Soft delete

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.room.update_last_message_at()

    def __str__(self):
        return f"Message from {self.sender.username} at {self.sent_at}"

class CallLog(models.Model):
    CALL_TYPES = [
        ('audio', 'Audio Call'),
        ('video', 'Video Call'),
    ]
    
    CALL_STATUSES = [
        ('ongoing', 'Ongoing'),
        ('completed', 'Completed'),
        ('missed', 'Missed'),
        ('rejected', 'Rejected'),
    ]
    
    caller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='outgoing_calls')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='incoming_calls')
    call_type = models.CharField(max_length=10, choices=CALL_TYPES)
    call_status = models.CharField(max_length=10, choices=CALL_STATUSES, default='ongoing')
    call_start_time = models.DateTimeField(default=now)
    call_end_time = models.DateTimeField(null=True, blank=True)
    duration = models.IntegerField(null=True, blank=True, help_text="Call duration in seconds")
    
    def save(self, *args, **kwargs):
        if self.call_status == 'completed' and self.call_end_time:
            self.duration = (self.call_end_time - self.call_start_time).total_seconds()
        super(CallLog, self).save(*args, **kwargs)

    def __str__(self):
        return f"{self.caller} -> {self.receiver} ({self.call_type}, {self.call_status})"