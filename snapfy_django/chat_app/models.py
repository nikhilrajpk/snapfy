from django.db import models
from django.utils.timezone import now
from user_app.models import User
from cloudinary.models import CloudinaryField

class ChatRoom(models.Model):
    users = models.ManyToManyField(User, related_name="chat_rooms")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"ChatRoom {self.id} with users {', '.join(user.username for user in self.users.all())}"


class Message(models.Model):
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField(blank=True, null=True)  # Text message 
    file = CloudinaryField('file', resource_type='auto', blank=True, null=True)  # Supports image, video, audio, GIFs
    sent_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

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
    call_start_time = models.DateTimeField(default=now)  # Start time of the call
    call_end_time = models.DateTimeField(null=True, blank=True)  # End time if completed
    duration = models.IntegerField(null=True, blank=True, help_text="Call duration in seconds")
    
    def save(self, *args, **kwargs):
        """ Auto-calculate duration if the call is completed. """
        if self.call_status == 'completed' and self.call_end_time:
            self.duration = (self.call_end_time - self.call_start_time).total_seconds()
        super(CallLog, self).save(*args, **kwargs)

    def __str__(self):
        return f"{self.caller} -> {self.receiver} ({self.call_type}, {self.call_status})"
