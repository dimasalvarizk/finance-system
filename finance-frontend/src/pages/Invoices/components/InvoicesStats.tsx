import React from 'react';
import { useTranslation } from 'react-i18next';
import StatCard from '../../../components/ui/StatCard';

interface InvoicesStatsProps {
  dynamicTotal: number;
  dynamicApproved: number;
  dynamicPending: number;
  dynamicOverdue: number;
  formattedOverdueBalance: string;
  successRate: string;
  loading: boolean;
}

export const InvoicesStats: React.FC<InvoicesStatsProps> = ({
  dynamicTotal,
  dynamicApproved,
  dynamicPending,
  dynamicOverdue,
  formattedOverdueBalance,
  successRate,
  loading,
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title={t('dashboard.totalConfirmations')}
        value={`${dynamicTotal} ${t('common.total')}`}
        subtext={t('dashboard.activeLedgerRecords')}
        badgeText={t('common.all')}
        badgeColorClass="bg-[#e0f2fe] text-[#0284c7]"
        isLoading={loading}
      />
      <StatCard
        title={t('common.statusApproved')}
        value={`${dynamicApproved} ${t('common.statusApproved')}`}
        subtext={t('invoices.clearedSubtext')}
        badgeText={`${successRate}%`}
        badgeColorClass="bg-[#ecfdf5] text-[#10b981]"
        isLoading={loading}
      />
      <StatCard
        title={t('dashboard.pendingApprovals')}
        value={`${dynamicPending} ${t('common.statusPending')}`}
        subtext={t('dashboard.requiresReview')}
        badgeText={t('invoices.awaitingClearance')}
        badgeColorClass="bg-[#fff7ed] text-[#f97316]"
        isLoading={loading}
      />
      <StatCard
        title={t('dashboard.overdueBalance')}
        value={formattedOverdueBalance}
        subtext={`${dynamicOverdue} ${dynamicOverdue !== 1 ? t('dashboard.overdueConfirmations') : t('dashboard.overdueConfirmation')}`}
        badgeText={t('dashboard.actionRequired')}
        badgeColorClass="bg-[#fef2f2] text-[#ef4444]"
        isLoading={loading}
      />
    </div>
  );
};
