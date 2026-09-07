import React from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, X, AlertTriangle } from 'lucide-react';
import type { ApprovedExpenseItem } from '../types';

interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: ApprovedExpenseItem[];
  isProcessing: boolean;
  onConfirm: () => void;
  formatAmount: (num: number, curr?: string) => string;
}

export const BulkDeleteModal: React.FC<BulkDeleteModalProps> = ({
  isOpen,
  onClose,
  selectedItems,
  isProcessing,
  onConfirm,
  formatAmount
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const totalAmount = selectedItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-[#0c0d0f]/60 backdrop-blur-sm p-4 animate-fade-in font-sans"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold">
              <Trash2 className="w-4 h-4" />
            </div>
            <h3 className="text-[15px] font-bold text-slate-900">
              {t('approvals.deleteConfirmTitle') || 'Delete Selected Claims'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Badge */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-2.5 text-amber-800 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <span>
            {t('approvals.deleteWarning') || 'This action will remove the selected claim records permanently from the ready queue.'}
          </span>
        </div>

        {/* Summary Description */}
        <p className="text-[12.5px] text-slate-600 leading-relaxed">
          {t('approvals.deleteConfirmDesc', { count: selectedItems.length }) ||
            `Are you sure you want to delete ${selectedItems.length} selected claim(s) totaling ${formatAmount(totalAmount)}?`}
        </p>

        {/* Selected Claims Preview List */}
        <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl bg-slate-50/70 p-2 space-y-1">
          {selectedItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-[11.5px] py-1 px-1.5">
              <div className="flex items-center space-x-2 truncate">
                <span className="font-bold text-slate-900">{item.claimId}</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600 truncate">{item.employee}</span>
              </div>
              <span className="font-semibold text-slate-800 flex-shrink-0 ml-2">
                {formatAmount(item.amount, item.currency)}
              </span>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-2">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[12px] transition-all cursor-pointer"
          >
            {t('common.cancel') || 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-[12px] transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center space-x-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isProcessing ? (t('common.loading') || 'Deleting...') : (t('approvals.delete') || 'Confirm Delete')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
