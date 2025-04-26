import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../../axiosInstance';
import { useNotifications } from '../../Features/Notification/NotificationContext';
import { CLOUDINARY_ENDPOINT } from '../../APIEndPoints';
import { showToast } from '../../redux/slices/toastSlice';
import { useDispatch } from 'react-redux';

const NotificationBell = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { unreadCount, recentNotifications, setUnreadCount, setRecentNotifications, syncUnreadCount } = useNotifications();
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const markAsRead = async (notificationId, e) => {
    e.stopPropagation();
    try {
      await axiosInstance.patch(`/notifications/${notificationId}/read/`);
      setRecentNotifications((prev) =>
        prev.map((notif) => (notif.id === notificationId ? { ...notif, is_read: true } : notif))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (dropdownOpen) {
      syncUnreadCount();
    }
  }, [dropdownOpen, syncUnreadCount]);

  const getNotificationMessage = (notification) => {
    const data = JSON.parse(notification.message);
    switch (data.type) {
      case 'follow':
        return `${data.from_user.username} started following you`;
      case 'mention':
        return `${data.from_user.username} mentioned you in a post`;
      case 'like':
        return `${data.from_user.username} liked your post`;
      case 'comment':
        return `${data.from_user.username} commented: "${data.content.substring(0, 20)}..."`;
      case 'call':
        return data.call_status === 'missed'
          ? `Missed call from ${data.from_user.username}`
          : `${data.from_user.username} is calling you`;
      case 'new_chat':
        return `${data.from_user.username} started a chat with you`;
      default:
        return 'New notification';
    }
  };

  const getNotificationLink = (notification) => {
    const data = JSON.parse(notification.message);
    switch (data.type) {
      case 'follow':
        return `/user/${data.from_user.username}`;
      case 'mention':
      case 'like':
      case 'comment':
        return `/post/${data.post_id}`;
      case 'call':
      case 'new_chat':
        return `/messages/${data.room_id}`;
      default:
        return '#';
    }
  };

  const handleNotificationClick = (notification, e) => {
    e.preventDefault();
    e.stopPropagation();
    const data = JSON.parse(notification.message);
    if (data.type === 'call') {
      axiosInstance.get(`/chatrooms/${data.room_id}/call-history/`)
        .then(response => {
          const call = response.data.find(c => String(c.id) === String(data.call_id));
          if (call && call.call_status === 'ongoing' && !call.call_end_time) {
            navigate(`/messages/${data.room_id}`);
          } else {
            dispatch(showToast({ message: call.call_status === 'missed' ? 'Missed call' : 'Call has ended', type: 'info' }));
          }
        })
        .catch(error => {
          console.error('Error checking call status:', error);
          dispatch(showToast({ message: 'Error checking call status', type: 'error' }));
        });
      setDropdownOpen(false);
    } else {
      navigate(getNotificationLink(notification));
      setDropdownOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setDropdownOpen(!dropdownOpen)} className="relative p-2 rounded-full hover:bg-gray-100">
        <Bell size={24} className="text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
          <div className="p-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Notifications</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {recentNotifications.length > 0 ? (
              recentNotifications.map((notification) => {
                const data = JSON.parse(notification.message);
                return (
                  <div
                    key={notification.id}
                    className={`flex items-center p-3 hover:bg-gray-100 transition-colors ${notification.is_read ? 'bg-white' : 'bg-blue-50'}`}
                    onClick={(e) => handleNotificationClick(notification, e)}
                  >
                    <img
                      src={data.from_user.profile_picture ?
                        `${CLOUDINARY_ENDPOINT}${data.from_user.profile_picture}` :
                        '/default-profile.png'}
                      className="w-8 h-8 rounded-full mr-2"
                      alt="User"
                      onError={(e) => (e.target.src = '/default-profile.png')}
                    />
                    <span className="text-sm text-gray-700 flex-1">{getNotificationMessage(notification)}</span>
                    {!notification.is_read && (
                      <button onClick={(e) => markAsRead(notification.id, e)} className="ml-2 text-green-500 hover:text-green-700">
                        Mark as read
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="p-3 text-gray-500 text-center">No notifications yet</p>
            )}
          </div>
          <div className="p-3 border-t border-gray-200">
            <Link to="/notifications" className="text-blue-600 hover:text-blue-800 text-sm font-medium" onClick={() => setDropdownOpen(false)}>
              See all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;