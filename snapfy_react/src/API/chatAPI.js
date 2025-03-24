// frontend/src/API/chatAPI.js
import axiosInstance from '../axiosInstance';

export const getMessages = async (roomId) => {
  const response = await axiosInstance.get(`/chatrooms/${roomId}/messages/`);
  return response.data;
};

export const sendMessage = async (roomId, content, file) => {
  const formData = new FormData();
  if (content) formData.append('content', content);
  if (file) formData.append('file', file);
  const response = await axiosInstance.post(`/chatrooms/${roomId}/send-message/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const startCall = async (username, callType) => {
  // Placeholder: Implement call logic if needed
  console.log(`Starting ${callType} call with ${username}`);
  // Add actual call API if implemented
};