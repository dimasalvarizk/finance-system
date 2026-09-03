import React, { useState, useEffect } from 'react';
import { Check, Monitor, Smartphone } from 'lucide-react';
import { updatePassword } from '../../../services/settingService';
import { getActiveSessions, revokeActiveSession, getLoginAttempts } from '../../../services/authService';
import { useTranslation } from 'react-i18next';

interface SessionItem {
  id: string;
  device: string;
  ip: string;
  location: string;
  active: string;
  isCurrent: boolean;
}

const SecurityTab: React.FC = () => {
  const { t } = useTranslation();
  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confPassword, setConfPassword] = useState('');
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loginLogs, setLoginLogs] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchSecurityData = async () => {
    try {
      const activeSess = await getActiveSessions();
      setSessions(activeSess || []);
    } catch (err) {
      console.error('Failed to load active sessions:', err);
    }

    try {
      const attempts = await getLoginAttempts();
      setLoginLogs(attempts || []);
    } catch (err) {
      console.error('Failed to load login attempts:', err);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confPassword) {
      alert("New passwords do not match!");
      return;
    }
    try {
      await updatePassword({ currPassword, newPassword });
      setFeedback('Password updated successfully!');
      setCurrPassword('');
      setNewPassword('');
      setConfPassword('');
      setTimeout(() => setFeedback(null), 3000);
      // Log the password change update by reloading logs
      await fetchSecurityData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update password');
    }
  };

  const handleRevokeSession = async (id: string) => {
    try {
      await revokeActiveSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      setFeedback('Session revoked successfully!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to revoke session');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left w-full font-sans">
      
      {feedback && (
        <div className="flex items-center space-x-2 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-[12px] font-semibold font-sans">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* CARD 1: CHANGE PASSWORD */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm py-5 overflow-hidden flex flex-col">
        <div className="px-6 pb-4">
          <h3 className="text-[16px] font-bold text-[#0f172a] font-sans">{t('settings.security')}</h3>
        </div>
        
        {/* Divider */}
        <div className="h-px bg-[#e2e8f0] w-full" />

        <form onSubmit={handlePasswordUpdate} className="p-6 space-y-4">
          {/* Current Password */}
          <div className="space-y-1.5 text-left">
            <label className="block text-[13px] font-semibold text-[#475569]">{t('settings.currentPassword')}</label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={currPassword}
              onChange={(e) => setCurrPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13px] text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-sans"
            />
          </div>

          {/* New Password */}
          <div className="space-y-1.5 text-left">
            <label className="block text-[13px] font-semibold text-[#475569]">{t('settings.newPassword')}</label>
            <input
              type="password"
              required
              placeholder={t('settings.enterNewPassword')}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13px] text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-sans"
            />
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5 text-left">
            <label className="block text-[13px] font-semibold text-[#475569]">{t('settings.confirmPassword')}</label>
            <input
              type="password"
              required
              placeholder={t('settings.reenterNewPassword')}
              value={confPassword}
              onChange={(e) => setConfPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13px] text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-sans"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold text-[13px] rounded-xl shadow-sm transition-all cursor-pointer font-sans"
            >
              {t('settings.updatePassword')}
            </button>
          </div>
        </form>
      </div>

      {/* CARD 2: ACTIVE OPERATOR SESSIONS */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm py-5 overflow-hidden flex flex-col">
        <div className="px-6 pb-4">
          <h3 className="text-[16px] font-bold text-[#0f172a] font-sans">{t('settings.activeSessions')}</h3>
        </div>
        
        {/* Divider */}
        <div className="h-px bg-[#e2e8f0] w-full" />

        <div className="divide-y divide-[#e2e8f0]">
          {sessions.map(session => (
            <div key={session.id} className="p-6 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-xl bg-[#f1f5f9] text-[#475569] flex items-center justify-center border border-[#e2e8f0]">
                  {session.device.toLowerCase().includes('iphone') ? (
                    <Smartphone className="w-5 h-5" />
                  ) : (
                    <Monitor className="w-5 h-5" />
                  )}
                </div>
                <div className="flex flex-col text-left space-y-0.5">
                  <div className="flex items-center">
                    <span className="font-bold text-[#0c0d0f] text-[14px]">{session.device}</span>
                    {session.isCurrent && (
                      <span className="bg-[#ecfdf5] text-[#10b981] text-[10px] font-bold px-2 py-0.5 rounded-md ml-2 inline-block">
                        {t('settings.current')}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#64748b] font-medium">
                    {session.ip} • {session.location} • {session.active}
                  </span>
                </div>
              </div>
              
              {!session.isCurrent && (
                <button
                  type="button"
                  onClick={() => handleRevokeSession(session.id)}
                  className="px-3.5 py-1.5 bg-white border border-[#fee2e2] text-[#ef4444] hover:bg-[#fef2f2] font-bold text-[12px] rounded-lg transition-all cursor-pointer font-sans"
                >
                  {t('settings.revoke')}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CARD 3: LOGIN ACTIVITY LOGS */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm py-5 overflow-hidden flex flex-col">
        <div className="px-6 pb-4">
          <h3 className="text-[16px] font-bold text-[#0f172a] font-sans">{t('settings.loginActivityLogs')}</h3>
        </div>
        
        {/* Divider */}
        <div className="h-px bg-[#e2e8f0] w-full" />

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px] font-sans">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">{t('settings.timestamp')}</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">{t('settings.ipAddress')}</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">{t('settings.operatingAgent')}</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-center w-28">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {loginLogs.map((log, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3.5 text-[#64748b] font-medium">{log.timestamp}</td>
                  <td className="px-6 py-3.5 font-semibold text-[#0c0d0f]">{log.ip}</td>
                  <td className="px-6 py-3.5 text-[#64748b] font-medium">{log.agent}</td>
                  <td className="px-6 py-3.5 text-center">
                    <span className={`inline-block font-bold text-[10px] px-2.5 py-0.5 rounded-md ${
                      log.status === 'Success' ? 'bg-[#ecfdf5] text-[#10b981]' : 'bg-[#fef2f2] text-[#ef4444]'
                    }`}>
                      {log.status === 'Success' ? t('common.success') : log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default SecurityTab;
