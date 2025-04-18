# admin_app.views.py
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .models import AnalyticsReport, AdminActionLog, UserStatistics
from user_app.models import User, Report 
from story_app.models import MusicTrack
from post_app.models import *
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
import csv
from moviepy.editor import AudioFileClip
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
import io

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
        'total_posts': Post.objects.count(),
        'total_likes': Like.objects.count(),
        'total_comments': Comment.objects.count(),
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
def post_growth(request):
    """Get post growth data for charts"""
    period = request.query_params.get('period', 'weekly')
    today = timezone.now().date()
    
    if period == 'daily':
        start_date = today - datetime.timedelta(days=6)
    elif period == 'weekly':
        start_date = today - datetime.timedelta(days=28)
    elif period == 'monthly':
        start_date = (today - datetime.timedelta(days=180)).replace(day=1)
    else:
        return Response({'error': 'Invalid period'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Count posts by date
    date_range = [start_date + datetime.timedelta(days=x) for x in range((today - start_date).days + 1)]
    result = []
    
    for date in date_range:
        count = Post.objects.filter(created_at__date=date).count()
        result.append({
            'date': date.strftime('%Y-%m-%d'),
            'count': count
        })
    
    return Response(result)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def like_growth(request):
    """Get like growth data for charts"""
    period = request.query_params.get('period', 'weekly')
    today = timezone.now().date()
    
    if period == 'daily':
        start_date = today - datetime.timedelta(days=6)
    elif period == 'weekly':
        start_date = today - datetime.timedelta(days=28)
    elif period == 'monthly':
        start_date = (today - datetime.timedelta(days=180)).replace(day=1)
    else:
        return Response({'error': 'Invalid period'}, status=status.HTTP_400_BAD_REQUEST)
    
    date_range = [start_date + datetime.timedelta(days=x) for x in range((today - start_date).days + 1)]
    result = []
    
    for date in date_range:
        count = Like.objects.filter(created_at__date=date).count()
        result.append({
            'date': date.strftime('%Y-%m-%d'),
            'count': count
        })
    
    return Response(result)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def comment_growth(request):
    """Get comment growth data for charts"""
    period = request.query_params.get('period', 'weekly')
    today = timezone.now().date()
    
    if period == 'daily':
        start_date = today - datetime.timedelta(days=6)
    elif period == 'weekly':
        start_date = today - datetime.timedelta(days=28)
    elif period == 'monthly':
        start_date = (today - datetime.timedelta(days=180)).replace(day=1)
    else:
        return Response({'error': 'Invalid period'}, status=status.HTTP_400_BAD_REQUEST)
    
    date_range = [start_date + datetime.timedelta(days=x) for x in range((today - start_date).days + 1)]
    result = []
    
    for date in date_range:
        count = Comment.objects.filter(created_at__date=date).count()
        result.append({
            'date': date.strftime('%Y-%m-%d'),
            'count': count
        })
    
    return Response(result)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def hashtag_trends(request):
    """Get top hashtag usage trends"""
    period = request.query_params.get('period', 'weekly')
    today = timezone.now().date()
    
    if period == 'daily':
        start_date = today - datetime.timedelta(days=6)
    elif period == 'weekly':
        start_date = today - datetime.timedelta(days=28)
    elif period == 'monthly':
        start_date = (today - datetime.timedelta(days=180)).replace(day=1)
    else:
        return Response({'error': 'Invalid period'}, status=status.HTTP_400_BAD_REQUEST)
    
    hashtags = Hashtag.objects.annotate(post_count=Count('hashtags_posts')).order_by('-post_count')[:5]
    result = []
    
    date_range = [start_date + datetime.timedelta(days=x) for x in range((today - start_date).days + 1)]
    for date in date_range:
        entry = {'date': date.strftime('%Y-%m-%d')}
        for hashtag in hashtags:
            count = hashtag.hashtags_posts.filter(created_at__date=date).count()
            entry[hashtag.name] = count
        result.append(entry)
    
    return Response(result)

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


from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.platypus.flowables import HRFlowable
from reportlab.graphics.shapes import Drawing, String
from reportlab.graphics.charts.lineplots import LinePlot
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.widgets.markers import makeMarker
import io
import datetime
from django.utils import timezone

def generate_enhanced_report(request, report_type, period, report_data, start_date, end_date):
    """Generate an enhanced PDF report with better design and visualizations"""
    # Prepare PDF response
    buffer = io.BytesIO()
    
    # Set up the document with margins
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=letter,
        leftMargin=0.5*inch,
        rightMargin=0.5*inch,
        topMargin=0.5*inch,
        bottomMargin=0.5*inch
    )
    
    # Define brand colors
    brand_green = colors.HexColor('#198754')
    brand_light_green = colors.HexColor('#e8f5e9')
    brand_gray = colors.HexColor('#6c757d')
    
    elements = []
    
    # Set up styles
    styles = getSampleStyleSheet()
    
    # Create custom styles
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=24,
        fontName='Helvetica-Bold',
        textColor=brand_green,
        spaceAfter=12,
        alignment=1,  # Center alignment
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Heading2'],
        fontSize=14,
        fontName='Helvetica',
        textColor=brand_gray,
        spaceAfter=24,
        alignment=1,  # Center alignment
    )
    
    heading_style = ParagraphStyle(
        'Heading',
        parent=styles['Heading2'],
        fontSize=16,
        fontName='Helvetica-Bold',
        textColor=brand_green,
        spaceBefore=12,
        spaceAfter=6,
    )
    
    normal_style = ParagraphStyle(
        'Normal',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica',
        leading=14,
    )
    
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        fontName='Helvetica',
        textColor=brand_gray,
        alignment=1,  # Center alignment
    )
    
    # Title and subtitle section
    elements.append(Spacer(1, 0.5*inch))
    elements.append(Paragraph(f"Snapfy Analytics", title_style))
    elements.append(Paragraph(f"{report_type.capitalize()} {period.capitalize()} Report", subtitle_style))
    
    # Horizontal rule
    elements.append(HRFlowable(width="100%", thickness=1, color=brand_green, spaceBefore=12, spaceAfter=12))
    
    # Report metadata
    date_range_text = f"Period: {start_date.strftime('%B %d, %Y')} to {end_date.strftime('%B %d, %Y')}"
    generated_text = f"Generated on {timezone.now().strftime('%B %d, %Y at %I:%M %p')} by {request.user.username}"
    
    elements.append(Paragraph(date_range_text, normal_style))
    elements.append(Paragraph(generated_text, normal_style))
    elements.append(Spacer(1, 0.25*inch))
    
    # Executive summary section
    elements.append(Paragraph("Executive Summary", heading_style))
    
    # Calculate summary metrics based on report_data
    if report_data and len(report_data) > 0:
        total_count = sum(item.get('count', 0) for item in report_data)
        avg_count = total_count / len(report_data) if len(report_data) > 0 else 0
        
        if len(report_data) >= 2:
            latest_count = report_data[-1].get('count', 0)
            previous_count = report_data[-2].get('count', 0)
            percent_change = ((latest_count - previous_count) / previous_count * 100) if previous_count > 0 else 0
            trend_direction = "increased" if percent_change > 0 else "decreased" if percent_change < 0 else "remained stable"
            
            summary_text = f"""
            This report provides an analysis of {report_type} data over the selected {period} period. 
            The total {report_type} count for this period was <b>{total_count}</b>, with a daily average of <b>{avg_count:.1f}</b>.
            Most recently, the {report_type} count has {trend_direction} by <b>{abs(percent_change):.1f}%</b> compared to the previous period.
            """
        else:
            summary_text = f"""
            This report provides an analysis of {report_type} data over the selected {period} period. 
            The total {report_type} count for this period was <b>{total_count}</b>, with a daily average of <b>{avg_count:.1f}</b>.
            """
    else:
        summary_text = f"This report provides an analysis of {report_type} data over the selected {period} period. No data is available for this period."
    
    elements.append(Paragraph(summary_text, normal_style))
    elements.append(Spacer(1, 0.25*inch))
    
    # Add data visualization
    if report_data and len(report_data) > 1:
        elements.append(Paragraph("Data Visualization", heading_style))
        
        # Create line plot using LinePlot instead of LineChart
        drawing = Drawing(500, 250)
        lp = LinePlot()
        lp.x = 50
        lp.y = 50
        lp.height = 150
        lp.width = 400
        
        # Extract data
        dates = [item.get('date', '') for item in report_data]
        counts = [item.get('count', 0) for item in report_data]
        
        # Format x-axis labels (dates)
        formatted_dates = []
        for date_str in dates:
            try:
                date_obj = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
                formatted_dates.append(date_obj.strftime('%m/%d'))
            except (ValueError, TypeError):
                formatted_dates.append(date_str)
        
        # Prepare data for LinePlot - needs x and y coordinates
        x_values = list(range(len(counts)))
        data = [(x_values, counts)]
        lp.data = data
        
        # Style the plot
        lp.joinedLines = 1
        lp.lines[0].strokeColor = brand_green
        lp.lines[0].strokeWidth = 2
        lp.lines[0].symbol = makeMarker('FilledCircle')
        lp.lines[0].symbol.fillColor = brand_green
        lp.lines[0].symbol.size = 5
        
        # Add grid
        lp.xValueAxis.gridStrokeColor = colors.lightgrey
        lp.xValueAxis.gridStrokeWidth = 0.5
        lp.yValueAxis.gridStrokeColor = colors.lightgrey
        lp.yValueAxis.gridStrokeWidth = 0.5
        
        # Add labels
        for i, label in enumerate(formatted_dates):
            if i % max(1, len(formatted_dates) // 10) == 0:  # Show every Nth label to avoid crowding
                s = String(lp.x + (i * lp.width / (len(formatted_dates) - 1)), lp.y - 20, label)
                s.fontName = 'Helvetica'
                s.fontSize = 8
                drawing.add(s)
        
        # Add chart title
        title = String(lp.x + lp.width/2, lp.y + lp.height + 20, f"{report_type.capitalize()} Trend")
        title.fontName = 'Helvetica-Bold'
        title.fontSize = 12
        title.textAnchor = 'middle'
        drawing.add(title)
        
        drawing.add(lp)
        elements.append(drawing)
        elements.append(Spacer(1, 0.25*inch))
    
    # Data table
    elements.append(Paragraph("Detailed Data", heading_style))
    
    if report_type == 'users':
        table_data = [['Date', 'New Users', 'Cumulative Users']]
        for item in report_data:
            table_data.append([item.get('date', ''), str(item.get('count', 0)), str(item.get('cumulative', 0))])
    
    elif report_type == 'posts':
        table_data = [['Date', 'New Posts', 'Cumulative Posts']]
        for item in report_data:
            table_data.append([item.get('date', ''), str(item.get('count', 0)), str(item.get('cumulative', 0))])
    
    elif report_type == 'likes':
        table_data = [['Date', 'New Likes', 'Cumulative Likes']]
        for item in report_data:
            table_data.append([item.get('date', ''), str(item.get('count', 0)), str(item.get('cumulative', 0))])
    
    elif report_type == 'comments':
        table_data = [['Date', 'New Comments', 'Cumulative Comments']]
        for item in report_data:
            table_data.append([item.get('date', ''), str(item.get('count', 0)), str(item.get('cumulative', 0))])
    
    elif report_type == 'hashtags':
        table_data = [['Date', 'Hashtag', 'Post Count']]
        for item in report_data:
            table_data.append([item.get('date', ''), item.get('hashtag', ''), str(item.get('count', 0))])
    
    # Create and style the table
    table = Table(table_data, repeatRows=1)
    table.setStyle(TableStyle([
        # Header style
        ('BACKGROUND', (0, 0), (-1, 0), brand_green),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        
        # Data rows style - zebra striping
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, brand_light_green]),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
        ('ALIGN', (0, 1), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
        ('TOPPADDING', (0, 1), (-1, -1), 4),
        
        # Borders
        ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ('BOX', (0, 0), (-1, -1), 1, brand_green),
    ]))
    elements.append(table)
    
    # Add key insights section
    if report_data and len(report_data) > 1:
        elements.append(Spacer(1, 0.3*inch))
        elements.append(Paragraph("Key Insights", heading_style))
        
        # Calculate some basic insights
        avg = sum(item.get('count', 0) for item in report_data) / len(report_data)
        max_count = max(item.get('count', 0) for item in report_data)
        max_date = next((item.get('date', '') for item in report_data if item.get('count', 0) == max_count), '')
        
        # Calculate growth rate
        first_count = report_data[0].get('count', 0)
        last_count = report_data[-1].get('count', 0)
        growth_rate = ((last_count - first_count) / first_count * 100) if first_count > 0 else 0
        
        insights_text = f"""
        <b>Peak Activity:</b> The highest {report_type} activity was recorded on {max_date} with {max_count} new {report_type}.
        
        <b>Average Activity:</b> During this period, the average daily {report_type} activity was {avg:.1f}.
        
        <b>Growth Rate:</b> From the beginning to the end of this period, {report_type} activity has 
        {"increased" if growth_rate > 0 else "decreased"} by {abs(growth_rate):.1f}%.
        """
        
        elements.append(Paragraph(insights_text, normal_style))
    
    # Add recommendations section
    elements.append(Spacer(1, 0.3*inch))
    elements.append(Paragraph("Recommendations", heading_style))
    
    recommendations = {
        'users': """
        Based on the user growth patterns observed:
        
        • Consider targeted engagement campaigns during periods of slower growth
        • Analyze user retention metrics alongside acquisition rates
        • Implement referral programs to accelerate user growth
        • Review onboarding flow to improve conversion rates
        """,
        'posts': """
        To optimize post engagement and creation:
        
        • Encourage content creation during periods of lower activity
        • Highlight trending content to inspire more posts
        • Consider content challenges or prompts to boost creation
        • Analyze post types that generate the most engagement
        """,
        'likes': """
        To improve like engagement:
        
        • Review content surfacing algorithms to ensure quality content reaches users
        • Consider implementing reaction options beyond just likes
        • Analyze which content types receive the most likes
        • Examine the correlation between likes and other engagement metrics
        """,
        'comments': """
        To enhance comment activity:
        
        • Consider prompts that encourage meaningful discussions
        • Review comment notification systems to increase engagement
        • Implement features that reward quality comments
        • Analyze what types of content generate the most discussion
        """,
        'hashtags': """
        To optimize hashtag usage and discovery:
        
        • Feature trending hashtags more prominently
        • Consider creating platform-specific hashtag campaigns
        • Provide better hashtag suggestions when users create content
        • Analyze correlations between hashtag usage and content performance
        """
    }
    
    elements.append(Paragraph(recommendations.get(report_type, "No specific recommendations available for this report type."), normal_style))
    
    # Add horizontal rule before footer
    elements.append(Spacer(1, 0.3*inch))
    elements.append(HRFlowable(width="100%", thickness=1, color=brand_gray, spaceBefore=12, spaceAfter=12))
    
    # Add footer with page number function
    def add_footer(canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(brand_gray)
        
        footer_text = f"Snapfy Analytics Report | Page {doc.page} | Generated for {request.user.username} | Confidential"
        footer_width = canvas.stringWidth(footer_text, 'Helvetica', 8)
        page_width = letter[0]
        x_position = (page_width - footer_width) / 2
        
        canvas.drawString(x_position, 0.5 * inch, footer_text)
        
        # Add watermark style branding with logo text
        canvas.setFont('Helvetica-Bold', 60)
        canvas.setFillColor(colors.HexColor('#f5f5f5'))  # Very light gray
        canvas.drawCentredString(letter[0]/2, letter[1]/2, "SNAPFY")
        
        canvas.restoreState()
    
    # Build PDF
    doc.build(elements, onFirstPage=add_footer, onLaterPages=add_footer)
    
    # Return the buffer
    buffer.seek(0)
    return buffer


# Example of how to update your generate_report view to use this enhanced template
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def generate_report(request):
    """Generate and download an enhanced PDF report"""
    report_type = request.query_params.get('type', 'users')  # users, posts, likes, comments, hashtags
    period = request.query_params.get('period', 'weekly')
    
    if report_type not in ['users', 'posts', 'likes', 'comments', 'hashtags']:
        return Response({'error': 'Invalid report type'}, status=status.HTTP_400_BAD_REQUEST)
    if period not in ['daily', 'weekly', 'monthly']:
        return Response({'error': 'Invalid period'}, status=status.HTTP_400_BAD_REQUEST)

    # Determine date range for report
    today = timezone.now().date()
    if period == 'daily':
        start_date = today - datetime.timedelta(days=6)
    elif period == 'weekly':
        start_date = today - datetime.timedelta(days=28)
    elif period == 'monthly':
        start_date = (today - datetime.timedelta(days=180)).replace(day=1)

    # Generate report data (as in your original code)
    date_range = [start_date + datetime.timedelta(days=x) for x in range((today - start_date).days + 1)]
    report_data = []

    # Table data
    if report_type == 'users':
        data = UserStatistics.get_user_count_by_date_range(start_date, today)
        cumulative = 0
        for entry in data:
            cumulative += entry['count']
            report_data.append({'date': str(entry['date']), 'count': entry['count'], 'cumulative': cumulative})
    elif report_type == 'posts':
        cumulative = 0
        for date in date_range:
            count = Post.objects.filter(created_at__date=date).count()
            cumulative += count
            report_data.append({'date': str(date), 'count': count, 'cumulative': cumulative})
    elif report_type == 'likes':
        cumulative = 0
        for date in date_range:
            count = Like.objects.filter(created_at__date=date).count()
            cumulative += count
            report_data.append({'date': str(date), 'count': count, 'cumulative': cumulative})
    elif report_type == 'comments':
        cumulative = 0
        for date in date_range:
            count = Comment.objects.filter(created_at__date=date).count()
            cumulative += count
            report_data.append({'date': str(date), 'count': count, 'cumulative': cumulative})
    elif report_type == 'hashtags':
        hashtags = Hashtag.objects.annotate(post_count=Count('hashtags_posts')).order_by('-post_count')[:5]
        for date in date_range:
            for hashtag in hashtags:
                count = hashtag.hashtags_posts.filter(created_at__date=date).count()
                if count > 0:
                    report_data.append({'date': str(date), 'hashtag': hashtag.name, 'count': count})

    # Generate enhanced PDF
    buffer = generate_enhanced_report(request, report_type, period, report_data, start_date, today)
    
    # Save report to database
    AnalyticsReport.objects.create(
        report_type=period,
        data_type=report_type,
        generated_by=request.user,
        report_data=report_data,
        start_date=start_date,
        end_date=today
    )

    # Log admin action
    AdminActionLog.objects.create(
        admin=request.user,
        action_type='generate_report',
        action_detail=f"Generated enhanced {report_type} PDF report for {period} period",
        affected_user=None
    )

    # Return PDF response
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{report_type}_{period}_report.pdf"'
    return response

# @api_view(['GET'])
# @permission_classes([IsAuthenticated, IsAdminUser])
# def generate_report(request):
#     """Generate and download a PDF report"""
#     report_type = request.query_params.get('type', 'users')  # users, posts, likes, comments, hashtags
#     period = request.query_params.get('period', 'weekly')
    
#     if report_type not in ['users', 'posts', 'likes', 'comments', 'hashtags']:
#         return Response({'error': 'Invalid report type'}, status=status.HTTP_400_BAD_REQUEST)
#     if period not in ['daily', 'weekly', 'monthly']:
#         return Response({'error': 'Invalid period'}, status=status.HTTP_400_BAD_REQUEST)

#     # Prepare PDF response
#     buffer = io.BytesIO()
#     doc = SimpleDocTemplate(buffer, pagesize=letter)
#     elements = []

#     # Styles
#     styles = getSampleStyleSheet()
#     title_style = ParagraphStyle(
#         'Title',
#         parent=styles['Heading1'],
#         fontSize=16,
#         spaceAfter=12,
#         textColor=colors.HexColor('#198754')
#     )
#     normal_style = styles['Normal']
#     footer_style = ParagraphStyle(
#         'Footer',
#         parent=styles['Normal'],
#         fontSize=8,
#         textColor=colors.grey
#     )

#     # Header
#     title = f"{report_type.capitalize()} {period.capitalize()} Report"
#     elements.append(Paragraph(title, title_style))
#     elements.append(Paragraph(f"Generated on {timezone.now().strftime('%Y-%m-%d %H:%M:%S')} by {request.user.username}", normal_style))
#     elements.append(Spacer(1, 0.2 * inch))

#     # Data preparation
#     today = timezone.now().date()
#     if period == 'daily':
#         start_date = today - datetime.timedelta(days=6)
#     elif period == 'weekly':
#         start_date = today - datetime.timedelta(days=28)
#     elif period == 'monthly':
#         start_date = (today - datetime.timedelta(days=180)).replace(day=1)

#     date_range = [start_date + datetime.timedelta(days=x) for x in range((today - start_date).days + 1)]
#     report_data = []

#     # Table data
#     if report_type == 'users':
#         table_data = [['Date', 'New Users', 'Cumulative Users']]
#         data = UserStatistics.get_user_count_by_date_range(start_date, today)
#         cumulative = 0
#         for entry in data:
#             cumulative += entry['count']
#             table_data.append([entry['date'], str(entry['count']), str(cumulative)])
#             report_data.append({'date': str(entry['date']), 'count': entry['count'], 'cumulative': cumulative})

#     elif report_type == 'posts':
#         table_data = [['Date', 'New Posts', 'Cumulative Posts']]
#         cumulative = 0
#         for date in date_range:
#             count = Post.objects.filter(created_at__date=date).count()
#             cumulative += count
#             table_data.append([str(date), str(count), str(cumulative)])
#             report_data.append({'date': str(date), 'count': count, 'cumulative': cumulative})

#     elif report_type == 'likes':
#         table_data = [['Date', 'New Likes', 'Cumulative Likes']]
#         cumulative = 0
#         for date in date_range:
#             count = Like.objects.filter(created_at__date=date).count()
#             cumulative += count
#             table_data.append([str(date), str(count), str(cumulative)])
#             report_data.append({'date': str(date), 'count': count, 'cumulative': cumulative})

#     elif report_type == 'comments':
#         table_data = [['Date', 'New Comments', 'Cumulative Comments']]
#         cumulative = 0
#         for date in date_range:
#             count = Comment.objects.filter(created_at__date=date).count()
#             cumulative += count
#             table_data.append([str(date), str(count), str(cumulative)])
#             report_data.append({'date': str(date), 'count': count, 'cumulative': cumulative})

#     elif report_type == 'hashtags':
#         table_data = [['Date', 'Hashtag', 'Post Count']]
#         hashtags = Hashtag.objects.annotate(post_count=Count('hashtags_posts')).order_by('-post_count')[:5]
#         for date in date_range:
#             for hashtag in hashtags:
#                 count = hashtag.hashtags_posts.filter(created_at__date=date).count()
#                 if count > 0:
#                     table_data.append([str(date), hashtag.name, str(count)])
#                     report_data.append({'date': str(date), 'hashtag': hashtag.name, 'count': count})

#     # Create table
#     table = Table(table_data)
#     table.setStyle(TableStyle([
#         ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#198754')),
#         ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
#         ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
#         ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
#         ('FONTSIZE', (0, 0), (-1, 0), 12),
#         ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
#         ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
#         ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
#         ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
#         ('FONTSIZE', (0, 1), (-1, -1), 10),
#         ('GRID', (0, 0), (-1, -1), 1, colors.black),
#     ]))
#     elements.append(table)

#     # Footer (added via build)
#     def add_footer(canvas, doc):
#         canvas.saveState()
#         footer_text = f"Page {doc.page} | Generated by Snapfy Admin"
#         canvas.setFont('Helvetica', 8)
#         canvas.setFillColor(colors.grey)
#         canvas.drawString(inch, 0.5 * inch, footer_text)
#         canvas.restoreState()

#     # Build PDF
#     doc.build(elements, onFirstPage=add_footer, onLaterPages=add_footer)

#     # Save report to database
#     AnalyticsReport.objects.create(
#         report_type=period,
#         data_type=report_type,
#         generated_by=request.user,
#         report_data=report_data,
#         start_date=start_date,
#         end_date=today
#     )

#     # Log admin action
#     AdminActionLog.objects.create(
#         admin=request.user,
#         action_type='generate_report',
#         action_detail=f"Generated {report_type} PDF report for {period} period",
#         affected_user=None
#     )

#     # Return PDF response
#     buffer.seek(0)
#     response = HttpResponse(buffer, content_type='application/pdf')
#     response['Content-Disposition'] = f'attachment; filename="{report_type}_{period}_report.pdf"'
#     return response

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def list_analytics_reports(request):
    """List all generated analytics reports with pagination"""
    page = int(request.query_params.get('page', 1))
    limit = int(request.query_params.get('limit', 10))
    data_type = request.query_params.get('data_type', '')  # Filter by users, posts, etc.

    reports = AnalyticsReport.objects.all()
    if data_type:
        reports = reports.filter(data_type=data_type)

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
            'data_type': report.data_type,
            'report_type': report.report_type,
            'generated_by': report.generated_by.username,
            'start_date': report.start_date,
            'end_date': report.end_date,
            'created_at': report.created_at,
            'report_data': report.report_data
        } for report in reports_page]
    }
    return Response(data)

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