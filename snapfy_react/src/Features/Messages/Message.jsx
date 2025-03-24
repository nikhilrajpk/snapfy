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
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [chatRooms, setChatRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [encryptionKey, setEncryptionKey] = useState('');

  useEffect(() => {
    if (!token || !user) {
      navigate('/');
      return;
    }

    const fetchChatRooms = async () => {
      try {
        setIsLoading(true);
        const response = await axiosInstance.get('/chatrooms/my-chats/');
        setChatRooms(response.data || []);
      } catch (error) {
        console.error('Error fetching chat rooms:', error);
        dispatch(showToast({ message: 'Failed to load chats', type: 'error' }));
      } finally {
        setIsLoading(false);
      }
    };
    fetchChatRooms();
  }, [dispatch, user, token, navigate]);

  useEffect(() => {
    if (!conversationId || !user || !token) return;
  
    const fetchRoomAndMessages = async () => {
        try {
          setIsLoading(true);
          const roomData = await axiosInstance.get(`/chatrooms/${conversationId}/`).then(res => res.data);
          const roomUsers = roomData.users.map(u => ({
            id: u.id,
            username: u.username,
            profile_picture: u.profile_picture,
            is_online: u.is_online,
            last_seen: u.last_seen,
          }));
          setSelectedRoom({ id: roomData.id, users: roomUsers });
          setEncryptionKey(roomData.encryption_key);
      
          const msgs = await getMessages(conversationId);
          const decryptedMessages = msgs.map((msg) => ({
            ...msg,
            content: msg.content && !msg.is_deleted ? decryptMessage(msg.content, roomData.encryption_key) : msg.content,
          }));
          setMessages(decryptedMessages || []);
        } catch (error) {
          console.error('Error fetching room/messages:', error);
          dispatch(showToast({ message: 'Failed to load chat', type: 'error' }));
        } finally {
          setIsLoading(false);
        }
      };
    fetchRoomAndMessages();
  
    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, [conversationId, dispatch, user, token, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => handleSearchUsers(searchTerm), 300);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const encryptMessage = (text, key) => {
    return CryptoJS.AES.encrypt(text, key).toString();
  };
  const decryptMessage = (ciphertext, key) => {
    if (!ciphertext || !key) return ciphertext || '';
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, key);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return decrypted || '[Decryption Failed]';
    } catch (e) {
      console.error('Decryption error:', e.message);
      return '[Decryption Failed]';
    }
  };

  const updateChatRoomsOrder = (newMessage) => {
    setChatRooms(prev => {
      const updatedRooms = prev.map(room => {
        if (String(room.id) === String(newMessage.room)) {
          return { ...room, last_message_at: newMessage.sent_at };
        }
        return room;
      });
      return updatedRooms.sort((a, b) => new Date(b.last_message_at || b.created_at) - new Date(a.last_message_at || a.created_at));
    });
  };

  const handleStartChat = async (username) => {
    try {
      const response = await axiosInstance.post('/chatrooms/start-chat/', { username });
      const roomUsers = response.data.users.map(u => ({
        id: u.id,
        username: u.username,
        profile_picture: u.profile_picture,
        is_online: u.is_online,
        last_seen: u.last_seen,
      }));
      const newRoom = { id: response.data.id, users: roomUsers, last_message_at: response.data.last_message_at };
      setSelectedRoom(newRoom);
      setChatRooms(prev => {
        if (!prev.some(r => r.id === newRoom.id)) {
          return [newRoom, ...prev];
        }
        return prev;
      });
      navigate(`/messages/${newRoom.id}`);
      const msgs = await getMessages(newRoom.id);
      setMessages(msgs.map(msg => ({
        ...msg,
        content: msg.content && !msg.is_deleted ? decryptMessage(msg.content) : msg.content,
      })) || []);
    } catch (error) {
      console.error('Error starting chat:', error);
      dispatch(showToast({ message: 'Failed to start chat', type: 'error' }));
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() && !fileInputRef.current?.files[0]) return;
    if (!selectedRoom?.id || !encryptionKey) return;
  
    setIsSending(true);
    try {
      const file = fileInputRef.current?.files[0];
      const formData = new FormData();
      if (message.trim()) {
        const encrypted = encryptMessage(message, encryptionKey);
        formData.append('content', encrypted);
        console.log('Sending encrypted content:', encrypted);
      }
      if (file) {
        formData.append('file', file);
      }
      // Add the room ID to the payload
      formData.append('room', selectedRoom.id);
  
      const response = await axiosInstance.post(
        `/chatrooms/${selectedRoom.id}/send-message/`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
  
      const newMessage = response.data;
      newMessage.content = message; // Show unencrypted locally
      setMessages((prev) => [...prev, newMessage]);
      updateChatRoomsOrder(newMessage);
      setMessage('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowEmojiPicker(false);
  
      // Check if WebSocket connection is open
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ mark_read: true }));
      } else {
        console.error('WebSocket connection is not open');
      }
    } catch (error) {
      console.error('Error sending message:', error.response?.data || error.message);
      dispatch(showToast({ message: 'Failed to send message', type: 'error' }));
    } finally {
      setIsSending(false);
    }
  };

  
  const handleDeleteMessage = async (messageId) => {
    try {
      await axiosInstance.post(`/chatrooms/${selectedRoom.id}/delete-message/`, { message_id: messageId });
      setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, is_deleted: true, content: '[Deleted]' } : msg));
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ message: { id: messageId, is_deleted: true } }));
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      dispatch(showToast({ message: 'Failed to delete message', type: 'error' }));
    }
  };

  const handleSearchUsers = async (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const response = await axiosInstance.get(`/chatrooms/search-users/?q=${term}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    }
  };

  const handleEmojiClick = (emoji) => {
    setMessage(prev => prev + emoji.emoji);
    setShowEmojiPicker(false);
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp || isNaN(new Date(timestamp).getTime())) return 'Unknown';
    return format(new Date(timestamp), 'h:mm a');
  };
  const formatLastActive = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = (now - time) / (1000 * 60 * 60);
    return diffInHours < 24 ? format(time, 'h:mm a') : diffInHours < 48 ? 'Yesterday' : format(time, 'MMM d');
  };


  useEffect(() => {
    if (!conversationId || !user || !token) return;
  
    const socket = new WebSocket(`ws://your-backend-url/ws/chat/${conversationId}/`);
    socketRef.current = socket;
  
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.message) {
          const newMessage = {
            ...data.message,
            content: decryptMessage(data.message.content, encryptionKey),
          };
          setMessages((prev) => [...prev, newMessage]);
          updateChatRoomsOrder(newMessage);
        }
      };
  
    return () => {
      socket.close();
    };
  }, [conversationId, user, token]);

  const room = selectedRoom || { users: [] };
  const decryptedLastMessage = room.last_message?.content
    ? decryptMessage(room.last_message.content, room.encryption_key)
    : room.last_message?.content || 'No messages yet';

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
            <div className="bg-white rounded-xl shadow-lg overflow-hidden h-[85vh]">
              <div className="grid grid-cols-1 md:grid-cols-3 h-full">
                <div className="md:col-span-1 border-r border-gray-200 overflow-y-auto bg-white">
                  <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-gray-800 mb-3">Messages</h2>
                    <input
                      type="text"
                      placeholder="Enter username to chat..."
                      className="w-full bg-gray-100 rounded-full px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-[#198754]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <IoSearch className="absolute left-7 top-12 text-gray-500" size={18} />
                    {searchResults.length > 0 && (
                      <div className="absolute bg-white shadow-lg rounded-lg mt-2 w-full max-h-40 overflow-y-auto z-20">
                        {searchResults.map(u => (
                          <div
                            key={u.id}
                            className="p-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => { handleStartChat(u.username); setSearchResults([]); setSearchTerm(''); }}
                          >
                            {u.username}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="overflow-y-auto h-[calc(85vh-115px)]">
                    {isLoading ? (
                      <Loader />
                    ) : chatRooms.length ? (
                      chatRooms.map(room => {
                        const otherUser = room?.users?.find(u => String(u.id) !== String(user?.id));
                        return (
                          <div
                            key={room.id}
                            className={`p-4 border-b border-gray-100 hover:bg-orange-50 cursor-pointer ${selectedRoom?.id === room.id ? 'bg-orange-100' : ''}`}
                            onClick={() => handleStartChat(otherUser.username)}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="relative">
                                <img
                                  src={otherUser.profile_picture ? `${CLOUDINARY_ENDPOINT}/${otherUser.profile_picture}` : '/default-profile.png'}
                                  alt={otherUser.username}
                                  className="w-12 h-12 rounded-full object-cover border border-gray-200 shadow-sm"
                                  onError={(e) => (e.target.src = '/default-profile.png')}
                                />
                                <div className={`absolute bottom-0 right-0 w-3 h-3 ${otherUser.is_online ? 'bg-green-500' : 'bg-gray-500'} rounded-full border-2 border-white`}></div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-gray-800 truncate">{otherUser.username}</h3>
                                <p className="text-sm text-gray-600 truncate">
                                    {decryptedLastMessage}
                                </p>
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
                <div className="md:col-span-2 flex flex-col h-full overflow-y-scroll">
                  {selectedRoom ? (
                    <>
                      <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center sticky top-0 z-10 shadow-sm">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <img
                              src={selectedRoom.users.find(u => String(u.id) !== String(user?.id))?.profile_picture ? `${CLOUDINARY_ENDPOINT}/${selectedRoom.users.find(u => String(u.id) !== String(user?.id)).profile_picture}` : '/default-profile.png'}
                              alt={selectedRoom.users.find(u => String(u.id) !== String(user?.id))?.username || 'User'}
                              className="w-10 h-10 rounded-full object-cover border border-gray-200"
                              onError={(e) => (e.target.src = '/default-profile.png')}
                            />
                            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${selectedRoom.users.find(u => String(u.id) !== String(user?.id))?.is_online ? 'bg-green-500' : 'bg-gray-500'} rounded-full border-2 border-white`}></div>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-800">
                              {selectedRoom.users.find(u => String(u.id) !== String(user?.id))?.username || 'Unknown User'}
                            </h3>
                            <p className={`text-xs ${selectedRoom.users.find(u => String(u.id) !== String(user?.id))?.is_online ? 'text-green-500' : 'text-gray-500'}`}>
                              {selectedRoom.users.find(u => String(u.id) !== String(user?.id))?.is_online ? 'Online' : `Last seen ${formatLastActive(selectedRoom.users.find(u => String(u.id) !== String(user?.id))?.last_seen)}`}
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
                      <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-orange-50 to-white" style={{ height: 'calc(85vh - 137px)' }}>
                        {isLoading ? (
                          <Loader />
                        ) : messages.length ? (
                            messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.sender && String(msg.sender.id) === String(user?.id) ? 'justify-end' : 'justify-start'} mb-4`}>
                                  {/* Message content */}
                                  {msg.sender && String(msg.sender.id) !== String(user?.id) && (
                                    <img
                                      src={msg.sender.profile_picture ? `${CLOUDINARY_ENDPOINT}/${msg.sender.profile_picture}` : '/default-profile.png'}
                                      alt={msg.sender.username}
                                      className="w-8 h-8 rounded-full object-cover border border-gray-200 mr-2"
                                      onError={(e) => (e.target.src = '/default-profile.png')}
                                    />
                                  )}
                                  <div className="max-w-[75%] relative group">
                                    <div
                                      className={`rounded-2xl p-3 shadow-sm ${
                                        msg.sender && String(msg.sender.id) === String(user?.id) ? 'bg-[#198754] text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none'
                                      }`}
                                    >
                                      {msg.is_deleted ? (
                                        <p className="italic text-gray-500">[Deleted]</p>
                                      ) : msg.file_url ? (
                                        msg.file_url.includes('video') ? (
                                          <video src={msg.file_url} controls className="rounded-lg max-h-60 w-auto" />
                                        ) : msg.file_url.includes('audio') ? (
                                          <audio controls className="w-full h-10"><source src={msg.file_url} type="audio/mpeg" /></audio>
                                        ) : (
                                          <img src={msg.file_url} alt="Shared file" className="rounded-lg max-h-60 w-auto" />
                                        )
                                      ) : (
                                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                      )}
                                      <div className={`text-xs mt-1 flex items-center ${msg.sender && String(msg.sender.id) === String(user?.id) ? 'text-white justify-end' : 'text-gray-500'}`}>
                                        {formatMessageTime(msg.sent_at)}
                                        {msg.sender && String(msg.sender.id) === String(user?.id) && (
                                          <span className="ml-1">{msg.is_read ? '✓✓' : '✓'}</span>
                                        )}
                                      </div>
                                    </div>
                                    {msg.sender && String(msg.sender.id) === String(user?.id) && !msg.is_deleted && (
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
                      <div className="p-4 border-t border-gray-200 bg-white">
                        {isSending && <div className="text-gray-500 text-sm mb-2">Sending...</div>}
                        {showEmojiPicker && (
                          <div ref={emojiPickerRef} className="absolute bottom-20 right-20 z-10 shadow-xl rounded-lg">
                            <Suspense fallback={<div>Loading emojis...</div>}>
                              <EmojiPicker onEmojiClick={handleEmojiClick} />
                            </Suspense>
                          </div>
                        )}
                        <div className="flex items-center space-x-3">
                          <button onClick={() => fileInputRef.current.click()} className="text-gray-500 hover:text-[#198754] p-2 rounded-full hover:bg-gray-100" title="Send media">
                            <IoImage size={22} />
                          </button>
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*,audio/mpeg,video/mp4" onChange={handleSendMessage} />
                          <textarea
                            className="flex-1 border border-gray-300 rounded-full px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-[#198754] resize-none"
                            placeholder="Message..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                            rows={1}
                            style={{ maxHeight: '100px' }}
                          />
                          <button onClick={() => setShowEmojiPicker(prev => !prev)} className="text-gray-500 hover:text-[#198754] p-2" title="Emoji">
                            <BsEmojiSmile size={20} />
                          </button>
                          <button onClick={handleSendMessage} className="p-3 rounded-full bg-[#198754] text-white hover:bg-[#157a47]" title="Send">
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