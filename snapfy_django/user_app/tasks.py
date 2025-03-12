from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
import random
from .models import User
from django.shortcuts import get_object_or_404

def generate_otp():
    return ''.join(str(random.randint(0, 9)) for _ in range(4))

@shared_task
def send_otp_email(user_email):
    otp = generate_otp()
    print("OTP ::", otp)
    # user = User.objects.get(email=user_email)
    user = get_object_or_404(User, email=user_email)
    user.set_otp(otp)
    send_mail(
        "Email Verification OTP",
        f"Your OTP is {otp}.",
        settings.EMAIL_HOST_USER,
        [user_email],
        fail_silently=False,
    )