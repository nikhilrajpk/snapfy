import axios from 'axios';
import { store } from './redux/store';
import { logout } from './redux/slices/userSlice';

const axiosInstance = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/',
  withCredentials: true,
});

// Request interceptor to ensure credentials are sent
axiosInstance.interceptors.request.use(
  (config) => {
    // You can add headers here if needed
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Attempt to refresh tokens
        await axios.post(
          'http://127.0.0.1:8000/api/token/refresh/',
          {},  // Empty body since we're using cookies
          { 
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );
        
        // Retry the original request
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        store.dispatch(logout());
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;