from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

urlpatterns = [
   
]

router = DefaultRouter()
router.register('users', viewset=views.UserAPIViewSet, basename='users')
urlpatterns+=router.urls