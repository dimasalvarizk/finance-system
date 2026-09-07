import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, FileSpreadsheet, Download } from 'lucide-react';
import type { ApprovedExpenseItem } from '../types';
import { exportPayrollToExcel } from '../utils/payrollExcelExport';

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

  const handleInstantExcelDownload = () => {
    exportPayrollToExcel(selectedItems, payrollPeriod);
  };

  const handleConfirmAndExport = () => {
    // Auto trigger excel download
    exportPayrollToExcel(selectedItems, payrollPeriod);
    onConfirm();
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-[#0c0d0f]/60 backdrop-blur-sm p-4 animate-fade-in font-sans"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-slate-900">
                {t('approvals.addToPayroll') || 'Export & Schedule to Payroll'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Generates .xlsx (USER NAME, BANK NAME, ACCOUNT NUMBER)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[12.5px] text-slate-600 leading-relaxed">
          You are about to batch schedule <span className="font-bold text-slate-900">{selectedItems.length} claim(s)</span> totaling <span className="font-extrabold text-blue-600">{formatAmount(selectedTotalAmount)}</span> and export the bank payroll Excel file.
        </p>

        <div className="space-y-1.5">
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

        {/* 3-Column Excel Preview Table */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Excel Columns Preview</span>
            <button
              type="button"
              onClick={handleInstantExcelDownload}
              className="text-emerald-600 hover:text-emerald-700 flex items-center space-x-1 cursor-pointer font-bold lowercase first-letter:uppercase"
            >
              <Download className="w-3 h-3" />
              <span>Download Excel only</span>
            </button>
          </div>
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
            <table className="w-full text-left text-[11.5px]">
              <thead className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                <tr>
                  <th className="px-3 py-1.5">USER NAME</th>
                  <th className="px-3 py-1.5">BANK NAME</th>
                  <th className="px-3 py-1.5">ACCOUNT NUMBER</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {selectedItems.slice(0, 4).map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-1.5 font-semibold text-slate-800 truncate max-w-[120px]">{item.employee}</td>
                    <td className="px-3 py-1.5 text-slate-600 truncate max-w-[110px]">{item.bankName || '-'}</td>
                    <td className="px-3 py-1.5 font-mono text-slate-700">{item.bankAccountNumber || '-'}</td>
                  </tr>
                ))}
                {selectedItems.length > 4 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-1 text-center text-slate-400 text-[10.5px] italic bg-slate-50/70">
                      + {selectedItems.length - 4} more rows in Excel...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
            onClick={handleConfirmAndExport}
            disabled={isProcessing}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[12px] transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {isProcessing
                ? (t('common.loading') || 'Processing...')
                : (t('approvals.exportAndSchedule') || 'Export Excel & Confirm')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

