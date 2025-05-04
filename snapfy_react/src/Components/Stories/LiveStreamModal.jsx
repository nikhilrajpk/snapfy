import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { X, Video, MessageCircle, Users, Send } from 'lucide-react';
import { showToast } from '../../redux/slices/toastSlice';
import { CLOUDINARY_ENDPOINT } from '../../APIEndPoints';
import axiosInstance from '../../axiosInstance';
import { v4 as uuidv4 } from 'uuid';

const LiveStreamModal = ({ liveStream, onClose, isHost }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [viewerCount, setViewerCount] = useState(liveStream.viewer_count || 0);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [viewers, setViewers] = useState([]);
  const [showChat, setShowChat] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [streamReady, setStreamReady] = useState(false);
  const processedMessageIds = useRef(new Set());
  const reconnectTimeoutRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const wsRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef({});
  const peerConnections = useRef({});
  const streamRef = useRef(null); // Ref to track stream immediately
  const isMounted = useRef(true);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.user);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (isHost) {
      startHostStream().then(() => {
        setStreamReady(true);
      });
    }
    connectWebSocket();
  }, [isHost, liveStream?.id, user?.id]);

  const initiateWebRTC = async () => {
    const hostId = liveStream.host.id;
    console.log('Initiating WebRTC for host:', hostId);

    if (peerConnections.current[hostId]) {
      console.log('Closing existing peer connection for host:', hostId);
      peerConnections.current[hostId].close();
      delete peerConnections.current[hostId];
    }

    try {
      console.log('Creating new peer connection');
      const pc = createPeerConnection(hostId);
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });
      console.log('Creating offer');
      const offer = await pc.createOffer();
      console.log('Setting local description');
      await pc.setLocalDescription(offer);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('Sending WebRTC offer');
        wsRef.current.send(JSON.stringify({
          type: 'webrtc_offer',
          offer: offer,
          sender_id: user.id,
        }));
      } else {
        throw new Error('WebSocket not open');
      }
    } catch (error) {
      console.error('Error initiating WebRTC:', error);
      // dispatch(showToast({ message: 'Failed to establish video connection', type: 'error' }));
    }
  };

  const connectWebSocket = () => {
    if (!user?.id || !liveStream?.id) return;

    const getAccessToken = () => {
      return document.cookie
        .split('; ')
        .find((row) => row.startsWith('access_token='))
        ?.split('=')[1];
    };

    const accessToken = getAccessToken();
    if (!accessToken) {
      dispatch(showToast({ message: 'Please log in to view live streams', type: 'error' }));
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const backendHost = process.env.NODE_ENV === 'development' ? 'localhost:8000' : window.location.host;
    const wsUrl = `${protocol}//${backendHost}/ws/live/${liveStream.id}/?token=${encodeURIComponent(accessToken)}`;
    console.log('Attempting WebSocket connection to:', wsUrl);

    const websocket = new WebSocket(wsUrl);
    wsRef.current = websocket;

    connectionTimeoutRef.current = setTimeout(() => {
      if (websocket.readyState !== WebSocket.OPEN) {
        console.error('WebSocket connection timed out after 15 seconds');
        websocket.close(1000, 'Connection timeout');
        setConnectionError('Failed to connect to the server. Please try again.');
      }
    }, 15000);

    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const initialReconnectDelay = 1000;

    websocket.onopen = () => {
      console.log('WebSocket connected successfully');
      clearTimeout(connectionTimeoutRef.current);
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttempts = 0;

      if (!isHost) {
        websocket.send(JSON.stringify({
          type: 'join_stream',
          sender_id: user.id,
          sender_username: user.username,
        }));
        setTimeout(() => initiateWebRTC(), 100);
      }
    };

    websocket.onmessage = async (event) => {
      if (!isMounted.current) return;
      try {
        const data = JSON.parse(event.data);
        console.log('Received WebSocket message:', JSON.stringify(data, null, 2));
        if (data.type === 'viewer_update') {
          setViewerCount(data.viewer_count);
          setViewers((prev) => {
            const updated = prev.filter((v) => v.id !== data.viewer_id);
            if (data.viewer_username) {
              updated.push({ id: data.viewer_id, username: data.viewer_username });
            }
            return updated;
          });
        } else if (data.type === 'stream_ended') {
          dispatch(showToast({ message: 'Live stream has ended', type: 'info' }));
          onClose();
        } else if (data.type === 'chat_message') {
          // Skip if message is already processed or from the current user
          if (processedMessageIds.current.has(data.message_id) || data.sender_id === user.id) {
            return;
          }
          processedMessageIds.current.add(data.message_id);
          setChatMessages((prev) => [
            ...prev,
            {
              sender_id: data.sender_id,
              sender_username: data.sender_username,
              message: data.message,
              timestamp: new Date().toISOString(),
              message_id: data.message_id,
            },
          ]);
        } else if (data.type === 'webrtc_offer' && isHost) {
          if (!streamRef.current) {
            console.log('Local stream not available, waiting to process offer from:', data.sender_id);
            await new Promise((resolve) => {
              const checkStream = setInterval(() => {
                if (streamRef.current) {
                  clearInterval(checkStream);
                  resolve();
                }
              }, 100);
            });
          }
          console.log('Processing offer from:', data.sender_id);
          handleOffer(data.offer, data.sender_id);
        } else if (data.type === 'webrtc_answer' && !isHost && data.sender_id === liveStream.host.id.toString()) {
          handleAnswer(data.answer, data.sender_id);
        } else if (data.type === 'webrtc_ice_candidate') {
          if (isHost && peerConnections.current[data.sender_id]) {
            handleIceCandidate(data.candidate, data.sender_id);
          } else if (!isHost && data.sender_id === liveStream.host.id.toString()) {
            handleIceCandidate(data.candidate, data.sender_id);
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      clearTimeout(connectionTimeoutRef.current);
      setIsConnected(false);
      setConnectionError('WebSocket connection error');
    };

    websocket.onclose = (event) => {
      console.log(`WebSocket closed with code: ${event.code}, reason: ${event.reason}`);
      clearTimeout(connectionTimeoutRef.current);
      setIsConnected(false);

      if (event.code !== 1000 && isMounted.current && reconnectAttempts < maxReconnectAttempts) {
        const delay = initialReconnectDelay * Math.pow(2, reconnectAttempts);
        console.log(`Reconnecting in ${delay}ms (Attempt ${reconnectAttempts + 1})`);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts++;
          connectWebSocket();
        }, delay);
      } else if (event.code !== 1000) {
        setConnectionError('Unable to connect after multiple attempts. Please refresh the page.');
      }
    };
  };

  const startHostStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      console.log('Host captured stream with tracks:', stream.getTracks());
      streamRef.current = stream; // Set ref immediately
      setLocalStream(stream);     // Set state (async update)
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
      dispatch(showToast({ message: 'Failed to access camera/microphone', type: 'error' }));
      onClose();
    }
  };

  const joinStream = async () => {
    try {
      await new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50;
        const checkConnection = () => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            resolve();
          } else if (wsRef.current?.readyState === WebSocket.CLOSED || wsRef.current?.readyState === WebSocket.CLOSING) {
            reject(new Error('WebSocket connection failed'));
          } else if (attempts >= maxAttempts) {
            reject(new Error('WebSocket connection timeout'));
          } else {
            attempts++;
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });

      const response = await axiosInstance.post(`/live/${liveStream.id}/join/`);
      setViewerCount(response.data.viewer_count);
    } catch (error) {
      console.error('Error joining stream:', error);
      dispatch(showToast({ message: error.message || 'Failed to join live stream', type: 'error' }));
      onClose();
    }
  };

  const createPeerConnection = (viewerId) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('Sending ICE candidate:', event.candidate.candidate);
        wsRef.current.send(JSON.stringify({
          type: 'webrtc_ice_candidate',
          candidate: event.candidate,
          sender_id: user.id,
        }));
      } else if (!event.candidate) {
        console.log('ICE candidate gathering completed for:', viewerId);
      }
    };

    pc.ontrack = (event) => {
      if (!isHost && isMounted.current) {
        console.log('Received remote track from host:', viewerId, event.streams[0].getTracks());
        setRemoteStreams((prev) => ({ ...prev, [viewerId]: event.streams[0] }));
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Peer connection state:', pc.connectionState);
      if (pc.connectionState === 'failed') {
        console.error('Peer connection failed for:', viewerId);
      }
    };

    if (isHost && streamRef.current) {
      console.log('Host adding tracks to peer connection for:', viewerId);
      streamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, streamRef.current);
        console.log('Added track:', track.kind);
      });
    }

    peerConnections.current[viewerId] = pc;
    return pc;
  };

  const handleSendMessage = () => {
    if (!chatInput.trim() || !wsRef.current) return;
    if (wsRef.current.readyState === WebSocket.OPEN) {
      const messageId = uuidv4();
      console.log('Sending chat message:', chatInput, 'with ID:', messageId);
      wsRef.current.send(JSON.stringify({
        type: 'chat_message',
        message: chatInput,
        sender_id: user.id,
        sender_username: user.username,
        message_id: messageId,
      }));
      // Add message locally for sender to see immediately
      processedMessageIds.current.add(messageId);
      setChatMessages((prev) => [
        ...prev,
        {
          sender_id: user.id,
          sender_username: user.username,
          message: chatInput,
          timestamp: new Date().toISOString(),
          message_id: messageId,
        },
      ]);
      setChatInput('');
    } else {
      dispatch(showToast({ message: 'Cannot send message: not connected', type: 'error' }));
    }
  };

  const handleOffer = async (offer, senderId) => {
    console.log('Host received offer from:', senderId);
    try {
      const pc = createPeerConnection(senderId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('Host sending answer to:', senderId);
        wsRef.current.send(JSON.stringify({
          type: 'webrtc_answer',
          answer: answer,
          sender_id: user.id,
        }));
      } else {
        console.error('WebSocket not open to send answer');
      }
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleAnswer = async (answer, senderId) => {
    const pc = peerConnections.current[senderId];
    if (pc) {
      console.log('Current signaling state:', pc.signalingState);
      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('Remote description set successfully for:', senderId);
      } else {
        console.error('Invalid signaling state for setting remote answer:', pc.signalingState);
      }
    } else {
      console.error('No peer connection found for sender:', senderId);
    }
  };

  const handleIceCandidate = async (candidate, senderId) => {
    const pc = peerConnections.current[senderId];
    if (pc) {
      console.log('Adding ICE candidate:', candidate);
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  const stopStream = async () => {
    if (isHost) {
      try {
        await axiosInstance.delete(`/live/${liveStream.id}/`);
        dispatch(showToast({ message: 'Live stream ended', type: 'success' }));
      } catch (error) {
        console.error('Error ending stream:', error);
        dispatch(showToast({ message: 'Failed to end live stream', type: 'error' }));
      }
    } else {
      try {
        await axiosInstance.post(`/live/${liveStream.id}/leave/`);
      } catch (error) {
        console.error('Error leaving stream:', error);
      }
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    Object.values(peerConnections.current).forEach((pc) => pc.close());
    peerConnections.current = {};
    setLocalStream(null);
    setRemoteStreams({});
  };

  useEffect(() => {
    if (!isHost) {
      Object.entries(remoteStreams).forEach(([viewerId, stream]) => {
        const videoEl = remoteVideoRef.current[viewerId];
        if (videoEl) {
          if (videoEl.srcObject !== stream) {
            console.log('Binding stream to video element for:', viewerId);
            videoEl.srcObject = stream;
            videoEl.play().catch((e) => console.error('Error playing video:', e));
          }
        } else {
          console.warn('Video element not found for:', viewerId);
        }
      });
    }
  }, [remoteStreams, isHost]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <img
            src={liveStream.host.profile_picture || '/default-profile.png'}
            alt={liveStream.host.username}
            className="w-8 h-8 rounded-full object-cover"
            onError={(e) => (e.target.src = '/default-profile.png')}
          />
          <div>
            <p
              onClick={() => navigate(`/user/${liveStream.host.username}`)}
              className="text-white font-medium cursor-pointer"
            >
              {liveStream.host.username}
            </p>
            <p className="text-white/60 text-xs">
              {(() => {
                try {
                  const parsed = JSON.parse(liveStream?.title.replace(/'/g, '"'));
                  return parsed.title || 'Live Stream';
                } catch (e) {
                  return 'Live Stream';
                }
              })()}
            </p>
            {console.log(liveStream)}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Users size={18} className="text-white/80" />
            <span className="text-white/80 text-sm">{viewerCount}</span>
          </div>
          <X
            size={24}
            className="text-white/80 cursor-pointer hover:text-white"
            onClick={() => {
              stopStream();
              onClose();
            }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-row items-center justify-center relative">
        <div className="flex-1 w-full h-full max-w-4xl max-h-[80vh] relative">
          {isHost ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain rounded-lg"
            />
          ) : (
            <video
              ref={(el) => (remoteVideoRef.current[liveStream.host.id] = el)}
              autoPlay
              playsInline
              className="w-full h-full object-contain rounded-lg"
            />
          )}
          <div className="absolute top-4 left-4 bg-red-500 text-white px-2 py-1 rounded-full text-sm flex items-center gap-1 animate-pulse">
            <Video size={14} />
            LIVE
          </div>
        </div>

        {showChat && (
          <div className="w-80 bg-gray-900/80 p-4 flex flex-col h-[80vh]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Live Chat</h3>
              <button
                onClick={() => setShowChat(false)}
                className="text-white/80 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
              {chatMessages.map((msg, index) => (
                <div key={msg.message_id} className="text-white text-sm">
                  <span className="font-semibold">{msg.sender_username}: </span>
                  {msg.message}
                </div>
              ))}
            </div>
            <div className="flex mt-4">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Send a message..."
                className="flex-1 p-2 rounded-l-lg bg-gray-800 text-white border-none focus:ring-2 focus:ring-[#198754]"
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button
                onClick={handleSendMessage}
                className="p-2 bg-[#198754] text-white rounded-r-lg hover:bg-[#157347]"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        )}
        {!showChat && (
          <button
            onClick={() => setShowChat(true)}
            className="absolute bottom-4 right-4 p-3 bg-[#198754] text-white rounded-full hover:bg-[#157347]"
          >
            <MessageCircle size={24} />
          </button>
        )}
      </div>
    </div>
  );
};

export default LiveStreamModal;