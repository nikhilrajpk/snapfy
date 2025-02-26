from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

urlpatterns = [
   path('register/', views.RegisterUserView.as_view(), name='register'),
    path('verify-otp/', views.VerifyOTPView.as_view(), name='verify-otp'),
    path('resend-otp/', views.ResendOTPView.as_view(), name='resend-otp'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('reset-password/', views.ResetPasswordView.as_view(), name='reset-password'),
    path("auth/google/signin/", views.GoogleLoginView.as_view(), name="google_signin"),
]

router = DefaultRouter()
router.register('users', viewset=views.UserAPIViewSet, basename='users')
urlpatterns+=router.urls