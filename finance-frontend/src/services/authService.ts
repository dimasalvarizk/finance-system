import axios from 'axios';

const API_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5001';

// Inisialisasi instance Axios khusus otentikasi
const authAPI = axios.create({
  baseURL: `${API_URL}/api/auth`,
  withCredentials: true, // Menyertakan cookie dalam request secara otomatis
});

// Interceptor to attach JWT token
authAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('finance_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const login = async (email: string, password: string) => {
  const response = await authAPI.post('/login', { email, password });
  return response.data;
};

export const logout = async () => {
  const response = await authAPI.post('/logout');
  return response.data;
};

export const getMe = async () => {
  const response = await authAPI.get('/me');
  return response.data;
};

export const getUsers = async () => {
  const response = await authAPI.get('/users');
  return response.data.data;
};

export const createUser = async (userData: any) => {
  const response = await authAPI.post('/users', userData);
  return response.data.data;
};

export const updateUser = async (id: string, userData: any) => {
  const response = await authAPI.put(`/users/${id}`, userData);
  return response.data.data;
};

export const deleteUser = async (id: string) => {
  const response = await authAPI.delete(`/users/${id}`);
  return response.data;
};

export const getActiveSessions = async () => {
  const response = await authAPI.get('/me/sessions');
  return response.data.data;
};

export const revokeActiveSession = async (id: string) => {
  const response = await authAPI.delete(`/me/sessions/${id}`);
  return response.data;
};

export const getLoginAttempts = async () => {
  const response = await authAPI.get('/me/login-logs');
  return response.data.data;
};

export const getNotifications = async () => {
  const response = await authAPI.get('/me/notifications');
  return response.data.data;
};

export const markNotificationAsRead = async (id: string) => {
  const response = await authAPI.put(`/me/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsAsRead = async () => {
  const response = await authAPI.put('/me/notifications/read-all');
  return response.data;
};

export const forgotPassword = async (email: string) => {
  const response = await authAPI.post('/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (token: string, password: string) => {
  const response = await authAPI.post('/reset-password', { token, password });
  return response.data;
};
