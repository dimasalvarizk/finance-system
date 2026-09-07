import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import type { ReimbursementClaimSummary, ReimbursementSuccessState } from './types';
import { DEFAULT_REIMBURSEMENT_CLAIM } from './mockData';
import { ClaimSummaryCard } from './components/ClaimSummaryCard';
import { PaymentMethodCard } from './components/PaymentMethodCard';
import { BeneficiaryBankCard } from './components/BeneficiaryBankCard';
import { DisbursementSuccessModal } from './components/DisbursementSuccessModal';

const InitiateReimbursement: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [claim] = useState<ReimbursementClaimSummary>(() => {
    if (id) {
      return {
        ...DEFAULT_REIMBURSEMENT_CLAIM,
        id,
        claimId: id
      };
    }
    return DEFAULT_REIMBURSEMENT_CLAIM;
  });

  const [isProcessing] = useState(false);
  const [successModalData, setSuccessModalData] = useState<ReimbursementSuccessState | null>(null);

  const formatAmount = (num: number, curr: string = 'RP') => {
    const formatted = new Intl.NumberFormat('id-ID').format(num);
    return `${formatted} ${curr.toUpperCase()}`;
  };

  const handleInitiatePayment = () => {
    navigate(`/pre-execution-payment/${claim.claimId}`);
  };

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
              />
            </div>

            {/* Right Column (6 cols): Beneficiary Bank Details & Action */}
            <div className="lg:col-span-6">
              <BeneficiaryBankCard
                claim={claim}
                isProcessing={isProcessing}
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

