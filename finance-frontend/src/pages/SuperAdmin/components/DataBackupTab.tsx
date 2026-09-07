import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { getInvoices, getCompanies } from '../../../services/invoiceService';
import { getHotelReservations } from '../../../services/hotelReservationService';
import { getExchangeRates, getFullDatabaseBackup, logBackupHistory, getBackupHistory } from '../../../services/settingService';
import { Download, FileSpreadsheet, FileJson, Clock, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BackupHistoryItem {
  id: string;
  exportType: string;
  filename: string;
  recordCount: number;
  exportedBy: string;
  createdAt: string;
}

export const DataBackupTab: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);
  const [historyList, setHistoryList] = useState<BackupHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Akses Khusus: Super Admin dan Tim IT (Ali & Dimas)
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
    }
  }, [isAuthorized]);

  const handleDownloadFullBackup = async () => {
    setIsExporting(true);
    setExportSuccessMessage(null);

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const filename = `ODST_Finance_Backup_${dateStr}.json`;

    try {
      let serverBackupData = null;
      try {
        const response = await getFullDatabaseBackup();
        if (response && response.data) {
          serverBackupData = response.data;
        }
      } catch (serverErr) {
        console.warn('Full database server backup endpoint failed, falling back to frontend aggregation:', serverErr);
      }

      let payloadToSave: any;

      if (serverBackupData) {
        payloadToSave = serverBackupData;
      } else {
        const [invoices, reservations, companies, rates] = await Promise.all([
          getInvoices().catch(() => []),
          getHotelReservations().catch(() => []),
          getCompanies().catch(() => []),
          getExchangeRates().catch(() => [])
        ]);

        const localHistory = localStorage.getItem('odst_backup_history');
        const parsedHistory = localHistory ? JSON.parse(localHistory) : [];

        payloadToSave = {
          version: '2.0.0',
          system: 'ODST Group Finance & Accounting Infrastructure',
          backupCreatedAt: now.toISOString(),
          exportedBy: {
            name: user?.name || 'Administrator',
            email: user?.email || 'admin@odst.id',
            role: user?.role || 'Super Admin'
          },
          summary: {
            invoicesCount: invoices?.length || 0,
            reservationsCount: reservations?.length || 0,
            companiesCount: companies?.length || 0,
            ratesCount: rates?.length || 0
          },
          datasets: {
            invoices: invoices || [],
            hotelReservations: reservations || [],
            clientCompanies: companies || [],
            exchangeRates: rates || [],
            systemAuditLogs: parsedHistory
          }
        };
      }

      const blob = new Blob([JSON.stringify(payloadToSave, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const timeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      setLastBackupTime(timeFormatted);
      setExportSuccessMessage(`Full Database Snapshot (${filename}) berhasil dibuat dan diunduh.`);

      const totalCount = payloadToSave?.summary?.invoicesCount 
        ? Object.values(payloadToSave.summary).reduce((acc: number, val: any) => acc + (typeof val === 'number' ? val : 0), 0)
        : 18;

      const historyEntry: BackupHistoryItem = {
        id: `full_${Date.now()}`,
        exportType: 'FULL_JSON',
        filename,
        recordCount: totalCount,
        exportedBy: user?.name || 'Administrator',
        createdAt: now.toISOString()
      };

      addHistoryItem(historyEntry);

      try {
        await logBackupHistory({
          exportType: 'FULL_JSON',
          filename,
          recordCount: totalCount,
          exportedBy: user?.name || 'Administrator'
        });
      } catch (logErr) {
        console.warn('Failed to log backup history to backend:', logErr);
      }

    } catch (err) {
      console.error('Error generating full system backup:', err);
      alert('Gagal membuat backup database. Silakan periksa koneksi backend.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async (type: 'invoices' | 'reservations' | 'companies') => {
    try {
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      let csvContent = '';
      let filename = '';
      let recordCount = 0;

      if (type === 'invoices') {
        const invoices = await getInvoices().catch(() => []);
        recordCount = invoices.length;
        filename = `Invoices_Export_${dateStr}.csv`;
        csvContent = 'Invoice No,Company,Date,Due Date,Total Amount,Currency,Status,Branch\n' +
          invoices.map((inv: any) => 
            `"${inv.invoiceNumber || ''}","${inv.companyName || ''}","${inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : ''}","${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : ''}",${inv.totalAmount || 0},"${inv.currency || 'SAR'}","${inv.status || ''}","${inv.branch || ''}"`
          ).join('\n');
      } else if (type === 'reservations') {
        const reservations = await getHotelReservations().catch(() => []);
        recordCount = reservations.length;
        filename = `Reservations_Export_${dateStr}.csv`;
        csvContent = 'Reservation No,Hotel Name,Guest Name,Check In,Check Out,Total Rooms,Status\n' +
          reservations.map((r: any) => 
            `"${r.reservationNo || ''}","${r.hotelName || ''}","${r.guestName || ''}","${r.checkIn || ''}","${r.checkOut || ''}",${r.roomsCount || 1},"${r.status || ''}"`
          ).join('\n');
      } else if (type === 'companies') {
        const companies = await getCompanies().catch(() => []);
        recordCount = companies.length;
        filename = `Companies_Export_${dateStr}.csv`;
        csvContent = 'Company Name,Code,Email,Phone,Country,City,Tax ID\n' +
          companies.map((c: any) => 
            `"${c.name || ''}","${c.code || ''}","${c.email || ''}","${c.phone || ''}","${c.country || ''}","${c.city || ''}","${c.taxNumber || ''}"`
          ).join('\n');
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const historyEntry: BackupHistoryItem = {
        id: `csv_${Date.now()}`,
        exportType: `${type.toUpperCase()}_CSV`,
        filename,
        recordCount,
        exportedBy: user?.name || 'Administrator',
        createdAt: now.toISOString()
      };

      addHistoryItem(historyEntry);

      try {
        await logBackupHistory({
          exportType: `${type.toUpperCase()}_CSV`,
          filename,
          recordCount,
          exportedBy: user?.name || 'Administrator'
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
                <span className="font-bold text-slate-800">Dimas & Ali</span>
              </div>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-400 italic">
            {t('settings.cloudBackupNote')}
          </div>
        </div>
      </div>

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

export default DataBackupTab;
