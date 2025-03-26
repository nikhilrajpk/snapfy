from django.db import transaction
from django.db.models import Q
from rest_framework import serializers
from .models import User, Report
from django.contrib.auth import authenticate
from post_app.serializer import PostSerializer, SavedPostSerializer, ArchivedPostSerializer


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    profile_picture = serializers.ImageField(required=False)
    
    class Meta:
        model = User
        fields = ('password', 'username', 'email', 'first_name', 'last_name', 'bio', 'profile_picture')
    
    def validate_email(self, value):
        # Check if a verified user exists with this email
        if User.objects.filter(email=value, is_verified=True).exists():
            raise serializers.ValidationError("This email is already in use.")
        
        # Check if email is used by a Google Sign-In user
        if User.objects.filter(email=value, is_google_signIn=True).exists():
            raise serializers.ValidationError("This email is already registered via Google Sign-In. Please use Google to log in.")
        
        return value
    
    def validate_username(self, value):
        # Check if a verified user exists with this username
        if User.objects.filter(username=value, is_verified=True).exists():
            raise serializers.ValidationError("This username is already in use.")
        return value
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        email = validated_data["email"]
        username = validated_data["username"]
        
        # Check if unverified user already exists
        user = User.objects.filter(email=email, is_verified=False).first()
        
        if user:
            # Update the existing unverified user with new data
            for attr, value in validated_data.items():
                setattr(user, attr, value)
            user.set_password(password)
            user.save()
            return user
        
        # Create new user if no existing unverified user
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.is_verified = False
        user.save()
        return user  

class UserProfileUpdateSerializer(serializers.ModelSerializer):
    profile_picture = serializers.ImageField(required=False, allow_null=True)
    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'bio', 'profile_picture')
        
    def validate_username(self, value):
        current_user = self.instance
        if current_user and User.objects.filter(~Q(id=current_user.id) & Q(username=value)).exists():
            raise serializers.ValidationError("This username is already in use.")
        return value
    
    def validate_profile_picture(self, value):
        # If value is a string (existing URL), skip file validation
        if isinstance(value, str):
            return value
        # If value is a file, validate it
        if value:
            if value.content_type not in ['image/jpeg', 'image/png', 'image/jpg']:
                raise serializers.ValidationError("Please upload a JPG or PNG file")
        return value
    
    def update(self, instance, validated_data):
        # If profile_picture is a string (existing URL), remove it from validated_data to preserve the current image
        if 'profile_picture' in validated_data and isinstance(validated_data['profile_picture'], str):
            validated_data.pop('profile_picture')
        return super().update(instance, validated_data)

class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField()
    
class ResendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        if not user:
            raise serializers.ValidationError("Invalid credentials")
        if not user.is_verified:
            raise serializers.ValidationError("Email is not verified")
        if user.is_blocked:
            raise serializers.ValidationError("Your account is blocked by the admin")
        return {'user': user}


class ResetPasswordSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True)
    email = serializers.EmailField()


class UserSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True, format='hex_verbose')
    is_staff = serializers.BooleanField(read_only=True)
    posts = serializers.SerializerMethodField()
    saved_posts = SavedPostSerializer(many=True, read_only=True)
    archived_posts = ArchivedPostSerializer(many=True, read_only=True)
    follower_count = serializers.SerializerMethodField() 
    following_count = serializers.SerializerMethodField()
    followers = serializers.SerializerMethodField()
    following = serializers.SerializerMethodField()
    profile_picture = serializers.SerializerMethodField()
    blocked_users = serializers.SerializerMethodField()
    last_seen = serializers.DateTimeField(read_only=True, allow_null=True)
    is_online = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ('id', 'posts', 'is_staff', 'username', 'email', 'first_name', 'last_name', 'bio', 'profile_picture',
                  'followers', 'following', 'is_blocked', 'is_verified', 'is_google_signIn', 'saved_posts', 'archived_posts', 'follower_count', 'following_count', 'blocked_users', 'is_online', 'last_seen')

    def get_posts(self, obj):
        archived_post_ids = obj.archived_posts.values_list('post_id', flat=True)
        posts = obj.posts.exclude(id__in=archived_post_ids).order_by('-id')
        return PostSerializer(posts, many=True).data
    
    def get_follower_count(self, obj):
        return obj.followers.count()

    def get_following_count(self, obj):
        return obj.following.count()
    
    def get_followers(self, obj):
        return [
            {
                'username': user.username,
                'profile_picture': str(user.profile_picture) if user.profile_picture else None
            } 
            for user in obj.followers.all()
        ]

    def get_following(self, obj):
        return [
            {
                'username': user.username,
                'profile_picture': str(user.profile_picture) if user.profile_picture else None
            } 
            for user in obj.following.all()
        ]

    def get_profile_picture(self, obj):
        # If profile_picture exists, convert it to string (Cloudinary public ID)
        return str(obj.profile_picture) if obj.profile_picture else None
    
    def get_blocked_users(self, obj):
        return [blocked.blocked.username for blocked in obj.blocked_users.all()]
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Ensure UUID id is a string (redundant with format='hex_verbose', but safe)
        data['id'] = str(data['id'])
        return data