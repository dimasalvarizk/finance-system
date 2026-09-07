import React from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, X } from 'lucide-react';
import type { ApprovedExpenseItem } from '../types';

interface AddToPayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: ApprovedExpenseItem[];
  selectedTotalAmount: number;
  payrollPeriod: string;
  setPayrollPeriod: (period: string) => void;
  isProcessing: boolean;
  onConfirm: () => void;
  formatAmount: (num: number, curr?: string) => string;
}

export const AddToPayrollModal: React.FC<AddToPayrollModalProps> = ({
  isOpen,
  onClose,
  selectedItems,
  selectedTotalAmount,
  payrollPeriod,
  setPayrollPeriod,
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
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <h3 className="text-[15px] font-bold text-slate-900">{t('approvals.addToPayroll') || 'Schedule to Payroll'}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[12.5px] text-slate-600 leading-relaxed">
          You are about to batch schedule <span className="font-bold text-slate-900">{selectedItems.length} claim(s)</span> totaling <span className="font-extrabold text-blue-600">{formatAmount(selectedTotalAmount)}</span> to be disbursed through the monthly employee payroll cycle.
        </p>

        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Target Payroll Batch Cycle
          </label>
          <select
            value={payrollPeriod}
            onChange={(e) => setPayrollPeriod(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12.5px] font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
          >
            <option value="October 2026 Cycle (End of Month)">October 2026 Cycle (End of Month)</option>
            <option value="November 2026 Mid-Cycle Batch">November 2026 Mid-Cycle Batch</option>
            <option value="November 2026 Cycle (End of Month)">November 2026 Cycle (End of Month)</option>
          </select>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1 text-[12px]">
          <div className="flex justify-between text-slate-500">
            <span>Total Recipient Employees:</span>
            <span className="font-bold text-slate-800">{new Set(selectedItems.map((i) => i.employee)).size} Staff</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Total Payout Value:</span>
            <span className="font-extrabold text-slate-900">{formatAmount(selectedTotalAmount)}</span>
          </div>
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
            className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-xl text-[12px] transition-all cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (t('common.loading') || 'Scheduling...') : (t('common.confirm') || 'Confirm Schedule to Payroll')}
          </button>
        </div>
      </div>
    </div>
  );
};
