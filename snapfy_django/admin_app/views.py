# admin_app.views.py
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .models import AnalyticsReport, AdminActionLog, UserStatistics
from user_app.models import User, Report  # Import User and Report
from django.db.models import Count
from django.utils import timezone
import datetime
import csv
from django.http import HttpResponse
from .permissions import IsAdminUser

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def dashboard_stats(request):
    """Get overall dashboard statistics"""
    today = timezone.now().date()
    start_of_week = today - datetime.timedelta(days=today.weekday())
    start_of_month = today.replace(day=1)
    
    stats = {
        'total_users': User.objects.filter(is_verified=True).count(),
        'blocked_users': User.objects.filter(is_blocked=True).count(),
        'new_users_today': User.objects.filter(date_joined__date=today).count(),
        'new_users_this_week': User.objects.filter(date_joined__date__gte=start_of_week).count(),
        'new_users_this_month': User.objects.filter(date_joined__date__gte=start_of_month).count(),
        'active_users': UserStatistics.get_active_users(days=7),
        'online_users': User.objects.filter(is_online=True).count(),
        'reports_count': Report.objects.count(),
        'unhandled_reports': Report.objects.filter(resolved=False).count(),
    }
    
    return Response(stats)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def user_growth(request):
    """Get user growth data for charts"""
    period = request.query_params.get('period', 'weekly')
    today = timezone.now().date()
    
    if period == 'daily':
        start_date = today - datetime.timedelta(days=6)
        end_date = today
    elif period == 'weekly':
        start_date = today - datetime.timedelta(days=28)
        end_date = today
    elif period == 'monthly':
        start_date = (today - datetime.timedelta(days=180)).replace(day=1)
        end_date = today
    else:
        return Response({'error': 'Invalid period'}, status=status.HTTP_400_BAD_REQUEST)
    
    data = UserStatistics.get_user_count_by_date_range(start_date, end_date)
    
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def blocked_users_list(request):
    """Get list of blocked users with pagination"""
    page = int(request.query_params.get('page', 1))
    limit = int(request.query_params.get('limit', 10))
    query = request.query_params.get('query', '')
    
    blocked_users = User.objects.filter(is_blocked=True).order_by('username')
    
    if query:
        blocked_users = blocked_users.filter(
            username__icontains=query
        ) | blocked_users.filter(email__icontains=query)
    
    total = blocked_users.count()
    start_idx = (page - 1) * limit
    end_idx = page * limit
    
    users_page = blocked_users[start_idx:end_idx]
    
    data = {
        'total': total,
        'page': page,
        'limit': limit,
        'total_pages': (total + limit - 1) // limit,
        'users': [{
            'id': str(user.id),
            'username': user.username,
            'profile_picture': user.profile_picture.url if user.profile_picture else None,
            'email': user.email,
            'date_joined': user.date_joined,
            'last_seen': user.last_seen,
            'reports_against': Report.objects.filter(reported_user=user).count()
        } for user in users_page]
    }
    
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def all_users_list(request):
    """Get list of all users with pagination"""
    page = int(request.query_params.get('page', 1))
    limit = int(request.query_params.get('limit', 10))
    query = request.query_params.get('query', '')
    
    users = User.objects.filter(is_staff=False).order_by('username')
    
    if query:
        users = users.filter(username__icontains=query) | users.filter(email__icontains=query)
    
    total = users.count()
    start_idx = (page - 1) * limit
    end_idx = page * limit
    
    users_page = users[start_idx:end_idx]
    
    data = {
        'total': total,
        'page': page,
        'limit': limit,
        'total_pages': (total + limit - 1) // limit,
        'users': [{
            'id': str(user.id),
            'username': user.username,
            'profile_picture': user.profile_picture.url if user.profile_picture else None,
            'email': user.email,
            'is_blocked': user.is_blocked,
            'is_verified': user.is_verified,
            'date_joined': user.date_joined,
            'last_seen': user.last_seen,
            'followers_count': user.followers.count(),
            'reports_against': Report.objects.filter(reported_user=user).count()
        } for user in users_page]
    }
    
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def block_user(request, user_id):
    """Block or unblock a user"""
    try:
        user = User.objects.get(id=user_id)
        action = request.data.get('action', 'block')
        
        if action == 'block':
            user.is_blocked = True
            action_type = 'block_user'
            action_detail = f"Blocked user {user.username}"
        elif action == 'unblock':
            user.is_blocked = False
            action_type = 'unblock_user'
            action_detail = f"Unblocked user {user.username}"
        else:
            return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)
        
        user.save()
        
        # Log admin action
        AdminActionLog.objects.create(
            admin=request.user,
            action_type=action_type,
            action_detail=action_detail,
            affected_user=user
        )
        
        return Response({'success': True, 'message': f"User {action}ed successfully"})
    
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def generate_report(request):
    """Generate and download a CSV report"""
    report_type = request.query_params.get('type', 'users')
    period = request.query_params.get('period', 'weekly')
    
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{report_type}_{period}_report.csv"'
    
    writer = csv.writer(response)
    
    if report_type == 'users':
        writer.writerow(['Date', 'New Users', 'Cumulative Users'])
        
        today = timezone.now().date()
        if period == 'daily':
            start_date = today - datetime.timedelta(days=7)
        elif period == 'weekly':
            start_date = today - datetime.timedelta(days=28)
        else:  # monthly
            start_date = today - datetime.timedelta(days=180)
            
        data = UserStatistics.get_user_count_by_date_range(start_date, today)
        cumulative = 0
        
        for entry in data:
            cumulative += entry['count']
            writer.writerow([entry['date'], entry['count'], cumulative])
            
        # Save report to database
        report_data = {
            'data': data,
            'cumulative': cumulative
        }
        
        AnalyticsReport.objects.create(
            report_type=period,
            generated_by=request.user,
            report_data=report_data,
            start_date=start_date,
            end_date=today
        )
    
    return response

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def manage_reports(request):
    """View and manage user reports"""
    if request.method == 'GET':
        # List all reports with pagination
        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 10))
        status = request.query_params.get('status', 'pending')  # 'pending' or 'resolved'
        reported_username = request.query_params.get('reported_user', '')

        reports = Report.objects.all()
        if status == 'pending':
            reports = reports.filter(resolved=False)
        elif status == 'resolved':
            reports = reports.filter(resolved=True)
        if reported_username:
            reports = reports.filter(reported_user__username=reported_username)

        total = reports.count()
        start_idx = (page - 1) * limit
        end_idx = page * limit

        reports_page = reports[start_idx:end_idx]

        data = {
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit,
            'reports': [{
                'id': str(report.id),
                'reporter': report.reporter.username,
                'reported_user': report.reported_user.username,
                'reported_user_id': str(report.reported_user.id),
                'reason': report.reason,
                'created_at': report.created_at,
                'resolved': report.resolved
            } for report in reports_page]
        }
        return Response(data)

    elif request.method == 'POST':
        # Mark a report as resolved
        report_id = request.data.get('report_id')
        try:
            report = Report.objects.get(id=report_id)
            report.resolved = True
            report.save()

            # Log admin action
            AdminActionLog.objects.create(
                admin=request.user,
                action_type='resolve_report',
                action_detail=f"Resolved report against {report.reported_user.username}",
                affected_user=report.reported_user
            )
            return Response({'success': True, 'message': 'Report marked as resolved'})
        except Report.DoesNotExist:
            return Response({'error': 'Report not found'}, status=status.HTTP_404_NOT_FOUND)