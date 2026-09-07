import React from 'react';
import { useTranslation } from 'react-i18next';

interface ExpenseStatCardsProps {
  totalClaimsCount: number;
  pendingCount: number;
  approvedCount: number;
  paidTotalUSD: number;
}

export const ExpenseStatCards: React.FC<ExpenseStatCardsProps> = ({
  totalClaimsCount,
  pendingCount,
  approvedCount,
  paidTotalUSD
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Total Claims */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-slate-500">{t('expenses.totalClaims') || 'Total Claims'}</span>
        </div>
        <div className="text-[26px] font-extrabold text-[#0c0d0f] tracking-tight">
          {totalClaimsCount} Requests
        </div>
        <div className="flex items-center space-x-2 pt-1">
          <span className="w-1 h-3.5 bg-slate-800 rounded-full flex-shrink-0" />
          <span className="text-[11.5px] font-medium text-slate-400">YTD claims submitted</span>
        </div>
      </div>

      {/* Card 2: Pending Approval */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-slate-500">{t('expenses.pendingApproval') || 'Pending Approval'}</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#fef3c7] text-[#b45309]">
            {t('expenses.pending') || 'Pending'}
          </span>
        </div>
        <div className="text-[26px] font-extrabold text-[#0c0d0f] tracking-tight">
          {pendingCount} Requests
        </div>
        <div className="flex items-center space-x-2 pt-1">
          <span className="w-1 h-3.5 bg-[#d97706] rounded-full flex-shrink-0" />
          <span className="text-[11.5px] font-medium text-slate-400">Awaiting review chain</span>
        </div>
      </div>

      {/* Card 3: Approved Claims */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-slate-500">{t('expenses.approvedPayout') || 'Approved Claims'}</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#dcfce7] text-[#15803d]">
            {t('expenses.approved') || 'Approved'}
          </span>
        </div>
        <div className="text-[26px] font-extrabold text-[#0c0d0f] tracking-tight">
          {approvedCount} Requests
        </div>
        <div className="flex items-center space-x-2 pt-1">
          <span className="w-1 h-3.5 bg-[#16a34a] rounded-full flex-shrink-0" />
          <span className="text-[11.5px] font-medium text-slate-400">Verified by Direct Manager</span>
        </div>
      </div>

      {/* Card 4: Paid Reimbursements */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-slate-500">{t('expenses.settledPaid') || 'Paid Reimbursements'}</span>
        </div>
        <div className="text-[26px] font-extrabold text-[#0c0d0f] tracking-tight">
          ${paidTotalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="flex items-center space-x-2 pt-1">
          <span className="w-1 h-3.5 bg-[#2563eb] rounded-full flex-shrink-0" />
          <span className="text-[11.5px] font-medium text-slate-400">Disbursed to bank account</span>
        </div>
      </div>
    </div>
  );
};
