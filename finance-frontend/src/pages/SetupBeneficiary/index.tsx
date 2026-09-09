import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import type { BeneficiaryAccountData, VerificationSuccessState } from './types';
import { DEFAULT_BENEFICIARY_DATA, BANK_CONFIGS } from './constants';
import { BeneficiaryBankingForm } from './components/BeneficiaryBankingForm';
import { VerificationSuccessModal } from './components/VerificationSuccessModal';
import { getCorporateExpenseById, updateCorporateExpenseStatus } from '../../services/expenseService';

const SetupBeneficiary: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [formData, setFormData] = useState<BeneficiaryAccountData>(() => {
    const saved = localStorage.getItem('finance_beneficiary_account');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const config = BANK_CONFIGS[parsed.bankName] || BANK_CONFIGS['Bank Negara Indonesia (BNI)'];
        return {
          ...DEFAULT_BENEFICIARY_DATA,
          ...parsed,
          targetCurrency: config.currency,
          swiftCode: config.swiftCode,
          bankBranch: config.bankBranch
        };
      } catch {
        return DEFAULT_BENEFICIARY_DATA;
      }
    }
    return DEFAULT_BENEFICIARY_DATA;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModalData, setSuccessModalData] = useState<VerificationSuccessState | null>(null);

  const fetchBeneficiaryData = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getCorporateExpenseById(id);
      if (data) {
        const rawBank = data.bankName || 'Bank Negara Indonesia (BNI)';
        const resolvedBank = rawBank.startsWith('Bank') ? rawBank : `Bank ${rawBank}`;
        const config = BANK_CONFIGS[resolvedBank] || BANK_CONFIGS[rawBank] || BANK_CONFIGS['Bank Negara Indonesia (BNI)'];
        const empName = data.bankAccountHolder || data.submittedByName || data.submittedBy || 'Dimas Alva Rizki';

        setFormData((prev) => ({
          ...prev,
          bankName: config.name,
          targetCurrency: config.currency,
          swiftCode: config.swiftCode,
          bankBranch: config.bankBranch,
          accountHolderName: empName,
          accountNumber: data.bankAccountNumber && data.bankAccountNumber !== '0000000000000000' ? data.bankAccountNumber : prev.accountNumber,
          iban: config.isIbanRequired ? prev.iban : '',
          employeeId: data.submittedById || prev.employeeId
        }));
      }
    } catch {
      // ignore
    }
  }, [id]);

  useEffect(() => {
    fetchBeneficiaryData();
  }, [fetchBeneficiaryData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (id) {
        await updateCorporateExpenseStatus(id, {
          bankName: formData.bankName,
          bankAccountNumber: formData.accountNumber,
          bankAccountHolder: formData.accountHolderName
        }).catch((err) => console.warn('Backend beneficiary sync failed:', err));
      }

      const updated: BeneficiaryAccountData = {
        ...formData,
        isVerified: true
      };

      try {
        localStorage.setItem('finance_beneficiary_account', JSON.stringify(updated));
      } catch (err) {
        console.error('Error saving beneficiary account', err);
      }

      setSuccessModalData({
        isOpen: true,
        bankName: formData.bankName,
        accountHolderName: formData.accountHolderName,
        accountNumber: formData.accountNumber,
        iban: formData.iban
      });
    } finally {
      setIsSubmitting(false);
    }
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

