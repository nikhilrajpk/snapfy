import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { X, Video, MessageCircle, Users, Send } from 'lucide-react';
import { showToast } from '../../redux/slices/toastSlice';
import { CLOUDINARY_ENDPOINT } from '../../APIEndPoints';
import axiosInstance from '../../axiosInstance';

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
  const reconnectTimeoutRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const wsRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef({});
  const peerConnections = useRef({});
  const isMounted = useRef(true); // Prevent state updates after unmount
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.user);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const initiateWebRTC = async () => {
    try {
      const pc = createPeerConnection(liveStream.host.id);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('Sending WebRTC offer');
        wsRef.current.send(JSON.stringify({
          type: 'webrtc_offer',
          offer: offer,
          sender_id: user.id,
        }));
      }
    } catch (error) {
      console.error('Error initiating WebRTC:', error);
      dispatch(showToast({ message: 'Failed to establish video connection', type: 'error' }));
    }
  };

  useEffect(() => {
    if (!user?.id || !liveStream?.id) return;

    const getAccessToken = () => {
      return document.cookie
        .split('; ')
        .find(row => row.startsWith('access_token='))
        ?.split('=')[1];
    };

    const connectWebSocket = () => {
      const accessToken = getAccessToken();
      if (!accessToken) {
        dispatch(showToast({ message: 'Please log in to view live streams', type: 'error' }));
        return;
      }

      // Dynamic WebSocket URL based on environment
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const backendHost = process.env.NODE_ENV === 'development' ? 'localhost:8000' : window.location.host;
      const wsUrl = `${protocol}//${backendHost}/ws/live/${liveStream.id}/?token=${encodeURIComponent(accessToken)}`;
      console.log('Attempting WebSocket connection to:', wsUrl);

      const websocket = new WebSocket(wsUrl);
      wsRef.current = websocket;

      connectionTimeoutRef.current = setTimeout(() => {
        console.log('Timeout check: WebSocket state is', websocket.readyState);
        if (websocket.readyState !== WebSocket.OPEN) {
          console.error('WebSocket connection timed out after 15 seconds');
          websocket.close(1000, 'Connection timeout');
          setConnectionError('Failed to connect to the server. Please try again.');
        } else {
          console.log('WebSocket is already open, ignoring timeout');
        }
      }, 15000);

      let reconnectAttempts = 0;
      const maxReconnectAttempts = 5;
      const initialReconnectDelay = 1000; // 1 second

      websocket.onopen = () => {
        console.log('WebSocket connected successfully');
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts = 0;
    
        if (!isHost && websocket.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify({
            type: 'join_stream',
            sender_id: user.id,
            sender_username: user.username,
          }));
          initiateWebRTC();
        }
      };

      websocket.onmessage = (event) => {
        if (!isMounted.current) return;
        try {
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);
      
          if (data.type === 'viewer_update') {
            setViewerCount(data.viewer_count);
            setViewers(prev => {
              const updated = prev.filter(v => v.id !== data.viewer_id);
              if (data.viewer_username) {
                updated.push({ id: data.viewer_id, username: data.viewer_username });
              }
              return updated;
            });
          } else if (data.type === 'stream_ended') {
            dispatch(showToast({ message: 'Live stream has ended', type: 'info' }));
            onClose();
          } else if (data.type === 'chat_message') {
            setChatMessages(prev => [
              ...prev,
              { sender_id: data.sender_id, sender_username: data.sender_username, message: data.message, timestamp: new Date().toISOString() },
            ]);
          } else if (data.type === 'webrtc_offer') {
            handleOffer(data.offer, data.sender_id);
          } else if (data.type === 'webrtc_answer') {
            handleAnswer(data.answer, data.sender_id);
          } else if (data.type === 'webrtc_ice_candidate') {
            handleIceCandidate(data.candidate, data.sender_id);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
        setIsConnected(false);
        setConnectionError('WebSocket connection error');
      };
    
      websocket.onclose = (event) => {
        console.log(`WebSocket closed with code: ${event.code}, reason: ${event.reason}`);
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
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

    connectWebSocket();

    return () => {
      console.log('Cleaning up WebSocket connection');
      if (wsRef.current) {
        if (wsRef.current.readyState !== WebSocket.CLOSED) {
          wsRef.current.close(1000, 'Component unmounting');
        }
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current = null;
      }
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [liveStream?.id, user?.id, dispatch, navigate, isHost]);

  useEffect(() => {
    if (isHost) {
      startHostStream();
    } else {
      joinStream();
    }
  }, [isHost]);

  const startHostStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
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
        const maxAttempts = 50; // 5 seconds with 100ms intervals
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
        wsRef.current.send(JSON.stringify({
          type: 'webrtc_ice_candidate',
          candidate: event.candidate,
          sender_id: user.id,
        }));
      }
    };
    pc.ontrack = (event) => {
      if (!isHost && isMounted.current) {
        setRemoteStreams((prev) => ({ ...prev, [viewerId]: event.streams[0] }));
      }
    };
    if (isHost && localStream) {
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    }
    peerConnections.current[viewerId] = pc;
    return pc;
  };

  const handleSendMessage = () => {
    if (!chatInput.trim() || !wsRef.current) return;
    if (wsRef.current.readyState === WebSocket.OPEN) {
      console.log('Sending chat message:', chatInput);
      wsRef.current.send(JSON.stringify({
        type: 'chat_message',
        message: chatInput,
        sender_id: user.id,
        sender_username: user.username,
      }));
      setChatInput('');
    } else {
      dispatch(showToast({ message: 'Cannot send message: not connected', type: 'error' }));
    }
  };

  const handleOffer = async (offer, senderId) => {
    const pc = createPeerConnection(senderId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    wsRef.current.send(JSON.stringify({
      type: 'webrtc_answer',
      answer: answer,
      sender_id: user.id,
    }));
  };

  const handleAnswer = async (answer, senderId) => {
    const pc = peerConnections.current[senderId];
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };

  const handleIceCandidate = async (candidate, senderId) => {
    const pc = peerConnections.current[senderId];
    if (pc) {
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
        if (remoteVideoRef.current[viewerId]) {
          remoteVideoRef.current[viewerId].srcObject = stream;
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
            <p className="text-white/60 text-xs">{
              (() => {
                try {
                  const parsed = JSON.parse(liveStream?.title.replace(/'/g, '"'));
                  return parsed.title || 'Live Stream';
                } catch (e) {
                  return 'Live Stream';
                }
              })()
            }</p>
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
                <div key={index} className="text-white text-sm">
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