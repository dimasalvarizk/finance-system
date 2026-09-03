import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { getNotifSettings, updateNotifSettings } from '../../../services/settingService';
import { useTranslation } from 'react-i18next';

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

interface ToggleSwitchProps {
  isOn: boolean;
  onToggle: () => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ isOn, onToggle }) => (
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

const NotificationsTab: React.FC = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<NotifSettings>(DEFAULT_SETTINGS);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotif = async () => {
      try {
        const data = await getNotifSettings();
        if (data) {
          setSettings((prev) => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.error('Failed to load notification settings:', err);
      }
    };
    fetchNotif();
  }, []);

  const toggleSetting = async (key: keyof NotifSettings, type: 'email' | 'inApp') => {
    const currentItem = settings[key] || { email: false, inApp: false };
    const updated = {
      ...settings,
      [key]: {
        ...currentItem,
        [type]: !currentItem[type]
      }
    };
    setSettings(updated);
    try {
      await updateNotifSettings(updated);
      setFeedback('Notification settings updated!');
      setTimeout(() => setFeedback(null), 2500);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update notification settings');
    }
  };

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
        <h3 className="text-[18px] font-bold text-[#0c0d0f] font-sans pl-1">{t('settings.confirmationNotifications')}</h3>
        <div className="bg-white rounded-t-none rounded-b-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px] font-sans">
              <thead>
                <tr className="bg-white border-b border-[#e2e8f0]">
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">{t('settings.alertType')}</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-center w-28">{t('settings.emailChannel')}</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-center w-28">{t('settings.inAppChannel')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {[
                  { key: 'newInvoiceSubmitted' as const, title: t('settings.notifNewInvoiceTitle'), desc: t('settings.notifNewInvoiceDesc') },
                  { key: 'invoiceApproved' as const, title: t('settings.notifApprovedTitle'), desc: t('settings.notifApprovedDesc') },
                  { key: 'invoiceRejected' as const, title: t('settings.notifRejectedTitle'), desc: t('settings.notifRejectedDesc') },
                  { key: 'paymentReceived' as const, title: t('settings.notifPaymentTitle'), desc: t('settings.notifPaymentDesc') },
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
        <h3 className="text-[18px] font-bold text-[#0c0d0f] font-sans pl-1">{t('settings.approvalNotifications')}</h3>
        <div className="bg-white rounded-t-none rounded-b-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px] font-sans">
              <thead>
                <tr className="bg-white border-b border-[#e2e8f0]">
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">{t('settings.alertType')}</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-center w-28">{t('settings.emailChannel')}</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-center w-28">{t('settings.inAppChannel')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {[
                  { key: 'approvalRequestAssigned' as const, title: t('settings.notifAssignedTitle'), desc: t('settings.notifAssignedDesc') },
                  { key: 'approvalCompleted' as const, title: t('settings.notifApprovalDoneTitle'), desc: t('settings.notifApprovalDoneDesc') },
                  { key: 'approvalOverdue' as const, title: t('settings.notifApprovalOverdueTitle'), desc: t('settings.notifApprovalOverdueDesc') },
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
        <h3 className="text-[18px] font-bold text-[#0c0d0f] font-sans pl-1">{t('settings.systemNotifications')}</h3>
        <div className="bg-white rounded-t-none rounded-b-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px] font-sans">
              <thead>
                <tr className="bg-white border-b border-[#e2e8f0]">
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">{t('settings.alertType')}</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-center w-28">{t('settings.emailChannel')}</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-center w-28">{t('settings.inAppChannel')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {[
                  { key: 'securityAlerts' as const, title: t('settings.notifSecurityTitle'), desc: t('settings.notifSecurityDesc') },
                  { key: 'teamMemberChanges' as const, title: t('settings.notifTeamChangesTitle'), desc: t('settings.notifTeamChangesDesc') },
                  { key: 'systemMaintenance' as const, title: t('settings.notifMaintenanceTitle'), desc: t('settings.notifMaintenanceDesc') },
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
