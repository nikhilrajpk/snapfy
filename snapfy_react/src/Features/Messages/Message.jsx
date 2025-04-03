import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { showToast } from '../../redux/slices/toastSlice';
import { format } from 'date-fns';
import Loader from '../../utils/Loader/Loader';
import { IoCall, IoVideocam, IoInformationCircle, IoImage, IoSend, IoSearch, IoTrash, IoMic, IoMicOff, IoPersonAdd, IoPersonRemove, IoExitOutline } from 'react-icons/io5';
import { BsEmojiSmile } from 'react-icons/bs';
import { getMessages } from '../../API/chatAPI';
import { CLOUDINARY_ENDPOINT } from '../../APIEndPoints';
import axiosInstance from '../../axiosInstance';
import groupIcon from '../../assets/group-icon.png';
import { createPortal } from 'react-dom';

const Navbar = React.lazy(() => import('../../Components/Navbar/Navbar'));
const Logo = React.lazy(() => import('../../Components/Logo/Logo'));
const EmojiPicker = React.lazy(() => import('emoji-picker-react'));
const PostPopup = React.lazy(() => import('../../Components/Post/PostPopUp'));

function Message() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [chatRooms, setChatRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupUsernameInput, setGroupUsernameInput] = useState('');
  const [groupUsers, setGroupUsers] = useState([]);
  const [groupUserSuggestions, setGroupUserSuggestions] = useState([]);
  const [showManageGroupModal, setShowManageGroupModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [callState, setCallState] = useState(null); // null, 'incoming', 'outgoing', 'active', 'ended'
  const [callId, setCallId] = useState(null);
  const [caller, setCaller] = useState(null);
  const [callOfferSdp, setCallOfferSdp] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const callDurationRef = useRef(0);
  const callTimerRef = useRef(null);

  // WebRTC Configuration
  const RTC_CONFIG = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] // Public STUN server
  };

  // Timer effect for recording
  useEffect(() => {
    let timer;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  useEffect(() => {
    const chatContainer = messagesContainerRef.current;
    if (chatContainer && !initialLoad) {
      const isAtBottom = chatContainer.scrollHeight - chatContainer.scrollTop <= chatContainer.clientHeight + 50;
      if (isAtBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages, initialLoad]);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchChatRooms = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get('/chatrooms/my-chats/');
        setChatRooms(response.data);
      } catch (error) {
        console.error('Error fetching chat rooms:', error);
        dispatch(showToast({ message: 'Failed to load chats', type: 'error' }));
      } finally {
        setIsLoading(false);
      }
    };

    fetchChatRooms();
  }, [dispatch, user, navigate]);

  // Check for active calls when component mounts or conversation changes
  const checkActiveCalls = async () => {
    if (!conversationId) return;
    
    try {
      const response = await axiosInstance.get(`/chatrooms/${conversationId}/call-history/`);
      const activeCall = response.data.find(call => 
        call.call_status === 'ongoing' && !call.call_end_time
      );
      
      if (activeCall) {
        setCallId(activeCall.id);
        if (String(activeCall.caller.id) === String(user.id)) {
          setCallState('outgoing');
        } else {
          setCallState('incoming');
          setCaller(activeCall.caller);
          setCallOfferSdp(activeCall.sdp);
        }
      }
    } catch (error) {
      console.error('Error checking active calls:', error);
    }
  };

  // call timer
  useEffect(() => {
    if (callState === 'active') {
      callDurationRef.current = 0;
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        callDurationRef.current += 1;
        setCallDuration(callDurationRef.current);
      }, 1000);
    } else if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    return () => clearInterval(callTimerRef.current);
  }, [callState]);

  useEffect(() => {
    if (!conversationId || !user) return;

    const fetchRoomAndMessages = async () => {
      setIsLoading(true);
      try {
        const roomData = await axiosInstance.get(`/chatrooms/${conversationId}/`).then((res) => res.data);
        setSelectedRoom(roomData);

        const msgs = await getMessages(conversationId);
        const messageItems = msgs.map((msg) => ({
          ...msg,
          sender: { ...msg.sender, profile_picture: msg.sender.profile_picture || null },
          key: `${msg.id}-${msg.sent_at}-${Math.random().toString(36).substr(2, 5)}`,
          file_url: msg.file_url || null,
        })) || [];

        // Check for call history and add to messages
        const callHistory = await axiosInstance.get(`/chatrooms/${conversationId}/call-history/`);
        const callItems = callHistory.data.map((call) => ({
          id: `call-${call.id}`,
          key: `call-${call.id}-${call.call_start_time}-${Math.random().toString(36).substr(2, 5)}`,
          sender: call.caller.id === user.id ? user : call.caller,
          content: `Call: ${call.call_type} - ${call.call_status}`,
          sent_at: call.call_end_time || call.call_start_time,
          is_call: true,
          call_status: call.call_status,
          call_duration: call.duration ? formatCallDuration(call.duration) : null,
        }));

        setMessages([...messageItems, ...callItems].sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at)));

        // Check for active calls
        await checkActiveCalls();

        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ type: 'mark_as_read', room_id: conversationId }));
        }
      } catch (error) {
        console.error('Error fetching room/messages:', error);
        dispatch(showToast({ message: 'Failed to load chat', type: 'error' }));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRoomAndMessages();
  }, [conversationId, dispatch, user, navigate]);

  useEffect(() => {
    if (initialLoad && messages.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setInitialLoad(false);
    }
  }, [initialLoad, messages]);

  useEffect(() => {
    if (!user?.id) return;

    let socketClosedIntentionally = false;
    const connectWebSocket = () => {
      const accessToken = document.cookie.split('; ').find(row => row.startsWith('access_token='))?.split('=')[1];
      const socket = new WebSocket(`ws://127.0.0.1:8000/ws/user/chat/?token=${accessToken}`);
      socketRef.current = socket;

      socket.onclose = (event) => {
        if (event.code !== 1000) { // Abnormal closure
          console.log('WebSocket disconnected, reconnecting...');
          setTimeout(connectWebSocket, 3000); // Reconnect after 3 seconds
        }
      };

      socket.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log('WebSocket data:', JSON.stringify(data, null, 2));

        switch (data.type) {
          case 'chat_message': {
            const message = data.message;
            if (!message || !message.sender || !message.sender.id) {
              console.error('Invalid chat_message data:', data);
              break;
            }
            const newMessage = {
              ...message,
              file_url: message.file_url || null,
              sent_at: message.sent_at || new Date().toISOString(),
              is_read: message.is_read || false,
              is_deleted: message.is_deleted || false,
              sender: {
                id: message.sender.id,
                username: message.sender.username || 'Unknown',
                profile_picture: message.sender.profile_picture || null,
              },
              key: `${message.id}-${message.sent_at}-${Math.random().toString(36).substr(2, 5)}`,
              file_type: message.file_type || 'other',
            };

            setChatRooms((prev) => {
              const updatedRooms = prev.map((room) => {
                if (String(room.id) === String(data.room_id)) {
                  const isOwnMessage = String(newMessage.sender.id) === String(user?.id);
                  const isCurrentRoom = String(data.room_id) === String(conversationId);
                  return {
                    ...room,
                    last_message: {
                      content: newMessage.is_deleted ? '[Deleted]' : newMessage.content,
                      file_url: newMessage.file_url,
                      is_deleted: newMessage.is_deleted,
                    },
                    last_message_at: newMessage.sent_at,
                    unread_count: isOwnMessage || isCurrentRoom ? 0 : data.unread_count,
                  };
                }
                return room;
              });
              return updatedRooms.sort((a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0));
            });

            if (String(data.room_id) === String(conversationId)) {
              setMessages((prev) => {
                const tempIdMatch = message.tempId && prev.some((msg) => msg.tempId === message.tempId);
                if (tempIdMatch) {
                  return prev.map((msg) => (msg.tempId === message.tempId ? newMessage : msg));
                }
                const existingIndex = prev.findIndex((msg) => String(msg.id) === String(message.id));
                if (existingIndex !== -1) {
                  return prev.map((msg, index) => (index === existingIndex ? newMessage : msg));
                }
                return [...prev, newMessage];
              });

              if (String(newMessage.sender.id) !== String(user?.id)) {
                socketRef.current.send(JSON.stringify({ type: 'mark_as_read', room_id: conversationId }));
              }
            }
            break;
          }

          case 'mark_as_read':
            if (String(data.room_id) === String(conversationId)) {
              setMessages((prev) =>
                prev.map((msg) =>
                  data.updated_ids.includes(String(msg.id)) ? { ...msg, is_read: true, read_at: data.read_at } : msg
                )
              );
            }
            setChatRooms((prev) =>
              prev.map((room) =>
                String(room.id) === String(data.room_id) ? { ...room, unread_count: 0 } : room
              )
            );
            setSelectedRoom((prev) =>
              prev && String(prev.id) === String(data.room_id) ? { ...prev, unread_count: 0 } : prev
            );
            break;

          case 'user_status':
            setChatRooms((prev) =>
              prev.map((room) => {
                const otherUser = room.users.find((u) => String(u.id) !== String(user?.id));
                if (String(otherUser?.id) === String(data.user_id)) {
                  return {
                    ...room,
                    users: room.users.map((u) =>
                      String(u.id) === String(data.user_id)
                        ? { ...u, is_online: data.is_online, last_seen: data.last_seen }
                        : u
                    ),
                  };
                }
                return room;
              })
            );
            setSelectedRoom((prev) =>
              prev && prev.users.some((u) => String(u.id) === String(data.user_id))
                ? {
                    ...prev,
                    users: prev.users.map((u) =>
                      String(u.id) === String(data.user_id)
                        ? { ...u, is_online: data.is_online, last_seen: data.last_seen }
                        : u
                    ),
                  }
                : prev
            );
            break;

            case 'call_offer':
              if (String(data.room_id) === String(conversationId) && String(data.caller.id) !== String(user.id)) {
                console.log('Received call offer:', data);
                setCallState('incoming');
                setCallId(data.call_id);
                setCaller(data.caller);
                // Store the full offer object
                setCallOfferSdp({
                  type: data.sdp.type || 'offer',
                  sdp: data.sdp.sdp || data.sdp
                });
                
                // Show notification
                dispatch(showToast({
                  message: `Incoming call from ${data.caller.username}`,
                  type: 'info',
                  action: {
                    label: 'Answer',
                    onClick: () => navigate(`/messages/${data.room_id}`)
                  }
                }));
              }
              break;


          case 'call_answer':
            if (String(data.room_id) === String(conversationId) && peerConnectionRef.current) {
              await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
              setCallState('active');
            }
            break;

          case 'ice_candidate':
            if (String(data.room_id) === String(conversationId) && peerConnectionRef.current) {
              await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
            break;

          case 'call_ended':
            if (String(data.room_id) === String(conversationId)) {
              endCall(data.call_status, false); // Prevent duplicate from WebSocket
              const existingCallIndex = messages.findIndex((msg) => msg.id === `call-${data.call_id}`);
              const callMessage = {
                id: `call-${data.call_id}`,
                key: `call-${data.call_id}-${new Date().toISOString()}-${Math.random().toString(36).substr(2, 5)}`,
                sender: caller || user,
                content: `Call: audio - ${data.call_status}`,
                sent_at: new Date().toISOString(),
                is_call: true,
                call_status: data.call_status,
                call_duration: formatCallDuration(data.duration || 0),
              };
              setMessages((prev) =>
                existingCallIndex !== -1
                  ? prev.map((msg, index) => (index === existingCallIndex ? callMessage : msg))
                  : [...prev, callMessage].sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at))
              );
            }
            break;
        }
      };

      socket.onerror = (error) => console.error('WebSocket error:', error);
      socket.onclose = (event) => {
        console.log(`WebSocket closed with code: ${event.code}, reason: ${event.reason}`);
        if (event.code !== 1000 && !socketClosedIntentionally) setTimeout(connectWebSocket, 1000);
      };
    };

    connectWebSocket();

    return () => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.close(1000, 'Component unmounted');
      }
    };
  }, [user?.id, conversationId, dispatch]);

  // WebRTC Call Functions
  const startCall = async () => {
    try {
      const otherUser = selectedRoom.users.find((u) => String(u.id) !== String(user.id));
      if (!otherUser?.id) throw new Error('No user to call');
  
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
  
      peerConnectionRef.current = new RTCPeerConnection(RTC_CONFIG);
      stream.getTracks().forEach((track) => peerConnectionRef.current.addTrack(track, stream));
  
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.send(JSON.stringify({
            type: 'ice_candidate',
            room_id: conversationId,
            target_user_id: otherUser.id,
            candidate: event.candidate,
          }));
        }
      };
  
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
  
      const response = await axiosInstance.post(`/chatrooms/${conversationId}/start-call/`, {
        call_type: 'audio',
        sdp: offer,
      });
  
      if (!response.data.call_id) {
        throw new Error('Failed to start call: no call ID returned');
      }
  
      setCallId(response.data.call_id);
      setCallState('outgoing');
  
    } catch (error) {
      console.error('Error starting call:', error);
      dispatch(showToast({ message: 'Failed to start call', type: 'error' }));
      endCall('failed');
    }
  };

  const acceptCall = async () => {
    try {
      if (!callOfferSdp || !caller?.id) {
        console.error('Call acceptance failed - missing data:', { 
          callOfferSdp, 
          caller,
          callState,
          callId
        });
        throw new Error('Call offer or caller info missing');
      }
  
      // Ensure we have a valid SDP offer
      const offer = {
        type: callOfferSdp.type || 'offer',
        sdp: callOfferSdp.sdp
      };
  
      if (!offer.sdp) {
        throw new Error('Invalid SDP offer');
      }
  
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
  
      // Create new peer connection
      peerConnectionRef.current = new RTCPeerConnection(RTC_CONFIG);
      stream.getTracks().forEach((track) => peerConnectionRef.current.addTrack(track, stream));
  
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.send(JSON.stringify({
            type: 'ice_candidate',
            room_id: conversationId,
            target_user_id: caller.id,
            candidate: event.candidate,
          }));
        }
      };
  
      peerConnectionRef.current.ontrack = (event) => {
        const remoteAudio = new Audio();
        remoteAudio.srcObject = event.streams[0];
        remoteAudio.play().catch((err) => console.error('Audio play error:', err));
      };
  
      // Set remote description first
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Create and set local answer
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
  
      // Send answer to caller
      socketRef.current.send(JSON.stringify({
        type: 'call_answer',
        room_id: conversationId,
        target_user_id: caller.id,
        call_id: callId,
        sdp: answer,
      }));
  
      setCallState('active');
    } catch (error) {
      console.error('Error accepting call:', error);
      dispatch(showToast({ message: 'Failed to accept call', type: 'error' }));
      endCall('failed');
    }
  };

  const endCall = async (status = 'completed', localInitiated = true) => {
    // Clean up media streams
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
  
    // Stop call timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  
    // Notify server if we initiated the end
    if (callId && localInitiated) {
      try {
        await axiosInstance.post(`/chatrooms/${conversationId}/end-call/`, {
          call_id: callId,
          call_status: status,
          duration: callDurationRef.current,
        });
  
        const targetUserId = caller?.id || 
          (selectedRoom?.users.find(u => String(u.id) !== String(user.id))?.id);
        
        if (targetUserId) {
          socketRef.current.send(JSON.stringify({
            type: 'call_ended',
            room_id: conversationId,
            target_user_id: targetUserId,
            call_id: callId,
            call_status: status,
            duration: callDurationRef.current,
          }));
        }
      } catch (error) {
        console.error('Error ending call:', error);
      }
    }
  
    // Reset all call state
    setCallState(null);
    setCallId(null);
    setCaller(null);
    setCallOfferSdp(null);
    setCallDuration(0);
    callDurationRef.current = 0;
  };

  const cleanupCall = () => {
    if (callState) {
      setCallState(null);
      setCallId(null);
      setCaller(null);
      setCallOfferSdp(null);
      setCallDuration(0);
      callDurationRef.current = 0;
      
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }
  };

  const formatCallDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };



  useEffect(() => {
    console.log('Caller state updated:', caller);
  }, [caller]);

  useEffect(() => {
    console.log('Call state changed:', {
      state: callState,
      caller: caller,
      callId: callId
    });
  }, [callState, caller, callId]);

  const handlePostClick = async (postId) => {
    try {
      const response = await axiosInstance.get(`/posts/${postId}/`);
      setSelectedPost(response.data);
    } catch (error) {
      console.error('Error fetching post:', error);
      dispatch(showToast({ message: 'Failed to load post', type: 'error' }));
    }
  };

  const renderMessageContent = (msg) => {
    // First check if it's a call
    if (msg.is_call) {
      return (
        <div className="flex items-center space-x-2">
          <IoCall className={msg.call_status === 'completed' ? 'text-green-500' : 'text-red-500'} />
          <span className="text-blue-500 italic">
            {msg.call_status === 'completed' ? 'Call completed' : `Call ${msg.call_status}`}
            {msg.call_duration && ` (${msg.call_duration})`}
          </span>
        </div>
      );
    }
  
    // Then handle regular messages
    const postLinkRegex = /Shared post: (.*)\/post\/(\d+)/;
    const match = msg.content.match(postLinkRegex);
    
    if (match && !msg.is_deleted) {
      const postId = match[2];
      return (
        <div
          className="cursor-pointer text-blue-400 hover:underline"
          onClick={() => handlePostClick(postId)}
        >
          View shared post
        </div>
      );
    }
  
    return msg.is_deleted ? (
      <p className="italic text-gray-300">[Deleted]</p>
    ) : msg.file_url ? (
      msg.file_type === 'audio' || msg.file_url.match(/\.(mp3|wav|ogg|webm)$/) ? (
        <audio controls className="w-full h-12">
          <source src={msg.file_url} type={msg.file_type === 'audio' ? 'audio/webm' : 'audio/mpeg'} />
        </audio>
      ) : msg.file_url.match(/\.(mp4|webm)$/) ? (
        <video src={msg.file_url} controls className="rounded-lg max-h-60 w-auto" />
      ) : (
        <img
          src={msg.file_url}
          alt="Shared file"
          className="rounded-lg max-h-60 w-auto cursor-pointer"
          onClick={() => handleImageClick(msg.file_url)}
        />
      )
    ) : (
      <p className="whitespace-pre-wrap break-words">{msg.content || '[Empty]'}</p>
    );
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const audioChunks = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
        setSelectedFile(audioFile);
        setFilePreview(URL.createObjectURL(audioFile));
        stream.getTracks().forEach((track) => track.stop());
        setRecordingTime(0);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      dispatch(showToast({ message: 'Recording started', type: 'info' }));
    } catch (error) {
      console.error('Error starting recording:', error);
      dispatch(showToast({ message: 'Failed to start recording', type: 'error' }));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      dispatch(showToast({ message: 'Recording stopped', type: 'info' }));
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() && !selectedFile) return;
    if (!selectedRoom?.id) return;

    setIsSending(true);
    const tempId = `${user.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const optimisticMessage = {
      tempId,
      content: message.trim(),
      sender: user,
      sent_at: new Date().toISOString(),
      key: tempId,
      is_read: false,
      is_deleted: false,
      file_url: selectedFile ? URL.createObjectURL(selectedFile) : null,
      file_type: selectedFile && selectedFile.type.startsWith('audio/') ? 'audio' : 'other',
    };

    setMessages((prev) => [...prev.filter((msg) => msg.tempId !== tempId), optimisticMessage]);

    try {
      const formData = new FormData();
      if (message.trim()) formData.append('content', message.trim());
      if (selectedFile) formData.append('file', selectedFile);
      formData.append('tempId', tempId);

      await axiosInstance.post(`/chatrooms/${selectedRoom.id}/send-message/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setMessage('');
      setSelectedFile(null);
      setFilePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Error sending message:', error);
      dispatch(showToast({ message: 'Failed to send message', type: 'error' }));
      setMessages((prev) => prev.filter((msg) => msg.tempId !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  const handleStartChat = async (username) => {
    try {
      const response = await axiosInstance.post('/chatrooms/start-chat/', { username });
      const newRoom = response.data;
      setSelectedRoom(newRoom);
      setChatRooms((prev) => {
        if (!prev.some((r) => String(r.id) === String(newRoom.id))) return [newRoom, ...prev];
        return prev;
      });
      navigate(`/messages/${newRoom.id}`);
      const msgs = await getMessages(newRoom.id);
      setMessages(msgs.map((msg) => ({
        ...msg,
        sender: { ...msg.sender, profile_picture: msg.sender.profile_picture || null },
        key: `${msg.id}-${msg.sent_at}`,
        file_url: msg.file_url || null,
      })) || []);
    } catch (error) {
      console.error('Error starting chat:', error);
      dispatch(showToast({ message: 'Failed to start chat', type: 'error' }));
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      dispatch(showToast({ message: 'Group name is required', type: 'error' }));
      return;
    }

    try {
      const usernames = groupUsers.map(user => user.username);
      const response = await axiosInstance.post('/chatrooms/create-group/', {
        group_name: groupName,
        usernames,
      });
      const newRoom = response.data;
      setChatRooms((prev) => [newRoom, ...prev]);
      setSelectedRoom(newRoom);
      navigate(`/messages/${newRoom.id}`);
      setGroupName('');
      setGroupUsers([]);
      setGroupUsernameInput('');
      setGroupUserSuggestions([]);
      setShowGroupModal(false);
      dispatch(showToast({ message: 'Group created successfully', type: 'success' }));
    } catch (error) {
      console.error('Error creating group:', error);
      dispatch(showToast({ message: 'Failed to create group', type: 'error' }));
    }
  };

  const handleAddUserToGroup = async (username) => {
    if (!username.trim()) return;

    try {
      const response = await axiosInstance.post(`/chatrooms/${selectedRoom.id}/add-user/`, { username });
      setSelectedRoom(response.data);
      setChatRooms((prev) =>
        prev.map((room) => (String(room.id) === String(selectedRoom.id) ? response.data : room))
      );
      dispatch(showToast({ message: `${username} added to group`, type: 'success' }));
    } catch (error) {
      console.error('Error adding user:', error);
      dispatch(showToast({ message: 'Failed to add user', type: 'error' }));
    }
  };

  const handleRemoveUserFromGroup = async (username) => {
    try {
      const response = await axiosInstance.post(`/chatrooms/${selectedRoom.id}/remove-user/`, { username });
      setSelectedRoom(response.data);
      setChatRooms((prev) =>
        prev.map((room) => (String(room.id) === String(selectedRoom.id) ? response.data : room))
      );
      dispatch(showToast({ message: `${username} removed from group`, type: 'success' }));
    } catch (error) {
      console.error('Error removing user:', error);
      dispatch(showToast({ message: 'Failed to remove user', type: 'error' }));
    }
  };

  const handleLeaveGroup = async () => {
    try {
      await axiosInstance.post(`/chatrooms/${selectedRoom.id}/leave-group/`);
      setChatRooms((prev) => prev.filter((room) => String(room.id) !== String(selectedRoom.id)));
      setSelectedRoom(null);
      setShowManageGroupModal(false);
      navigate('/messages');
      dispatch(showToast({ message: 'You have left the group', type: 'success' }));
    } catch (error) {
      console.error('Error leaving group:', error);
      dispatch(showToast({ message: 'Failed to leave group', type: 'error' }));
    }
  };

  const handleUpdateGroupName = async (newName) => {
    if (!newName.trim()) return;

    try {
      const response = await axiosInstance.post(`/chatrooms/${selectedRoom.id}/update-group-name/`, { group_name: newName });
      setSelectedRoom(response.data);
      setChatRooms((prev) =>
        prev.map((room) => (String(room.id) === String(selectedRoom.id) ? response.data : room))
      );
      dispatch(showToast({ message: 'Group name updated', type: 'success' }));
    } catch (error) {
      console.error('Error updating group name:', error);
      dispatch(showToast({ message: 'Failed to update group name', type: 'error' }));
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      const response = await axiosInstance.post(`/chatrooms/${selectedRoom.id}/delete-message/`, { message_id: messageId });
      if (response.status === 200) {
        setMessages((prev) =>
          prev.map((msg) =>
            String(msg.id) === String(messageId) ? { ...msg, is_deleted: true, content: '[Deleted]', file_url: null } : msg
          )
        );
      }
    } catch (error) {
      console.error('Error deleting message:', error.response?.data || error.message);
      if (error.response?.status !== 404) {
        dispatch(showToast({ message: 'Failed to delete message', type: 'error' }));
      }
    }
  };

  const handleSearchUsers = async (term, isGroupSearch = false) => {
    if (!term.trim()) {
      isGroupSearch ? setGroupUserSuggestions([]) : setSearchResults([]);
      return;
    }
    try {
      const response = await axiosInstance.get(`/chatrooms/search-users/?q=${encodeURIComponent(term)}`);
      const filteredUsers = response.data.filter(u => String(u.id) !== String(user.id));
      isGroupSearch ? setGroupUserSuggestions(filteredUsers) : setSearchResults(filteredUsers);
    } catch (error) {
      console.error('Error searching users:', error);
      isGroupSearch ? setGroupUserSuggestions([]) : setSearchResults([]);
      dispatch(showToast({ message: 'Search failed', type: 'error' }));
    }
  };

  const handleAddGroupUser = (user) => {
    if (!groupUsers.some(u => u.id === user.id)) {
      setGroupUsers([...groupUsers, user]);
    }
    setGroupUsernameInput('');
    setGroupUserSuggestions([]);
  };

  const handleRemoveGroupUser = (userId) => {
    setGroupUsers(groupUsers.filter(u => u.id !== userId));
  };

  const handleEmojiClick = (emoji) => {
    setMessage((prev) => prev + emoji.emoji);
    setShowEmojiPicker(false);
  };

  const handleFileSelected = (e) => {
    if (e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setFilePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp || isNaN(new Date(timestamp).getTime())) return 'Unknown';
    return format(new Date(timestamp), 'h:mm a');
  };

  const formatLastActive = (timestamp) => {
    if (!timestamp || isNaN(new Date(timestamp).getTime())) return 'Recently';
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = (now - time) / (1000 * 60 * 60);
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return format(time, 'h:mm a');
    if (diffInHours < 48) return 'Yesterday';
    return format(time, 'MMM d');
  };

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  const otherUser = selectedRoom && !selectedRoom.is_group
    ? selectedRoom.users.find((u) => String(u?.id) !== String(user?.id))
    : null;

  const isAdmin = selectedRoom && selectedRoom.admin && String(selectedRoom.admin.id) === String(user?.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-2">
            <Suspense fallback={<Loader />}>
              <Logo />
              <Navbar />
            </Suspense>
          </div>
          <div className="lg:col-span-10">
            <div className="bg-white rounded-xl shadow-lg h-[85vh] flex">
              <div className="grid grid-cols-1 md:grid-cols-3 w-full h-full">
                <div className="md:col-span-1 border-r border-gray-200 overflow-y-auto bg-white">
                  <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-gray-800 mb-3">Messages</h2>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Enter username to chat..."
                        className="w-full bg-gray-100 rounded-full px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-[#198754]"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          handleSearchUsers(e.target.value);
                        }}
                      />
                      <IoSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                      {searchResults.length > 0 && (
                        <div className="absolute bg-white shadow-lg rounded-lg mt-2 w-full max-h-40 overflow-y-auto z-20">
                          {searchResults.map((u) => (
                            <div
                              key={u.id}
                              className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between"
                              onClick={() => {
                                handleStartChat(u.username);
                                setSearchResults([]);
                                setSearchTerm('');
                              }}
                            >
                              <img src={`${CLOUDINARY_ENDPOINT}${u?.profile_picture}`} className='w-5 object-contain rounded-full'/>
                              {u.username}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setShowGroupModal(true)}
                      className="mt-2 w-full bg-[#198754] text-white py-2 rounded-full hover:bg-[#157a47]"
                    >
                      Create Group
                    </button>
                  </div>
                  <div className="overflow-y-auto h-[calc(85vh-160px)]">
                    {isLoading ? (
                      <Loader />
                    ) : chatRooms.length ? (
                      chatRooms.map((room) => {
                        const otherUser = !room.is_group
                          ? room.users.find((u) => String(u.id) !== String(user?.id))
                          : null;
                        const lastMessage = room.last_message?.is_deleted
                          ? '[Deleted]'
                          : room.last_message?.file_url
                          ? '[Media]'
                          : room.last_message?.content || 'No messages yet';
                        const unreadCount = room.unread_count || 0;

                        return (
                          <div
                            key={room.id}
                            className={`p-4 border-b border-gray-100 hover:bg-orange-50 cursor-pointer ${
                              String(selectedRoom?.id) === String(room.id) ? 'bg-orange-100' : ''
                            }`}
                            onClick={() => navigate(`/messages/${room.id}`)}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="relative">
                                <img
                                  src={room.is_group ? groupIcon : (otherUser?.profile_picture ? `${CLOUDINARY_ENDPOINT}${otherUser.profile_picture}` : '/default-profile.png')}
                                  alt={room.is_group ? room.group_name : otherUser?.username || 'Unknown'}
                                  className="w-12 h-12 rounded-full object-cover border border-gray-200 shadow-sm"
                                  onError={(e) => (e.target.src = room.is_group ? groupIcon : '/default-profile.png')}
                                />
                                {!room.is_group && (
                                  <div
                                    className={`absolute bottom-0 right-0 w-3 h-3 ${
                                      otherUser?.is_online ? 'bg-green-500' : 'bg-gray-500'
                                    } rounded-full border-2 border-white`}
                                  ></div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-gray-800 truncate">
                                  {room.is_group ? room.group_name : otherUser?.username || 'Unknown'}
                                </h3>
                                <p className="text-sm text-gray-600 truncate">{lastMessage}</p>
                                {unreadCount > 0 && (
                                  <span className="text-xs bg-red-500 text-white rounded-full px-2 py-1">{unreadCount}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-center text-gray-600 mt-4">No chats yet</p>
                    )}
                  </div>
                </div>
                <div className="md:col-span-2 flex flex-col h-full">
                  {selectedRoom ? (
                    <>
                      <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center sticky top-0 z-10 shadow-sm shrink-0">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <img
                              src={
                                selectedRoom.is_group
                                  ? groupIcon
                                  : (otherUser?.profile_picture ? `${CLOUDINARY_ENDPOINT}/${otherUser.profile_picture}` : '/default-profile.png')
                              }
                              alt={selectedRoom.is_group ? selectedRoom.group_name : otherUser?.username || 'User'}
                              className="w-10 h-10 rounded-full object-cover border border-gray-200"
                              onError={(e) => (e.target.src = selectedRoom.is_group ? groupIcon : '/default-profile.png')}
                            />
                            {!selectedRoom.is_group && (
                              <div
                                className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${
                                  otherUser?.is_online ? 'bg-green-500' : 'bg-gray-500'
                                } rounded-full border-2 border-white`}
                              ></div>
                            )}
                          </div>
                          <div>
                            <Link to={`/user/${otherUser?.username}`}>
                              <h3 className="font-semibold text-gray-800">
                                {selectedRoom.is_group ? selectedRoom.group_name : otherUser?.username || 'Unknown User'}
                              </h3>
                            </Link>
                            {!selectedRoom.is_group ? (
                              <p className={`text-xs ${otherUser?.is_online ? 'text-green-500' : 'text-gray-500'}`}>
                                {otherUser?.is_online ? 'Online' : `Last seen ${formatLastActive(otherUser?.last_seen)}`}
                              </p>
                            ) : (
                              <p className="text-xs text-gray-500">{selectedRoom.users.length} members</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {!selectedRoom.is_group && (
                            <>
                              <button
                                onClick={startCall}
                                className="text-gray-600 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100"
                                title="Audio call"
                                disabled={callState}
                              >
                                <IoCall size={20} />
                              </button>
                              <button className="text-gray-600 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100" title="Video call">
                                <IoVideocam size={20} />
                              </button>
                            </>
                          )}
                          {selectedRoom.is_group && (
                            <button
                              onClick={() => setShowManageGroupModal(true)}
                              className="text-gray-600 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100"
                              title="Manage group"
                            >
                              <IoInformationCircle size={20} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div
                        ref={messagesContainerRef}
                        className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-orange-50 to-white"
                        style={{ maxHeight: 'calc(85vh - 137px)' }}
                      >
                        {isLoading ? (
                          <Loader />
                        ) : messages.length ? (
                          messages.map((msg) => (
                            <div
                              key={msg.key}
                              className={`flex ${String(msg?.sender?.id) === String(user?.id) ? 'justify-end' : 'justify-start'} mb-4`}
                            >
                              {String(msg?.sender?.id) !== String(user?.id) && (
                                <Link to={`/user/${msg?.sender?.username}`}>
                                  <img
                                    src={
                                      msg?.sender?.profile_picture.startsWith('http')
                                        ? `${msg?.sender?.profile_picture}`
                                        : `${CLOUDINARY_ENDPOINT}/${msg?.sender?.profile_picture}`
                                    }
                                    alt={msg?.sender?.username || 'Unknown'}
                                    className="w-8 h-8 rounded-full object-cover border border-gray-200 mr-2"
                                  />
                                </Link>
                              )}
                              <div className="max-w-[75%] relative group">
                                <div
                                  className={`rounded-2xl p-3 shadow-sm ${
                                    String(msg?.sender?.id) === String(user?.id)
                                      ? 'bg-[#198754] text-white rounded-tr-none'
                                      : 'bg-white text-gray-800 rounded-tl-none'
                                  } ${msg.file_type === 'audio' || msg.file_url?.match(/\.(mp3|wav|ogg|webm)$/) ? 'min-w-[250px]' : ''}`}
                                >
                                  {renderMessageContent(msg)}
                                  <div
                                    className={`text-xs mt-1 flex items-center ${
                                      String(msg?.sender?.id) === String(user?.id) ? 'text-white justify-end' : 'text-gray-500'
                                    }`}
                                  >
                                    {formatMessageTime(msg?.sent_at)}
                                    {String(msg?.sender?.id) === String(user?.id) && !msg.is_call && (
                                      <span className="ml-1">
                                        {msg?.is_read ? '✓✓' : '✓'}
                                        {msg?.is_read && msg?.read_at && (
                                          <span className="text-xs text-gray-300 ml-1">
                                            {formatMessageTime(msg?.read_at)}
                                          </span>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {String(msg?.sender?.id) === String(user?.id) && !msg?.is_deleted && !msg.is_call && msg.id && (
                                  <button
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    className="absolute top-0 right-0 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                    title="Delete message"
                                  >
                                    <IoTrash size={16} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-center text-gray-600 mt-4">No messages yet</p>
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                      <div className="p-4 border-t border-gray-200 bg-white shrink-0">
                        {isSending && <div className="text-gray-500 text-sm mb-2">Sending...</div>}
                        {filePreview && (
                          <div className="mb-2">
                            {selectedFile && selectedFile.type.startsWith('audio/') ? (
                              <div className="flex items-center space-x-2">
                                <audio controls src={filePreview} className="w-64 h-12" />
                                <button
                                  onClick={() => {
                                    setSelectedFile(null);
                                    setFilePreview(null);
                                  }}
                                  className="text-red-500 text-sm"
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <img src={filePreview} alt="Selected file" className="max-h-20 w-auto rounded-lg" />
                                <button
                                  onClick={() => {
                                    setSelectedFile(null);
                                    setFilePreview(null);
                                  }}
                                  className="text-red-500 text-sm"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        {showEmojiPicker && (
                          <div ref={emojiPickerRef} className="absolute bottom-20 right-20 z-10 shadow-xl rounded-lg">
                            <Suspense fallback={<div>Loading emojis...</div>}>
                              <EmojiPicker onEmojiClick={handleEmojiClick} />
                            </Suspense>
                          </div>
                        )}
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => fileInputRef.current.click()}
                            className="text-gray-500 hover:text-[#198754] p-2 rounded-full hover:bg-gray-100"
                            title="Send media"
                          >
                            <IoImage size={22} />
                          </button>
                          <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*,audio/*,video/*"
                            onChange={handleFileSelected}
                          />
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={isRecording ? stopRecording : startRecording}
                              className={`p-2 rounded-full ${isRecording ? 'text-red-500' : 'text-gray-500 hover:text-[#198754]'} hover:bg-gray-100`}
                              title={isRecording ? 'Stop recording' : 'Record audio'}
                            >
                              {isRecording ? <IoMicOff size={24} /> : <IoMic size={24} />}
                            </button>
                            {isRecording && (
                              <span className="text-red-500 text-sm font-semibold">{formatRecordingTime(recordingTime)}</span>
                            )}
                          </div>
                          <textarea
                            className="flex-1 border border-gray-300 rounded-full px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-[#198754] resize-none"
                            placeholder="Message..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                            rows={1}
                            style={{ maxHeight: '100px' }}
                          />
                          <button
                            onClick={() => setShowEmojiPicker((prev) => !prev)}
                            className="text-gray-500 hover:text-[#198754] p-2"
                            title="Emoji"
                          >
                            <BsEmojiSmile size={20} />
                          </button>
                          <button
                            onClick={handleSendMessage}
                            className="p-3 rounded-full bg-[#198754] text-white hover:bg-[#157a47]"
                            title="Send"
                          >
                            <IoSend size={20} />
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex justify-center items-center bg-gradient-to-b from-orange-50 to-white">
                      <div className="text-center p-6 max-w-md">
                        <h3 className="text-xl font-bold text-gray-800">Start a Chat</h3>
                        <p className="text-gray-600 mt-2">Enter a username or create a group to begin</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-transparent bg-opacity-75 flex items-center justify-center z-50" onClick={closeImageModal}>
          <div className="relative max-w-4xl w-full p-4 bg-white rounded-lg shadow-lg border-2 border-[#198754]">
            <img src={selectedImage} alt="Full view" className="w-full max-h-screen object-contain rounded-lg" />
            <button
              onClick={closeImageModal}
              className="absolute top-2 right-2 text-white bg-red-500 hover:bg-red-600 p-2 rounded-full"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowGroupModal(false)}>
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-800 mb-4">Create Group</h3>
            <input
              type="text"
              placeholder="Group Name"
              className="w-full bg-gray-100 rounded-full px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-[#198754]"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Add Username"
                className="w-full bg-gray-100 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#198754]"
                value={groupUsernameInput}
                onChange={(e) => {
                  setGroupUsernameInput(e.target.value);
                  handleSearchUsers(e.target.value, true);
                }}
              />
              {groupUserSuggestions.length > 0 && (
                <div className="absolute bg-white shadow-lg rounded-lg mt-2 w-full max-h-40 overflow-y-auto z-20">
                  {groupUserSuggestions.map((u) => (
                    <div
                      key={u.id}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => handleAddGroupUser(u)}
                    >
                      {u.username}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-800">Selected Members</h4>
              {groupUsers.length > 0 ? (
                groupUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between py-2">
                    <span>{u.username}</span>
                    <button
                      onClick={() => handleRemoveGroupUser(u.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-600">No members selected</p>
              )}
            </div>
            <button
              onClick={handleCreateGroup}
              className="w-full bg-[#198754] text-white py-2 rounded-full hover:bg-[#157a47]"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* Manage Group Modal */}
      {showManageGroupModal && selectedRoom?.is_group && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowManageGroupModal(false)}>
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-800 mb-4">Manage Group: {selectedRoom.group_name}</h3>
            <input
              type="text"
              placeholder="New Group Name"
              className="w-full bg-gray-100 rounded-full px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-[#198754]"
              defaultValue={selectedRoom.group_name}
              onBlur={(e) => handleUpdateGroupName(e.target.value)}
            />
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-800">Members</h4>
              {selectedRoom.users.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2">
                  <Link to={`/user/${u?.username}`}>
                    <span>{u.username} {String(u.id) === String(selectedRoom.admin?.id) ? '(Admin)' : ''}</span>
                  </Link>
                  {isAdmin && String(u.id) !== String(user.id) && (
                    <button
                      onClick={() => handleRemoveUserFromGroup(u.username)}
                      className="text-red-500 hover:text-red-600"
                      title="Remove user"
                    >
                      <IoPersonRemove size={20} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add Username"
              className="w-full bg-gray-100 rounded-full px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-[#198754]"
              onKeyPress={(e) => e.key === 'Enter' && handleAddUserToGroup(e.target.value) && (e.target.value = '')}
            />
            {!isAdmin && (
              <button
                onClick={handleLeaveGroup}
                className="w-full bg-red-500 text-white py-2 rounded-full hover:bg-red-600 mb-4"
              >
                <IoExitOutline className="inline mr-2" /> Leave Group
              </button>
            )}
            <button
              onClick={() => setShowManageGroupModal(false)}
              className="w-full bg-gray-500 text-white py-2 rounded-full hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Call Modal */}
      {(callState === 'incoming' || callState === 'outgoing' || callState === 'active') && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md text-center">
            <img
              src={callState === 'incoming' ? (caller?.profile_picture ? `${CLOUDINARY_ENDPOINT}${caller.profile_picture}` : '/default-profile.png') : (otherUser?.profile_picture ? `${CLOUDINARY_ENDPOINT}${otherUser.profile_picture}` : '/default-profile.png')}
              alt={callState === 'incoming' ? caller?.username : otherUser?.username}
              className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4 border-blue-400"
            />
            <h3 className="text-2xl font-bold text-gray-800">
              {callState === 'incoming' ? 'Incoming Call' : callState === 'outgoing' ? 'Calling...' : 'In Call'}
            </h3>
            <p className="text-gray-600 mt-2">{callState === 'incoming' ? caller?.username : otherUser?.username}</p>
            {callState === 'active' && (
              <div className="text-xl font-mono mt-4">{formatCallDuration(callDuration)}</div>
            )}
            <div className="flex justify-center mt-4 space-x-4">
              {callState === 'incoming' && (
                <>
                  <button onClick={acceptCall} className="bg-green-500 hover:bg-green-600 text-white rounded-full p-4" title="Accept call">
                    <IoCall size={24} />
                  </button>
                  <button onClick={() => endCall('rejected')} className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4" title="Reject call">
                    <IoCall size={24} className="transform rotate-135" />
                  </button>
                </>
              )}
              {(callState === 'outgoing' || callState === 'active') && (
                <button onClick={() => endCall(callState === 'outgoing' ? 'missed' : 'completed')} className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4" title="End call">
                  <IoCall size={24} className="transform rotate-135" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedPost && createPortal(
        <PostPopup
          post={selectedPost}
          userData={{ username: selectedPost.user.username, profileImage: selectedPost.user.profile_picture }}
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
        />,
        document.body
      )}
    </div>
  );
}

export default Message;