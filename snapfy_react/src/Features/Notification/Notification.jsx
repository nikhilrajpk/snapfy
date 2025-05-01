import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../../axiosInstance';
import { Bell, User, AtSign, Clock, CheckCheck, Trash2, ArrowLeft, MessageCircle, Video } from 'lucide-react';
import { showToast } from '../../redux/slices/toastSlice';
import { CLOUDINARY_ENDPOINT } from '../../APIEndPoints';
import PostPopup from '../../Components/Post/PostPopUp';
import { useNotifications } from '../../Features/Notification/NotificationContext';

const NotificationType = {
  FOLLOW: 'follow',
  MENTION: 'mention',
  LIKE: 'like',
  COMMENT: 'comment',
  CALL: 'call',
  NEW_CHAT: 'new_chat',
  LIVE: 'live',
};

const NotificationItem = ({ notification, onMarkAsRead, onDelete, onOpenPost }) => {
  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
  };

  const data = JSON.parse(notification.message);
  const { type, from_user, content, post_id, call_status, room_id, live_id } = data;

  const getIcon = () => {
    switch (type) {
      case NotificationType.FOLLOW:
        return <User className="text-blue-500" size={16} />;
      case NotificationType.MENTION:
        return <AtSign className="text-indigo-500" size={16} />;
      case NotificationType.LIKE:
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4 text-red-500"
          >
            <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
          </svg>
        );
      case NotificationType.COMMENT:
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4 text-green-500"
          >
            <path
              fillRule="evenodd"
              d="M4.804 21.644A6.707 6.707 0 0 0 6 21.75a6.721 6.721 0 0 0 3.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 0 1-.814 1.686.75.75 0 0 0 .44 1.223ZM8.25 10.875a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25ZM10.875 12a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm4.875-1.125a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25Z"
              clipRule="evenodd"
            />
          </svg>
        );
      case NotificationType.CALL:
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4 text-blue-500"
          >
            <path
              fillRule="evenodd"
              d="M19.5 9.75a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 1 1.5 0v2.69l4.72-4.72a.75.75 0 1 1 1.06 1.06L16.19 9h2.56a.75.75 0 0 1 .75.75Z"
              clipRule="evenodd"
            />
          </svg>
        );
      case NotificationType.NEW_CHAT:
        return <MessageCircle className="text-purple-500" size={16} />;
      case NotificationType.LIVE:
        return <Video className="text-red-500" size={16} />;
      default:
        return <Bell className="text-gray-500" size={16} />;
    }
  };

  const getMessage = () => {
    switch (type) {
      case NotificationType.FOLLOW:
        return (
          <>
            <span className="font-semibold text-gray-900">{from_user.username}</span> started following you
          </>
        );
      case NotificationType.MENTION:
        return (
          <>
            <span className="font-semibold text-gray-900">{from_user.username}</span> mentioned you in a post
          </>
        );
      case NotificationType.LIKE:
        return (
          <>
            <span className="font-semibold text-gray-900">{from_user.username}</span> liked your post
          </>
        );
      case NotificationType.COMMENT:
        return (
          <>
            <span className="font-semibold text-gray-900">{from_user.username}</span> commented:{' '}
            <span className="text-gray-700 italic">
              &quot;{content.substring(0, 30)}
              {content.length > 30 ? '...' : ''}&quot;
            </span>
          </>
        );
      case NotificationType.CALL:
        return (
          <>
            <span className="font-semibold text-gray-900">{from_user.username}</span>{' '}
            {call_status === 'missed' ? 'missed your call' : 'called you'}
          </>
        );
      case NotificationType.NEW_CHAT:
        return (
          <>
            <span className="font-semibold text-gray-900">{from_user.username}</span> started a chat with you
          </>
        );
      case NotificationType.LIVE:
        return (
          <>
            <span className="font-semibold text-gray-900">{from_user.username}</span> is live now
          </>
        );
      default:
        return <span className="text-gray-700">New notification</span>;
    }
  };

  const getLinkPath = () => {
    switch (type) {
      case NotificationType.FOLLOW:
        return `/user/${from_user.username}`;
      case NotificationType.MENTION:
      case NotificationType.LIKE:
      case NotificationType.COMMENT:
        return null;
      case NotificationType.CALL:
      case NotificationType.NEW_CHAT:
        return `/messages/${room_id}`;
      case NotificationType.LIVE:
        return `/live/${live_id}`;
      default:
        return '#';
    }
  };

  const handleClick = (e) => {
    if ([NotificationType.MENTION, NotificationType.LIKE, NotificationType.COMMENT].includes(type)) {
      e.preventDefault();
      onOpenPost(post_id);
    }
  };

  return (
    <div
      className={`relative rounded-xl p-3 transition-all duration-300 border group ${
        notification.is_read ? 'bg-white border-gray-100' : 'bg-gradient-to-r from-blue-50 to-white border-blue-100'
      }`}
    >
      {!notification.is_read && (
        <div className="absolute top-1/2 left-3 transform -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500"></div>
      )}
      <div className="flex items-start space-x-3 pl-2">
        <div className="flex-shrink-0">
          <img
            src={
              from_user.profile_picture
                ? String(from_user.profile_picture).startsWith('http')
                  ? from_user.profile_picture
                  : `${CLOUDINARY_ENDPOINT}${from_user.profile_picture}`
                : '/default-profile.png'
            }
            className={`w-10 h-10 rounded-full object-cover border-2 ${
              notification.is_read ? 'border-gray-200' : 'border-blue-300'
            }`}
            alt={from_user.username}
            onError={(e) => (e.target.src = '/default-profile.png')}
          />
        </div>
        <div className="flex-1 min-w-0">
          {getLinkPath() ? (
            <Link to={getLinkPath()} className="block">
              <div className="flex items-center mb-1 gap-1.5">
                {getIcon()}
                <p className="text-sm text-gray-700 line-clamp-2">{getMessage()}</p>
              </div>
              <div className="flex items-center text-xs text-gray-500">
                <Clock size={12} className="mr-1" />
                {timeAgo(notification.created_at)}
              </div>
            </Link>
          ) : (
            <div onClick={handleClick} className="block cursor-pointer">
              <div className="flex items-center mb-1 gap-1.5">
                {getIcon()}
                <p className="text-sm text-gray-700 line-clamp-2">{getMessage()}</p>
              </div>
              <div className="flex items-center text-xs text-gray-500">
                <Clock size={12} className="mr-1" />
                {timeAgo(notification.created_at)}
              </div>
            </div>
          )}
        </div>
        <div
          className={`flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200`}
        >
          {!notification.is_read && (
            <button
              onClick={() => onMarkAsRead(notification.id)}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-green-600 transition-colors"
              title="Mark as read"
            >
              <CheckCheck size={16} />
            </button>
          )}
          <button
            onClick={() => onDelete(notification.id)}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [isPostPopupOpen, setIsPostPopupOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const { unreadCount, setUnreadCount } = useNotifications();
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('notifications/');
      setNotifications(response.data);
      setUnreadCount(response.data.filter((n) => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      dispatch(showToast({ message: 'Failed to load notifications', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axiosInstance.patch(`/notifications/${notificationId}/read/`);
      setNotifications((prev) =>
        prev.map((notif) => (notif.id === notificationId ? { ...notif, is_read: true } : notif))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      dispatch(showToast({ message: 'Notification marked as read', type: 'success' }));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      dispatch(showToast({ message: 'Failed to update notification', type: 'error' }));
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await axiosInstance.post('/notifications/mark-all-read/');
      console.log('Mark all as read response:', response.data);
      setNotifications((prev) => prev.map((notif) => ({ ...notif, is_read: true })));
      setUnreadCount(0);
      dispatch(
        showToast({ message: response.data.message || 'All notifications marked as read', type: 'success' })
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error.response?.data || error);
      dispatch(showToast({ message: 'Failed to update notifications', type: 'error' }));
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axiosInstance.delete(`/notifications/${notificationId}/`);
      setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
      dispatch(showToast({ message: 'Notification deleted', type: 'success' }));
    } catch (error) {
      console.error('Error deleting notification:', error);
      dispatch(showToast({ message: 'Failed to delete notification', type: 'error' }));
    }
  };

  const openPostPopup = async (postId) => {
    try {
      const response = await axiosInstance.get(`/posts/${postId}/`);
      const postData = response.data;
      setSelectedPostId({
        id: postId,
        file: postData.file,
        caption: postData.caption,
        likes: postData.likes,
        comment_count: postData.comment_count,
        user: {
          username: postData.user.username,
          profile_picture: postData.user.profile_picture,
        },
        created_at: postData.created_at,
        is_liked: postData.is_liked || false,
      });
      setIsPostPopupOpen(true);
    } catch (error) {
      console.error('Error fetching post data:', error);
      dispatch(showToast({ message: 'Failed to load post', type: 'error' }));
    }
  };

  const closePostPopup = () => {
    setIsPostPopupOpen(false);
    setSelectedPostId(null);
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
  }, [user]);

  const filteredNotifications = notifications.filter((notification) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !notification.is_read;
    try {
      const data = JSON.parse(notification.message);
      return data.type === activeTab;
    } catch (e) {
      return false;
    }
  });

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <p className="text-gray-500 mb-4">Please log in to view notifications</p>
        <button
          onClick={() => navigate('/login')}
          className="px-4 py-2 bg-[#198754] text-white rounded-lg hover:bg-[#146c43] transition-colors"
        >
          Log In
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="mr-2 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
          </div>
        </div>
        <div className="border-b border-gray-200 overflow-x-auto">
          <div className="max-w-4xl mx-auto px-2">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('all')}
                className={`py-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'all'
                    ? 'border-[#198754] text-[#198754]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All{' '}
                {unreadCount > 0 && activeTab !== 'all' && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('unread')}
                className={`py-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'unread'
                    ? 'border-[#198754] text-[#198754]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Unread{' '}
                {unreadCount > 0 && activeTab === 'unread' && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab(NotificationType.FOLLOW)}
                className={`py-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === NotificationType.FOLLOW
                    ? 'border-[#198754] text-[#198754]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Follows
              </button>
              <button
                onClick={() => setActiveTab(NotificationType.MENTION)}
                className={`py-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === NotificationType.MENTION
                    ? 'border-[#198754] text-[#198754]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Mentions
              </button>
              <button
                onClick={() => setActiveTab(NotificationType.CALL)}
                className={`py-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === NotificationType.CALL
                    ? 'border-[#198754] text-[#198754]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Calls
              </button>
              <button
                onClick={() => setActiveTab(NotificationType.NEW_CHAT)}
                className={`py-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === NotificationType.NEW_CHAT
                    ? 'border-[#198754] text-[#198754]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Chats
              </button>
              <button
                onClick={() => setActiveTab(NotificationType.LIVE)}
                className={`py-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === NotificationType.LIVE
                    ? 'border-[#198754] text-[#198754]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Live
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#198754] border-r-2 border-b-2 border-gray-200"></div>
          </div>
        ) : filteredNotifications.length > 0 ? (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onDelete={deleteNotification}
                onOpenPost={openPostPopup}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Bell size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-500 text-center">
              {activeTab === 'all'
                ? "You don't have any notifications yet"
                : activeTab === 'unread'
                ? "You've read all your notifications"
                : `No ${activeTab} notifications yet`}
            </p>
          </div>
        )}
      </div>
      {isPostPopupOpen && selectedPostId && (
        <PostPopup
          post={selectedPostId}
          userData={user}
          isOpen={isPostPopupOpen}
          onClose={closePostPopup}
        />
      )}
    </div>
  );
};

export default Notifications;