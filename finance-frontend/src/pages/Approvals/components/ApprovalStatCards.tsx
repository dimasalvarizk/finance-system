import React from 'react';
import { useTranslation } from 'react-i18next';

interface ApprovalStatCardsProps {
  awaitingPaymentCount: number;
  processedYTDCount: number;
  totalPendingPayoutAmount: number;
}

export const ApprovalStatCards: React.FC<ApprovalStatCardsProps> = ({
  awaitingPaymentCount,
  processedYTDCount,
  totalPendingPayoutAmount
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* Card 1: Awaiting Payment */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-slate-500">{t('approvals.readyDisburse') || 'Awaiting Payment'}</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#fef3c7] text-[#b45309]">
            Audit Due
          </span>
        </div>
        <div className="text-[26px] font-extrabold text-[#0c0d0f] tracking-tight">
          {awaitingPaymentCount} Requests
        </div>
        <div className="flex items-center space-x-2 pt-1">
          <span className="w-1 h-3.5 bg-[#d97706] rounded-full flex-shrink-0" />
          <span className="text-[11.5px] font-medium text-slate-400">Fully approved in workflow</span>
        </div>
      </div>

      {/* Card 2: Processed YTD */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-slate-500">{t('approvals.processedMonth') || 'Processed YTD'}</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#dcfce7] text-[#15803d]">
            Active Month
          </span>
        </div>
        <div className="text-[26px] font-extrabold text-[#0c0d0f] tracking-tight">
          {processedYTDCount} Claims
        </div>
        <div className="flex items-center space-x-2 pt-1">
          <span className="w-1 h-3.5 bg-[#16a34a] rounded-full flex-shrink-0" />
          <span className="text-[11.5px] font-medium text-slate-400">Completed payouts</span>
        </div>
      </div>

      {/* Card 3: Total Pending Payout */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-slate-500">{t('approvals.totalValue') || 'Total Pending Payout'}</span>
        </div>
        <div className="text-[26px] font-extrabold text-[#0c0d0f] tracking-tight">
          {totalPendingPayoutAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RP
        </div>
        <div className="flex items-center space-x-2 pt-1">
          <span className="w-1 h-3.5 bg-[#2563eb] rounded-full flex-shrink-0" />
          <span className="text-[11.5px] font-medium text-slate-400">In queue for bank transfer</span>
        </div>
      </div>
    </div>
  );
};
