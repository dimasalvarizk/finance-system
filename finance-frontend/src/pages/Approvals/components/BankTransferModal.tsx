import React from 'react';
import { useTranslation } from 'react-i18next';
import { Send, X } from 'lucide-react';
import type { ApprovedExpenseItem } from '../types';

interface BankTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: ApprovedExpenseItem[];
  selectedTotalAmount: number;
  transferRef: string;
  setTransferRef: (ref: string) => void;
  isProcessing: boolean;
  onConfirm: () => void;
  formatAmount: (num: number, curr?: string) => string;
}

export const BankTransferModal: React.FC<BankTransferModalProps> = ({
  isOpen,
  onClose,
  selectedItems,
  selectedTotalAmount,
  transferRef,
  setTransferRef,
  isProcessing,
  onConfirm,
  formatAmount
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-[#0c0d0f]/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-up font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Send className="w-4 h-4" />
            </div>
            <h3 className="text-[15px] font-bold text-slate-900">{t('approvals.transferToBank') || 'Direct Bank Transfer Batch'}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[12.5px] text-slate-600 leading-relaxed">
          Prepare automated corporate bank API payout for <span className="font-bold text-slate-900">{selectedItems.length} selected request(s)</span>.
        </p>

        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Batch Transfer Reference ID
          </label>
          <input
            type="text"
            value={transferRef}
            onChange={(e) => setTransferRef(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12.5px] font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Breakdown of Destination Accounts */}
        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
          {selectedItems.map((item) => (
            <div key={item.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-[11.5px]">
              <div>
                <span className="font-bold text-slate-900 block">{item.employee}</span>
                <span className="text-slate-400">{item.bankName} • {item.bankAccountNumber}</span>
              </div>
              <span className="font-extrabold text-slate-900">{formatAmount(item.amount, item.currency)}</span>
            </div>
          ))}
        </div>

        <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100 flex items-center justify-between text-[12px]">
          <span className="font-bold text-emerald-900">Total Transfer Amount:</span>
          <span className="text-base font-extrabold text-emerald-700">{formatAmount(selectedTotalAmount)}</span>
        </div>

        <div className="flex items-center justify-end space-x-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[12px] transition-all cursor-pointer"
          >
            {t('common.cancel') || 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[12px] transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isProcessing ? (t('common.loading') || 'Transmitting...') : (t('approvals.transferToBank') || 'Dispatch Transfer Batch')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
