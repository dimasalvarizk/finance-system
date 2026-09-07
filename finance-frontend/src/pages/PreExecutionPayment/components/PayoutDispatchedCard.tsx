import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Download, History } from 'lucide-react';
import type { PaymentExecutionData } from '../types';

interface PayoutDispatchedCardProps {
  data: PaymentExecutionData;
  onDownloadReceipt: () => void;
  formatAmount: (num: number, curr?: string) => string;
}

export const PayoutDispatchedCard: React.FC<PayoutDispatchedCardProps> = ({
  data,
  onDownloadReceipt,
  formatAmount
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-7 space-y-6">
      {/* Top Banner with Green Check Circle */}
      <div className="flex items-start space-x-3.5 pb-2">
        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 border border-emerald-200 ring-4 ring-emerald-50/50">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div className="space-y-0.5">
          <h3 className="text-[16px] font-bold text-slate-900">
            {t('preExecutionPayment.dispatchedTitle') || 'Reimbursement Settle Complete'}
          </h3>
          <p className="text-[12px] font-medium text-emerald-600">
            {t('preExecutionPayment.tunnelSubtitle') || 'Executed on host-to-host network'}
          </p>
        </div>
      </div>

      {/* Key-Value Details */}
      <div className="space-y-3.5 text-[13px] border-t border-slate-100 pt-5">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">Transaction ID</span>
          <span className="text-slate-900 font-mono font-bold">{data.transactionTraceId}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">Acknowledge Code</span>
          <span className="text-slate-900 font-mono font-semibold">{data.acknowledgementCode}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">{t('invoices.paymentDate') || 'Transfer Timestamp'}</span>
          <span className="text-slate-900 font-medium">{data.transferTimestamp}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">{t('initiateReimbursement.fundingSource') || 'Settled From Account'}</span>
          <span className="text-slate-900 font-semibold">{data.settledFromAccount}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">{t('initiateReimbursement.beneficiaryDetails') || 'Settled To Account'}</span>
          <span className="text-slate-900 font-semibold">{data.settledToAccount}</span>
        </div>
      </div>

      {/* Total Amount Row */}
      <div className="border-t border-slate-100 pt-5 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <span className="text-[13.5px] font-bold text-slate-900">
            {t('expenseApproval.transferAmount') || 'Total Amount Settle Paid'}
          </span>
          <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-[#dcfce7] text-[#15803d]">
            {t('preExecutionPayment.settlePaid') || 'PAID COMPLETED'}
          </span>
        </div>
        <span className="text-[18px] font-extrabold text-[#15803d]">
          {formatAmount(data.amount, data.currency)}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
        <button
          type="button"
          onClick={onDownloadReceipt}
          className="px-3 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl text-[12px] transition-all cursor-pointer flex items-center justify-center space-x-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{t('preExecutionPayment.downloadVoucher') || 'Download PDF Receipt'}</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/my-expenses')}
          className="px-3 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl text-[12px] transition-all cursor-pointer flex items-center justify-center space-x-1.5"
        >
          <History className="w-3.5 h-3.5" />
          <span>{t('nav.myExpenses') || 'View History Log'}</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/approvals')}
          className="px-4 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-xl text-[12px] shadow-sm transition-all cursor-pointer text-center"
        >
          {t('requests.backToListing') || 'Return to Approvals'}
        </button>
      </div>
    </div>
  );
};

