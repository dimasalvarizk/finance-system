import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import type { ReimbursementClaimSummary, ReimbursementSuccessState } from './types';
import { ClaimSummaryCard } from './components/ClaimSummaryCard';
import { PaymentMethodCard } from './components/PaymentMethodCard';
import { BeneficiaryBankCard } from './components/BeneficiaryBankCard';
import { DisbursementSuccessModal } from './components/DisbursementSuccessModal';
import { getCorporateExpenseById } from '../../services/expenseService';
import { getTeamMembers, getActiveBankingGatewaysSummary } from '../../services/settingService';

const InitiateReimbursement: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [isGatewayActive, setIsGatewayActive] = useState<boolean>(true);
  const [claim, setClaim] = useState<ReimbursementClaimSummary>({
    id: id || '',
    claimId: id || '',
    employeeName: '',
    department: '',
    expenseCategory: '',
    missionReference: '',
    amount: 0,
    currency: 'RP',
    bankName: 'Bank Danamon',
    accountHolderName: '',
    accountNumber: '',
    status: 'Approved & Ready'
  });

  const [isProcessing] = useState(false);
  const [successModalData, setSuccessModalData] = useState<ReimbursementSuccessState | null>(null);

  const fetchClaim = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    try {
      const [data, teamList, gateways] = await Promise.all([
        getCorporateExpenseById(id),
        getTeamMembers().catch(() => []),
        getActiveBankingGatewaysSummary().catch(() => [])
      ]);

      if (Array.isArray(gateways)) {
        if (gateways.length === 0) {
          setIsGatewayActive(false);
        } else {
          const activeDanamon = gateways.find(
            (g: any) =>
              g.isActive &&
              (g.id === 'gw_danamon' || g.bankCode === 'DANAMON_ID' || (g.bankName && g.bankName.includes('Danamon')))
          );
          setIsGatewayActive(Boolean(activeDanamon || gateways.some((g: any) => g.isActive)));
        }
      }

      if (data) {
        const teamMembers: any[] = Array.isArray(teamList) ? teamList : [];
        const empName = data.submittedByName || data.submittedBy || data.employeeName || '';
        const matchedUser = teamMembers.find(
          (u) =>
            (u.name && empName && u.name.trim().toLowerCase() === empName.trim().toLowerCase()) ||
            (u.email && data.submittedBy && u.email.trim().toLowerCase() === data.submittedBy.trim().toLowerCase()) ||
            (u.id && data.submittedById && String(u.id) === String(data.submittedById))
        );

        setClaim({
          id: String(data.id || data.claimId),
          claimId: data.claimId || `EXP-${data.id}`,
          employeeName: matchedUser?.name || empName || 'Employee',
          department: matchedUser?.department || data.department || 'Operations',
          expenseCategory: data.category || data.expenseCategory || 'General Expense',
          missionReference: data.reason || data.description || data.projectRef || 'Mission Reference',
          amount: parseFloat(data.amount) || 0,
          currency: data.currency || 'RP',
          bankName: data.bankName || 'Bank Danamon',
          accountHolderName: data.bankAccountHolder || matchedUser?.name || empName || 'Employee',
          accountNumber: data.bankAccountNumber || '0000000000000000',
          status: data.status === 'Paid' ? 'Disbursed' : 'Approved & Ready'
        });
        return;
      }
    } catch (err) {
      console.warn('Backend lookup failed, checking local storage:', err);
    } finally {
      setLoading(false);
    }

    try {
      const localApproved = localStorage.getItem('finance_approved_expenses_v3') || localStorage.getItem('finance_approved_expenses');
      if (localApproved) {
        const parsed = JSON.parse(localApproved);
        if (Array.isArray(parsed)) {
          const found = parsed.find(
            (item: any) =>
              (item.claimId && item.claimId.toLowerCase() === id.toLowerCase()) ||
              item.id === id
          );
          if (found) {
            setClaim({
              id: String(found.id || found.claimId),
              claimId: found.claimId || `EXP-${found.id}`,
              employeeName: found.employee || found.submittedByName || found.employeeName || 'Staff Member',
              department: found.department || 'Operations',
              expenseCategory: found.category || found.expenseCategory || 'General',
              missionReference: found.reason || found.description || found.missionReference || 'Mission Expense',
              amount: parseFloat(found.amount) || 0,
              currency: found.currency || 'RP',
              bankName: found.bankName || 'Bank Danamon',
              accountHolderName: found.bankAccountHolder || found.employee || found.submittedByName || 'Staff Member',
              accountNumber: found.bankAccountNumber || found.accountNumber || '0000000000000000',
              status: found.status === 'Paid' ? 'Disbursed' : 'Approved & Ready'
            });
            return;
          }
        }
      }
    } catch {
      // ignore
    }
  }, [id]);

  useEffect(() => {
    fetchClaim();
  }, [fetchClaim]);

  const formatAmount = (num: number, curr: string = 'RP') => {
    const formatted = new Intl.NumberFormat('id-ID').format(num);
    return `${formatted} ${curr.toUpperCase()}`;
  };

  const handleInitiatePayment = () => {
    navigate(`/pre-execution-payment/${claim.claimId}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-full bg-[#f8fafc] select-none font-inter">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <Header />
          <div className="flex-1 flex items-center justify-center p-16">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-[13px] font-semibold text-slate-600">{t('common.loading')}</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-[#f8fafc] select-none font-inter">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <div className="flex-1 p-6 sm:p-8 space-y-7 max-w-[1400px] w-full mx-auto">
          {/* Top Title & Header */}
          <div className="space-y-1">
            <h1 className="text-[26px] font-bold text-[#0c0d0f] tracking-tight">
              {t('initiateReimbursement.title') || 'Initiate Bank Reimbursement'}
            </h1>
            <p className="text-[13px] text-[#64748b] font-medium">
              {t('initiateReimbursement.subtitle') || 'Confirm claim details and initiate immediate automatic payout through Al Rajhi integrated bank API.'}
            </p>
          </div>

          {/* 2-Column Responsive Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (7 cols): Claim Summary + Payment Method Selection */}
            <div className="lg:col-span-6 space-y-6">
              <ClaimSummaryCard
                claim={claim}
                formatAmount={formatAmount}
              />

              <PaymentMethodCard
                bankName={claim.bankName}
                isActive={isGatewayActive}
              />
            </div>

            {/* Right Column (6 cols): Beneficiary Bank Details & Action */}
            <div className="lg:col-span-6">
              <BeneficiaryBankCard
                claim={claim}
                isProcessing={isProcessing}
                isGatewayActive={isGatewayActive}
                onInitiatePayment={handleInitiatePayment}
                onCancel={() => navigate('/approvals')}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Success Modal */}
      <DisbursementSuccessModal
        data={successModalData}
        onClose={() => setSuccessModalData(null)}
        formatAmount={formatAmount}
      />
    </div>
  );
};

export default InitiateReimbursement;
