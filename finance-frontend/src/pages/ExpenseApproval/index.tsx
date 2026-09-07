import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import type { ApprovalClaimDetail, ActionNotificationState } from './types';
import { DEFAULT_CLAIM_DETAIL } from './mockData';
import { ClaimProfileCard } from './components/ClaimProfileCard';
import { ReceiptDocumentCard } from './components/ReceiptDocumentCard';
import { ReceiptFullscreenModal } from './components/ReceiptFullscreenModal';
import { TransferSuccessModal } from './components/TransferSuccessModal';
import { ActionNotificationModal } from './components/ActionNotificationModal';

const ExpenseApproval: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [claim, setClaim] = useState<ApprovalClaimDetail>(() => {
    if (id) {
      return {
        ...DEFAULT_CLAIM_DETAIL,
        id: id,
        claimId: id
      };
    }
    return DEFAULT_CLAIM_DETAIL;
  });

  const [comment, setComment] = useState('');
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isTransferSuccessModalOpen, setIsTransferSuccessModalOpen] = useState(false);
  const [actionNotification, setActionNotification] = useState<ActionNotificationState | null>(null);

  const isFullyApproved = useMemo(() => {
    return claim.workflowSteps.every((s) => s.isApproved);
  }, [claim.workflowSteps]);

  const formatAmount = (num: number, curr: string = 'Rp') => {
    const formatted = new Intl.NumberFormat('id-ID').format(num);
    return `${formatted} ${curr}`;
  };

  const handleApprove = () => {
    const updatedSteps = claim.workflowSteps.map((step) => ({
      ...step,
      isApproved: true
    }));

    setClaim((prev) => ({
      ...prev,
      status: 'Approved',
      workflowSteps: updatedSteps
    }));

    setActionNotification({
      isOpen: true,
      title: 'Claim Approved',
      message: `The expense reimbursement claim ${claim.claimId} has been fully approved by all reviewers and is now ready for bank transfer.`,
      type: 'approve'
    });
  };

  const handleReject = () => {
    setClaim((prev) => ({
      ...prev,
      status: 'Rejected'
    }));

    setActionNotification({
      isOpen: true,
      title: 'Claim Rejected',
      message: `Reimbursement claim ${claim.claimId} has been rejected.${comment ? ` Reason: "${comment}"` : ''}`,
      type: 'reject'
    });
  };

  const handleClarification = () => {
    setActionNotification({
      isOpen: true,
      title: 'Clarification Requested',
      message: `A notification has been sent to ${claim.employeeName} requesting additional details.${comment ? ` Note: "${comment}"` : ''}`,
      type: 'clarify'
    });
  };

  const handleTransfer = () => {
    navigate(`/initiate-reimbursement/${claim.claimId}`);
  };

  const handleDownloadReceipt = () => {
    const receiptContent = `========================================
       ${claim.receiptVendor.name}
       ${claim.receiptVendor.location}
       ${claim.receiptVendor.vatId}
========================================
Items:
${claim.receiptVendor.items.map((i) => `- ${i.name.padEnd(30, ' ')} : ${formatAmount(i.amount, 'RP')}`).join('\n')}
----------------------------------------
TOTAL AMOUNT : ${formatAmount(claim.receiptVendor.total, 'RP')}
----------------------------------------
${claim.receiptVendor.paymentMethod}
${claim.receiptVendor.footerNote}
========================================`;

    const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Receipt_${claim.claimId}_${claim.receiptVendor.name.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen w-full bg-[#f8fafc] select-none font-inter">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <div className="flex-1 p-6 sm:p-8 space-y-6 max-w-[1400px] w-full mx-auto">
          {/* Top Title & Breadcrumb */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-[26px] font-bold text-[#0c0d0f] tracking-tight">
                {t('expenseApproval.title') || 'Expense Approval'}
              </h1>
              <p className="text-[13px] text-[#64748b] font-medium">
                {t('expenseApproval.subtitle') || `Review and process the pending reimbursement claim submitted by ${claim.employeeName}`}
              </p>
            </div>

            <div className="flex items-center space-x-2 text-[12.5px] font-medium text-slate-400">
              <Link to="/my-expenses" className="hover:text-slate-600 transition-colors">
                {t('expenses.title') || 'Expenses & Reimbursements'}
              </Link>
              <span>/</span>
              <Link to="/approvals" className="text-[#2563eb] font-semibold hover:underline">
                {t('approvals.title') || 'Approvals / Action'}
              </Link>
            </div>
          </div>

          {/* Main 2-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-6">
              <ClaimProfileCard
                claim={claim}
                comment={comment}
                setComment={setComment}
                isFullyApproved={isFullyApproved}
                onApprove={handleApprove}
                onReject={handleReject}
                onClarify={handleClarification}
                onTransfer={handleTransfer}
                formatAmount={formatAmount}
              />
            </div>

            <div className="lg:col-span-6">
              <ReceiptDocumentCard
                vendor={claim.receiptVendor}
                onDownload={handleDownloadReceipt}
                onMaximize={() => setIsReceiptModalOpen(true)}
                formatAmount={formatAmount}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <ReceiptFullscreenModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        claim={claim}
        onDownload={handleDownloadReceipt}
        formatAmount={formatAmount}
      />

      <TransferSuccessModal
        isOpen={isTransferSuccessModalOpen}
        onClose={() => setIsTransferSuccessModalOpen(false)}
        claim={claim}
        formatAmount={formatAmount}
      />

      <ActionNotificationModal
        data={actionNotification}
        onClose={() => setActionNotification(null)}
      />
    </div>
  );
};

export default ExpenseApproval;
