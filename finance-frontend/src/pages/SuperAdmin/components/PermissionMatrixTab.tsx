import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { updateUserPermissions } from '../../../services/settingService';

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  employeeId?: string;
  role: string;
  branch: string;
  department?: string;
  jobTitle?: string;
  status?: string;
  lastActive?: string;
  permissions?: Record<string, boolean>;
}

interface PermissionMatrixTabProps {
  users: UserItem[];
  onRefresh: () => Promise<void>;
}

export const PermissionMatrixTab: React.FC<PermissionMatrixTabProps> = ({ users, onRefresh }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Local permissions state for fast optimistic feedback
  const [localPermissions, setLocalPermissions] = useState<Record<string, Record<string, boolean>>>(() => {
    const initial: Record<string, Record<string, boolean>> = {};
    users.forEach((u) => {
      initial[u.id] = { ...(u.permissions || {}) };
    });
    return initial;
  });

  const handleToggle = async (user: UserItem, permissionKey: string) => {
    const currentPerms = localPermissions[user.id] || { ...(user.permissions || {}) };
    const newStatus = !currentPerms[permissionKey];
    const updatedPerms = {
      ...currentPerms,
      [permissionKey]: newStatus
    };

    // Optimistic update
    setLocalPermissions((prev) => ({
      ...prev,
      [user.id]: updatedPerms
    }));

    try {
      setSavingUserId(user.id);
      setFeedback(null);
      await updateUserPermissions(user.id, updatedPerms);
      setFeedback({
        type: 'success',
        message: t('superAdmin.feedback.updatedPerm', {
          key: permissionKey,
          name: user.name,
          status: newStatus ? t('superAdmin.table.enabled') : t('superAdmin.table.disabled')
        })
      });
      // Silent refresh
      await onRefresh();
    } catch (err: any) {
      console.error('Failed to update permission:', err);
      // Revert optimistic update
      setLocalPermissions((prev) => ({
        ...prev,
        [user.id]: currentPerms
      }));
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message || t('superAdmin.feedback.updateFailed', { name: user.name })
      });
    } finally {
      setSavingUserId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.branch?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase());

    if (roleFilter === 'ALL') return matchesSearch;
    if (roleFilter === 'BYPASS') {
      const perms = localPermissions[u.id] || u.permissions || {};
      return matchesSearch && (perms.CAN_BYPASS_APPROVAL || u.role === 'Super Admin');
    }
    if (roleFilter === 'SUPER_ADMIN') {
      return matchesSearch && (u.role === 'Super Admin' || u.name.includes('Dimas') || u.name.includes('Ali'));
    }
    return matchesSearch && u.role === roleFilter;
  });

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Stats calculation
  const totalBypass = users.filter((u) => {
    const p = localPermissions[u.id] || u.permissions || {};
    return p.CAN_BYPASS_APPROVAL || u.role === 'Super Admin';
  }).length;

  const totalMembersMgr = users.filter((u) => {
    const p = localPermissions[u.id] || u.permissions || {};
    return p.CAN_ADD_MEMBERS || u.role === 'Super Admin';
  }).length;

  return (
    <div className="space-y-6 font-inter">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xl font-bold text-slate-900">{users.length}</div>
          <div className="text-[11px] font-medium text-slate-500 mt-0.5">{t('superAdmin.stats.totalUsers')}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xl font-bold text-amber-700">{totalBypass}</div>
          <div className="text-[11px] font-medium text-slate-500 mt-0.5">{t('superAdmin.stats.bypassApproved')}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xl font-bold text-emerald-700">{totalMembersMgr}</div>
          <div className="text-[11px] font-medium text-slate-500 mt-0.5">{t('superAdmin.stats.canAddMembers')}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xl font-bold text-purple-700">
            {users.filter((u) => u.role === 'Super Admin' || u.name.includes('Dimas') || u.name.includes('Ali')).length}
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-0.5">{t('superAdmin.stats.superAdmins')}</div>
        </div>
      </div>

      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl flex items-center space-x-2.5 text-xs font-semibold shadow-xs transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('superAdmin.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1d2857] focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            {t('superAdmin.filterLabel')}
          </span>
          {['ALL', 'BYPASS', 'SUPER_ADMIN', 'Accountant', 'Chief Accountant', 'Division Director'].map((f) => (
            <button
              key={f}
              onClick={() => setRoleFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                roleFilter === f
                  ? 'bg-[#1d2857] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f === 'ALL'
                ? t('superAdmin.filters.allUsers')
                : f === 'BYPASS'
                ? t('superAdmin.filters.bypassEnabled')
                : f === 'SUPER_ADMIN'
                ? t('superAdmin.filters.superAdmins')
                : f}
            </button>
          ))}
        </div>
      </div>

      {/* Permission Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                  {t('superAdmin.table.userRole')}
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                  {t('superAdmin.table.branchDept')}
                </th>
                <th className="px-6 py-3.5 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {t('superAdmin.table.bypassApproval')}
                </th>
                <th className="px-6 py-3.5 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {t('superAdmin.table.addMembers')}
                </th>
                <th className="px-6 py-3.5 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {t('superAdmin.table.manageLogs')}
                </th>
                <th className="px-6 py-3.5 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {t('superAdmin.table.viewReports')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs">
                    {t('superAdmin.table.noUsers')}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const perms = localPermissions[user.id] || user.permissions || {};
                  const isSuperAdminUser =
                    user.role === 'Super Admin' || user.name.includes('Dimas') || user.name.includes('Ali');
                  const isSaving = savingUserId === user.id;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* User Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isSuperAdminUser
                                ? 'bg-purple-700 text-white'
                                : 'bg-slate-800 text-white'
                            }`}
                          >
                            {getInitials(user.name)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-slate-900">{user.name}</span>
                              {isSuperAdminUser && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  {t('superAdmin.table.superAdminBadge')}
                                </span>
                              )}
                              {user.name.includes('Khalid') && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  {t('superAdmin.table.vipBadge')}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">{user.email}</div>
                            <div className="text-[10.5px] font-medium text-slate-400 mt-0.5">
                              {t('superAdmin.table.role')} <span className="text-slate-700 font-semibold">{user.role}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Branch Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-slate-700 font-medium">
                          {user.branch || t('superAdmin.table.globalOffice')}
                        </div>
                        {user.department && (
                          <div className="text-[11px] text-slate-400 mt-0.5">{user.department}</div>
                        )}
                      </td>

                      {/* CAN_BYPASS_APPROVAL Toggle */}
                      <td className="px-6 py-4 whitespace-nowrap text-center bg-amber-50/20">
                        <div className="flex flex-col items-center justify-center">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleToggle(user, 'CAN_BYPASS_APPROVAL')}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                              perms.CAN_BYPASS_APPROVAL || isSuperAdminUser ? 'bg-amber-500' : 'bg-slate-300'
                            } ${isSaving ? 'opacity-50 cursor-wait' : ''}`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                perms.CAN_BYPASS_APPROVAL || isSuperAdminUser ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className="text-[10px] font-bold mt-1 text-slate-600">
                            {perms.CAN_BYPASS_APPROVAL || isSuperAdminUser ? (
                              <span className="text-amber-700">{t('superAdmin.table.enabled')}</span>
                            ) : (
                              <span className="text-slate-400">{t('superAdmin.table.disabled')}</span>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* CAN_ADD_MEMBERS Toggle */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center justify-center">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleToggle(user, 'CAN_ADD_MEMBERS')}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                              perms.CAN_ADD_MEMBERS || isSuperAdminUser ? 'bg-emerald-500' : 'bg-slate-300'
                            } ${isSaving ? 'opacity-50 cursor-wait' : ''}`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                perms.CAN_ADD_MEMBERS || isSuperAdminUser ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className="text-[10px] font-bold mt-1 text-slate-600">
                            {perms.CAN_ADD_MEMBERS || isSuperAdminUser ? (
                              <span className="text-emerald-700">{t('superAdmin.table.enabled')}</span>
                            ) : (
                              <span className="text-slate-400">{t('superAdmin.table.disabled')}</span>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* CAN_EDIT_SYSTEM_LOGS Toggle */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center justify-center">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleToggle(user, 'CAN_EDIT_SYSTEM_LOGS')}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                              perms.CAN_EDIT_SYSTEM_LOGS || isSuperAdminUser ? 'bg-purple-600' : 'bg-slate-300'
                            } ${isSaving ? 'opacity-50 cursor-wait' : ''}`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                perms.CAN_EDIT_SYSTEM_LOGS || isSuperAdminUser ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className="text-[10px] font-bold mt-1 text-slate-600">
                            {perms.CAN_EDIT_SYSTEM_LOGS || isSuperAdminUser ? (
                              <span className="text-purple-700">{t('superAdmin.table.enabled')}</span>
                            ) : (
                              <span className="text-slate-400">{t('superAdmin.table.disabled')}</span>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* CAN_VIEW_ALL_REPORTS Toggle */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center justify-center">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleToggle(user, 'CAN_VIEW_ALL_REPORTS')}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              perms.CAN_VIEW_ALL_REPORTS || isSuperAdminUser ? 'bg-blue-600' : 'bg-slate-300'
                            } ${isSaving ? 'opacity-50 cursor-wait' : ''}`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                perms.CAN_VIEW_ALL_REPORTS || isSuperAdminUser ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className="text-[10px] font-bold mt-1 text-slate-600">
                            {perms.CAN_VIEW_ALL_REPORTS || isSuperAdminUser ? (
                              <span className="text-blue-700">{t('superAdmin.table.enabled')}</span>
                            ) : (
                              <span className="text-slate-400">{t('superAdmin.table.disabled')}</span>
                            )}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
