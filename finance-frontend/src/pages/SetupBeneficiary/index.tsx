import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import type { BeneficiaryAccountData, VerificationSuccessState } from './types';
import { DEFAULT_BENEFICIARY_DATA } from './constants';
import { BeneficiaryBankingForm } from './components/BeneficiaryBankingForm';
import { VerificationSuccessModal } from './components/VerificationSuccessModal';

const SetupBeneficiary: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [formData, setFormData] = useState<BeneficiaryAccountData>(() => {
    const saved = localStorage.getItem('finance_beneficiary_account');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_BENEFICIARY_DATA;
      }
    }
    return DEFAULT_BENEFICIARY_DATA;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModalData, setSuccessModalData] = useState<VerificationSuccessState | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      const updated: BeneficiaryAccountData = {
        ...formData,
        isVerified: true
      };

      try {
        localStorage.setItem('finance_beneficiary_account', JSON.stringify(updated));
      } catch (err) {
        console.error('Error saving beneficiary account', err);
      }

      setIsSubmitting(false);
      setSuccessModalData({
        isOpen: true,
        bankName: formData.bankName,
        accountHolderName: formData.accountHolderName,
        accountNumber: formData.accountNumber,
        iban: formData.iban
      });
    }, 600);
  };

  return (
    <div className="flex min-h-screen w-full bg-[#f8fafc] select-none font-inter">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <div className="flex-1 p-6 sm:p-8 space-y-7 max-w-[1200px] w-full mx-auto">
          {/* Top Title & Header */}
          <div className="space-y-1">
            <h1 className="text-[26px] font-bold text-[#0c0d0f] tracking-tight">
              {t('setupBeneficiary.title') || 'Setup Beneficiary Account'}
            </h1>
            <p className="text-[13px] text-[#64748b] font-medium">
              {t('setupBeneficiary.subtitle') || 'Provide the verified destination banking credentials for reimbursement. All transfers settle instantly upon validation.'}
            </p>
          </div>

          {/* Form */}
          <BeneficiaryBankingForm
            formData={formData}
            setFormData={setFormData}
            isSubmitting={isSubmitting}
            onCancel={() => navigate('/approvals')}
            onSubmit={handleSubmit}
          />
        </div>
      </main>

      {/* Verification Success Modal */}
      <VerificationSuccessModal
        data={successModalData}
        onClose={() => setSuccessModalData(null)}
      />
    </div>
  );
};

export default SetupBeneficiary;

