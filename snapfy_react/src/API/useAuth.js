import { useEffect } from 'react';
import axiosInstance from '../axiosInstance';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../redux/slices/userSlice';
import { useNavigate } from 'react-router-dom';
import { userLogout } from './authAPI';

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
            // Get refresh token from cookies
            const refreshToken = document.cookie
              .split('; ')
              .find(row => row.startsWith('refresh_token='))
              ?.split('=')[1];
            
            if (!refreshToken) throw new Error('No refresh token');
            
            const refreshResponse = await axiosInstance.post('token/refresh/', { 
              refresh: refreshToken 
            });
            
            if (!refreshResponse.data.access) throw new Error('Refresh failed');
            
            // Update access token in cookies
            document.cookie = `access_token=${refreshResponse.data.access}; path=/; max-age=${3600 * 24}; SameSite=Lax`;
          } catch (refreshError) {
            console.error('Auth verification failed:', refreshError);
            await userLogout();
            dispatch(logout());
            navigate('/');
          }
        }
      }
    };

    if (user) {
      verifyAuth();
      const interval = setInterval(verifyAuth, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user, dispatch, navigate]);
};