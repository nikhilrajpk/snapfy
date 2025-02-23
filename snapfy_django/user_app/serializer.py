from django.db import transaction
from rest_framework import serializers
from .models import User, Report
from django.contrib.auth import authenticate


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only = True)
    profile_picture = serializers.ImageField(required=False)
    class Meta:
        model = User
        fields = ('password', 'username', 'email', 'first_name', 'last_name', 'bio', 'profile_picture')
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.is_verified = False
        user.save()
        return user
    
    # def update(self, instance, validated_data):
    #     with transaction.atomic():
    #         return super().update(instance, validated_data)
        

class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField()

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


class UserSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only = True)
    is_staff = serializers.BooleanField(read_only = True)
    
    class Meta:
        model = User
        fields = ( 'id', 'is_staff', 'username', 'email', 'first_name', 'last_name', 'bio', 'profile_picture',
            'followers', 'following', 'is_blocked', 'is_verified'
        )