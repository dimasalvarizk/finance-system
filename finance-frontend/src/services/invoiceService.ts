import axios from 'axios';

const API_URL = 
  import.meta.env.VITE_INVOICE_API_URL || 
  import.meta.env.VITE_SETTING_API_URL || 
  import.meta.env.VITE_AUTH_API_URL || 
  (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') ? '' : 'http://localhost:5002');

const invoiceAPI = axios.create({
  baseURL: `${API_URL}/api/invoices`,
});

const companyAPI = axios.create({
  baseURL: `${API_URL}/api/companies`,
});

// Interceptor to attach JWT token automatically
const attachToken = (config: any) => {
  const token = localStorage.getItem('finance_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

invoiceAPI.interceptors.request.use(attachToken, (error) => Promise.reject(error));
companyAPI.interceptors.request.use(attachToken, (error) => Promise.reject(error));

export const getInvoices = async () => {
  const response = await invoiceAPI.get('/');
  return response.data.data;
};

export const createInvoice = async (invoiceData: any) => {
  const response = await invoiceAPI.post('/', invoiceData);
  return response.data.data;
};

export const updateInvoiceStatus = async (idOrInvoiceNo: string, status: string) => {
  const response = await invoiceAPI.put(`/${idOrInvoiceNo}/status`, { status });
  return response.data;
};

export const getCompanies = async () => {
  const response = await companyAPI.get('/');
  return response.data.data;
};

export const createCompany = async (companyData: any) => {
  const response = await companyAPI.post('/', companyData);
  return response.data.data;
};

export const updateCompany = async (code: string, companyData: any) => {
  const response = await companyAPI.put(`/${code}`, companyData);
  return response.data.data;
};

export const deleteCompany = async (code: string) => {
  const response = await companyAPI.delete(`/${code}`);
  return response.data;
};

export const updateInvoice = async (id: string, invoiceData: any) => {
  const response = await invoiceAPI.put(`/${id}`, invoiceData);
  return response.data.data;
};

export const cancelInvoice = async (id: string) => {
  const response = await invoiceAPI.put(`/${id}/cancel`);
  return response.data;
};

export const deleteInvoices = async (ids: string[]) => {
  const response = await invoiceAPI.delete('/', { data: { ids } });
  return response.data;
};

export const uploadPaymentProof = async (idOrInvoiceNo: string, base64Data: string) => {
  const response = await invoiceAPI.put(`/${idOrInvoiceNo}/payment-proof`, { paymentAttachment: base64Data });
  return response.data;
};

export const addInvoicePayment = async (invoiceNo: string, paymentData: { amount: number; paymentDate: string; note?: string; saveOverpaymentCredit?: boolean; companyCode?: string }) => {
  const response = await invoiceAPI.post(`/${invoiceNo}/payments`, paymentData);
  return response.data;
};

export const getInvoicePayments = async (invoiceNo: string) => {
  const response = await invoiceAPI.get(`/${invoiceNo}/payments`);
  return response.data.data;
};

export const addCompanyCredit = async (code: string, creditAmount: number) => {
  const response = await companyAPI.put(`/${code}/credit`, { creditAmount });
  return response.data;
};
