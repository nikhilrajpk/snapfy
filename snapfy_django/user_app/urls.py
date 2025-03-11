from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

urlpatterns = [
   path('register/', views.RegisterUserView.as_view(), name='register'),
    path('verify-otp/', views.VerifyOTPView.as_view(), name='verify-otp'),
    path('resend-otp/', views.ResendOTPView.as_view(), name='resend-otp'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('reset-password/', views.ResetPasswordView.as_view(), name='reset-password'),
    path("auth/google/signin/", views.GoogleLoginView.as_view(), name="google-signin"),
    path("profile/update/", views.UpdateUserProfileView.as_view(), name='update-profile'),
    path('profile/picture/', views.ProxyProfilePictureView.as_view(), name='proxy-profile-picture'),
    path('users/id/<uuid:id>/', views.get_user_by_id, name='get_user_by_id'),
    path('block/<str:username>/', views.BlockUserView.as_view(), name='block_user'),
    path('unblock/<str:username>/', views.UnblockUserView.as_view(), name='unblock_user'),
]

router = DefaultRouter()
router.register('users', viewset=views.UserAPIViewSet, basename='users')
urlpatterns+=router.urls