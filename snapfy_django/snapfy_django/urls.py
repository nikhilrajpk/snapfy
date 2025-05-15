from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse

def health_check(request):
    return HttpResponse("OK", status=200)

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/',include('user_app.urls')),
    path('api/',include('story_app.urls')),
    path('api/',include('post_app.urls')),
    path('api/',include('notification_app.urls')),
    path('api/',include('chat_app.urls')),
    path('api/admin/',include('admin_app.urls')),
    path('health', health_check),
    # path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    # path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
