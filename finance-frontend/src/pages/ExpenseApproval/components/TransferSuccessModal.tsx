import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import type { ApprovalClaimDetail } from '../types';

interface TransferSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: ApprovalClaimDetail;
  formatAmount: (num: number, curr?: string) => string;
}

export const TransferSuccessModal: React.FC<TransferSuccessModalProps> = ({
  isOpen,
  onClose,
  claim,
  formatAmount
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-[#0c0d0f]/60 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl text-center space-y-5 animate-scale-in transform-gpu"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h3 className="text-[18px] font-bold text-slate-900">
            Disbursement Dispatched!
          </h3>
          <p className="text-[13px] text-slate-500 leading-relaxed">
            Reimbursement payment of <span className="font-bold text-slate-800">{formatAmount(claim.amount, 'RP')}</span> has been queued for bank transfer to <span className="font-semibold text-slate-800">{claim.employeeName}</span> ({claim.bankName} - {claim.bankAccountNumber}).
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center space-x-3">
          <button
            onClick={() => {
              onClose();
              navigate('/approvals');
            }}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[13px] rounded-xl shadow-sm transition-all cursor-pointer"
          >
            Back to Approvals Queue
          </button>
        </div>
      </div>
    </div>
  );
};
