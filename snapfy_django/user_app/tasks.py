import logging
from django.core.mail import send_mail
from django.conf import settings
import random
from .models import User
from django.shortcuts import get_object_or_404

logger = logging.getLogger(__name__)

def generate_otp():
    return ''.join(str(random.randint(0, 9)) for _ in range(4))

def send_otp_email(user_email):
    otp = generate_otp()
    logger.info(f"OTP :: {otp}")
    user = get_object_or_404(User, email=user_email)
    try:
        user.set_otp(otp)
    except Exception as e:
        logger.error(f"Failed to store OTP in Redis for {user_email}: {str(e)}")
        raise  # Re-raise to handle the error in the view

    try:
        send_mail(
            subject="Verify Your Snapfy Account",
            message=(
                f"Hi there,\n\n"
                f"Thanks for signing up with Snapfy! Your One-Time Password (OTP) is: {otp}\n\n"
                f"Please enter this code to verify your email. It’s valid for 10 minutes.\n\n"
                f"If you didn’t request this, feel free to ignore this email.\n\n"
                f"Best,\nThe Snapfy Team"
            ),
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[user_email],
            fail_silently=False,
            html_message=(
                f"<h2>Welcome to Snapfy!</h2>"
                f"<p>Hi there,</p>"
                f"<p>Thanks for signing up! Your One-Time Password (OTP) is: <strong>{otp}</strong></p>"
                f"<p>Please enter this code to verify your email. It’s valid for 5 minutes.</p>"
                f"<p>If you didn’t request this, feel free to ignore this email.</p>"
                f"<p>Best,<br>The Snapfy Team</p>"
            ),
        )
        logger.info(f"Email sent to {user_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {user_email}: {str(e)}")
        raise  # Re-raise to handle the error in the view