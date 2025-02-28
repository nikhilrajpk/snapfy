import axios from 'axios'
import { store } from './redux/store'
import { login } from './redux/slices/userSlice'

const axiosInstance = axios.create({
    baseURL : 'http://127.0.0.1:8000/api/'
})

axiosInstance.interceptors.request.use((config)=>{
    const token = store.getState().user.token;
    if(token){
        config.headers.Authorization = `Bearer ${token}`
    }
    // console.log("Request config:", config); // Debug request
    return config
})

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true; // Prevent infinite loop
        const refreshToken = store.getState().user.refreshToken;
  
        if (refreshToken) {
          try {
            const response = await axios.post('http://127.0.0.1:8000/api/token/refresh/', {
              refresh: refreshToken,
            });
            const newAccessToken = response.data.access;
            store.dispatch(login({ 
              user: store.getState().user.user, 
              token: newAccessToken,
              refreshToken: refreshToken 
            }));
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return axiosInstance(originalRequest); // Retry original request
          } catch (refreshError) {
            console.error("Refresh token failed:", refreshError);
            // Optionally log out user here
            return Promise.reject(refreshError);
          }
        }
      }
      return Promise.reject(error);
    }
  );

export default axiosInstance