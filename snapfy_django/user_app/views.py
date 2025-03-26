from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action, api_view
from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.parsers import MultiPartParser, FormParser
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import requests, socket
from django.http import HttpResponse
from django.conf import settings
from django.db.models import Q
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone

from .serializer import UserSerializer, UserCreateSerializer, VerifyOTPSerializer, LoginSerializer, ResendOTPSerializer, ResetPasswordSerializer, UserProfileUpdateSerializer
from .models import User, Report, BlockedUser
from .tasks import send_otp_email


class UserAPIViewSet(viewsets.ModelViewSet):
    queryset = User.objects.prefetch_related('following', 'posts').order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'username'

    def get_queryset(self):
        queryset = super().get_queryset()
        username = self.request.query_params.get('username', None)

        # Exclude superusers and the logged-in user from the queryset
        queryset = queryset.exclude(is_superuser=True)

        # Apply username search filter if provided
        if username:
            queryset = queryset.filter(Q(username__icontains=username) & ~Q(username__icontains=self.request.user.username))

        # Restrict updates to the logged-in user's own profile for non-staff
        if self.action in ['update', 'partial_update', 'destroy'] and not self.request.user.is_staff:
            return queryset.filter(username=self.request.user.username)

        return queryset
    
    @action(detail=True, methods=['post'], url_path='follow')
    def follow(self, request, username=None):
        """Follow a user."""
        user_to_follow = self.get_object()  # Gets user by username from URL
        current_user = request.user

        if current_user == user_to_follow:
            return Response({"error": "You cannot follow yourself"}, status=status.HTTP_400_BAD_REQUEST)

        if current_user in user_to_follow.followers.all():
            return Response({"error": "You already follow this user"}, status=status.HTTP_400_BAD_REQUEST)

        user_to_follow.followers.add(current_user)
        serializer = self.get_serializer(user_to_follow)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='unfollow')
    def unfollow(self, request, username=None):
        """Unfollow a user."""
        user_to_unfollow = self.get_object()  # Gets user by username from URL
        current_user = request.user

        if current_user == user_to_unfollow:
            return Response({"error": "You cannot unfollow yourself"}, status=status.HTTP_400_BAD_REQUEST)

        if current_user not in user_to_unfollow.followers.all():
            return Response({"error": "You do not follow this user"}, status=status.HTTP_400_BAD_REQUEST)

        user_to_unfollow.followers.remove(current_user)
        serializer = self.get_serializer(user_to_unfollow)
        return Response(serializer.data, status=status.HTTP_200_OK)
    

@api_view(['POST'])
def logout_view(request):
    user = request.user
    if not user.is_authenticated:
        return Response({"message": "Not logged in"}, status=401)
    user.is_online = False
    user.last_seen = timezone.now()
    user.save()
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"user_{user.id}",
        {
            "type": "user_status_update",
            "user_id": str(user.id),
            "is_online": False,
            "last_seen": user.last_seen.isoformat(),
        }
    )
    return Response({"message": "Logged out"}, status=200)


class BlockUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, username):
        try:
            user_to_block = User.objects.get(username=username)
            if user_to_block == request.user:
                return Response({"error": "You cannot block yourself"}, status=status.HTTP_400_BAD_REQUEST)
            
            if BlockedUser.objects.filter(blocker=request.user, blocked=user_to_block).exists():
                return Response({"error": f"{username} is already blocked"}, status=status.HTTP_400_BAD_REQUEST)

            print(f"Before block: {user_to_block.username}’s following: {list(user_to_block.following.all())}")
            if user_to_block in request.user.following.all():
                request.user.following.remove(user_to_block)
                request.user.save()
            if request.user in user_to_block.following.all():
                user_to_block.following.remove(request.user)  # Naruto unfollows Sanji
                user_to_block.save()  # Persist the change
            if request.user in user_to_block.followers.all():
                user_to_block.followers.remove(request.user)
                user_to_block.save()
            if user_to_block in request.user.followers.all():
                request.user.followers.remove(user_to_block)
                request.user.save()
                
            print(f"After block: {user_to_block.username}’s following: {list(user_to_block.following.all())}")

            BlockedUser.objects.create(blocker=request.user, blocked=user_to_block)
            
            serializer = UserSerializer(request.user)
            return Response({"message": f"Blocked {username}", "user": serializer.data}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

class UnblockUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, username):
        try:
            user_to_unblock = User.objects.get(username=username)
            block_record = BlockedUser.objects.filter(blocker=request.user, blocked=user_to_unblock).first()
            if not block_record:
                return Response({"error": f"{username} is not blocked"}, status=status.HTTP_400_BAD_REQUEST)
            
            block_record.delete()
            serializer = UserSerializer(request.user)
            return Response({"message": f"Unblocked {username}", "user": serializer.data}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
 
    
@api_view(['GET'])
def get_user_by_id(request, id):
    try:
        user = User.objects.get(id=id)
        serializer = UserSerializer(user)
        return Response(serializer.data)
    except User.DoesNotExist:
        return Response({"detail": "No User matches the given query."}, status=status.HTTP_404_NOT_FOUND)
    
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
            idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), settings.GOOGLE_CLIENT_ID, clock_skew_in_seconds=5)
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
        
        
        
class UpdateUserProfileView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]
    
    def put(self, request):
        user = request.user
        print("Received request data:", dict(request.data))  # Debug incoming data
        serializer = UserProfileUpdateSerializer(instance=user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            print("Updated user data:", serializer.data)  # Debug updated data
            return Response({
                "message" : "Profile updated successfully",
                "user" : UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        print("Serializer errors:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

class ProxyProfilePictureView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        image_url = str(request.user.profile_picture)  # Ensure string
        if not image_url:
            print("No profile picture URL found")
            return HttpResponse(status=404)

        # Ensure full URL if truncated
        if image_url.startswith('https://lh3.googleusercontent') and 's96-c' not in image_url:
            image_url = "https://lh3.googleusercontent.com/a/ACg8ocJhgQ0gmNBdkbwGNGb-wGr9Y2owXwvJimBxo8h2XA_KTRhUMw=s96-c"
            print("Corrected truncated URL to:", image_url)

        try:
            print("Full image URL:", image_url)
            hostname = 'lh3.googleusercontent.com'
            resolved = socket.getaddrinfo(hostname, 443)
            print("DNS resolution succeeded:", resolved)

            print("Fetching image from:", image_url)
            response = requests.get(image_url, stream=True, timeout=10)
            response.raise_for_status()
            print("Image fetched successfully, status:", response.status_code, "Content length:", len(response.content))
            return HttpResponse(response.content, content_type=response.headers['Content-Type'])
        except socket.gaierror as e:
            print(f"DNS resolution failed: {e}")
            return HttpResponse(status=502)
        except requests.RequestException as e:
            print(f"Failed to fetch image: {e}")
            return HttpResponse(status=502)