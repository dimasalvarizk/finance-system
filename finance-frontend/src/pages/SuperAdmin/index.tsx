import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldAlert,
  RefreshCw
} from 'lucide-react';
import { getTeamMembers } from '../../services/settingService';
import { PermissionMatrixTab } from './components/PermissionMatrixTab';
import { AuditLogsTab } from './components/AuditLogsTab';

const SuperAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'permissions' | 'audit_logs'>('permissions');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Exclusively for Dimas & Ali only
  const isSuperAdmin = Boolean(
    user && (
      user.name?.toLowerCase().includes('dimas') ||
      user.name?.toLowerCase().includes('ali') ||
      user.email?.toLowerCase().includes('dimas') ||
      user.email?.toLowerCase().includes('ali')
    )
  );

  const fetchUsers = async () => {
    try {
      const data = await getTeamMembers();
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to load team members:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchUsers();
    }
  }, [isSuperAdmin]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-screen w-full bg-[#f4f6fa] select-none font-inter">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <Header />
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="bg-white p-10 rounded-2xl border border-red-200 shadow-xl max-w-md w-full text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-inner">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {t('superAdmin.restrictedTitle')}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                {t('superAdmin.restrictedDesc')}
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full py-2.5 bg-[#1d2857] hover:bg-[#2b3a7a] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                {t('superAdmin.returnToDashboard')}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-[#f4f6fa] select-none font-inter">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <div className="flex-1 p-8 space-y-8 max-w-[1440px] w-full mx-auto">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-md">
                  {t('superAdmin.badge')}
                </span>
                <span className="text-[11px] font-semibold text-slate-400">/</span>
                <span className="text-[11px] font-semibold text-slate-500">Dimas & Ali</span>
              </div>
              <h1 className="text-[26px] font-bold text-[#0c0d0f] tracking-tight">
                {t('superAdmin.title')}
              </h1>
              <p className="text-[13px] text-[#64748b] font-medium">
                {t('superAdmin.subtitle')}
              </p>
            </div>

            {/* Quick Action */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{t('superAdmin.refreshData')}</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-2 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('permissions')}
              className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'permissions'
                  ? 'border-[#1d2857] text-[#1d2857]'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              {t('superAdmin.tabs.permissionMatrix')} ({users.length} {t('superAdmin.tabs.users')})
            </button>
            <button
              onClick={() => setActiveTab('audit_logs')}
              className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'audit_logs'
                  ? 'border-[#1d2857] text-[#1d2857]'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              {t('superAdmin.tabs.auditLogs')}
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'permissions' ? (
            loading ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-[#1d2857] border-t-transparent rounded-full animate-spin" />
                  <span>{t('common.loading')}</span>
                </div>
              </div>
            ) : (
              <PermissionMatrixTab users={users} onRefresh={fetchUsers} />
            )
          ) : (
            <AuditLogsTab />
          )}
        </div>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
