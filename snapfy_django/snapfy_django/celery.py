import os

from celery import Celery
from django.conf import settings

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'snapfy_django.settings')

# app = Celery('snapfy_django')
app = Celery('snapfy_django', broker=settings.CELERY_BROKER_URL)

# Use solo mode on Windows
if os.name == 'nt':  # Windows
    app.conf.update(
        worker_pool='solo',
    )

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
# - namespace='CELERY' means all celery-related configuration keys
#   should have a `CELERY_` prefix.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()


# @app.task(bind=True, ignore_result=True)
# def debug_task(self):
#     print(f'Request: {self.request!r}')