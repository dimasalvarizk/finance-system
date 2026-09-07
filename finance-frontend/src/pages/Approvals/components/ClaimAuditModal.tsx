import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Receipt, X, Paperclip } from 'lucide-react';
import type { ApprovedExpenseItem } from '../types';

interface ClaimAuditModalProps {
  item: ApprovedExpenseItem | null;
  onClose: () => void;
  formatAmount: (num: number, curr?: string) => string;
}

export const ClaimAuditModal: React.FC<ClaimAuditModalProps> = ({
  item,
  onClose,
  formatAmount
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0c0d0f]/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-scale-up font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-slate-900">{item.claimId}</h3>
              <p className="text-[11.5px] text-slate-500">{item.employee} • {item.department}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                {t('expenses.amount') || 'Claim Payout Amount'}
              </span>
              <span className="text-xl font-extrabold text-slate-900">{formatAmount(item.amount, item.currency)}</span>
            </div>
            <div>
              <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-[#fef3c7] text-[#b45309] border border-[#fde68a]">
                {item.approvalChain}
              </span>
            </div>
          </div>

          {/* Bank Transfer Details */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('initiateReimbursement.beneficiaryDetails') || 'Employee Bank Destination'}</h4>
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1 text-[12.5px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">{t('setupBeneficiary.bankName') || 'Bank Name'}:</span>
                <span className="font-bold text-slate-800">{item.bankName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">{t('setupBeneficiary.accountNumber') || 'Account Number'}:</span>
                <span className="font-mono font-bold text-blue-700">{item.bankAccountNumber}</span>
              </div>
            </div>
          </div>

          {/* Claim Description */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('submitExpense.purpose') || 'Mission Reference & Details'}</h4>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-[12.5px]">
              <div>
                <span className="text-slate-400 text-[11px] block font-medium">{t('expenses.category') || 'Reason'}:</span>
                <span className="font-semibold text-slate-800">{item.reason}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block font-medium">{t('submitExpense.category') || 'Category'}:</span>
                <span className="font-semibold text-slate-800">{item.category}</span>
              </div>
              {item.notes && (
                <div>
                  <span className="text-slate-400 text-[11px] block font-medium">{t('common.notes') || 'Approval Notes'}:</span>
                  <span className="text-slate-600">{item.notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Attached Receipt */}
          {item.receiptName && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-[12px]">
              <div className="flex items-center space-x-2">
                <Paperclip className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-800 truncate max-w-[240px]">{item.receiptName}</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {t('expenses.receipt') || 'Receipt Verified'}
              </span>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => {
              navigate(`/approvals/action/${item.claimId}`);
            }}
            className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold rounded-xl text-[12.5px] transition-all cursor-pointer flex items-center space-x-1.5 shadow-xs"
          >
            <span>{t('expenseApproval.title') || 'Review Full Approval Page'}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-[12px] transition-all cursor-pointer"
          >
            {t('common.close') || 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
