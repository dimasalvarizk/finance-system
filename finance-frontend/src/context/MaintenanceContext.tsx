import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMaintenanceLocks, updateMaintenanceLocks, type MaintenanceLockState } from '../services/settingService';
import { useAuth } from './AuthContext';

interface MaintenanceContextType {
  locks: MaintenanceLockState;
  loading: boolean;
  isITAdmin: boolean;
  isModuleLocked: (moduleKey: 'hotelReservations' | 'invoices' | 'requests' | 'fullSystem') => boolean;
  refreshLocks: () => Promise<void>;
  toggleLock: (moduleKey: keyof MaintenanceLockState, extra?: { message?: string; estimatedTime?: string }) => Promise<void>;
}

const DEFAULT_STATE: MaintenanceLockState = {
  fullSystem: false,
  hotelReservations: false,
  invoices: false,
  requests: false,
  message: 'Modul ini sedang dalam pemeliharaan berkala untuk peningkatan performa sistem.',
  estimatedTime: '',
  lockedBy: '',
  updatedAt: ''
};

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

export const MaintenanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [locks, setLocks] = useState<MaintenanceLockState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);

  const userNameLower = (user?.name || '').toLowerCase();
  const userEmailLower = (user?.email || '').toLowerCase();
  const isITAdmin = 
    userNameLower.includes('dimas') || 
    userNameLower.includes('ali') || 
    userEmailLower.includes('dimas') || 
    userEmailLower.includes('ali') || 
    user?.role === 'Super Admin';

  const fetchLocks = useCallback(async () => {
    try {
      const data = await getMaintenanceLocks();
      if (data) {
        setLocks((prev) => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.warn('Failed to load maintenance locks from server:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocks();
    const interval = setInterval(fetchLocks, 15000); // Polling every 15 seconds
    return () => clearInterval(interval);
  }, [fetchLocks]);

  const isModuleLocked = useCallback((moduleKey: 'hotelReservations' | 'invoices' | 'requests' | 'fullSystem'): boolean => {
    // IT Administrators (Dimas, Ali, Super Admin) always bypass lock
    if (isITAdmin) return false;

    if (locks.fullSystem) return true;
    if (moduleKey === 'hotelReservations' && locks.hotelReservations) return true;
    if (moduleKey === 'invoices' && locks.invoices) return true;
    if (moduleKey === 'requests' && locks.requests) return true;

    return false;
  }, [locks, isITAdmin]);

  const toggleLock = async (moduleKey: keyof MaintenanceLockState, extra?: { message?: string; estimatedTime?: string }) => {
    const updated = {
      ...locks,
      [moduleKey]: !locks[moduleKey],
      ...(extra?.message !== undefined ? { message: extra.message } : {}),
      ...(extra?.estimatedTime !== undefined ? { estimatedTime: extra.estimatedTime } : {})
    };
    setLocks(updated);
    try {
      await updateMaintenanceLocks(updated);
    } catch (err) {
      console.error('Failed to update maintenance locks on backend:', err);
      // rollback
      fetchLocks();
      throw err;
    }
  };

  return (
    <MaintenanceContext.Provider
      value={{
        locks,
        loading,
        isITAdmin,
        isModuleLocked,
        refreshLocks: fetchLocks,
        toggleLock
      }}
    >
      {children}
    </MaintenanceContext.Provider>
  );
};

export const useMaintenance = () => {
  const context = useContext(MaintenanceContext);
  if (!context) {
    throw new Error('useMaintenance must be used within a MaintenanceProvider');
  }
  return context;
};
