from django.db import transaction
from rest_framework import serializers
from .models import User, Report
from django.contrib.auth import authenticate


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
    id = serializers.UUIDField(read_only = True)
    is_staff = serializers.BooleanField(read_only = True)
    
    class Meta:
        model = User
        fields = ( 'id', 'is_staff', 'username', 'email', 'first_name', 'last_name', 'bio', 'profile_picture',
            'followers', 'following', 'is_blocked', 'is_verified'
        )