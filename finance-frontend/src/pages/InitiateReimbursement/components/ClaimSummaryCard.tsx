import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ReimbursementClaimSummary } from '../types';

interface ClaimSummaryCardProps {
  claim: ReimbursementClaimSummary;
  formatAmount: (num: number, curr?: string) => string;
}

export const ClaimSummaryCard: React.FC<ClaimSummaryCardProps> = ({
  claim,
  formatAmount
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-7 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">
          {t('initiateReimbursement.claimSummary') || 'Approved Claim Summary'}
        </h2>
        <span className="px-2.5 py-0.5 rounded text-[10.5px] font-bold bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0]">
          {t('expenses.approved') || 'APPROVED'} & {t('approvals.readyDisburse') || 'READY'}
        </span>
      </div>

      <div className="space-y-3.5 text-[13px]">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">{t('requests.employeeName') || 'Employee Name'}</span>
          <span className="text-slate-900 font-bold">{claim.employeeName}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">{t('approvals.department') || 'Department'}</span>
          <span className="text-slate-900 font-bold">{claim.department}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">{t('submitExpense.category') || 'Expense Category'}</span>
          <span className="text-slate-900 font-bold">{claim.expenseCategory}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">{t('dashboard.ref') || 'Mission Reference'}</span>
          <span className="text-slate-900 font-bold">{claim.missionReference}</span>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-5 flex items-center justify-between">
        <span className="text-[14px] font-bold text-slate-900">
          {t('expenseApproval.transferAmount') || 'Total Reimbursement Amount'}
        </span>
        <span className="text-[20px] font-extrabold text-[#2563eb]">
          {formatAmount(claim.amount, claim.currency)}
        </span>
      </div>
    </div>
  );
};

