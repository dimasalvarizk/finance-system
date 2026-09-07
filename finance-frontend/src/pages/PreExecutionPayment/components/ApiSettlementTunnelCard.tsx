import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Check, Info } from 'lucide-react';
import type { PaymentExecutionData } from '../types';

interface ApiSettlementTunnelCardProps {
  data: PaymentExecutionData;
  onComplete: () => void;
}

export const ApiSettlementTunnelCard: React.FC<ApiSettlementTunnelCardProps> = ({
  data,
  onComplete
}) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(4); // Default to Step 4 (Dispatching) as in Image 2

  useEffect(() => {
    // Progress lifecycle from 4 -> 5 -> Complete
    const timer1 = setTimeout(() => {
      setCurrentStep(5);
    }, 1800);

    const timer2 = setTimeout(() => {
      onComplete();
    }, 3200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onComplete]);

  const lifecycleSteps = [
    { number: 1, label: t('initiateReimbursement.initiatePayment') || 'Initiated' },
    { number: 2, label: 'API Handshake' },
    { number: 3, label: 'Balance Verified' },
    { number: 4, label: 'Dispatching' },
    { number: 5, label: t('common.completed') || 'Completed' }
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-8 sm:p-12 space-y-9 max-w-[920px] w-full mx-auto font-sans">
      {/* Centered Loading Animation */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto ring-8 ring-blue-50/50">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>

        <div className="space-y-1">
          <h2 className="text-[20px] font-bold text-slate-900 tracking-tight">
            {t('preExecutionPayment.tunnelTitle') || 'Executing Direct Bank Transfer'}
          </h2>
          <p className="text-[12.5px] text-slate-500 font-medium">
            {t('preExecutionPayment.tunnelSubtitle') || `SOSA API Tunnel: Handshaking with ${data.debitBank} gateways...`}
          </p>
        </div>
      </div>

      {/* Realtime API Dispatch Lifecycle Card */}
      <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-100 space-y-5">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-left">
          REALTIME API DISPATCH LIFECYCLE
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between relative px-2">
          {lifecycleSteps.map((step, idx) => {
            const isLast = idx === lifecycleSteps.length - 1;
            const isDone = step.number < currentStep;
            const isActive = step.number === currentStep;

            return (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center text-center z-10 space-y-1.5 flex-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] transition-all ${
                      isDone
                        ? 'bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0]'
                        : isActive
                        ? 'bg-blue-600 text-white border-2 border-blue-600 ring-4 ring-blue-100 animate-pulse'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {isDone ? (
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <span>{step.number}</span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-semibold ${
                      isDone
                        ? 'text-slate-800 font-bold'
                        : isActive
                        ? 'text-blue-600 font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {!isLast && (
                  <div
                    className={`h-[2px] flex-1 -mt-4 transition-all ${
                      step.number < currentStep
                        ? 'bg-[#15803d]'
                        : step.number === currentStep
                        ? 'border-t-2 border-dotted border-blue-400'
                        : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Details List */}
      <div className="space-y-3 text-[13px] border-t border-slate-100 pt-6">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">Transaction Trace ID</span>
          <span className="text-slate-900 font-mono font-bold">{data.transactionTraceId}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">Settlement Endpoint</span>
          <span className="text-slate-900 font-bold">{data.debitBank.replace(' Bank', '')} Host-to-Host</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">Estimated Completion Time</span>
          <span className="text-slate-900 font-bold">&lt; 30 seconds</span>
        </div>
      </div>

      {/* Info Warning Footer */}
      <div className="flex items-center space-x-2 text-[12px] text-slate-400 font-medium pt-2">
        <Info className="w-4 h-4 flex-shrink-0" />
        <p>This panel refreshes automatically. Do not reload or navigate away from the page.</p>
      </div>
    </div>
  );
};

