import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import type { ReimbursementClaimSummary } from '../types';

interface BeneficiaryBankCardProps {
  claim: ReimbursementClaimSummary;
  isProcessing: boolean;
  onInitiatePayment: () => void;
  onCancel: () => void;
}

export const BeneficiaryBankCard: React.FC<BeneficiaryBankCardProps> = ({
  claim,
  isProcessing,
  onInitiatePayment,
  onCancel
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-7 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">
          {t('initiateReimbursement.beneficiaryDetails') || 'Beneficiary Bank Details'}
        </h2>
        <Link
          to={`/setup-beneficiary/${claim.claimId}`}
          className="px-2.5 py-0.5 rounded text-[10.5px] font-bold bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all cursor-pointer"
          title="Click to view or edit beneficiary account"
        >
          {t('initiateReimbursement.verifiedAccount') || 'Verified Account'}
        </Link>
      </div>

      <div className="space-y-3.5 text-[13px]">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">{t('setupBeneficiary.bankName') || 'Bank Name'}</span>
          <span className="text-slate-900 font-bold">{claim.bankName}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">{t('setupBeneficiary.accountHolder') || 'Account Holder Name'}</span>
          <span className="text-slate-900 font-bold">{claim.accountHolderName}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">{t('setupBeneficiary.accountNumber') || 'Account Number'}</span>
          <span className="text-slate-900 font-mono font-bold tracking-wider">
            {claim.accountNumber}
          </span>
        </div>
      </div>

      {/* Attention Controller Alert Box */}
      <div className="p-4 bg-[#fef9c3]/80 border border-[#fde047]/60 rounded-xl space-y-1.5">
        <h4 className="text-[11.5px] font-extrabold text-[#854d0e] uppercase tracking-wider">
          {t('initiateReimbursement.attentionController') || 'ATTENTION CONTROLLER'}
        </h4>
        <p className="text-[11.5px] text-[#713f12] font-medium leading-relaxed">
          {t('initiateReimbursement.attentionDesc') || 'By clicking Initiate Payment below, you authorize the immediate dispatch of funds to the verified employee bank account details shown above.'}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl text-[12.5px] transition-all cursor-pointer flex-1 text-center"
        >
          {t('initiateReimbursement.cancelExecution') || 'Cancel Execution'}
        </button>

        <button
          type="button"
          onClick={onInitiatePayment}
          disabled={isProcessing}
          className="px-6 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-xl text-[12.5px] shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2 flex-1"
        >
          <span>{isProcessing ? (t('common.loading') || 'Processing...') : (t('initiateReimbursement.initiatePayment') || 'Initiate Payment')}</span>
          {!isProcessing && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

