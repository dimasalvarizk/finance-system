import axios from 'axios';

const API_URL = import.meta.env.VITE_REQUEST_API_URL || 'http://localhost:5003';

const requestAPI = axios.create({
  baseURL: `${API_URL}/api/requests`,
});

// Interceptor to attach JWT token to all requests automatically
requestAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('finance_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const getRequests = async () => {
  const response = await requestAPI.get('');
  return response.data.data;
};

export const createRequest = async (requestData: any) => {
  const response = await requestAPI.post('', requestData);
  return response.data.data;
};

export const approveRequest = async (id: string, note?: string) => {
  const response = await requestAPI.put(`/${id}/approve`, { note });
  return response.data.data;
};

export const rejectRequest = async (id: string, reason?: string) => {
  const response = await requestAPI.put(`/${id}/reject`, { reason });
  return response.data.data;
};

export const saveRequestNote = async (id: string, note: string) => {
  const response = await requestAPI.put(`/${id}/note`, { note });
  return response.data;
};

export const checkDownloadPermission = async (idOrInvoiceNo: string) => {
  try {
    const response = await requestAPI.get(`/${idOrInvoiceNo}/download-check`);
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 403) {
      return { success: false, allowed: false, message: error.response.data.message };
    }
    throw error;
  }
};

export const sendInvoiceEmail = async (idOrInvoiceNo: string, email: string) => {
  const response = await requestAPI.post(`/${idOrInvoiceNo}/send-email`, { email });
  return response.data;
};
