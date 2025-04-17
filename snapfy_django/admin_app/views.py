# admin_app.views.py
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .models import AnalyticsReport, AdminActionLog, UserStatistics
from user_app.models import User, Report 
from story_app.models import MusicTrack
from .serializers import MusicTrackSerializer
from django.db.models import Count
from django.utils import timezone
import datetime
from django.utils.timezone import now
import csv
from django.http import HttpResponse
from .permissions import IsAdminUser
from django.db.models import Q
import cloudinary.uploader
import tempfile
import os
import logging
from moviepy.editor import AudioFileClip

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
        
        

logger = logging.getLogger(__name__)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def music_track_list(request):
    """List all music tracks with pagination and search, or create a new track"""
    if request.method == 'GET':
        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 10))
        query = request.query_params.get('query', '')
        trending_only = request.query_params.get('trending', 'false').lower() == 'true'

        tracks = MusicTrack.objects.all()
        if query:
            tracks = tracks.filter(title__icontains=query)
        if trending_only:
            tracks = tracks.filter(is_trending=True)

        total = tracks.count()
        start_idx = (page - 1) * limit
        end_idx = page * limit

        tracks_page = tracks[start_idx:end_idx]

        serializer = MusicTrackSerializer(tracks_page, many=True)
        return Response({
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit,
            'tracks': serializer.data
        })

    elif request.method == 'POST':
        file = request.FILES.get('file')
        title = request.data.get('title')
        is_trending = request.data.get('is_trending', 'false').lower() == 'true'
        start_time = float(request.data.get('start_time', 0))
        end_time = float(request.data.get('end_time', 30))

        if not file or not title:
            return Response({"error": "Title and file are required"}, status=status.HTTP_400_BAD_REQUEST)

        temp_path = None
        trimmed_path = None
        try:
            # Save uploaded file temporarily
            with tempfile.NamedTemporaryFile(delete=False, suffix=file.name) as temp_file:
                temp_path = temp_file.name
                for chunk in file.chunks():
                    temp_file.write(chunk)

            # Load audio and calculate duration
            audio = AudioFileClip(temp_path)
            original_duration = audio.duration

            # Validate and adjust trimming times
            if start_time < 0 or start_time >= original_duration:
                audio.close()
                return Response({"error": "Invalid start time"}, status=status.HTTP_400_BAD_REQUEST)
            
            trimmed_duration = min(end_time, original_duration) - start_time
            if trimmed_duration > 30:
                end_time = start_time + 30
                trimmed_duration = 30
            elif trimmed_duration < 3:
                audio.close()
                return Response({"error": "Trimmed duration must be at least 3 seconds"}, status=status.HTTP_400_BAD_REQUEST)

            # Trim audio if necessary
            if trimmed_duration != original_duration or start_time != 0:
                trimmed_audio = audio.subclip(start_time, end_time)
                trimmed_path = tempfile.mktemp(suffix='.mp3')
                trimmed_audio.write_audiofile(trimmed_path, codec='mp3', logger=None)
                audio.close()
                trimmed_audio.close()
                upload_file_path = trimmed_path
            else:
                audio.close()
                upload_file_path = temp_path

            # Upload to Cloudinary
            upload_result = cloudinary.uploader.upload(
                upload_file_path,
                resource_type="video",
                public_id=f"music_tracks/{title}_{now().strftime('%Y%m%d%H%M%S')}"
            )
            file_url = upload_result['secure_url']

            # Create MusicTrack
            track = MusicTrack.objects.create(
                title=title,
                file=file_url,
                duration=trimmed_duration,
                is_trending=is_trending
            )
            serializer = MusicTrackSerializer(track)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error uploading music track: {e}")
            return Response({"error": f"Failed to upload track: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        finally:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except Exception as e:
                    logger.warning(f"Failed to delete temp file {temp_path}: {e}")
            if trimmed_path and os.path.exists(trimmed_path):
                try:
                    os.unlink(trimmed_path)
                except Exception as e:
                    logger.warning(f"Failed to delete trimmed file {trimmed_path}: {e}")


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated, IsAdminUser])
def music_track_detail(request, track_id):
    """Retrieve, update, or delete a music track"""
    try:
        track = MusicTrack.objects.get(id=track_id)
    except MusicTrack.DoesNotExist:
        return Response({"error": "Music track not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = MusicTrackSerializer(track)
        return Response(serializer.data)

    elif request.method == 'PUT':
        file = request.FILES.get('file')
        title = request.data.get('title', track.title)
        is_trending = request.data.get('is_trending', track.is_trending)
        start_time = float(request.data.get('start_time', 0)) if file else track.start_time
        end_time = float(request.data.get('end_time', 30)) if file else track.start_time + track.duration
        if isinstance(is_trending, str):
            is_trending = is_trending.lower() == 'true'

        temp_path = None
        trimmed_path = None
        try:
            if file:
                # Save uploaded file temporarily
                with tempfile.NamedTemporaryFile(delete=False, suffix=file.name) as temp_file:
                    temp_path = temp_file.name
                    for chunk in file.chunks():
                        temp_file.write(chunk)

                # Load audio and calculate duration
                audio = AudioFileClip(temp_path)
                original_duration = audio.duration

                # Validate and adjust trimming times
                if start_time < 0 or start_time >= original_duration:
                    audio.close()
                    return Response({"error": "Invalid start time"}, status=status.HTTP_400_BAD_REQUEST)
                
                trimmed_duration = min(end_time, original_duration) - start_time
                if trimmed_duration > 30:
                    end_time = start_time + 30
                    trimmed_duration = 30
                elif trimmed_duration < 3:
                    audio.close()
                    return Response({"error": "Trimmed duration must be at least 3 seconds"}, status=status.HTTP_400_BAD_REQUEST)

                # Trim audio if necessary
                if trimmed_duration != original_duration or start_time != 0:
                    trimmed_audio = audio.subclip(start_time, end_time)
                    trimmed_path = tempfile.mktemp(suffix='.mp3')
                    trimmed_audio.write_audiofile(trimmed_path, codec='mp3', logger=None)
                    audio.close()
                    trimmed_audio.close()
                    upload_file_path = trimmed_path
                else:
                    audio.close()
                    upload_file_path = temp_path

                # Upload to Cloudinary
                upload_result = cloudinary.uploader.upload(
                    upload_file_path,
                    resource_type="video",
                    public_id=f"music_tracks/{title}_{now().strftime('%Y%m%d%H%M%S')}"
                )
                track.file = upload_result['secure_url']
                track.duration = trimmed_duration

            track.title = title
            track.is_trending = is_trending
            track.save()
            serializer = MusicTrackSerializer(track)
            return Response(serializer.data)

        except Exception as e:
            logger.error(f"Error updating music track: {e}")
            return Response({"error": f"Failed to update track: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        finally:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except Exception as e:
                    logger.warning(f"Failed to delete temp file {temp_path}: {e}")
            if trimmed_path and os.path.exists(trimmed_path):
                try:
                    os.unlink(trimmed_path)
                except Exception as e:
                    logger.warning(f"Failed to delete trimmed file {trimmed_path}: {e}")

    elif request.method == 'DELETE':
        track.delete()
        return Response({"message": "Music track deleted"}, status=status.HTTP_204_NO_CONTENT)