# admin_app/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('dashboard-stats/', views.dashboard_stats, name='dashboard_stats'),
    path('user-growth/', views.user_growth, name='user_growth'),
    path('blocked-users/', views.blocked_users_list, name='blocked_users_list'),
    path('users/', views.all_users_list, name='all_users_list'),
    path('block-user/<uuid:user_id>/', views.block_user, name='block_user'),
    path('reports/', views.manage_reports, name='manage_reports'),
    path('generate-report/', views.generate_report, name='generate_report'),
]