import axios from 'axios';

const API_URL =
  import.meta.env.VITE_EXPENSE_API_URL ||
  import.meta.env.VITE_HOTEL_RESERVATION_API_URL ||
  import.meta.env.VITE_SETTING_API_URL ||
  import.meta.env.VITE_INVOICE_API_URL ||
  import.meta.env.VITE_AUTH_API_URL ||
  (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') ? '' : 'http://localhost:5000');

const expenseAPI = axios.create({
  baseURL: `${API_URL}/api/expenses`,
});

// Attach JWT token automatically
expenseAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('finance_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export interface SubmitExpensePayload {
  claimId?: string;
  projectRef?: string;
  category: string;
  currency: string;
  amount: number;
  expenseDate: string;
  description: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  receipts?: Array<{
    name: string;
    size?: number;
    type?: string;
    url?: string;
  }>;
  submittedByName?: string;
  submittedByEmail?: string;
  department?: string;
  notes?: string;
}

export const getExpenseCategories = async (): Promise<string[]> => {
  try {
    const response = await expenseAPI.get('/categories');
    return response.data.data;
  } catch (error) {
    console.warn('Failed to fetch categories from backend, using fallback:', error);
    return [
      'Mission Meals',
      'Transportation & Fuel',
      'Client Dinner & Catering Accommodation',
      'Client Entertainment',
      'Inter-office Logistics & Courier',
      'Office Supplies & Stationery',
      'Hotel & Lodging Inspection',
      'IT & Cloud Infrastructure',
      'Emergency Medical & Operational Allowance',
      'Others'
    ];
  }
};

export const submitCorporateExpense = async (payload: SubmitExpensePayload) => {
  const response = await expenseAPI.post('', payload);
  return response.data;
};

export const getCorporateExpenses = async (params?: { status?: string; category?: string; currency?: string; search?: string }) => {
  const response = await expenseAPI.get('', { params });
  return response.data.data || [];
};

export const getMyCorporateExpenses = async () => {
  const response = await expenseAPI.get('/my-claims');
  return response.data.data || [];
};

export const getCorporateExpenseById = async (id: string) => {
  const response = await expenseAPI.get(`/${id}`);
  return response.data.data;
};

export const updateCorporateExpenseStatus = async (
  id: string,
  data: {
    status?: string;
    rejectionReason?: string;
    disbursementMethod?: string;
    disbursementRef?: string;
    payrollPeriod?: string;
    notes?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountHolder?: string;
  }
) => {
  const response = await expenseAPI.patch(`/${id}/status`, data);
  return response.data;
};

export const bulkActionCorporateExpenses = async (data: {
  action: 'delete' | 'payroll' | 'bank_transfer';
  ids: string[];
  payrollPeriod?: string;
  transferRef?: string;
}) => {
  const response = await expenseAPI.post('/bulk-action', data);
  return response.data;
};

export const deleteCorporateExpense = async (id: string) => {
  const response = await expenseAPI.delete(`/${id}`);
  return response.data;
};

export const getExpenseStats = async () => {
  const response = await expenseAPI.get('/stats');
  return response.data.data;
};

export const executeSettlementPayment = async (
  id: string,
  payload?: {
    actor?: string;
    clientIp?: string;
    transactionTraceId?: string;
    acknowledgementCode?: string;
  }
) => {
  const response = await expenseAPI.post(`/${id}/execute-settlement`, payload || {});
  return response.data;
};

export const inquireBankAccount = async (payload: {
  bankName: string;
  accountNumber: string;
  accountHolderName?: string;
}) => {
  const response = await expenseAPI.post('/account-inquiry', payload);
  return response.data;
};


