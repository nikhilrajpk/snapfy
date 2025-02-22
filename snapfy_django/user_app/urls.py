from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

urlpatterns = [
   path('register/', views.RegisterUserView.as_view(), name='register'),
    path('verify-otp/', views.VerifyOTPView.as_view(), name='verify-otp'),
    path('login/', views.LoginView.as_view(), name='login'),
]

router = DefaultRouter()
router.register('users', viewset=views.UserAPIViewSet, basename='users')
urlpatterns+=router.urls