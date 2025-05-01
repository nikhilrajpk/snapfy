import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import LiveStream
from user_app.models import User
from .serializers import LiveStreamSerializer
from django.core.exceptions import ObjectDoesNotExist
import logging
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.authentication import JWTAuthentication

logger = logging.getLogger(__name__)

class LiveStreamConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.live_id = self.scope['url_route']['kwargs']['live_id']
        self.group_name = f'live_{self.live_id}'

        # Extract token from query string
        query_string = self.scope['query_string'].decode()
        token = None
        if 'token=' in query_string:
            from urllib.parse import parse_qs
            params = parse_qs(query_string)
            token = params.get('token', [None])[0]

        if not token:
            logger.warning("No token provided")
            await self.close(code=4001)
            return

        # Validate token
        try:
            jwt_auth = JWTAuthentication()
            validated_token = await database_sync_to_async(jwt_auth.get_validated_token)(token)
            self.user = await database_sync_to_async(jwt_auth.get_user)(validated_token)
            
            if not self.user.is_authenticated:
                logger.warning("User not authenticated")
                await self.close(code=4001)
                return

            # Fetch live stream with host pre-loaded
            self.live_stream = await database_sync_to_async(
                lambda: LiveStream.objects.select_related('host').get(id=self.live_id, is_active=True)
            )()
        except (InvalidToken, TokenError) as e:
            logger.error(f"Invalid token: {str(e)}")
            await self.close(code=4001)
            return
        except LiveStream.DoesNotExist:
            logger.warning(f"Live stream {self.live_id} not found")
            await self.close(code=4004)
            return
        except Exception as e:
            logger.error(f"Error in connect: {str(e)}")
            await self.close(code=4500)
            return

        # Accept connection
        await self.accept()
        await self.channel_layer.group_add(self.group_name, self.channel_name)

        # Update viewers if not host
        if self.user != self.live_stream.host:
            await database_sync_to_async(self.live_stream.viewers.add)(self.user)
            await self.send_viewer_update()

        # Send connection success
        await self.send(text_data=json.dumps({
            'type': 'connection_success',
            'message': 'Connected to live stream',
            'viewer_count': await database_sync_to_async(lambda: self.live_stream.viewers.count())(),
            'is_host': self.user == self.live_stream.host
        }))

    async def send_viewer_update(self):
        viewer_count = await database_sync_to_async(lambda: self.live_stream.viewers.count())()
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'viewer_update',
                'viewer_count': viewer_count,
                'viewer_id': str(self.user.id),
                'viewer_username': self.user.username
            }
        )

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            
        # Remove viewer if not host
        if hasattr(self, 'live_stream') and self.user != self.live_stream.host:
            try:
                await database_sync_to_async(self.live_stream.viewers.remove)(self.user)
                await self.send_viewer_update()
            except Exception as e:
                logger.error(f"Error removing viewer: {str(e)}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'join_stream':
                # Add viewer to stream
                await database_sync_to_async(self.live_stream.viewers.add)(self.user)
                await self.send_viewer_update()

            elif message_type == 'webrtc_offer':
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        'type': 'webrtc_offer',
                        'offer': data['offer'],
                        'sender_id': str(self.user.id)
                    }
                )
            elif message_type == 'webrtc_answer':
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        'type': 'webrtc_answer',
                        'answer': data['answer'],
                        'sender_id': str(self.user.id)
                    }
                )
            elif message_type == 'webrtc_ice_candidate':
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        'type': 'webrtc_ice_candidate',
                        'candidate': data['candidate'],
                        'sender_id': str(self.user.id)
                    }
                )
            elif message_type == 'chat_message':
                # Broadcast chat message to all viewers
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        'type': 'chat_message',
                        'message': data['message'],
                        'sender_id': str(data['sender_id']),
                        'sender_username': data['sender_username']
                    }
                )
        except json.JSONDecodeError as e:
            logger.error(f"WebSocket JSON decode error: {e}")
            await self.send(text_data=json.dumps({'error': 'Invalid JSON'}))

    async def webrtc_offer(self, event):
        await self.send(text_data=json.dumps({
            'type': 'webrtc_offer',
            'offer': event['offer'],
            'sender_id': event['sender_id']
        }))

    async def webrtc_answer(self, event):
        await self.send(text_data=json.dumps({
            'type': 'webrtc_answer',
            'answer': event['answer'],
            'sender_id': event['sender_id']
        }))

    async def webrtc_ice_candidate(self, event):
        await self.send(text_data=json.dumps({
            'type': 'webrtc_ice_candidate',
            'candidate': event['candidate'],
            'sender_id': event['sender_id']
        }))

    async def viewer_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'viewer_update',
            'viewer_count': event['viewer_count'],
            'viewer_id': event['viewer_id'],
            'viewer_username': event['viewer_username']
        }))

    async def stream_ended(self, event):
        await self.send(text_data=json.dumps({
            'type': 'stream_ended',
            'live_id': event['live_id']
        }))

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message'],
            'sender_id': event['sender_id'],
            'sender_username': event['sender_username']
        }))

class GlobalLiveStreamConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            token = None
            query_string = self.scope['query_string'].decode()
            
            # Parse token from query string
            if 'token=' in query_string:
                from urllib.parse import parse_qs
                params = parse_qs(query_string)
                token = params.get('token', [None])[0]
            
            if not token:
                logger.warning("No token provided in WebSocket connection")
                await self.close(code=4001)
                return

            # Validate token
            try:
                jwt_auth = JWTAuthentication()
                validated_token = await database_sync_to_async(jwt_auth.get_validated_token)(token)
                user = await database_sync_to_async(jwt_auth.get_user)(validated_token)
                
                if not user.is_authenticated:
                    logger.warning(f"Unauthenticated user attempted WebSocket connection: {user}")
                    await self.close(code=4001)
                    return
                    
                self.user = user
                self.group_name = 'live_global'
                
                # Add connection to group
                await self.channel_layer.group_add(self.group_name, self.channel_name)
                await self.accept()
                
                logger.info(f"WebSocket connected for user {self.user.username}")
                
                # Send initial active streams
                await self.send_active_streams()
                
            except (InvalidToken, TokenError) as e:
                logger.error(f"JWT authentication failed: {str(e)}")
                await self.close(code=4001)
            except Exception as e:
                logger.error(f"Unexpected error in WebSocket connect: {str(e)}", exc_info=True)
                await self.close(code=4500)

        except Exception as e:
            logger.error(f"Connection setup failed: {str(e)}", exc_info=True)
            await self.close(code=4500)

    async def send_active_streams(self):
        try:
            live_streams = await database_sync_to_async(
                lambda: list(LiveStream.objects.filter(is_active=True))
            )()
            serializer = await database_sync_to_async(
                lambda: LiveStreamSerializer(live_streams, many=True, context={'request': None}).data
            )()
            await self.send(text_data=json.dumps({
                'type': 'active_streams',
                'streams': serializer
            }))
            logger.debug(f"Sent active streams to user {self.user.username}: {len(live_streams)} streams")
        except Exception as e:
            logger.error(f"Error sending active streams: {str(e)}", exc_info=True)
            await self.send(text_data=json.dumps({'error': 'Failed to fetch active streams'}))

    async def disconnect(self, close_code):
        if hasattr(self, 'user'):
            logger.info(f"WebSocket disconnected for user {self.user.username} with code {close_code} (channel: {self.channel_name})")
        else:
            logger.info(f"WebSocket disconnected with code {close_code} (no user)")
            
        if hasattr(self, 'group_name'):
            try:
                await self.channel_layer.group_discard(self.group_name, self.channel_name)
            except Exception as e:
                logger.error(f"Error discarding channel from group: {str(e)}", exc_info=True)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            logger.debug(f"Received WebSocket message from {self.user.username}: {data}")
            if data.get('type') == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
                logger.debug(f"Sent pong to {self.user.username}")
        except json.JSONDecodeError:
            logger.error("Invalid JSON received")
            await self.send(text_data=json.dumps({'error': 'Invalid JSON'}))
        except Exception as e:
            logger.error(f"Error processing received message: {str(e)}", exc_info=True)
            await self.send(text_data=json.dumps({'error': 'Server error'}))

    async def live_stream_update(self, event):
        try:
            await self.send(text_data=json.dumps({
                'type': 'live_stream_update',
                'live_stream': event['live_stream']
            }))
            logger.debug(f"Sent live stream update to {self.user.username}")
        except Exception as e:
            logger.error(f"Error sending live stream update: {str(e)}", exc_info=True)

# TestConsumer remains unchanged
class TestConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        logger.info("Test WebSocket connected")
    
    async def disconnect(self, close_code):
        logger.info(f"Test WebSocket disconnected with code {close_code}")
    
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            if data.get('type') == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
        except json.JSONDecodeError:
            logger.error("Invalid JSON received in TestConsumer")