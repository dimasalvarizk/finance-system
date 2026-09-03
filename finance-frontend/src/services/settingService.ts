import axios from 'axios';

const API_URL = import.meta.env.VITE_SETTING_API_URL || 'http://localhost:5000'; // Gateway URL

const settingAPI = axios.create({
  baseURL: `${API_URL}/api/settings`,
});

// Interceptor to attach JWT token automatically
const attachToken = (config: any) => {
  const token = localStorage.getItem('finance_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

settingAPI.interceptors.request.use(attachToken, (error) => Promise.reject(error));

// 1. Team Members
export const getTeamMembers = async () => {
  const response = await settingAPI.get('/team');
  return response.data.data;
};
export const createTeamMember = async (data: any) => {
  const response = await settingAPI.post('/team', data);
  return response.data.data;
};
export const updateTeamMember = async (id: string, data: any) => {
  const response = await settingAPI.put(`/team/${id}`, data);
  return response.data.data;
};
export const deleteTeamMember = async (id: string) => {
  const response = await settingAPI.delete(`/team/${id}`);
  return response.data;
};

// 2. Branches
export const getBranches = async () => {
  const response = await settingAPI.get('/branches');
  return response.data.data;
};
export const createBranch = async (data: any) => {
  const response = await settingAPI.post('/branches', data);
  return response.data.data;
};
export const updateBranch = async (id: string, data: any) => {
  const response = await settingAPI.put(`/branches/${id}`, data);
  return response.data.data;
};
export const deleteBranch = async (id: string) => {
  const response = await settingAPI.delete(`/branches/${id}`);
  return response.data;
};

// 3. Notifications Preferences
export const getNotifSettings = async () => {
  const response = await settingAPI.get('/notifications');
  return response.data.data;
};
export const updateNotifSettings = async (data: any) => {
  const response = await settingAPI.put('/notifications', data);
  return response.data.data;
};

// 4. Edit Profile
export const updateProfile = async (data: any) => {
  const response = await settingAPI.put('/profile', data);
  return response.data.data;
};

// 5. Security / Password Update
export const updatePassword = async (data: any) => {
  const response = await settingAPI.put('/security/password', data);
  return response.data;
};

// 6. Exchange Rates
export const getExchangeRates = async () => {
  const response = await settingAPI.get('/exchange-rates');
  return response.data.data;
};
export const getExchangeRatesHistory = async () => {
  const response = await settingAPI.get('/exchange-rates/history');
  return response.data.data;
};
export const updateExchangeRates = async (data: any) => {
  const response = await settingAPI.put('/exchange-rates', data);
  return response.data.data;
};

// 7. Services Management
export const getServices = async () => {
  const response = await settingAPI.get('/services');
  return response.data.data;
};
export const createService = async (data: any) => {
  const response = await settingAPI.post('/services', data);
  return response.data.data;
};
export const updateService = async (id: string, data: any) => {
  const response = await settingAPI.put(`/services/${id}`, data);
  return response.data.data;
};
export const deleteService = async (id: string) => {
  const response = await settingAPI.delete(`/services/${id}`);
  return response.data;
};

// 8. Tax Settings Management
export const getTaxSetting = async () => {
  const response = await settingAPI.get('/tax');
  return response.data.data;
};
export const updateTaxSetting = async (taxPercentage: number) => {
  const response = await settingAPI.put('/tax', { taxPercentage });
  return response.data.data;
};

// 9. Company Settings Management
export const getCompanySetting = async () => {
  const response = await settingAPI.get('/company');
  return response.data.data;
};
export const updateCompanySetting = async (data: { 
  companyName?: string; 
  phone?: string; 
  taxNumber?: string; 
  defaultNotes?: string; 
  termsAndConditions?: string;
  bankName?: string;
  accountName?: string;
  idrAccountNumber?: string;
  usdAccountNumber?: string;
}) => {
  const response = await settingAPI.put('/company', data);
  return response.data.data;
};

// 10. HB Room Types Management
export const getRoomTypes = async () => {
  const response = await settingAPI.get('/hb/room-types');
  return response.data.data;
};
export const createRoomType = async (data: { name: string; status: string }) => {
  const response = await settingAPI.post('/hb/room-types', data);
  return response.data.data;
};
export const updateRoomType = async (id: string, data: { name: string; status: string }) => {
  const response = await settingAPI.put(`/hb/room-types/${id}`, data);
  return response.data.data;
};
export const deleteRoomType = async (id: string) => {
  const response = await settingAPI.delete(`/hb/room-types/${id}`);
  return response.data;
};

// 11. HB Meal Types Management
export const getMealTypes = async () => {
  const response = await settingAPI.get('/hb/meal-types');
  return response.data.data;
};
export const createMealType = async (data: { name: string; status: string }) => {
  const response = await settingAPI.post('/hb/meal-types', data);
  return response.data.data;
};
export const updateMealType = async (id: string, data: { name: string; status: string }) => {
  const response = await settingAPI.put(`/hb/meal-types/${id}`, data);
  return response.data.data;
};
export const deleteMealType = async (id: string) => {
  const response = await settingAPI.delete(`/hb/meal-types/${id}`);
  return response.data;
};

// 12. Full Database Snapshot Backup (All 18 MySQL Tables)
export const getFullDatabaseBackup = async () => {
  const response = await settingAPI.get('/backup/full');
  return response.data;
};

// 13. Backup History & Audit Logs
export const logBackupHistory = async (data: {
  exportType: string;
  filename: string;
  recordCount?: number;
  backupPayload?: any;
}) => {
  const response = await settingAPI.post('/backup/history', data);
  return response.data;
};

export const getBackupHistory = async () => {
  const response = await settingAPI.get('/backup/history');
  return response.data.data;
};

// 14. System Maintenance Broadcast
export const broadcastMaintenance = async (data: {
  scope: string;
  scheduleTime?: string;
  message: string;
  urgency?: 'Normal' | 'High';
}) => {
  const response = await settingAPI.post('/maintenance', data);
  return response.data;
};

// 15. Module Maintenance Mode Locks
export interface MaintenanceLockState {
  fullSystem: boolean;
  dashboard: boolean;
  invoices: boolean;
  requests: boolean;
  companies: boolean;
  hotelReservations: boolean;
  settings: boolean;
  message?: string;
  estimatedTime?: string;
  lockedBy?: string;
  updatedAt?: string;
}

export const getMaintenanceLocks = async (): Promise<MaintenanceLockState> => {
  const response = await settingAPI.get('/maintenance/status');
  return response.data.data;
};

export const updateMaintenanceLocks = async (data: Partial<MaintenanceLockState>): Promise<MaintenanceLockState> => {
  const response = await settingAPI.post('/maintenance/locks', data);
  return response.data.data;
};

