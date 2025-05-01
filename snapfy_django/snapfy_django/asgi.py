# snapfy_django/asgi.py
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

# Set the default settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'snapfy_django.settings')

# Initialize Django ASGI application first
django_asgi_app = get_asgi_application()

# Import routing after initialization
from chat_app import routing 
from notification_app import routing as notification_routing
from story_app import routing as story_routing

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(
            routing.websocket_urlpatterns +
            notification_routing.websocket_urlpatterns+
            story_routing.websocket_urlpatterns
        )
    ),
})

