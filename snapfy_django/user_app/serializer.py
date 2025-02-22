from rest_framework import serializers
from .models import User, Report


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only = True)
    class Meta:
        model = User
        fields = (
            'password',
            'username',
            'email',
            'first_name',
            'last_name',
            'bio',
            'profile_picture',
            'is_blocked',
            'is_verified'
        )
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.is_verified = False
        user.save()
        return user
    
    


class UserSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only = True)
    is_staff = serializers.BooleanField(read_only = True)
    
    class Meta:
        model = User
        fields = (
            'id',
            'is_staff',
            'username',
            'email',
            'first_name',
            'last_name',
            'bio',
            'profile_picture',
            'followers',
            'following',
            'is_blocked',
            'is_verified'
        )