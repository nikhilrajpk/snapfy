import axios from 'axios';
import { store } from './redux/store';
import { logout } from './redux/slices/userSlice';
import { showToast } from './redux/slices/toastSlice';

const axiosInstance = axios.create({
  baseURL: 'https://snapfy-backend-682457091521.us-central1.run.app/api/',
  withCredentials: true,
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('access_token='))
      ?.split('=')[1];
    
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip token refresh for logout requests
    if (originalRequest.url.includes('/logout/') || window.isLoggingOut) {
      return Promise.reject(error);
    }
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Get refresh token from cookies
        const refreshToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('refresh_token='))
          ?.split('=')[1];
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        // Refresh the token
        const response = await axios.post(

          'https://snapfy-backend-682457091521.us-central1.run.app/api/token/refresh/',
          { refresh: refreshToken },
          { withCredentials: true }
        );
        
        // Update access token in cookies
        document.cookie = `access_token=${response.data.access}; path=/; max-age=${3600 * 24}; SameSite=Lax`;
        
        // Retry original request with new token
        originalRequest.headers['Authorization'] = `Bearer ${response.data.access}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // await axios.post('http://127.0.0.1:8000/api/logout/')
        // store.dispatch(logout());
        // store.dispatch(showToast({
        //   message: 'Session expired. Please log in again.',
        //   type: 'warning'
        // }));
        // window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;