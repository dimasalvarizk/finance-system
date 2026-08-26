import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { getNotifSettings, updateNotifSettings } from '../../../services/settingService';

interface NotifItem {
  email: boolean;
  inApp: boolean;
}

interface NotifSettings {
  newInvoiceSubmitted: NotifItem;
  invoiceApproved: NotifItem;
  invoiceRejected: NotifItem;
  paymentReceived: NotifItem;

  approvalRequestAssigned: NotifItem;
  approvalCompleted: NotifItem;
  approvalOverdue: NotifItem;

  securityAlerts: NotifItem;
  teamMemberChanges: NotifItem;
  systemMaintenance: NotifItem;
}

const DEFAULT_SETTINGS: NotifSettings = {
  newInvoiceSubmitted: { email: true, inApp: true },
  invoiceApproved: { email: true, inApp: true },
  invoiceRejected: { email: true, inApp: true },
  paymentReceived: { email: false, inApp: true },

  approvalRequestAssigned: { email: true, inApp: true },
  approvalCompleted: { email: false, inApp: true },
  approvalOverdue: { email: true, inApp: true },

  securityAlerts: { email: true, inApp: true },
  teamMemberChanges: { email: true, inApp: false },
  systemMaintenance: { email: false, inApp: true },
};

const NotificationsTab: React.FC = () => {
  const [settings, setSettings] = useState<NotifSettings>(DEFAULT_SETTINGS);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotif = async () => {
      try {
        const data = await getNotifSettings();
        if (data) {
          setSettings(data);
        }
      } catch (err) {
        console.error('Failed to load notification settings:', err);
      }
    };
    fetchNotif();
  }, []);

  const toggleSetting = async (key: keyof NotifSettings, type: 'email' | 'inApp') => {
    const updated = {
      ...settings,
      [key]: {
        ...settings[key],
        [type]: !settings[key][type]
      }
    };
    setSettings(updated);
    try {
      await updateNotifSettings(updated);
      setFeedback('Notification settings updated!');
      setTimeout(() => setFeedback(null), 2500);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update notification settings');
    }
  };

  const ToggleSwitch: React.FC<{ isOn: boolean; onToggle: () => void }> = ({ isOn, onToggle }) => (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        isOn ? 'bg-[#f59e0b]' : 'bg-[#e2e8f0]'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          isOn ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );

  return (
    <div className="space-y-8 animate-fade-in text-left">
      {feedback && (
        <div className="flex items-center space-x-2 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-[12px] font-semibold font-sans">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* SECTION 1: INVOICE NOTIFICATIONS */}
      <div className="space-y-3">
        <h3 className="text-[18px] font-bold text-[#0c0d0f] font-sans pl-1">Confirmation Notifications</h3>
        <div className="bg-white rounded-t-none rounded-b-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px] font-sans">
              <thead>
                <tr className="bg-white border-b border-[#e2e8f0]">
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Alert Type</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-center w-28">Email</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-center w-28">In-App</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {[
                  { key: 'newInvoiceSubmitted' as const, title: 'New confirmation submitted', desc: 'Notify when a branch team submits a new confirmation.' },
                  { key: 'invoiceApproved' as const, title: 'Confirmation approved', desc: 'Notify when a confirmation has passed final review and is cleared.' },
                  { key: 'invoiceRejected' as const, title: 'Confirmation rejected', desc: 'Notify if a confirmation is rejected or returned for corrections.' },
                  { key: 'paymentReceived' as const, title: 'Payment received', desc: 'Receive confirmation when payment transitions succeed.' },
                ].map(item => (
                  <tr key={item.key} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3.5">
                      <div className="flex flex-col space-y-0.5">
                        <span className="font-bold text-[#0c0d0f]">{item.title}</span>
                        <span className="text-[11px] text-[#64748b] font-medium">{item.desc}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <ToggleSwitch isOn={settings[item.key].email} onToggle={() => toggleSetting(item.key, 'email')} />
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <ToggleSwitch isOn={settings[item.key].inApp} onToggle={() => toggleSetting(item.key, 'inApp')} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 2: APPROVAL NOTIFICATIONS */}
      <div className="space-y-3">
        <h3 className="text-[18px] font-bold text-[#0c0d0f] font-sans pl-1">Approval Notifications</h3>
        <div className="bg-white rounded-t-none rounded-b-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px] font-sans">
              <thead>
                <tr className="bg-white border-b border-[#e2e8f0]">
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Alert Type</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-center w-28">Email</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-center w-28">In-App</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {[
                  { key: 'approvalRequestAssigned' as const, title: 'Approval request assigned', desc: 'Receive alerts when a new queue item lands in your desk.' },
                  { key: 'approvalCompleted' as const, title: 'Approval completed', desc: 'Notification when downstream team processes your cleared queues.' },
                  { key: 'approvalOverdue' as const, title: 'Approval overdue', desc: 'Receive critical notification if action queue items cross due limits.' },
                ].map(item => (
                  <tr key={item.key} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3.5">
                      <div className="flex flex-col space-y-0.5">
                        <span className="font-bold text-[#0c0d0f]">{item.title}</span>
                        <span className="text-[11px] text-[#64748b] font-medium">{item.desc}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <ToggleSwitch isOn={settings[item.key].email} onToggle={() => toggleSetting(item.key, 'email')} />
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <ToggleSwitch isOn={settings[item.key].inApp} onToggle={() => toggleSetting(item.key, 'inApp')} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 3: SYSTEM NOTIFICATIONS */}
      <div className="space-y-3">
        <h3 className="text-[18px] font-bold text-[#0c0d0f] font-sans pl-1">System Notifications</h3>
        <div className="bg-white rounded-t-none rounded-b-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px] font-sans">
              <thead>
                <tr className="bg-white border-b border-[#e2e8f0]">
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Alert Type</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-center w-28">Email</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-center w-28">In-App</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {[
                  { key: 'securityAlerts' as const, title: 'Security alerts', desc: 'Get notified about login attempts from unknown IP locations.' },
                  { key: 'teamMemberChanges' as const, title: 'Team member changes', desc: 'Notify when super admins add or remove platform operators.' },
                  { key: 'systemMaintenance' as const, title: 'System maintenance', desc: 'Get alerts before scheduled system upgrades and offlines.' },
                ].map(item => (
                  <tr key={item.key} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3.5">
                      <div className="flex flex-col space-y-0.5">
                        <span className="font-bold text-[#0c0d0f]">{item.title}</span>
                        <span className="text-[11px] text-[#64748b] font-medium">{item.desc}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <ToggleSwitch isOn={settings[item.key].email} onToggle={() => toggleSetting(item.key, 'email')} />
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <ToggleSwitch isOn={settings[item.key].inApp} onToggle={() => toggleSetting(item.key, 'inApp')} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsTab;
