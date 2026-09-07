import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, FileText, User, Globe, AlertCircle } from 'lucide-react';
import type { SystemAuditLog } from '../../../services/settingService';

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { action: string; target_user?: string; details: any; ip_address?: string }) => Promise<void>;
  initialData?: SystemAuditLog | null;
  mode: 'add' | 'edit';
}

const ACTION_OPTIONS = [
  { value: 'MANUAL_LOG_ENTRY', label: 'Manual Administrative Note' },
  { value: 'SECURITY_AUDIT', label: 'Security & Access Audit' },
  { value: 'SYSTEM_CONFIG_CHANGED', label: 'System Configuration Changed' },
  { value: 'UPDATE_PERMISSIONS', label: 'User Permissions Update' },
  { value: 'FINANCE_OVERRIDE', label: 'Financial Transaction Override' },
  { value: 'COMPLIANCE_REVIEW', label: 'Compliance & Audit Review' }
];

export const LogModal: React.FC<LogModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode
}) => {
  const [action, setAction] = useState('MANUAL_LOG_ENTRY');
  const [targetUser, setTargetUser] = useState('');
  const [detailsText, setDetailsText] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData && mode === 'edit') {
      setAction(initialData.action || 'MANUAL_LOG_ENTRY');
      setTargetUser(initialData.target_user || '');
      setIpAddress(initialData.ip_address || '');
      try {
        const parsed = JSON.parse(initialData.details || '{}');
        setDetailsText(parsed.message || (typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2)));
      } catch {
        setDetailsText(initialData.details || '');
      }
    } else {
      setAction('MANUAL_LOG_ENTRY');
      setTargetUser('');
      setDetailsText('');
      setIpAddress('');
    }
    setError('');
  }, [initialData, mode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailsText.trim()) {
      setError('Please provide details or remarks for this audit log.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onSubmit({
        action,
        target_user: targetUser.trim() || 'System',
        details: { message: detailsText.trim() },
        ip_address: ipAddress.trim() || undefined
      });
      onClose();
    } catch (err: any) {
      console.error('Failed to save audit log:', err);
      setError(err?.response?.data?.message || 'Failed to save audit log. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn font-inter">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-[#1d2857] to-[#2b3a7a] text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {mode === 'add' ? 'Add System Audit Log' : 'Edit Audit Log Entry'}
              </h3>
              <p className="text-xs text-slate-300">
                {mode === 'add' ? 'Record a manual audit trail or operational note' : `Editing log ID: ${initialData?.id || ''}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Action / Event Type *</span>
            </label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1d2857] focus:bg-white transition-all"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.value})
                </option>
              ))}
            </select>
          </div>

          {/* Target User / Entity */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Target User / Entity</span>
            </label>
            <input
              type="text"
              value={targetUser}
              onChange={(e) => setTargetUser(e.target.value)}
              placeholder="e.g. Mr. Khalid, DST-System, finance_token"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1d2857] focus:bg-white transition-all"
            />
          </div>

          {/* IP Address (Optional) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>IP Address (Optional)</span>
            </label>
            <input
              type="text"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="e.g. 187.52.126.215 or 127.0.0.1"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1d2857] focus:bg-white transition-all"
            />
          </div>

          {/* Remarks / Details */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Audit Remarks & Details *</span>
            </label>
            <textarea
              rows={4}
              value={detailsText}
              onChange={(e) => setDetailsText(e.target.value)}
              placeholder="Enter comprehensive notes regarding this audit trail entry..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1d2857] focus:bg-white transition-all resize-none"
              required
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#1d2857] hover:bg-[#2b3a7a] text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{mode === 'add' ? 'Add Audit Entry' : 'Update Log Entry'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
