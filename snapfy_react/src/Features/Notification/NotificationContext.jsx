import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../axiosInstance';
import { showToast } from '../../redux/slices/toastSlice';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const { user } = useSelector(state => state.user);
  const socketRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const response = await axiosInstance.get('/notifications/?limit=5');
      const allNotifications = response.data;
      setUnreadCount(allNotifications.filter(n => !n.is_read).length);
      setRecentNotifications(allNotifications.slice(0, 5));
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleCallNotification = (data) => {
    if (data.type === 'call_offer') {
      dispatch(showToast({
        message: `Incoming call from ${data.caller.username}`,
        type: 'info',
      }));
    }
  };

  const connectWebSocket = () => {
    if (!user?.username) return;

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;
    socketRef.current = new WebSocket(`${protocol}://${host}/ws/notifications/${user.username}/`);

    socketRef.current.onopen = () => {
      console.log('WebSocket connection established (context)');
      reconnectAttempts.current = 0;
    };

    socketRef.current.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'notification') {
          setUnreadCount(prev => prev + 1);
          setRecentNotifications(prev => [data.notification, ...prev].slice(0, 5));
          
          // Handle call notifications
          const notificationData = JSON.parse(data.notification.message);
          if (notificationData.type === 'call') {
            handleCallNotification({
              type: 'call_offer',
              caller: notificationData.from_user,
              room_id: notificationData.room_id,
              call_id: notificationData.call_id
            });
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    socketRef.current.onerror = (error) => {
      console.error('WebSocket error (context):', error);
    };

    socketRef.current.onclose = (e) => {
      console.log('WebSocket connection closed (context)', e.code, e.reason);
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current++;
        setTimeout(connectWebSocket, delay);
      }
    };
  };

  useEffect(() => {
    if (!user) return;

    fetchNotifications();
    connectWebSocket();

    return () => {
      if (socketRef.current?.readyState === WebSocket.OPEN || WebSocket.CONNECTING) {
        socketRef.current.close(1000, 'Component unmounted');
      }
    };
  }, [user]);

  return (
    <NotificationContext.Provider value={{ 
      unreadCount, 
      recentNotifications, 
      setUnreadCount, 
      setRecentNotifications 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);