# admin_app/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('dashboard-stats/', views.dashboard_stats, name='dashboard_stats'),
    path('user-growth/', views.user_growth, name='user_growth'),
    path('post-growth/', views.post_growth, name='post_growth'),
    path('like-growth/', views.like_growth, name='like_growth'),
    path('comment-growth/', views.comment_growth, name='comment_growth'),
    path('hashtag-trends/', views.hashtag_trends, name='hashtag_trends'),
    path('blocked-users/', views.blocked_users_list, name='blocked_users_list'),
    path('users/', views.all_users_list, name='all_users_list'),
    path('block-user/<uuid:user_id>/', views.block_user, name='block_user'),
    path('reports/', views.manage_reports, name='manage_reports'),
    path('generate-report/', views.generate_report, name='generate_report'),
    path('list-analytics-reports/', views.list_analytics_reports, name='list_analytics_reports'),
    path('music-tracks/', views.music_track_list, name='music_track_list'),
    path('music-tracks/<int:track_id>/', views.music_track_detail, name='music_track_detail'),
]