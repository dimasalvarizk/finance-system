import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface PaymentMethodCardProps {
  bankName: string;
  isActive?: boolean;
}

export const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({ bankName, isActive = true }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-7 space-y-5">
      <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">
        {t('initiateReimbursement.fundingSource')}
      </h2>

      {/* Selected Radio Box */}
      <div
        className={`p-4 rounded-xl border-2 flex items-start space-x-3.5 transition-all ${
          isActive
            ? 'border-blue-500 bg-blue-50/20'
            : 'border-amber-300 bg-amber-50/30'
        }`}
      >
        {/* Radio Dot */}
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
            isActive ? 'border-blue-600' : 'border-amber-500'
          }`}
        >
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isActive ? 'bg-blue-600' : 'bg-amber-500'
            }`}
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[13.5px] font-bold text-slate-900">
              {t('initiateReimbursement.transferToBank')}
            </span>
            {isActive ? (
              <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-[#dcfce7] text-[#15803d]">
                {t('initiateReimbursement.apiIntegrated')}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-amber-100 text-amber-800">
                {t('initiateReimbursement.apiInactive')}
              </span>
            )}
          </div>
          <p className="text-[12px] text-slate-500 font-medium leading-relaxed">
            {t('initiateReimbursement.transferDesc')}
          </p>
        </div>
      </div>

      {/* API Gateway Status Callout */}
      <div
        className={`p-3.5 rounded-xl border flex items-center space-x-3 ${
          isActive
            ? 'bg-slate-50 border-slate-100'
            : 'bg-amber-50/60 border-amber-200'
        }`}
      >
        <div
          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
            isActive
              ? 'bg-emerald-100 text-emerald-600'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {isActive ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5" />
          )}
        </div>
        <p
          className={`text-[12px] font-medium ${
            isActive ? 'text-slate-600' : 'text-amber-800'
          }`}
        >
          {isActive
            ? t('initiateReimbursement.gatewayCallout', {
                bank: bankName.startsWith('Bank') ? bankName : `Bank ${bankName}`
              })
            : t('initiateReimbursement.gatewayInactiveCallout', {
                bank: bankName.startsWith('Bank') ? bankName : `Bank ${bankName}`
              })}
        </p>
      </div>
    </div>
  );
};


