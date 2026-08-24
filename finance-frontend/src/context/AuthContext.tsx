import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as loginAPI, logout as logoutAPI, getMe as getMeAPI } from '../services/authService';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  branch: string;
  phone?: string;
  employeeId?: string;
  department?: string;
  jobTitle?: string;
  avatar?: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  loginUser: (email: string, password: string) => Promise<any>;
  logoutUser: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cek keaktifan sesi cookie saat aplikasi pertama kali dimuat
  const checkSession = async () => {
    try {
      const data = await getMeAPI();
      if (data.success && data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
        if (data.token) {
          localStorage.setItem('finance_token', data.token);
        }
      }
    } catch (err) {
      // Sesi tidak ada atau kadaluarsa
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('finance_token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const refreshUser = async () => {
    try {
      const data = await getMeAPI();
      if (data.success && data.user) {
        setUser(data.user);
      }
    } catch (err) {
      console.error('Failed to refresh user context:', err);
    }
  };

  const loginUser = async (email: string, password: string) => {
    const data = await loginAPI(email, password);
    if (data.success && data.user) {
      setUser(data.user);
      setIsAuthenticated(true);
      if (data.token) {
        localStorage.setItem('finance_token', data.token);
      }
    }
    return data;
  };

  const logoutUser = async () => {
    try {
      await logoutAPI();
    } catch (err) {
      console.error('Logout request failed', err);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('finance_token');
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, loginUser, logoutUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
