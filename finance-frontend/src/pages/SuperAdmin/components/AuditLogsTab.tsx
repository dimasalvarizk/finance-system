import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import {
  getAuditLogs,
  createAuditLog,
  updateAuditLog,
  deleteAuditLog
} from '../../../services/settingService';
import type { SystemAuditLog } from '../../../services/settingService';
import { LogModal } from './LogModal';

export const AuditLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<SystemAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedLog, setSelectedLog] = useState<SystemAuditLog | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await getAuditLogs();
      setLogs(data || []);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
      setActionFeedback({
        type: 'error',
        message: 'Failed to load system audit logs. Make sure you are logged in as Super Admin.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdateLog = async (logData: {
    action: string;
    target_user?: string;
    details: any;
    ip_address?: string;
  }) => {
    if (modalMode === 'add') {
      await createAuditLog(logData);
      setActionFeedback({ type: 'success', message: 'Manual audit log entry recorded successfully.' });
    } else if (modalMode === 'edit' && selectedLog) {
      await updateAuditLog(selectedLog.id, logData);
      setActionFeedback({ type: 'success', message: 'Audit log entry updated successfully.' });
    }
    await fetchLogs();
  };

  const handleDeleteLog = async (id: string) => {
    try {
      await deleteAuditLog(id);
      setDeleteId(null);
      setActionFeedback({ type: 'success', message: 'Audit log entry removed permanently.' });
      await fetchLogs();
    } catch (err: any) {
      console.error('Failed to delete audit log:', err);
      setActionFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to delete audit log entry.'
      });
    }
  };

  const parseDetails = (detailsStr?: string) => {
    if (!detailsStr) return { message: 'No details recorded', raw: null };
    try {
      const parsed = JSON.parse(detailsStr);
      if (typeof parsed === 'string') return { message: parsed, raw: null };
      return {
        message: parsed.message || (parsed.newPermissions ? 'Permissions updated' : JSON.stringify(parsed)),
        raw: parsed
      };
    } catch {
      return { message: detailsStr, raw: null };
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE_CONFIRMATION_BYPASS':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            BYPASS CONFIRMATION
          </span>
        );
      case 'UPDATE_PERMISSIONS':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
            UPDATE PERMISSIONS
          </span>
        );
      case 'MANUAL_LOG_ENTRY':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            ADMIN NOTE
          </span>
        );
      case 'USER_CREATED':
      case 'USER_DELETED':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            {action}
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {action}
          </span>
        );
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.performed_by_name && log.performed_by_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.target_user && log.target_user.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.action && log.action.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.ip_address && log.ip_address.includes(searchTerm));

    if (actionFilter === 'ALL') return matchesSearch;
    return matchesSearch && log.action === actionFilter;
  });

  return (
    <div className="space-y-6 font-inter">
      {/* Toast Feedback */}
      {actionFeedback && (
        <div
          className={`p-3.5 rounded-xl flex items-center justify-between shadow-xs transition-all text-xs font-semibold ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <span>{actionFeedback.message}</span>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-slate-400 hover:text-slate-600 text-xs ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search logs by user, action, IP, or details..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1d2857] focus:bg-white transition-all"
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1d2857]"
          >
            <option value="ALL">All Actions</option>
            <option value="CREATE_CONFIRMATION_BYPASS">Bypass Confirmations</option>
            <option value="UPDATE_PERMISSIONS">Permission Changes</option>
            <option value="MANUAL_LOG_ENTRY">Admin Notes</option>
            <option value="SECURITY_AUDIT">Security Events</option>
            <option value="SYSTEM_CONFIG_CHANGED">System Changes</option>
          </select>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors disabled:opacity-50"
            title="Refresh Audit Logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              setSelectedLog(null);
              setModalMode('add');
              setModalOpen(true);
            }}
            className="px-4 py-2 bg-[#1d2857] hover:bg-[#2b3a7a] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Manual Log</span>
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Action Event
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Performed By
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Target Entity
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Audit Details / Remarks
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-[#1d2857] border-t-transparent rounded-full animate-spin" />
                      <span>Loading system audit logs...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs">
                    No audit log entries matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const { message, raw } = parseDetails(log.details);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Timestamp */}
                      <td className="px-6 py-3.5 whitespace-nowrap text-xs text-slate-600">
                        <div className="font-medium text-slate-800">
                          {log.createdAt
                            ? format(new Date(log.createdAt), 'dd MMM yyyy, HH:mm:ss')
                            : '-'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{log.id}</div>
                      </td>

                      {/* Action Event */}
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>

                      {/* Performed By */}
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <div className="text-xs font-bold text-slate-900">
                          {log.performed_by_name || log.performed_by || 'Super Admin'}
                        </div>
                        {log.ip_address && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {log.ip_address}
                          </div>
                        )}
                      </td>

                      {/* Target Entity */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {log.target_user || 'System'}
                        </span>
                      </td>

                      {/* Audit Details */}
                      <td className="px-6 py-4 text-xs text-slate-700 max-w-xs md:max-w-md">
                        <div className="line-clamp-2 text-slate-800 font-medium">
                          {message}
                        </div>
                        {raw && raw.newPermissions && (
                          <div className="text-[10px] text-purple-700 mt-1 font-mono">
                            New: {JSON.stringify(raw.newPermissions)}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-1">
                        <button
                          onClick={() => {
                            setSelectedLog(log);
                            setModalMode('edit');
                            setModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-[#1d2857] hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Log Remarks"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteId(log.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Log Entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Delete Audit Log Entry?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete audit record ID: <code className="font-mono text-slate-700">{deleteId}</code>? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteLog(deleteId)}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Modal (Add / Edit) */}
      <LogModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedLog(null);
        }}
        onSubmit={handleCreateOrUpdateLog}
        initialData={selectedLog}
        mode={modalMode}
      />
    </div>
  );
};
