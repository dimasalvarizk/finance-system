import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';

interface PaymentMethodCardProps {
  bankName: string;
}

export const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({ bankName }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-7 space-y-5">
      <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">
        {t('initiateReimbursement.fundingSource') || 'Payment Method Selection'}
      </h2>

      {/* Selected Radio Box */}
      <div className="p-4 rounded-xl border-2 border-blue-500 bg-blue-50/20 flex items-start space-x-3.5 transition-all">
        {/* Checked Radio Dot */}
        <div className="w-5 h-5 rounded-full border-2 border-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
        </div>

        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[13.5px] font-bold text-slate-900">
              {t('approvals.transferToBank') || 'Direct Bank Transfer'}
            </span>
            <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-[#dcfce7] text-[#15803d]">
              {t('common.active') || 'Active'} API Integrated
            </span>
          </div>
          <p className="text-[12px] text-slate-500 font-medium leading-relaxed">
            Initiates instantaneous local settlement via automated host-to-host channel.
          </p>
        </div>
      </div>

      {/* API Gateway Status Callout */}
      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center space-x-3">
        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5" />
        </div>
        <p className="text-[12px] text-slate-600 font-medium">
          Connected directly to <span className="font-bold text-slate-900">{bankName} Bank API Gateway</span>. Corporate Account balance verified.
        </p>
      </div>
    </div>
  );
};

