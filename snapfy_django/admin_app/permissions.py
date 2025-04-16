# admin_app.permissions.py
from rest_framework import permissions

class IsAdminUser(permissions.BasePermission):
    """
    Permission to only allow staff or superusers to access the view.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser)