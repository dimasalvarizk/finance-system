import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, User } from 'lucide-react';
import type { PaymentExecutionData } from '../types';

interface PreExecutionReviewCardProps {
  data: PaymentExecutionData;
  onBack: () => void;
  onConfirm: () => void;
  formatAmount: (num: number, curr?: string) => string;
}

export const PreExecutionReviewCard: React.FC<PreExecutionReviewCardProps> = ({
  data,
  onBack,
  onConfirm,
  formatAmount
}) => {
  const { t } = useTranslation();
  const [otp, setOtp] = useState(data.otpCode);
  const [isVerifiedCheck, setIsVerifiedCheck] = useState(true);
  const [countdown, setCountdown] = useState(45);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResend = (e: React.MouseEvent) => {
    e.preventDefault();
    if (countdown === 0) {
      setCountdown(60);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-7 sm:p-9 space-y-7 max-w-[920px] w-full mx-auto">
      <h2 className="text-[17px] font-bold text-slate-900 tracking-tight">
        {t('preExecutionPayment.reviewTitle') || 'Transaction Review'}
      </h2>

      {/* Account Route Flow Diagram */}
      <div className="bg-slate-50/60 rounded-2xl p-6 border border-slate-100 space-y-4">
        {/* Debit Account (Sender) */}
        <div className="flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-100">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              {t('initiateReimbursement.fundingSource') || 'DEBIT ACCOUNT (SENDER)'}
            </span>
            <p className="text-[14px] font-bold text-slate-900">
              {data.debitBank}
            </p>
            <p className="text-[12px] font-mono text-slate-500">
              {t('setupBeneficiary.accountNumber')}: {data.debitAccountMasked}
            </p>
          </div>
        </div>

        {/* Vertical Dotted Connector */}
        <div className="pl-5">
          <div className="w-0.5 h-6 border-l-2 border-dotted border-slate-300" />
        </div>

        {/* Credit Account (Recipient) */}
        <div className="flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5 border border-amber-100">
            <User className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              {t('initiateReimbursement.beneficiaryDetails') || 'CREDIT ACCOUNT (RECIPIENT)'}
            </span>
            <p className="text-[14px] font-bold text-slate-900">
              {data.creditEmployee} ({data.creditBank})
            </p>
            <p className="text-[12px] font-mono text-slate-500">
              {t('setupBeneficiary.accountNumber')}: {data.creditAccount}
            </p>
          </div>
        </div>
      </div>

      {/* 3-Column Metadata Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
        <div>
          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
            {t('dashboard.ref') || 'CLAIM REFERENCE'}
          </span>
          <span className="text-[13.5px] font-bold text-slate-900">
            {data.claimReference}
          </span>
        </div>

        <div>
          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
            SETTLEMENT ROUTE
          </span>
          <span className="text-[13.5px] font-bold text-slate-900">
            {data.settlementRoute}
          </span>
        </div>

        <div>
          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
            ESTIMATED SPEED
          </span>
          <span className="text-[13.5px] font-bold text-emerald-600">
            {data.estimatedSpeed}
          </span>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-6 space-y-4">
        {/* Two-Factor Authentication OTP */}
        <div className="space-y-2">
          <label className="text-[12.5px] font-bold text-slate-800 block">
            {t('preExecutionPayment.enterOtp') || 'Two-Factor Authentication (OTP Code)'}
          </label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <input
              type="text"
              value={otp}
              maxLength={6}
              onChange={(e) => setOtp(e.target.value)}
              placeholder={t('preExecutionPayment.otpPlaceholder') || '6-digit OTP'}
              className="w-48 px-4 py-2 bg-white border-2 border-blue-500 rounded-xl text-[16px] font-mono font-bold text-blue-700 tracking-widest text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="text-[11.5px] text-slate-500 space-y-0.5">
              <p>OTP sent to financial controller & Chief Accountant's mobile phone.</p>
              <a
                href="#resend"
                onClick={handleResend}
                className="text-blue-600 font-semibold hover:underline cursor-pointer"
              >
                {countdown > 0 ? `Resend code (${countdown}s)` : 'Resend code now'}
              </a>
            </div>
          </div>
        </div>

        {/* Verification Checkbox */}
        <div className="pt-2">
          <label className="flex items-start space-x-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isVerifiedCheck}
              onChange={(e) => setIsVerifiedCheck(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 mt-0.5 cursor-pointer"
            />
            <span className="text-[12px] text-slate-600 leading-relaxed font-medium">
              I verify that the above details conform exactly to approved invoice{' '}
              <span className="font-bold text-slate-900">{data.invoiceVendor}</span>, VAT ID{' '}
              <span className="font-mono text-slate-800">{data.invoiceVatId}</span>, for{' '}
              <span className="font-bold text-slate-900">{formatAmount(data.amount, data.currency)}</span>
            </span>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-4 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="text-[13px] font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          {t('requests.backToListing') || 'Back to Claim'}
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={!isVerifiedCheck || otp.length < 4}
          className="px-6 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-xl text-[13px] shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
        >
          {t('preExecutionPayment.confirmAuthorize') || 'Confirm & Execute Payment'}
        </button>
      </div>
    </div>
  );
};

