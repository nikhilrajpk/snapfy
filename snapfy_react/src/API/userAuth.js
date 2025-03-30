// useAuth.js
import { useEffect } from 'react';
import axiosInstance from '../axiosInstance';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../redux/slices/userSlice';
import { useNavigate } from 'react-router-dom';

export const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.user);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        await axiosInstance.get('verify-auth/');
      } catch (error) {
        if (error.response?.status === 401) {
          try {
            await axiosInstance.post('logout/');
          } finally {
            dispatch(logout());
            navigate('/login');
          }
        }
      }
    };

    if (user) {
      verifyAuth();
      const interval = setInterval(verifyAuth, 5 * 60 * 1000); // Verify every 5 minutes
      return () => clearInterval(interval);
    }
  }, [user, dispatch, navigate]);
};