import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useMaintenance } from '../../../context/MaintenanceContext';
import { broadcastMaintenance } from '../../../services/settingService';
import { ShieldCheck, Radio } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BroadcastLogItem {
  id: string;
  scope: string;
  scheduleTime: string;
  message: string;
  urgency: 'Normal' | 'High';
  sentBy: string;
  sentAt: string;
}

export const SystemMaintenanceTab: React.FC = () => {
  const { user } = useAuth();
  const { locks, toggleLock } = useMaintenance();
  const { t } = useTranslation();

  // Broadcast System Maintenance States
  const [broadcastScope, setBroadcastScope] = useState<string>('All System');
  const [broadcastSchedule, setBroadcastSchedule] = useState<string>('');
  const [broadcastUrgency, setBroadcastUrgency] = useState<'Normal' | 'High'>('Normal');
  const [broadcastMessage, setBroadcastMessage] = useState<string>('');
  const [autoLockOnBroadcast, setAutoLockOnBroadcast] = useState<boolean>(false);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [recentBroadcasts, setRecentBroadcasts] = useState<BroadcastLogItem[]>([]);

  useEffect(() => {
    try {
      const savedBc = localStorage.getItem('odst_broadcast_history');
      if (savedBc) {
        setRecentBroadcasts(JSON.parse(savedBc));
      }
    } catch (e) {}
  }, []);

  const applyTemplate = (scope: string, urgency: 'Normal' | 'High', schedule: string, message: string) => {
    setBroadcastScope(scope);
    setBroadcastUrgency(urgency);
    setBroadcastSchedule(schedule);
    setBroadcastMessage(message);
    setBroadcastFeedback(null);
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      setBroadcastFeedback({ type: 'error', message: t('settings.messagePlaceholder') });
      return;
    }
    setIsBroadcasting(true);
    setBroadcastFeedback(null);
    setShowConfirmModal(false);

    try {
      const res = await broadcastMaintenance({
        scope: broadcastScope,
        scheduleTime: broadcastSchedule,
        message: broadcastMessage,
        urgency: broadcastUrgency
      });

      const newLog: BroadcastLogItem = {
        id: `bc_${Date.now()}`,
        scope: broadcastScope,
        scheduleTime: broadcastSchedule || 'Segera',
        message: broadcastMessage,
        urgency: broadcastUrgency,
        sentBy: user?.name || 'Administrator',
        sentAt: new Date().toISOString()
      };

      setRecentBroadcasts(prev => {
        const updated = [newLog, ...prev].slice(0, 20);
        try {
          localStorage.setItem('odst_broadcast_history', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      if (autoLockOnBroadcast) {
        try {
          if (broadcastScope === 'Dashboard') {
            await toggleLock('dashboard', { message: broadcastMessage, estimatedTime: broadcastSchedule });
          } else if (broadcastScope === 'Hotel Reservations') {
            await toggleLock('hotelReservations', { message: broadcastMessage, estimatedTime: broadcastSchedule });
          } else if (broadcastScope === 'Confirmations' || broadcastScope === 'Invoices') {
            await toggleLock('invoices', { message: broadcastMessage, estimatedTime: broadcastSchedule });
          } else if (broadcastScope === 'Requests' || broadcastScope === 'Approval Requests') {
            await toggleLock('requests', { message: broadcastMessage, estimatedTime: broadcastSchedule });
          } else if (broadcastScope === 'Companies') {
            await toggleLock('companies', { message: broadcastMessage, estimatedTime: broadcastSchedule });
          } else if (broadcastScope === 'My Expenses') {
            await toggleLock('myExpenses', { message: broadcastMessage, estimatedTime: broadcastSchedule });
          } else if (broadcastScope === 'Submit Expense') {
            await toggleLock('submitExpense', { message: broadcastMessage, estimatedTime: broadcastSchedule });
          } else if (broadcastScope === 'Approvals' || broadcastScope === 'Expense Approvals') {
            await toggleLock('approvals', { message: broadcastMessage, estimatedTime: broadcastSchedule });
          } else if (broadcastScope === 'Settings' || broadcastScope === 'Settings & DB') {
            await toggleLock('settings', { message: broadcastMessage, estimatedTime: broadcastSchedule });
          } else if (broadcastScope === 'All System') {
            await toggleLock('fullSystem', { message: broadcastMessage, estimatedTime: broadcastSchedule });
          }
        } catch (lockErr) {
          console.warn('Failed to auto-lock module:', lockErr);
        }
      }

      setBroadcastFeedback({
        type: 'success',
        message: autoLockOnBroadcast
          ? `${res?.message || t('settings.broadcastSuccess')} Modul terpilih juga telah berhasil dikunci untuk pemeliharaan.`
          : (res?.message || t('settings.broadcastSuccess'))
      });
      setBroadcastMessage('');
      setBroadcastSchedule('');
      setAutoLockOnBroadcast(false);
    } catch (err: any) {
      console.error('Failed to send broadcast:', err);
      setBroadcastFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Gagal mengirimkan siaran pemeliharaan sistem'
      });
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans select-none animate-fade-in w-full">
      {/* ========================================================================= */}
      {/* SAKLAR KUNCI PEMELIHARAAN MODUL (LIVE LOCK SWITCHES) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-sans flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              {t('settings.maintenanceLocksTitle')}
            </h3>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              {t('settings.maintenanceLocksDesc')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Bypass IT:</span>
            <span className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {t('settings.bypassActive')}
            </span>
          </div>
        </div>

        {/* 9 Sidebar Modules + 1 Full System Emergency Lock Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          
          {/* Card 1: Dashboard */}
          <div className={`p-4 rounded-xl border transition-all ${
            locks.dashboard 
              ? 'bg-rose-50/70 border-rose-300 shadow-sm' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900">{t('nav.dashboard')}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                locks.dashboard ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {locks.dashboard ? t('settings.statusLocked') : t('settings.statusActive')}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              {locks.dashboard ? t('settings.pageClosedForUsers') : t('settings.pageNormalForUsers')}
            </p>
            <button
              type="button"
              onClick={() => toggleLock('dashboard', { message: broadcastMessage || locks.message, estimatedTime: broadcastSchedule || locks.estimatedTime })}
              className={`w-full py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                locks.dashboard
                  ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {locks.dashboard ? t('settings.unlockModuleBtn') : t('settings.lockModuleBtn')}
            </button>
          </div>

          {/* Card 2: Confirmations (Invoices) */}
          <div className={`p-4 rounded-xl border transition-all ${
            locks.invoices 
              ? 'bg-rose-50/70 border-rose-300 shadow-sm' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900">{t('nav.confirmations')}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                locks.invoices ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {locks.invoices ? t('settings.statusLocked') : t('settings.statusActive')}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              {locks.invoices ? t('settings.pageClosedForUsers') : t('settings.pageNormalForUsers')}
            </p>
            <button
              type="button"
              onClick={() => toggleLock('invoices', { message: broadcastMessage || locks.message, estimatedTime: broadcastSchedule || locks.estimatedTime })}
              className={`w-full py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                locks.invoices
                  ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {locks.invoices ? t('settings.unlockModuleBtn') : t('settings.lockModuleBtn')}
            </button>
          </div>

          {/* Card 3: Requests */}
          <div className={`p-4 rounded-xl border transition-all ${
            locks.requests 
              ? 'bg-rose-50/70 border-rose-300 shadow-sm' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900">{t('nav.requests')}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                locks.requests ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {locks.requests ? t('settings.statusLocked') : t('settings.statusActive')}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              {locks.requests ? t('settings.pageClosedForUsers') : t('settings.pageNormalForUsers')}
            </p>
            <button
              type="button"
              onClick={() => toggleLock('requests', { message: broadcastMessage || locks.message, estimatedTime: broadcastSchedule || locks.estimatedTime })}
              className={`w-full py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                locks.requests
                  ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {locks.requests ? t('settings.unlockModuleBtn') : t('settings.lockModuleBtn')}
            </button>
          </div>

          {/* Card 4: Companies */}
          <div className={`p-4 rounded-xl border transition-all ${
            locks.companies 
              ? 'bg-rose-50/70 border-rose-300 shadow-sm' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900">{t('nav.companies')}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                locks.companies ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {locks.companies ? t('settings.statusLocked') : t('settings.statusActive')}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              {locks.companies ? t('settings.pageClosedForUsers') : t('settings.pageNormalForUsers')}
            </p>
            <button
              type="button"
              onClick={() => toggleLock('companies', { message: broadcastMessage || locks.message, estimatedTime: broadcastSchedule || locks.estimatedTime })}
              className={`w-full py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                locks.companies
                  ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {locks.companies ? t('settings.unlockModuleBtn') : t('settings.lockModuleBtn')}
            </button>
          </div>

          {/* Card 5: Hotel Reservations */}
          <div className={`p-4 rounded-xl border transition-all ${
            locks.hotelReservations 
              ? 'bg-rose-50/70 border-rose-300 shadow-sm' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900">{t('nav.hotelReservations')}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                locks.hotelReservations ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {locks.hotelReservations ? t('settings.statusLocked') : t('settings.statusActive')}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              {locks.hotelReservations ? t('settings.pageClosedForUsers') : t('settings.pageNormalForUsers')}
            </p>
            <button
              type="button"
              onClick={() => toggleLock('hotelReservations', { message: broadcastMessage || locks.message, estimatedTime: broadcastSchedule || locks.estimatedTime })}
              className={`w-full py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                locks.hotelReservations
                  ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {locks.hotelReservations ? t('settings.unlockModuleBtn') : t('settings.lockModuleBtn')}
            </button>
          </div>

          {/* Card 6: My Expenses (Internal) */}
          <div className={`p-4 rounded-xl border transition-all ${
            locks.myExpenses 
              ? 'bg-rose-50/70 border-rose-300 shadow-sm' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900">{t('nav.myExpenses')}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                locks.myExpenses ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {locks.myExpenses ? t('settings.statusLocked') : t('settings.statusActive')}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              {locks.myExpenses ? t('settings.pageClosedForUsers') : t('settings.pageNormalForUsers')}
            </p>
            <button
              type="button"
              onClick={() => toggleLock('myExpenses', { message: broadcastMessage || locks.message, estimatedTime: broadcastSchedule || locks.estimatedTime })}
              className={`w-full py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                locks.myExpenses
                  ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {locks.myExpenses ? t('settings.unlockModuleBtn') : t('settings.lockModuleBtn')}
            </button>
          </div>

          {/* Card 7: Submit Expense (Internal) */}
          <div className={`p-4 rounded-xl border transition-all ${
            locks.submitExpense 
              ? 'bg-rose-50/70 border-rose-300 shadow-sm' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900">{t('nav.submitExpense')}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                locks.submitExpense ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {locks.submitExpense ? t('settings.statusLocked') : t('settings.statusActive')}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              {locks.submitExpense ? t('settings.pageClosedForUsers') : t('settings.pageNormalForUsers')}
            </p>
            <button
              type="button"
              onClick={() => toggleLock('submitExpense', { message: broadcastMessage || locks.message, estimatedTime: broadcastSchedule || locks.estimatedTime })}
              className={`w-full py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                locks.submitExpense
                  ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {locks.submitExpense ? t('settings.unlockModuleBtn') : t('settings.lockModuleBtn')}
            </button>
          </div>

          {/* Card 8: Approvals (Internal) */}
          <div className={`p-4 rounded-xl border transition-all ${
            locks.approvals 
              ? 'bg-rose-50/70 border-rose-300 shadow-sm' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900">{t('nav.approvals')}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                locks.approvals ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {locks.approvals ? t('settings.statusLocked') : t('settings.statusActive')}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              {locks.approvals ? t('settings.pageClosedForUsers') : t('settings.pageNormalForUsers')}
            </p>
            <button
              type="button"
              onClick={() => toggleLock('approvals', { message: broadcastMessage || locks.message, estimatedTime: broadcastSchedule || locks.estimatedTime })}
              className={`w-full py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                locks.approvals
                  ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {locks.approvals ? t('settings.unlockModuleBtn') : t('settings.lockModuleBtn')}
            </button>
          </div>

          {/* Card 9: Settings */}
          <div className={`p-4 rounded-xl border transition-all ${
            locks.settings 
              ? 'bg-rose-50/70 border-rose-300 shadow-sm' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900">{t('nav.settings')}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                locks.settings ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {locks.settings ? t('settings.statusLocked') : t('settings.statusActive')}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              {locks.settings ? t('settings.pageClosedForUsers') : t('settings.pageNormalForUsers')}
            </p>
            <button
              type="button"
              onClick={() => toggleLock('settings', { message: broadcastMessage || locks.message, estimatedTime: broadcastSchedule || locks.estimatedTime })}
              className={`w-full py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                locks.settings
                  ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {locks.settings ? t('settings.unlockModuleBtn') : t('settings.lockModuleBtn')}
            </button>
          </div>

          {/* Card 10: Full System Lock */}
          <div className={`p-4 rounded-xl border transition-all ${
            locks.fullSystem 
              ? 'bg-rose-100 border-rose-400 shadow-sm' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900">{t('settings.scopeAll')}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                locks.fullSystem ? 'bg-rose-600 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {locks.fullSystem ? t('settings.statusEmergencyLocked') : t('settings.statusActive')}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              {locks.fullSystem ? t('settings.systemClosedForUsers') : t('settings.systemNormalForUsers')}
            </p>
            <button
              type="button"
              onClick={() => toggleLock('fullSystem', { message: broadcastMessage || locks.message, estimatedTime: broadcastSchedule || locks.estimatedTime })}
              className={`w-full py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                locks.fullSystem
                  ? 'bg-rose-700 hover:bg-rose-800 text-white border-rose-700'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {locks.fullSystem ? t('settings.unlockSystemBtn') : t('settings.lockSystemBtn')}
            </button>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* SYSTEM MAINTENANCE BROADCAST (Dimas Alva Rizki & Ali Restricted) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-bold text-slate-900 font-sans">
                {t('settings.maintenanceBroadcastTitle')}
              </h3>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                IT Control
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              {t('settings.maintenanceBroadcastDesc')}
            </p>
          </div>

          <div className="text-xs text-slate-600 font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 self-start sm:self-auto">
            Otorisasi: <strong className="text-slate-800">Dimas & Ali</strong>
          </div>
        </div>

        {/* Feedback Alert */}
        {broadcastFeedback && (
          <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between animate-fade-in ${
            broadcastFeedback.type === 'success' 
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}>
            <span>{broadcastFeedback.message}</span>
            <button 
              onClick={() => setBroadcastFeedback(null)} 
              className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer font-bold text-xs ml-3"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Form & Live Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Quick Template Chips */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                {t('settings.quickTemplates')}
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyTemplate(
                    'All System',
                    'High',
                    'Malam ini pukul 23:30 - 00:00 WIB',
                    'Akan dilakukan upgrade infrastruktur server dan pembaruan core engine. Sistem tidak dapat diakses sementara selama 30 menit. Mohon simpan semua data Anda.'
                  )}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer"
                >
                  {t('settings.tplServerUpgrade')}
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate(
                    'Hotel Reservations',
                    'Normal',
                    'Besok pukul 06:00 - 06:30 WIB',
                    'Pembaruan modul alokasi kamar dan validasi voucher. Modul lain tetap beroperasi normal.'
                  )}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer"
                >
                  {t('settings.tplHotelModule')}
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate(
                    'Approvals',
                    'Normal',
                    'Besok pukul 22:00 - 22:30 WIB',
                    'Pembaruan modul alur pengajuan & persetujuan klaim pengeluaran internal (Internal Expenses & Approvals).'
                  )}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer"
                >
                  Internal Reimbursement & Approvals
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate(
                    'All System',
                    'Normal',
                    'Hari Minggu pukul 01:00 - 02:00 WIB',
                    'Optimalisasi database cloud dan reindeks data keuangan tahunan untuk meningkatkan kecepatan loading laporan.'
                  )}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer"
                >
                  {t('settings.tplDatabaseSync')}
                </button>
              </div>
            </div>

            {/* Scope Selection */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
                {t('settings.scopeLabel')}
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'All System', label: 'Seluruh Sistem' },
                  { id: 'Dashboard', label: 'Dashboard' },
                  { id: 'Confirmations', label: 'Confirmations' },
                  { id: 'Requests', label: 'Requests' },
                  { id: 'Companies', label: 'Companies' },
                  { id: 'Hotel Reservations', label: 'Hotel Reservations' },
                  { id: 'My Expenses', label: 'My Expenses' },
                  { id: 'Submit Expense', label: 'Submit Expense' },
                  { id: 'Approvals', label: 'Approvals' },
                  { id: 'Settings', label: 'Settings' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setBroadcastScope(s.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                      broadcastScope === s.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule & Urgency in 2 Cols */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  {t('settings.scheduleTimeLabel')}
                </label>
                <input
                  type="text"
                  value={broadcastSchedule}
                  onChange={(e) => setBroadcastSchedule(e.target.value)}
                  placeholder={t('settings.scheduleTimePlaceholder')}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-all font-sans"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  {t('settings.urgencyLabel')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBroadcastUrgency('Normal')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      broadcastUrgency === 'Normal'
                        ? 'bg-slate-100 border-slate-300 text-slate-800 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setBroadcastUrgency('High')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      broadcastUrgency === 'High'
                        ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    High (Downtime)
                  </button>
                </div>
              </div>
            </div>

            {/* Broadcast Message Input */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                {t('settings.messageLabel')} <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder={t('settings.messagePlaceholder')}
                className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-all resize-none font-sans"
              />
            </div>

            {/* Auto-Lock Checkbox */}
            <div className="flex items-center space-x-2 pt-1">
              <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoLockOnBroadcast}
                  onChange={(e) => setAutoLockOnBroadcast(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <span>{t('settings.autoLockOnBroadcast')}</span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!broadcastMessage.trim()) {
                    setBroadcastFeedback({ type: 'error', message: t('settings.messagePlaceholder') });
                    return;
                  }
                  setShowConfirmModal(true);
                }}
                disabled={isBroadcasting || !broadcastMessage.trim()}
                className="px-6 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer border-none disabled:opacity-50"
              >
                {isBroadcasting ? t('settings.sendingBroadcast') : t('settings.sendBroadcastBtn')}
              </button>
            </div>

          </div>

          {/* Right Column: Live User Preview Box (5 cols) */}
          <div className="lg:col-span-5 bg-slate-50/70 rounded-xl p-4 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-3">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  {t('settings.livePreview')}
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  IN-APP & EMAIL
                </span>
              </div>

              {/* Notification Card Mockup */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2.5 text-xs font-sans">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900">
                      [Sistem] Pemeliharaan Terjadwal
                    </span>
                    {broadcastUrgency === 'High' && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800">
                        URGENT
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">Baru saja</span>
                </div>

                <p className="text-slate-600 leading-relaxed text-[11px]">
                  {broadcastMessage || 'Pesan siaran pemeliharaan akan ditampilkan di sini kepada seluruh pengguna sistem...'}
                </p>

                {broadcastSchedule && (
                  <div className="text-[11px] font-semibold text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    🕒 Estimasi Waktu: {broadcastSchedule}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between items-center">
                  <span>Pengirim: <strong>{user?.name || 'Dimas Alva Rizki'}</strong></span>
                  <span>Target: <strong>{broadcastScope === 'All System' ? 'Semua Pengguna' : broadcastScope}</strong></span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-amber-50/50 rounded-xl border border-amber-200/60 text-[11px] text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <span>Saluran Pengiriman:</span>
              </div>
              <p className="text-slate-600 text-[10.5px]">
                1. <strong>Lonceng Header:</strong> Badge merah dan pesan notifikasi di semua halaman.<br />
                2. <strong>Email:</strong> Dikirim otomatis ke alamat email seluruh pengguna aktif.
              </p>
            </div>
          </div>
        </div>

        {/* Broadcast History Table */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Riwayat Pengiriman Siaran Sistem
          </h4>
          
          {recentBroadcasts.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 font-medium bg-slate-50 rounded-xl border border-slate-200">
              Belum ada siaran pemeliharaan yang dikirimkan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-sans">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                    <th className="px-3.5 py-2.5">Waktu Kirim</th>
                    <th className="px-3.5 py-2.5">Cakupan</th>
                    <th className="px-3.5 py-2.5">Jadwal</th>
                    <th className="px-3.5 py-2.5">Pesan</th>
                    <th className="px-3.5 py-2.5">Urgensi</th>
                    <th className="px-3.5 py-2.5">Pengirim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentBroadcasts.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3.5 py-2.5 font-semibold text-slate-700 whitespace-nowrap">
                        {new Date(b.sentAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {b.scope}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-600 font-medium whitespace-nowrap">
                        {b.scheduleTime || '-'}
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-600 max-w-xs truncate" title={b.message}>
                        {b.message}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.urgency === 'High' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {b.urgency}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-600 font-medium whitespace-nowrap">
                        {b.sentBy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-[#0c0d0f]/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-in transform-gpu">
            <div className="text-left space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                {t('settings.confirmBroadcastTitle')}
              </h3>
              <p className="text-xs text-slate-500 font-normal leading-relaxed font-sans">
                {t('settings.confirmBroadcastMsg')}
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5 font-sans">
              <div><strong className="text-slate-500">Cakupan:</strong> {broadcastScope}</div>
              {broadcastSchedule && <div><strong className="text-slate-500">Jadwal:</strong> {broadcastSchedule}</div>}
              <div><strong className="text-slate-500">Tingkat Urgensi:</strong> {broadcastUrgency}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer border-none"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSendBroadcast}
                disabled={isBroadcasting}
                className="py-2.5 px-4 bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer border-none"
              >
                {isBroadcasting ? t('settings.sendingBroadcast') : t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemMaintenanceTab;
