import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import type { PaymentExecutionData, ExecutionStep } from './types';
import { DEFAULT_EXECUTION_DATA } from './mockData';
import { PreExecutionReviewCard } from './components/PreExecutionReviewCard';
import { ApiSettlementTunnelCard } from './components/ApiSettlementTunnelCard';
import { PayoutDispatchedCard } from './components/PayoutDispatchedCard';
import { ComplianceAuditTrailCard } from './components/ComplianceAuditTrailCard';

const PreExecutionPayment: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [step, setStep] = useState<ExecutionStep>('review');
  const [data] = useState<PaymentExecutionData>(() => {
    if (id) {
      return {
        ...DEFAULT_EXECUTION_DATA,
        claimReference: id
      };
    }
    return DEFAULT_EXECUTION_DATA;
  });

  const formatAmount = (num: number, curr: string = 'RP') => {
    const formatted = new Intl.NumberFormat('id-ID').format(num);
    return `${formatted} ${curr.toUpperCase()}`;
  };

  const handleDownloadReceipt = () => {
    const receiptContent = `================================================
           PAYOUT DISBURSEMENT VOUCHER
================================================
Transaction ID      : ${data.transactionTraceId}
Acknowledgement Code: ${data.acknowledgementCode}
Timestamp           : ${data.transferTimestamp}
Claim Reference     : ${data.claimReference}

Debit Account       : ${data.debitBank} (${data.debitAccountMasked})
Credit Recipient    : ${data.creditEmployee} - ${data.creditBank}
Account Number      : ${data.creditAccount}

Settlement Route    : ${data.settlementRoute}
Invoice Vendor      : ${data.invoiceVendor} (VAT: ${data.invoiceVatId})

TOTAL AMOUNT SETTLED: ${formatAmount(data.amount, data.currency)}
STATUS              : PAID COMPLETED (HOST-TO-HOST)
================================================`;

    const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Voucher_${data.transactionTraceId}_${data.claimReference}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const pageHeaders = {
    review: {
      title: t('preExecutionPayment.reviewTitle') || 'Pre-Execution Payment Review',
      subtitle: t('preExecutionPayment.reviewSubtitle') || 'Perform dual-factor authorization. Ensure the audit trial complies with standard corporate governance thresholds.'
    },
    tunnel: {
      title: t('preExecutionPayment.tunnelTitle') || 'API Settlement Tunnel',
      subtitle: t('preExecutionPayment.tunnelSubtitle') || 'Al Rajhi API Host-to-Host connection handshake.'
    },
    dispatched: {
      title: t('preExecutionPayment.dispatchedTitle') || 'Payout Dispatched Successfully',
      subtitle: t('preExecutionPayment.dispatchedSubtitle') || 'Funds successfully routed and acknowledged by gateway. Audit receipts compiled.'
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#f8fafc] select-none font-inter">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <div className="flex-1 p-6 sm:p-8 space-y-7 max-w-[1400px] w-full mx-auto">
          {/* Dynamic Page Header */}
          <div className="space-y-1">
            <h1 className="text-[26px] font-bold text-[#0c0d0f] tracking-tight">
              {pageHeaders[step].title}
            </h1>
            <p className="text-[13px] text-[#64748b] font-medium">
              {pageHeaders[step].subtitle}
            </p>
          </div>

          {/* Conditional Multi-State Render */}
          {step === 'review' && (
            <PreExecutionReviewCard
              data={data}
              onBack={() => navigate('/initiate-reimbursement')}
              onConfirm={() => setStep('tunnel')}
              formatAmount={formatAmount}
            />
          )}

          {step === 'tunnel' && (
            <ApiSettlementTunnelCard
              data={data}
              onComplete={() => setStep('dispatched')}
            />
          )}

          {step === 'dispatched' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-6">
                <PayoutDispatchedCard
                  data={data}
                  onDownloadReceipt={handleDownloadReceipt}
                  formatAmount={formatAmount}
                />
              </div>

              <div className="lg:col-span-6">
                <ComplianceAuditTrailCard
                  logs={data.auditLogs}
                  claimReference={data.claimReference}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PreExecutionPayment;

