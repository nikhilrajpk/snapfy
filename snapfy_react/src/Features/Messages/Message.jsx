import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { showToast } from '../../redux/slices/toastSlice';
import { format } from 'date-fns';
import CryptoJS from 'crypto-js';
import Loader from '../../utils/Loader/Loader';
import { IoCall, IoVideocam, IoInformationCircle, IoImage, IoSend, IoSearch, IoTrash } from 'react-icons/io5';
import { BsEmojiSmile } from 'react-icons/bs';
import { getMessages } from '../../API/chatAPI';
import { CLOUDINARY_ENDPOINT } from '../../APIEndPoints';
import axiosInstance from '../../axiosInstance';

const Navbar = React.lazy(() => import('../../Components/Navbar/Navbar'));
const Logo = React.lazy(() => import('../../Components/Logo/Logo'));
const EmojiPicker = React.lazy(() => import('emoji-picker-react'));

function Message() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.user);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);
  const statusSocketRef = useRef(null);
  const emojiPickerRef = useRef(null);
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
  const lastMarkAsReadRef = useRef(0);

  // Scroll to bottom on new messages if at bottom
  useEffect(() => {
    const chatContainer = messagesContainerRef.current;
    if (chatContainer) {
      const isAtBottom = chatContainer.scrollHeight - chatContainer.scrollTop <= chatContainer.clientHeight + 50;
      if (isAtBottom && !initialLoad) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages, initialLoad]);

  // Fetch chat rooms
  useEffect(() => {
    if (!token || !user) {
      navigate('/');
      return;
    }

    const fetchChatRooms = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get('/chatrooms/my-chats/');
        const rooms = response.data.map((room) => ({
          ...room,
          encryption_key: room.encryption_key,
          last_message: room.last_message
            ? {
                ...room.last_message,
                content: String(room.last_message.sender.id) === String(user.id)
                  ? room.last_message.content
                  : decryptMessage(room.last_message.content, room.encryption_key),
              }
            : null,
          unread_count: room.unread_count || 0,
        }));
        setChatRooms(rooms);
      } catch (error) {
        console.error('Error fetching chat rooms:', error);
        dispatch(showToast({ message: 'Failed to load chats', type: 'error' }));
      } finally {
        setIsLoading(false);
      }
    };

    fetchChatRooms();
  }, [dispatch, user, token, navigate]);

  // Fetch room and messages
  useEffect(() => {
    if (!conversationId || !user || !token) return;

    const fetchRoomAndMessages = async () => {
      setIsLoading(true);
      try {
        const roomData = await axiosInstance.get(`/chatrooms/${conversationId}/`).then((res) => res.data);
        if (!roomData.encryption_key) {
          throw new Error('Encryption key not provided by server');
        }
        const roomUsers = roomData.users.map((u) => ({
          id: u.id,
          username: u.username,
          profile_picture: u.profile_picture || null,
          is_online: u.is_online,
          last_seen: u.last_seen,
        }));
        const room = {
          id: roomData.id,
          users: roomUsers,
          encryption_key: roomData.encryption_key,
          unread_count: roomData.unread_count || 0,
        };
        setSelectedRoom(room);
    
        const msgs = await getMessages(conversationId);
        const decryptedMessages = msgs.map((msg) => {
          const isFromCurrentUser = String(msg.sender.id) === String(user.id);
          return {
            ...msg,
            original_content: isFromCurrentUser ? msg.content : undefined, // Always store original for sender
            content: isFromCurrentUser 
              ? msg.content  // Sender sees original content
              : decryptMessage(msg.content, roomData.encryption_key), // Others see decrypted
            sender: { ...msg.sender, profile_picture: msg.sender.profile_picture || null },
          };
        });
        setMessages(decryptedMessages || []);
        setInitialLoad(true);
    
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
  }, [conversationId, dispatch, user, token, navigate]);

  // Scroll on initial load
  useEffect(() => {
    if (initialLoad && messages.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setInitialLoad(false);
    }
  }, [initialLoad, messages]);

  // Chat WebSocket (Updated)
  useEffect(() => {
    if (!conversationId || !user?.id || !token || !selectedRoom?.encryption_key) return;
  
    let socketClosedIntentionally = false;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
  
    const connectWebSocket = () => {
      if (reconnectAttempts >= maxReconnectAttempts) {
        console.error('Max WebSocket reconnect attempts reached');
        dispatch(showToast({ message: 'Lost connection to chat server', type: 'error' }));
        return;
      }
  
      const socket = new WebSocket(`ws://localhost:8000/ws/chat/${conversationId}/?token=${token}`);
      socketRef.current = socket;
  
      socket.onopen = () => {
        console.log('Chat WebSocket connection established');
        socket.send(JSON.stringify({ type: 'mark_as_read', room_id: conversationId }));
        reconnectAttempts = 0;
      };
  
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('WebSocket data:', data);
  
        if (data.type === 'chat_message') {
          const message = data.message;
          const key = selectedRoom?.encryption_key;
          if (!key) {
            console.error('Encryption key missing for decryption');
            return;
          }
  
          const isFromCurrentUser = String(message.sender.id) === String(user?.id);
  
          const newMessage = {
            ...message,
            original_content: isFromCurrentUser ? undefined : undefined, // Will be set from existing message
            content: isFromCurrentUser ? message.content : decryptMessage(message.content, key),
            file_url: message.file_url || null,
            sent_at: message.sent_at || new Date().toISOString(),
            is_read: message.is_read || false,
            is_deleted: message.is_deleted || false,
            sender: {
              id: message.sender.id,
              username: message.sender.username || 'Unknown',
              profile_picture: message.sender.profile_picture || null,
            },
          };
  
          setMessages((prev) => {
            const existingMessageIndex = prev.findIndex(
              (msg) => String(msg.id) === String(newMessage.id) || (isFromCurrentUser && msg.tempId && msg.tempId === prev[prev.length - 1]?.tempId)
            );
            if (existingMessageIndex !== -1) {
              return prev.map((msg, index) =>
                index === existingMessageIndex
                  ? {
                      ...newMessage,
                      original_content: isFromCurrentUser ? msg.original_content : undefined, // Preserve sender’s original
                      content: isFromCurrentUser ? msg.original_content || message.content : decryptMessage(message.content, key),
                    }
                  : msg
              );
            }
            return [...prev, newMessage];
          });
  
          setChatRooms((prev) => {
            return prev.map((room) => {
              if (String(room.id) === String(data.room_id)) {
                return {
                  ...room,
                  last_message: {
                    ...newMessage,
                    content: isFromCurrentUser
                      ? newMessage.content
                      : decryptMessage(message.content, room.encryption_key),
                  },
                  last_message_at: newMessage.sent_at,
                  unread_count:
                    String(newMessage.sender.id) !== String(user?.id)
                      ? (room.unread_count || 0) + 1
                      : room.unread_count,
                };
              }
              return room;
            }).sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
          });
  
          if (
            String(data.room_id) === String(conversationId) &&
            String(newMessage.sender.id) !== String(user?.id)
          ) {
            const now = Date.now();
            if (now - lastMarkAsReadRef.current > 1000) {
              lastMarkAsReadRef.current = now;
              socket.send(JSON.stringify({ type: 'mark_as_read', room_id: conversationId }));
            }
          }
        } else if (data.type === 'mark_as_read') {
          setMessages((prev) =>
            prev.map((msg) =>
              data.updated_ids.map(String).includes(String(msg.id))
                ? { ...msg, is_read: true, read_at: data.read_at || new Date().toISOString() }
                : msg
            )
          );
  
          setChatRooms((prev) =>
            prev.map((room) =>
              String(room.id) === String(data.room_id) ? { ...room, unread_count: 0 } : room
            )
          );
  
          setSelectedRoom((prev) =>
            prev && String(prev.id) === String(data.room_id) ? { ...prev, unread_count: 0 } : prev
          );
        } else if (data.type === 'chat_room_update') {
          setChatRooms((prev) =>
            prev.map((room) =>
              String(room.id) === String(data.room_id)
                ? {
                    ...room,
                    last_message: {
                      ...data.last_message,
                      content: String(data.last_message.sender.id) === String(user?.id)
                        ? data.last_message.content
                        : decryptMessage(data.last_message.content, room.encryption_key),
                      sender: {
                        id: data.last_message.sender.id,
                        username: data.last_message.sender.username,
                        profile_picture: data.last_message.sender.profile_picture || null,
                      },
                    },
                    unread_count: data.unread_count,
                    last_message_at: data.last_message.sent_at,
                  }
                : room
            ).sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at))
          );
  
          if (String(selectedRoom?.id) === String(data.room_id)) {
            setSelectedRoom((prev) => ({
              ...prev,
              unread_count: data.unread_count,
            }));
          }
        }
      };
  
      socket.onerror = (error) => console.error('Chat WebSocket error:', error);
  
      socket.onclose = (event) => {
        console.log('Chat WebSocket closed:', event.code);
        if (event.code !== 1000 && !socketClosedIntentionally) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
          setTimeout(() => {
            reconnectAttempts++;
            connectWebSocket();
          }, delay);
        }
      };
    };
  
    connectWebSocket();
    return () => {
      socketClosedIntentionally = true;
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.close(1000, 'Component unmounted');
      }
    };
  }, [conversationId, user?.id, token, selectedRoom?.encryption_key, dispatch]);

  // Status WebSocket (Unchanged)
  useEffect(() => {
    if (!user?.id || !token) return;
  
    let socketClosedIntentionally = false;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
  
    const connectStatusWebSocket = () => {
      if (reconnectAttempts >= maxReconnectAttempts) {
        console.error('Max Status WebSocket reconnect attempts reached');
        dispatch(showToast({ message: 'Lost connection to status server', type: 'error' }));
        return;
      }
  
      const socket = new WebSocket(`ws://localhost:8000/ws/user/${user.id}/?token=${token}`);
      statusSocketRef.current = socket;
  
      socket.onopen = () => {
        console.log('Status WebSocket connection established');
        reconnectAttempts = 0; // Reset on successful connection
        const pingInterval = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
  
        socket.onclose = () => clearInterval(pingInterval);
      };
  
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'chat_room_update') {
          setChatRooms((prev) =>
            prev.map((room) =>
              String(room.id) === String(data.room_id)
                ? {
                    ...room,
                    last_message: {
                      ...data.last_message,
                      content: String(data.last_message.sender.id) === String(user?.id)
                        ? data.last_message.content
                        : decryptMessage(data.last_message.content, room.encryption_key),
                    },
                    unread_count: data.unread_count,
                    last_message_at: data.last_message.sent_at,
                  }
                : room
            ).sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at))
          );
        } else if (data.type === 'user_status_update') {
          setSelectedRoom((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              users: prev.users.map((u) =>
                String(u.id) === String(data.user_id)
                  ? { ...u, is_online: data.is_online, last_seen: data.last_seen }
                  : u
              ),
            };
          });
          setChatRooms((prev) =>
            prev.map((room) => ({
              ...room,
              users: room.users.map((u) =>
                String(u.id) === String(data.user_id)
                  ? { ...u, is_online: data.is_online, last_seen: data.last_seen }
                  : u
              ),
            }))
          );
        }
      };
  
      socket.onerror = (error) => {
        console.error('Status WebSocket error:', error);
      };
  
      socket.onclose = (event) => {
        console.log('Status WebSocket closed:', event.code, event.reason);
        if (event.code !== 1000 && !socketClosedIntentionally) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000); // Exponential backoff
          setTimeout(() => {
            reconnectAttempts++;
            connectStatusWebSocket();
          }, delay);
        }
      };
    };
  
    connectStatusWebSocket();
    return () => {
      socketClosedIntentionally = true;
      if (statusSocketRef.current?.readyState === WebSocket.OPEN) {
        statusSocketRef.current.close(1000, 'Component unmounted');
      }
    };
  }, [user?.id, token]);

  const encryptMessage = (text, key) => {
    if (!text || !key) return text;
    const derivedKey = CryptoJS.SHA256(key).toString();
    return CryptoJS.AES.encrypt(text, derivedKey).toString();
  };

  const decryptMessage = (ciphertext, key) => {
    if (!ciphertext || !key || !ciphertext.startsWith('U2FsdGVkX1')) {
      console.warn('Skipping decryption:', { ciphertext, hasKey: !!key });
      return ciphertext || '[No Content]';
    }
    try {
      const derivedKey = CryptoJS.SHA256(key).toString();
      console.log('Attempting decryption:', { ciphertext, derivedKey });
      const bytes = CryptoJS.AES.decrypt(ciphertext, derivedKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted) {
        console.error('Decryption resulted in empty string:', { ciphertext, key, derivedKey });
        return '[Decryption Failed: Empty]';
      }
      console.log('Decrypted successfully:', decrypted);
      return decrypted;
    } catch (e) {
      console.error('Decryption error:', e.message, { ciphertext, key });
      return '[Decryption Failed]';
    }
  };

  const updateChatRoomsOrder = (newMessage) => {
    setChatRooms((prev) => {
      const updatedRooms = prev.map((room) => {
        if (String(room.id) === String(newMessage.room)) {
          const isFromCurrentUser = String(newMessage.sender.id) === String(user?.id);
          const messageContent = isFromCurrentUser
            ? newMessage.original_content || newMessage.content
            : decryptMessage(newMessage.content, room.encryption_key);

          return {
            ...room,
            last_message: {
              ...newMessage,
              content: newMessage.is_deleted ? '[Deleted]' : messageContent,
              sender: { ...newMessage.sender, profile_picture: newMessage.sender.profile_picture || null },
            },
            last_message_at: newMessage.sent_at,
            unread_count: !isFromCurrentUser && !newMessage.is_read
              ? (room.unread_count || 0) + 1
              : room.unread_count,
          };
        }
        return room;
      });
      return updatedRooms.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
    });
  };

  const handleSendMessage = async () => {
    if (!message.trim() && !selectedFile) return;
    if (!selectedRoom?.id || !selectedRoom.encryption_key) {
      console.error('Missing room or key:', selectedRoom);
      return;
    }
  
    setIsSending(true);
    try {
      const formData = new FormData();
      const originalContent = message.trim();
      if (originalContent) {
        const encrypted = encryptMessage(originalContent, selectedRoom.encryption_key);
        formData.append('content', encrypted);
      }
      if (selectedFile) formData.append('file', selectedFile);
      formData.append('room', selectedRoom.id);
  
      const response = await axiosInstance.post(
        `/chatrooms/${selectedRoom.id}/send-message/`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
  
      const newMessage = {
        ...response.data,
        original_content: originalContent, // Store plain text for sender
        content: originalContent, // Display plain text for sender immediately
        file_url: response.data.file_url || null,
        sender: { id: user.id, username: user.username, profile_picture: user.profile_picture || null },
        is_read: false,
        is_deleted: false,
        sent_at: response.data.sent_at || new Date().toISOString(),
        tempId: Date.now().toString(), // Temporary ID to match before WebSocket confirmation
      };
  
      setMessages((prev) => [...prev, newMessage]); // Add immediately with tempId
      updateChatRoomsOrder(newMessage);
      setMessage('');
      setSelectedFile(null);
      setFilePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Error sending message:', error);
      dispatch(showToast({ message: 'Failed to send message', type: 'error' }));
    } finally {
      setIsSending(false);
    }
  };

  const handleStartChat = async (username) => {
    try {
      const response = await axiosInstance.post('/chatrooms/start-chat/', { username });
      const roomUsers = response.data.users.map((u) => ({
        id: u.id,
        username: u.username,
        profile_picture: u.profile_picture || null,
        is_online: u.is_online,
        last_seen: u.last_seen,
      }));
      const newRoom = {
        id: response.data.id,
        users: roomUsers,
        last_message_at: response.data.last_message_at,
        encryption_key: response.data.encryption_key,
        unread_count: 0,
      };
      setSelectedRoom(newRoom);
      setChatRooms((prev) => {
        if (!prev.some((r) => String(r.id) === String(newRoom.id))) return [newRoom, ...prev];
        return prev;
      });
      navigate(`/messages/${newRoom.id}`);
      const msgs = await getMessages(newRoom.id);
      setMessages(
        msgs.map((msg) => ({
          ...msg,
          original_content: String(msg.sender.id) === String(user.id) ? msg.content : undefined,
          content: String(msg.sender.id) === String(user.id)
            ? msg.content
            : decryptMessage(msg.content, newRoom.encryption_key),
          sender: { ...msg.sender, profile_picture: msg.sender.profile_picture || null },
        })) || []
      );
    } catch (error) {
      console.error('Error starting chat:', error);
      dispatch(showToast({ message: 'Failed to start chat', type: 'error' }));
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      const response = await axiosInstance.post(`/chatrooms/${selectedRoom.id}/delete-message/`, { message_id: messageId });
      if (response.status === 200) {
        setMessages((prev) =>
          prev.map((msg) =>
            String(msg.id) === String(messageId) ? { ...msg, is_deleted: true, content: '[Deleted]' } : msg
          )
        );
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(
            JSON.stringify({
              type: 'chat_message',
              message: { id: messageId, room: selectedRoom.id, is_deleted: true },
            })
          );
        }
      }
    } catch (error) {
      console.error('Error deleting message:', error.response?.data || error.message);
      if (error.response?.status !== 404) {
        dispatch(showToast({ message: 'Failed to delete message', type: 'error' }));
      }
    }
  };

  const handleSearchUsers = async (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const response = await axiosInstance.get(`/chatrooms/search-users/?q=${encodeURIComponent(term)}`);
      setSearchResults(response.data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
      dispatch(showToast({ message: 'Search failed', type: 'error' }));
    }
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

  const otherUser = selectedRoom?.users?.find((u) => String(u?.id) !== String(user?.id));

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
                              className="p-2 hover:bg-gray-100 cursor-pointer"
                              onClick={() => {
                                handleStartChat(u.username);
                                setSearchResults([]);
                                setSearchTerm('');
                              }}
                            >
                              {u.username}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="overflow-y-auto h-[calc(85vh-115px)]">
                    {isLoading ? (
                      <Loader />
                    ) : chatRooms.length ? (
                      chatRooms.map((room) => {
                        const otherUser = room.users.find((u) => String(u.id) !== String(user?.id));
                        const lastMessage = room.last_message?.content || 'No messages yet';
                        const unreadCount = room.unread_count || 0;

                        return (
                          <div
                            key={room.id}
                            className={`p-4 border-b border-gray-100 hover:bg-orange-50 cursor-pointer ${
                              selectedRoom?.id === room.id ? 'bg-orange-100' : ''
                            }`}
                            onClick={() => navigate(`/messages/${room.id}`)}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="relative">
                                <img
                                  src={
                                    otherUser.profile_picture
                                      ? `${CLOUDINARY_ENDPOINT}${otherUser.profile_picture}`
                                      : '/default-profile.png'
                                  }
                                  alt={otherUser.username}
                                  className="w-12 h-12 rounded-full object-cover border border-gray-200 shadow-sm"
                                  onError={(e) => (e.target.src = '/default-profile.png')}
                                />
                                <div
                                  className={`absolute bottom-0 right-0 w-3 h-3 ${
                                    otherUser.is_online ? 'bg-green-500' : 'bg-gray-500'
                                  } rounded-full border-2 border-white`}
                                ></div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-gray-800 truncate">{otherUser.username}</h3>
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
                                otherUser?.profile_picture
                                  ? `${CLOUDINARY_ENDPOINT}/${otherUser.profile_picture}`
                                  : '/default-profile.png'
                              }
                              alt={otherUser?.username || 'User'}
                              className="w-10 h-10 rounded-full object-cover border border-gray-200"
                              onError={(e) => (e.target.src = '/default-profile.png')}
                            />
                            <div
                              className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${
                                otherUser?.is_online ? 'bg-green-500' : 'bg-gray-500'
                              } rounded-full border-2 border-white`}
                            ></div>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-800">{otherUser?.username || 'Unknown User'}</h3>
                            <p className={`text-xs ${otherUser?.is_online ? 'text-green-500' : 'text-gray-500'}`}>
                              {otherUser?.is_online ? 'Online' : `Last seen ${formatLastActive(otherUser?.last_seen)}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <button className="text-gray-600 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100" title="Audio call">
                            <IoCall size={20} />
                          </button>
                          <button className="text-gray-600 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100" title="Video call">
                            <IoVideocam size={20} />
                          </button>
                          <button className="text-gray-600 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100" title="Conversation info">
                            <IoInformationCircle size={20} />
                          </button>
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
                              key={msg.id}
                              className={`flex ${String(msg?.sender?.id) === String(user?.id) ? 'justify-end' : 'justify-start'} mb-4`}
                            >
                              {String(msg?.sender?.id) !== String(user?.id) && (
                                <img
                                  src={
                                    msg?.sender?.profile_picture
                                      ? `${CLOUDINARY_ENDPOINT}/${msg.sender.profile_picture}`
                                      : '/default-profile.png'
                                  }
                                  alt={msg?.sender?.username || 'Unknown'}
                                  className="w-8 h-8 rounded-full object-cover border border-gray-200 mr-2"
                                  onError={(e) => (e.target.src = '/default-profile.png')}
                                />
                              )}
                              <div className="max-w-[75%] relative group">
                                <div
                                  className={`rounded-2xl p-3 shadow-sm ${
                                    String(msg?.sender?.id) === String(user?.id)
                                      ? 'bg-[#198754] text-white rounded-tr-none'
                                      : 'bg-white text-gray-800 rounded-tl-none'
                                  }`}
                                >
                                  {msg?.is_deleted ? (
                                    <p className="italic text-gray-500">[Deleted]</p>
                                  ) : msg?.file_url ? (
                                    msg.file_url.includes('video') ? (
                                      <video src={msg.file_url} controls className="rounded-lg max-h-60 w-auto" />
                                    ) : msg.file_url.includes('audio') ? (
                                      <audio controls className="w-full h-10">
                                        <source src={msg.file_url} type="audio/mpeg" />
                                      </audio>
                                    ) : (
                                      <img src={msg.file_url} alt="Shared file" className="rounded-lg max-h-60 w-auto" />
                                    )
                                  ) : (
                                    <p className="whitespace-pre-wrap break-words">{msg?.content || '[Empty]'}</p>
                                  )}
                                  <div
                                    className={`text-xs mt-1 flex items-center ${
                                      String(msg?.sender?.id) === String(user?.id) ? 'text-white justify-end' : 'text-gray-500'
                                    }`}
                                  >
                                    {formatMessageTime(msg?.sent_at)}
                                    {String(msg?.sender?.id) === String(user?.id) && (
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
                                {String(msg?.sender?.id) === String(user?.id) && !msg?.is_deleted && (
                                  <button
                                    onClick={() => handleDeleteMessage(msg?.id)}
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
                            accept="image/*,audio/mpeg,video/mp4"
                            onChange={handleFileSelected}
                          />
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
                        <p className="text-gray-600 mt-2">Enter a username above to begin</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Message;