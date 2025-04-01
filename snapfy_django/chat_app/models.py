from django.db import models
from django.utils.timezone import now
from user_app.models import User
from cloudinary.models import CloudinaryField
import os
from django.utils import timezone
from cryptography.fernet import Fernet

def generate_encryption_key():
    """Generate a Fernet-compatible encryption key."""
    return Fernet.generate_key().decode()

class ChatRoom(models.Model):
    users = models.ManyToManyField(User, related_name="chat_rooms")
    created_at = models.DateTimeField(auto_now_add=True)
    last_message_at = models.DateTimeField(null=True, blank=True)
    encryption_key = models.CharField(max_length=64, default=generate_encryption_key)
    unread_count = models.PositiveIntegerField(default=0)

    def update_last_message(self, message):
        self.last_message_at = message.sent_at
        self.save()
    
    def update_unread_count(self):
        self.unread_count = self.messages.filter(is_read=False).exclude(sender__in=self.users.all()).count()
        self.save()

    def __str__(self):
        return f"ChatRoom {self.id} with {self.users.count()} users"

class Message(models.Model):
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_messages")
    content = models.TextField(blank=True, null=True)
    file = CloudinaryField('file', resource_type='auto', blank=True, null=True)
    sent_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        ordering = ['sent_at']
        indexes = [
            models.Index(fields=['room', 'sent_at']),
            models.Index(fields=['is_read']),
            models.Index(fields=['is_deleted']),
        ]

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new:
            self.room.update_last_message(self)

    def mark_as_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()
            self.room.update_unread_count()

    def __str__(self):
        return f"Message {self.id} in {self.room} from {self.sender}"


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