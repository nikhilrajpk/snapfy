# admin_app.models.py
from django.db import models
from django.utils import timezone
import uuid
from django.contrib.auth import get_user_model

User = get_user_model()

class AnalyticsReport(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    REPORT_TYPES = (
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    )
    DATA_TYPES = (
        ('users', 'Users'),
        ('posts', 'Posts'),
        ('likes', 'Likes'),
        ('comments', 'Comments'),
        ('hashtags', 'Hashtags'),
    )
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES)
    data_type = models.CharField(max_length=20, choices=DATA_TYPES)
    generated_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='generated_reports')
    report_data = models.JSONField()
    start_date = models.DateField()
    end_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    file_path = models.CharField(max_length=255, blank=True, null=True)
    
    def __str__(self):
        return f"{self.report_type} Report ({self.start_date} to {self.end_date})"

class AdminActionLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    admin = models.ForeignKey(User, on_delete=models.CASCADE, related_name="admin_actions")
    action_type = models.CharField(max_length=100)
    action_detail = models.TextField()
    affected_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="admin_actions_received")
    timestamp = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.admin.username} - {self.action_type} - {self.timestamp}"

class UserStatistics:
    @staticmethod
    def get_user_count_by_date_range(start_date, end_date):
        date_range = [start_date + timezone.timedelta(days=x) for x in range((end_date - start_date).days + 1)]
        result = []
        
        for date in date_range:
            count = User.objects.filter(
                date_joined__date=date,
                is_verified=True
            ).count()
            result.append({
                'date': date.strftime('%Y-%m-%d'),
                'count': count
            })
        
        return result
    
    @staticmethod
    def get_active_users(days=7):
        cutoff = timezone.now() - timezone.timedelta(days=days)
        return User.objects.filter(last_seen__gte=cutoff).count()