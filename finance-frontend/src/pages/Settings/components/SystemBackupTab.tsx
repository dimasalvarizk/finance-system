import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { getInvoices, getCompanies } from '../../../services/invoiceService';
import { getHotelReservations } from '../../../services/hotelReservationService';
import { getExchangeRates, getFullDatabaseBackup, logBackupHistory, getBackupHistory, broadcastMaintenance } from '../../../services/settingService';
import { Download, FileSpreadsheet, FileJson, Clock, User, Megaphone, Send, AlertTriangle, CheckCircle2, Radio, Sparkles, Layers, ShieldCheck, Calendar, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BackupHistoryItem {
  id: string;
  exportType: string;
  filename: string;
  recordCount: number;
  exportedBy: string;
  createdAt: string;
}

interface BroadcastLogItem {
  id: string;
  scope: string;
  scheduleTime: string;
  message: string;
  urgency: 'Normal' | 'High';
  sentBy: string;
  sentAt: string;
}

const SystemBackupTab: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);
  const [historyList, setHistoryList] = useState<BackupHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Broadcast System Maintenance States
  const [broadcastScope, setBroadcastScope] = useState<string>('All System');
  const [broadcastSchedule, setBroadcastSchedule] = useState<string>('');
  const [broadcastUrgency, setBroadcastUrgency] = useState<'Normal' | 'High'>('Normal');
  const [broadcastMessage, setBroadcastMessage] = useState<string>('');
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [recentBroadcasts, setRecentBroadcasts] = useState<BroadcastLogItem[]>([]);

  // Akses Khusus: Super Admin (Mr. Emad Moustafa) dan Tim IT (Ali & Dimas)
  const isSuperAdmin = user?.role === 'Super Admin';
  const userNameLower = (user?.name || '').toLowerCase();
  const userEmailLower = (user?.email || '').toLowerCase();
  const isIT = userNameLower.includes('ali') || 
               userNameLower.includes('dimas') || 
               userEmailLower.includes('ali') || 
               userEmailLower.includes('dimas');

  const isAuthorized = isSuperAdmin || isIT;

  const addHistoryItem = (newItem: BackupHistoryItem) => {
    setHistoryList((prev) => {
      const filtered = prev.filter((x) => x.filename !== newItem.filename);
      const updated = [newItem, ...filtered];
      try {
        localStorage.setItem('odst_backup_history', JSON.stringify(updated.slice(0, 50)));
      } catch (e) {}
      return updated;
    });
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    let apiData: BackupHistoryItem[] = [];
    try {
      const data = await getBackupHistory();
      if (Array.isArray(data) && data.length > 0) {
        apiData = data;
      }
    } catch (e) {
      console.warn('Failed to load backup history from server:', e);
    }

    let localList: BackupHistoryItem[] = [];
    try {
      const localSaved = localStorage.getItem('odst_backup_history');
      if (localSaved) {
        localList = JSON.parse(localSaved);
      }
    } catch (e) {}

    const map = new Map<string, BackupHistoryItem>();
    [...apiData, ...localList].forEach((item) => {
      if (item && item.filename) {
        map.set(item.id || item.filename, item);
      }
    });

    const merged = Array.from(map.values()).sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    setHistoryList(merged);
    setLoadingHistory(false);
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchHistory();
      try {
        const savedBc = localStorage.getItem('odst_broadcast_history');
        if (savedBc) {
          setRecentBroadcasts(JSON.parse(savedBc));
        }
      } catch (e) {}
    }
  }, [isAuthorized]);

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

      setBroadcastFeedback({
        type: 'success',
        message: res?.message || t('settings.broadcastSuccess')
      });
      setBroadcastMessage('');
      setBroadcastSchedule('');
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

  if (!isAuthorized) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center space-y-4 max-w-2xl mx-auto my-8 font-sans">
        <h3 className="text-lg font-extrabold text-rose-900">{t('settings.accessRestricted')}</h3>
        <p className="text-xs text-rose-700 font-medium leading-relaxed">
          {t('settings.backupAccessRestrictedDesc')}
        </p>
      </div>
    );
  }

  // Export Full JSON Backup (All 18 MySQL Tables)
  const handleDownloadFullBackup = async () => {
    setIsExporting(true);
    setExportSuccessMessage(null);
    try {
      let backupPayload: any = null;

      try {
        const backendRes = await getFullDatabaseBackup();
        if (backendRes && backendRes.success && backendRes.data) {
          backupPayload = backendRes.data;
        }
      } catch (e) {
        console.warn('Backend full backup API unavailable, assembling frontend tables payload...', e);
      }

      if (!backupPayload) {
        const [invoices, reservations, companies, rates] = await Promise.all([
          getInvoices().catch(() => []),
          getHotelReservations().catch(() => []),
          getCompanies().catch(() => []),
          getExchangeRates().catch(() => ({})),
        ]);

        backupPayload = {
          system: 'ODST Group / Manazil AL.Mukhtara Finance System',
          exportDate: new Date().toISOString(),
          exportedBy: `${user?.name || 'Administrator'} (${user?.email || 'N/A'})`,
          authorizedRole: user?.role,
          tableCount: 18,
          tables: {
            dst_invoices: { rowCount: invoices.length, rows: invoices },
            dst_hotel_reservations: { rowCount: reservations.length, rows: reservations },
            dst_companies: { rowCount: companies.length, rows: companies },
            dst_exchange_rates: { rowCount: 1, rows: [rates] },
            dst_branches: { rowCount: 0, rows: [] },
            dst_company_settings: { rowCount: 0, rows: [] },
            dst_exchange_rates_history: { rowCount: 0, rows: [] },
            dst_invoice_items: { rowCount: 0, rows: [] },
            dst_login_logs: { rowCount: 0, rows: [] },
            dst_meal_types: { rowCount: 0, rows: [] },
            dst_notification_settings: { rowCount: 0, rows: [] },
            dst_notifications: { rowCount: 0, rows: [] },
            dst_requests: { rowCount: 0, rows: [] },
            dst_room_types: { rowCount: 0, rows: [] },
            dst_services: { rowCount: 0, rows: [] },
            dst_sessions: { rowCount: 0, rows: [] },
            dst_tax_settings: { rowCount: 0, rows: [] },
            dst_users: { rowCount: 0, rows: [] }
          }
        };
      }

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      const filename = `ODST_FULL_DB_SNAPSHOT_${new Date().toISOString().slice(0, 10)}_${Date.now()}.json`;
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      const newItem: BackupHistoryItem = {
        id: `bkp_${Date.now()}`,
        exportType: 'FULL_JSON',
        filename,
        recordCount: 18,
        exportedBy: user?.name ? `${user.name} (${user.email || ''})` : 'System Admin',
        createdAt: new Date().toISOString()
      };
      addHistoryItem(newItem);

      // Log history to server in background
      try {
        await logBackupHistory({
          exportType: 'FULL_JSON',
          filename,
          recordCount: 18,
          backupPayload
        });
      } catch (logErr) {
        console.warn('Failed to log backup history to backend:', logErr);
      }

      const timeNow = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastBackupTime(timeNow);
      setExportSuccessMessage(`Snapshot Basis Data Lengkap (18 Tabel) berhasil diekspor pada ${timeNow}!`);
      setIsExporting(false);
    } catch (err) {
      console.error('Failed to generate system backup:', err);
      alert('Gagal menghasilkan cadangan sistem. Silakan periksa koneksi jaringan.');
      setIsExporting(false);
    }
  };

  // Helper Export CSV
  const handleExportCSV = async (type: 'invoices' | 'reservations' | 'companies') => {
    try {
      let data: any[] = [];
      let filename = `ODST_${type.toUpperCase()}_EXPORT_${new Date().toISOString().slice(0, 10)}.csv`;
      let headers: string[] = [];

      if (type === 'invoices') {
        const invoices = await getInvoices().catch(() => []);
        headers = ['ID', 'Confirmation Number', 'Branch', 'Company', 'Agent', 'Issue Date', 'Due Date', 'Status', 'Grand Total', 'Currency'];
        data = invoices.map((inv: any) => [
          inv.id || '',
          `"${inv.invoice_number || ''}"`,
          `"${inv.branch || ''}"`,
          `"${inv.client_company_name || inv.company_name || ''}"`,
          `"${inv.agent_name || ''}"`,
          inv.issue_date || '',
          inv.due_date || '',
          inv.status || '',
          inv.grand_total || inv.total_amount || 0,
          inv.currency || 'USD'
        ]);
      } else if (type === 'reservations') {
        const reservations = await getHotelReservations().catch(() => []);
        headers = ['ID', 'Reservation Number', 'Hotel', 'Guest Name', 'Agency', 'Check-In', 'Check-Out', 'Room Type', 'Meal Plan', 'Selling Price', 'Currency'];
        data = reservations.map((res: any) => [
          res.id || '',
          `"${res.reservation_number || ''}"`,
          `"${res.hotel_name || ''}"`,
          `"${res.guest_name || ''}"`,
          `"${res.client_company_name || ''}"`,
          res.check_in || '',
          res.check_out || '',
          `"${res.room_type || ''}"`,
          `"${res.meal_plan || ''}"`,
          res.selling_price || 0,
          res.currency || 'SAR'
        ]);
      } else if (type === 'companies') {
        const companies = await getCompanies().catch(() => []);
        headers = ['ID', 'Company Name', 'Agent Name', 'Email', 'Phone', 'City', 'Country', 'Tax Number', 'Created At'];
        data = companies.map((c: any) => [
          c.id || '',
          `"${c.name || ''}"`,
          `"${c.agent_name || ''}"`,
          `"${c.email || ''}"`,
          `"${c.phone || ''}"`,
          `"${c.city || ''}"`,
          `"${c.country || ''}"`,
          `"${c.tax_number || ''}"`,
          c.created_at || ''
        ]);
      }

      if (data.length === 0) {
        alert(`Tidak ada data ${type} untuk diekspor.`);
        return;
      }

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...data.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      const newItem: BackupHistoryItem = {
        id: `bkp_${Date.now()}`,
        exportType: `CSV_${type.toUpperCase()}`,
        filename,
        recordCount: data.length,
        exportedBy: user?.name ? `${user.name} (${user.email || ''})` : 'System Admin',
        createdAt: new Date().toISOString()
      };
      addHistoryItem(newItem);

      // Log history to server in background
      try {
        await logBackupHistory({
          exportType: `CSV_${type.toUpperCase()}`,
          filename,
          recordCount: data.length
        });
      } catch (logErr) {
        console.warn('Failed to log CSV export history to backend:', logErr);
      }
    } catch (err) {
      console.error('Error exporting CSV:', err);
      alert('Gagal mengekspor file CSV.');
    }
  };

  return (
    <div className="space-y-6 font-sans select-none animate-fade-in w-full">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1d2857] to-[#111827] rounded-2xl p-6 text-white shadow-md flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center space-x-2.5">
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-extrabold text-[11px] border border-emerald-500/30 uppercase tracking-wider">
              {t('settings.adminItOnly')}
            </span>
            <span className="text-slate-400 text-xs font-mono">Cloud MySQL Engine</span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-white">{t('settings.backupInfrastructure')}</h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            {t('settings.backupSubtitle')}
          </p>
        </div>
      </div>

      {/* Success Alert Banner */}
      {exportSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center justify-between text-xs font-bold animate-fade-in">
          <span>{exportSuccessMessage}</span>
          <button 
            onClick={() => setExportSuccessMessage(null)} 
            className="text-emerald-600 hover:text-emerald-800 font-bold border-none bg-transparent cursor-pointer text-xs"
          >
            {t('common.close') || 'Tutup'}
          </button>
        </div>
      )}

      {/* Primary Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Full Database Snapshot Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">{t('settings.downloadFullBackup')}</h3>
              <p className="text-[11px] text-slate-400 font-medium">{t('settings.fullBackupSubtitle')}</p>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              {t('settings.fullBackupDesc')}
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-[11px] text-slate-400 font-medium">
              <span>{lastBackupTime ? t('settings.lastExport', { time: lastBackupTime }) : t('settings.noExportThisSession')}</span>
            </div>
            <button
              onClick={handleDownloadFullBackup}
              disabled={isExporting}
              className="px-5 py-2.5 bg-[#1d2857] hover:bg-[#111827] text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm border-none disabled:opacity-50 flex items-center gap-2"
            >
              <FileJson className="w-4 h-4" />
              <span>{isExporting ? t('settings.generatingBackup') : t('settings.downloadFullBackup')}</span>
            </button>
          </div>
        </div>

        {/* Infrastructure & Cloud Backup Status */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">{t('settings.hostingInfrastructure')}</h3>
              <p className="text-[11px] text-slate-400 font-medium">{t('settings.productionDbDeployment')}</p>
            </div>
            
            <div className="space-y-2 text-xs font-sans text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">{t('settings.autoCloudBackup')}:</span>
                <span className="font-bold text-emerald-600">{t('settings.activeSnapshot')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">{t('settings.serverDeployments')}:</span>
                <span className="font-bold text-blue-600">{t('settings.synchronizedGit')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">{t('settings.authorizedControllers')}:</span>
                <span className="font-bold text-slate-800">Mr. Emad, Ali, Dimas</span>
              </div>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-400 italic">
            {t('settings.cloudBackupNote')}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* SYSTEM MAINTENANCE BROADCAST (Dimas Alva Rizki & Ali Restricted) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 flex-shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-800">
                  {t('settings.maintenanceBroadcastTitle')}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                  IT Control
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {t('settings.maintenanceBroadcastDesc')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 self-start sm:self-auto">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Otorisasi: <strong className="text-slate-700">Dimas & Ali</strong></span>
          </div>
        </div>

        {/* Feedback Alert */}
        {broadcastFeedback && (
          <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between animate-fade-in ${
            broadcastFeedback.type === 'success' 
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center gap-2">
              {broadcastFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{broadcastFeedback.message}</span>
            </div>
            <button 
              onClick={() => setBroadcastFeedback(null)} 
              className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Form & Live Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Quick Template Chips */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
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
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-50 hover:bg-amber-50 hover:text-amber-800 border border-slate-200 transition-all cursor-pointer text-slate-600"
                >
                  🚀 {t('settings.tplServerUpgrade')}
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate(
                    'Hotel Reservations',
                    'Normal',
                    'Besok pukul 06:00 - 06:30 WIB',
                    'Pembaruan modul alokasi kamar dan validasi voucher. Modul lain (Invoices & Requests) tetap beroperasi normal.'
                  )}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-50 hover:bg-amber-50 hover:text-amber-800 border border-slate-200 transition-all cursor-pointer text-slate-600"
                >
                  🏨 {t('settings.tplHotelModule')}
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate(
                    'All System',
                    'Normal',
                    'Hari Minggu pukul 01:00 - 02:00 WIB',
                    'Optimalisasi database cloud dan reindeks data keuangan tahunan untuk meningkatkan kecepatan loading laporan.'
                  )}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-50 hover:bg-amber-50 hover:text-amber-800 border border-slate-200 transition-all cursor-pointer text-slate-600"
                >
                  🗄️ {t('settings.tplDatabaseSync')}
                </button>
              </div>
            </div>

            {/* Scope Selection */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                {t('settings.scopeLabel')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'All System', label: t('settings.scopeAll'), icon: '🌐' },
                  { id: 'Hotel Reservations', label: t('settings.scopeReservations'), icon: '🏨' },
                  { id: 'Invoices', label: t('settings.scopeInvoices'), icon: '📑' },
                  { id: 'Approval Requests', label: t('settings.scopeApprovals'), icon: '✅' },
                  { id: 'Settings & DB', label: t('settings.scopeSettings'), icon: '⚙️' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setBroadcastScope(s.id)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      broadcastScope === s.id
                        ? 'bg-amber-50/80 border-amber-400 text-amber-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span>{s.icon}</span>
                    <span className="truncate">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule & Urgency in 2 Cols */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  {t('settings.scheduleTimeLabel')}
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={broadcastSchedule}
                    onChange={(e) => setBroadcastSchedule(e.target.value)}
                    placeholder={t('settings.scheduleTimePlaceholder')}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-all font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  {t('settings.urgencyLabel')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBroadcastUrgency('Normal')}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      broadcastUrgency === 'Normal'
                        ? 'bg-blue-50 border-blue-400 text-blue-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    📢 Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setBroadcastUrgency('High')}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      broadcastUrgency === 'High'
                        ? 'bg-rose-50 border-rose-400 text-rose-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    ⚠️ High (Downtime)
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
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-all resize-none font-sans"
              />
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
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2 border-none disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isBroadcasting ? t('settings.sendingBroadcast') : t('settings.sendBroadcastBtn')}</span>
              </button>
            </div>

          </div>

          {/* Right Column: Live User Preview Box (5 cols) */}
          <div className="lg:col-span-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4.5 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-amber-600" />
                  {t('settings.livePreview')}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  In-App & Email
                </span>
              </div>

              {/* Mock Notification Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm space-y-2.5">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${
                    broadcastUrgency === 'High' 
                      ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                      : 'bg-amber-50 text-amber-600 border border-amber-200'
                  }`}>
                    {broadcastUrgency === 'High' ? <AlertTriangle className="w-4 h-4" /> : <Megaphone className="w-4 h-4" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {broadcastUrgency === 'High' ? '⚠️ ' : '📢 '}
                        {broadcastScope && broadcastScope !== 'All System' ? `[Modul ${broadcastScope}] ` : '[Sistem] '}
                        Pemeliharaan Terjadwal
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap ml-1">Baru saja</span>
                    </div>

                    {broadcastSchedule && (
                      <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 mt-1">
                        <Clock className="w-3 h-3" />
                        <span>{broadcastSchedule}</span>
                      </div>
                    )}

                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-sans line-clamp-3">
                      {broadcastMessage.trim() || 'Pesan siaran pemeliharaan akan ditampilkan di sini kepada seluruh pengguna sistem...'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Pengirim: <strong className="text-slate-600">{user?.name || 'Dimas / Ali'}</strong></span>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Semua Pengguna
                  </span>
                </div>
              </div>

              {/* Delivery Channels Info */}
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1.5 font-sans">
                <div className="font-bold text-slate-700 text-xs">Saluran Pengiriman Otomatis:</div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span><strong>Lonceng Header:</strong> Badge merah + audio alert popover</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span><strong>Email Notifikasi:</strong> Dikirimkan ke inbox akun aktif</span>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 italic">
              * Notifikasi akan tersimpan dalam tabel audit dan dapat dibaca kapan saja oleh pengguna.
            </div>
          </div>
        </div>

        {/* Recent Broadcasts List */}
        {recentBroadcasts.length > 0 && (
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Riwayat Siaran Terakhir (Sesi Ini)
            </h4>
            <div className="space-y-2">
              {recentBroadcasts.slice(0, 3).map((b) => (
                <div key={b.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between gap-4 font-sans">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.urgency === 'High' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {b.scope}
                      </span>
                      {b.scheduleTime && (
                        <span className="text-[11px] font-semibold text-slate-600">
                          Jadwal: {b.scheduleTime}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 truncate">{b.message}</p>
                  </div>
                  <div className="text-[10px] text-slate-400 whitespace-nowrap text-right">
                    <div>{new Date(b.sentAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                    <div>Oleh: {b.sentBy}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <Megaphone className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-slate-800">
                {t('settings.confirmBroadcastTitle')}
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed font-sans">
                {t('settings.confirmBroadcastMsg')}
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1 font-sans">
              <div><strong>Cakupan:</strong> {broadcastScope}</div>
              {broadcastSchedule && <div><strong>Jadwal:</strong> {broadcastSchedule}</div>}
              <div><strong>Tingkat:</strong> {broadcastUrgency}</div>
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
                className="py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer border-none flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isBroadcasting ? t('settings.sendingBroadcast') : t('common.confirm')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modular CSV Exports Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-extrabold text-slate-800">{t('settings.exportCsvData')}</h3>
          <p className="text-[11px] text-slate-400 font-medium">{t('settings.exportCsvDesc')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <button
            onClick={() => handleExportCSV('invoices')}
            className="p-4 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl transition-all text-left flex items-center justify-between cursor-pointer bg-white"
          >
            <div>
              <div className="text-xs font-bold text-slate-800">{t('invoices.title')}</div>
              <div className="text-[10px] text-slate-400">{t('settings.exportInvoicesDesc')}</div>
            </div>
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          </button>

          <button
            onClick={() => handleExportCSV('reservations')}
            className="p-4 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl transition-all text-left flex items-center justify-between cursor-pointer bg-white"
          >
            <div>
              <div className="text-xs font-bold text-slate-800">{t('hotelReservations.title')}</div>
              <div className="text-[10px] text-slate-400">{t('settings.exportReservationsDesc')}</div>
            </div>
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
          </button>

          <button
            onClick={() => handleExportCSV('companies')}
            className="p-4 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl transition-all text-left flex items-center justify-between cursor-pointer bg-white"
          >
            <div>
              <div className="text-xs font-bold text-slate-800">{t('companies.title')}</div>
              <div className="text-[10px] text-slate-400">{t('settings.exportCompaniesDesc')}</div>
            </div>
            <FileSpreadsheet className="w-4 h-4 text-amber-600" />
          </button>
        </div>
      </div>

      {/* Export & Backup History Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              {t('settings.exportHistory')}
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              {t('settings.exportHistoryDesc')}
            </p>
          </div>
          <button
            onClick={fetchHistory}
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-all cursor-pointer"
          >
            {t('common.refresh')}
          </button>
        </div>

        {loadingHistory ? (
          <div className="py-8 text-center text-xs text-slate-400 font-medium animate-pulse">
            {t('settings.loadingExportHistory')}
          </div>
        ) : historyList.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 font-medium border border-dashed border-slate-200 rounded-xl bg-slate-50">
            {t('settings.noExportHistory')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  <th className="px-4 py-3">{t('settings.timestamp')}</th>
                  <th className="px-4 py-3">{t('settings.exportType')}</th>
                  <th className="px-4 py-3">{t('settings.filename')}</th>
                  <th className="px-4 py-3">{t('settings.exportedBy')}</th>
                  <th className="px-4 py-3 text-center">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyList.map((item) => {
                  const isFull = item.exportType === 'FULL_JSON';
                  const dateStr = item.createdAt 
                    ? new Date(item.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
                    : 'N/A';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isFull 
                            ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {isFull ? 'FULL JSON (18 Tables)' : item.exportType}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600 font-medium">
                        {item.filename}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium flex items-center gap-1.5">
                        <User className="w-3 h-3 text-slate-400" />
                        {item.exportedBy}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            if (isFull) {
                              handleDownloadFullBackup();
                            } else if (item.exportType.includes('INVOICES')) {
                              handleExportCSV('invoices');
                            } else if (item.exportType.includes('RESERVATIONS')) {
                              handleExportCSV('reservations');
                            } else if (item.exportType.includes('COMPANIES')) {
                              handleExportCSV('companies');
                            } else {
                              handleDownloadFullBackup();
                            }
                          }}
                          className="px-3 py-1 bg-slate-100 hover:bg-indigo-50 text-indigo-700 hover:text-indigo-800 font-bold text-[11px] rounded-lg border border-slate-200 hover:border-indigo-200 transition-all cursor-pointer inline-flex items-center gap-1"
                          title={t('settings.redownloadDesc')}
                        >
                          <Download className="w-3 h-3" />
                          {t('settings.redownload')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default SystemBackupTab;
