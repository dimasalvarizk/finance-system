import axios from 'axios';

const API_URL = 
  import.meta.env.VITE_HOTEL_RESERVATION_API_URL || 
  import.meta.env.VITE_SETTING_API_URL || 
  import.meta.env.VITE_INVOICE_API_URL || 
  import.meta.env.VITE_AUTH_API_URL || 
  (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') ? '' : 'http://localhost:5000');

const hotelReservationAPI = axios.create({
  baseURL: `${API_URL}/api/hotel-reservations`,
});

// Interceptor to attach JWT token to all requests automatically
hotelReservationAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('finance_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const getHotelReservations = async () => {
  const response = await hotelReservationAPI.get('');
  return response.data;
};

export const createHotelReservation = async (bookingData: any) => {
  const response = await hotelReservationAPI.post('', bookingData);
  return response.data;
};

export const approveHotelReservation = async (id: string, data: { confirmationNo: string; approvedAtKarim: string }) => {
  const response = await hotelReservationAPI.put(`/${id}/approve`, data);
  return response.data;
};

export const updateHotelReservationStatus = async (id: string, data: { status?: string; isPaid?: boolean; notes?: string; paymentInvoiceFile?: string }) => {
  const response = await hotelReservationAPI.put(`/${id}/status`, data);
  return response.data;
};

export const deleteHotelReservation = async (id: string) => {
  const response = await hotelReservationAPI.delete(`/${id}`);
  return response.data;
};

export const addHotelPayment = async (id: string, paymentData: { amount: number; paymentDate: string; note?: string }) => {
  const response = await hotelReservationAPI.post(`/${id}/payments`, paymentData);
  return response.data;
};

export const getHotelPayments = async (id: string) => {
  const response = await hotelReservationAPI.get(`/${id}/payments`);
  return response.data.data;
};

export const sendHotelReservationEmail = async (id: string, email: string) => {
  const response = await hotelReservationAPI.post(`/${id}/send-email`, { email });
  return response.data;
};

