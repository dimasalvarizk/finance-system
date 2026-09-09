import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import type { VerificationSuccessState } from '../types';

interface VerificationSuccessModalProps {
  data: VerificationSuccessState | null;
  onClose: () => void;
}

export const VerificationSuccessModal: React.FC<VerificationSuccessModalProps> = ({
  data,
  onClose
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!data || !data.isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-[#0c0d0f]/60 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl text-center space-y-5 animate-scale-in font-sans transform-gpu"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h3 className="text-[19px] font-bold text-slate-900">
            {t('setupBeneficiary.accountVerified')}
          </h3>
          <p className="text-[13px] text-slate-500 leading-relaxed">
            {t('setupBeneficiary.modalVerifiedDesc', {
              name: data.accountHolderName,
              bank: data.bankName
            })}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <button
            onClick={() => {
              onClose();
              navigate('/initiate-reimbursement');
            }}
            className="w-full py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-[13px] rounded-xl shadow-sm transition-all cursor-pointer"
          >
            {t('setupBeneficiary.proceedToReimbursement')}
          </button>
          <button
            onClick={() => {
              onClose();
              navigate('/approvals');
            }}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[13px] rounded-xl transition-all cursor-pointer"
          >
            {t('approvals.title')}
          </button>
        </div>
      </div>
    </div>
  );
};

