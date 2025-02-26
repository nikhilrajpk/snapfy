from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.parsers import MultiPartParser, FormParser
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import requests
from django.conf import settings

from .serializer import UserSerializer, UserCreateSerializer, VerifyOTPSerializer, LoginSerializer, ResendOTPSerializer, ResetPasswordSerializer
from .models import User, Report
from .tasks import send_otp_email


class UserAPIViewSet(viewsets.ModelViewSet):
    queryset = User.objects.prefetch_related('following').order_by('-date_joined')
    serializer_class = UserSerializer
    
    def get_permissions(self):
        self.permission_classes = [IsAuthenticated]
        if self.action == 'create':
            self.permission_classes = [AllowAny]
        return super().get_permissions()
    
    
    # we want users can view and update their own orders and admin can do in all orders.
    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_staff:
            qs = qs.filter(username=self.request.user.username)
        return qs
    
    
class RegisterUserView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = UserCreateSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            # Always send a new OTP when user tries to register again
            send_otp_email.delay(user.email)
            return Response({"message": "OTP sent to email."}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VerifyOTPView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            otp = serializer.validated_data['otp']
            try:
                user = User.objects.get(email=email)
                if user.verify_otp(otp):
                    user.is_verified = True
                    user.save()
                    return Response({"message": "Email verified successfully."}, status=status.HTTP_200_OK)
                return Response({"message": "Invalid OTP."}, status=status.HTTP_400_BAD_REQUEST)
            except User.DoesNotExist:
                return Response({"message": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class ResendOTPView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = ResendOTPSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            send_otp_email(email)
            return Response({"message": "OTP has been send to your email."}, status= status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            return Response({
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "user": UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    
    def put(self, request):
        serializers = ResetPasswordSerializer(data = request.data)
        if serializers.is_valid():
            email = serializers.validated_data['email']
            password = serializers.validated_data['password']
            
            try:
                user = User.objects.get(email=email)
                user.set_password(password)
                user.save()
                return Response({"message": "Password changed successfully."}, status=status.HTTP_205_RESET_CONTENT)
            except User.DoesNotExist:
                return Response({"message": "User not found!"}, status=status.HTTP_404_NOT_FOUND)
        return Response(serializers.errors, status=status.HTTP_400_BAD_REQUEST)
    
    
class GoogleLoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        
        token = request.data.get('token') # ID token from React
        if not token:
            return Response({"message": "Token is not provided!"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Verify the ID token
            idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), settings.GOOGLE_CLIENT_ID)

            email = idinfo.get("email")
            google_id = idinfo.get("sub")  # Unique Google ID
            first_name = idinfo.get("given_name", "")
            last_name = idinfo.get("family_name", "")
            picture = idinfo.get("picture", None)

        except ValueError as e:
            return Response({"error": "Invalid token", "detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Create or update user
        try:
            user = User.objects.get(email=email)
            if not user.is_google_signIn:
                return Response({"error": "This email is already registered."}, status=status.HTTP_400_BAD_REQUEST)
            # update if changed
            user.first_name = first_name
            user.last_name = last_name
            user.profile_picture = picture
            user.save()
        except User.DoesNotExist:
            user = User.objects.create_user(
                username=email.split('@')[0],
                email=email,
                first_name=first_name,
                last_name=last_name,
                profile_picture=picture,
                is_google_signIn=True
            )
        
        # Generate JWT token
        refresh = RefreshToken.for_user(user)
        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": UserSerializer(user).data
        }, status=status.HTTP_200_OK)