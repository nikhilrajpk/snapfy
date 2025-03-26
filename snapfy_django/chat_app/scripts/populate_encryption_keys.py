# chat_app/scripts/populate_encryption_keys.py
from django.apps import apps
from django.conf import settings

def populate_encryption_keys():
    ChatRoom = apps.get_model('chat_app', 'ChatRoom')
    for room in ChatRoom.objects.all():
        if not room.encryption_key:  # Only set if missing
            room.encryption_key = generate_encryption_key()
            room.save()
            print(f"Updated ChatRoom {room.id} with key: {room.encryption_key}")

if __name__ == "__main__":
    import os
    import django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'snapfy_django.settings')
    django.setup()
    from chat_app.models import generate_encryption_key
    populate_encryption_keys()