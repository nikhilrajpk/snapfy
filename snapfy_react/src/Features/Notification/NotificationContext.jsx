import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import axiosInstance from '../../axiosInstance';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const { user } = useSelector(state => state.user);
  const socketRef = useRef(null);

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

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = 'localhost:8000'; // Point to Django backend
    socketRef.current = new WebSocket(`${protocol}://${host}/ws/notifications/${user.username}/`);

    socketRef.current.onopen = () => {
      console.log('WebSocket connection established (context)');
    };

    socketRef.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'notification') {
        setUnreadCount(prev => prev + 1);
        setRecentNotifications(prev => [data.notification, ...prev].slice(0, 5));
      }
    };

    socketRef.current.onerror = (error) => {
      console.error('WebSocket error (context):', error);
    };

    socketRef.current.onclose = () => {
      console.log('WebSocket connection closed (context)');
    };

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [user]);

  return (
    <NotificationContext.Provider value={{ unreadCount, recentNotifications, setUnreadCount, setRecentNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);