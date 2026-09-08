import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { Loader2 } from 'lucide-react';
import type { ApprovalClaimDetail, ActionNotificationState, WorkflowStep } from './types';
import { DEFAULT_CLAIM_DETAIL } from './mockData';
import { INITIAL_APPROVED_EXPENSES } from '../Approvals/mockData';
import { ClaimProfileCard } from './components/ClaimProfileCard';
import { ReceiptDocumentCard } from './components/ReceiptDocumentCard';
import { ReceiptFullscreenModal } from './components/ReceiptFullscreenModal';
import { TransferSuccessModal } from './components/TransferSuccessModal';
import { ActionNotificationModal } from './components/ActionNotificationModal';
import { useAuth } from '../../context/AuthContext';
import { checkIsAuthorizedApprover } from '../../utils/approvalPermissions';
import {
  getCorporateExpenseById,
  updateCorporateExpenseStatus
} from '../../services/expenseService';

/**
 * Standard 3-Tier Executive Authorization Steps
 * Step 1: Mr. Hesham Mokhtar (Finance Director)
 * Step 2: Mr. Khalid Idriss (Branch General Manager)
 * Step 3: Mr. Emad Moustafa (Financial Controller / Treasury)
 */
export const computeWorkflowSteps = (
  status: string = '',
  approvalChain: string = '',
  dateSubmitted: string = '',
  existingTimeline?: any[]
): WorkflowStep[] => {
  const normStatus = (status || '').toLowerCase().trim();
  const normChain = (approvalChain || '').toLowerCase().trim();
  const defaultDate = dateSubmitted || 'Oct 24, 2026';

  const baseSteps: WorkflowStep[] = [
    {
      stepNumber: 1,
      approver: 'Mr. Hesham Mokhtar',
      role: 'Finance Director',
      isApproved: false,
      date: defaultDate
    },
    {
      stepNumber: 2,
      approver: 'Mr. Khalid Idriss',
      role: 'Branch General Manager',
      isApproved: false,
      date: defaultDate
    },
    {
      stepNumber: 3,
      approver: 'Mr. Emad Moustafa',
      role: 'Financial Controller / Treasury',
      isApproved: false,
      date: defaultDate
    }
  ];

  // 1. Fully Approved or Paid / Disbursed / Transferred
  if (
    normStatus === 'approved' ||
    normStatus === 'paid' ||
    normStatus === 'transferred' ||
    normStatus === 'disbursed' ||
    normChain.includes('3/3')
  ) {
    return baseSteps.map((s) => ({ ...s, isApproved: true }));
  }

  // 2. Ready for Payment / 2 of 3 steps completed (Awaiting Step 3 Controller review)
  if (
    normStatus === 'ready for payment' ||
    normStatus.includes('hesham review') ||
    normChain.includes('2/3')
  ) {
    return [
      { ...baseSteps[0], isApproved: true },
      { ...baseSteps[1], isApproved: true },
      { ...baseSteps[2], isApproved: false }
    ];
  }

  // 3. 1 of 3 steps completed (Awaiting Step 2 Branch GM review)
  if (
    normStatus.includes('khalid review') ||
    normChain.includes('1/3')
  ) {
    return [
      { ...baseSteps[0], isApproved: true },
      { ...baseSteps[1], isApproved: false },
      { ...baseSteps[2], isApproved: false }
    ];
  }

  // 4. Pending initial state (0/3)
  if (normStatus === 'pending' || normChain.includes('0/3')) {
    return [
      { ...baseSteps[0], isApproved: false },
      { ...baseSteps[1], isApproved: false },
      { ...baseSteps[2], isApproved: false }
    ];
  }

  // 5. If custom timeline exists with completed count
  if (Array.isArray(existingTimeline) && existingTimeline.length > 0) {
    const completedCount = existingTimeline.filter((t) => t.status === 'completed').length;
    return baseSteps.map((s, idx) => ({
      ...s,
      isApproved: idx < completedCount
    }));
  }

  // Default fallback: 2/3 approved (awaiting final approval on this review screen)
  return [
    { ...baseSteps[0], isApproved: true },
    { ...baseSteps[1], isApproved: true },
    { ...baseSteps[2], isApproved: false }
  ];
};

const ExpenseApproval: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [claim, setClaim] = useState<ApprovalClaimDetail>(() => {
    if (id) {
      const foundMock = INITIAL_APPROVED_EXPENSES.find(
        (item) => item.claimId.toLowerCase() === id.toLowerCase() || item.id === id
      );
      if (foundMock) {
        return {
          id: String(foundMock.id || foundMock.claimId),
          claimId: foundMock.claimId,
          employeeName: foundMock.employee,
          employeeId: foundMock.employeeId || 'EMP-101',
          department: foundMock.department,
          category: foundMock.category,
          missionReference: foundMock.reason,
          amount: foundMock.amount,
          currency: foundMock.currency || 'RP',
          dateSubmitted: foundMock.approvedDate,
          bankName: foundMock.bankName,
          bankAccountNumber: foundMock.bankAccountNumber,
          status: foundMock.status === 'Disbursed' ? 'Transferred' : 'In Review',
          workflowSteps: computeWorkflowSteps(
            foundMock.status,
            foundMock.approvalChain,
            foundMock.approvedDate
          ),
          receiptVendor: {
            name: foundMock.receiptName || `${foundMock.category} Receipt`,
            location: 'Corporate Branch Operations',
            vatId: 'VAT-SA-30049281900003',
            items: [{ name: foundMock.reason, amount: foundMock.amount }],
            total: foundMock.amount,
            paymentMethod: `${foundMock.bankName} - ${foundMock.bankAccountNumber}`,
            footerNote: foundMock.notes || 'Tax invoice validated for corporate auditing.'
          }
        };
      }
      return {
        ...DEFAULT_CLAIM_DETAIL,
        id: id,
        claimId: id
      };
    }
    return DEFAULT_CLAIM_DETAIL;
  });

  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isTransferSuccessModalOpen, setIsTransferSuccessModalOpen] = useState(false);
  const [actionNotification, setActionNotification] = useState<ActionNotificationState | null>(null);

  const [itSimulatedApprover, setItSimulatedApprover] = useState<
    'Mr. Hesham Mokhtar' | 'Mr. Khalid Idriss' | 'Mr. Emad Moustafa' | 'BYPASS_ALL' | null
  >(null);

  const currentActiveStepNumber = useMemo(() => {
    const steps = claim.workflowSteps || [];
    const firstPendingIdx = steps.findIndex((s) => !s.isApproved);
    return firstPendingIdx === -1 ? 3 : firstPendingIdx + 1;
  }, [claim.workflowSteps]);

  const {
    isAuthorizedApprover,
    matchedApproverName,
    canApproveCurrentStep,
    currentRequiredApprover,
    currentRequiredRole,
    restrictionReason,
    isITDeveloper
  } = useMemo(() => {
    return checkIsAuthorizedApprover(user, currentActiveStepNumber, itSimulatedApprover);
  }, [user, currentActiveStepNumber, itSimulatedApprover]);

  const fetchClaimDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // 1. Try Backend API
      try {
        const data = await getCorporateExpenseById(id);
        if (data) {
          const mapped: ApprovalClaimDetail = {
            id: String(data.id || data.claimId),
            claimId: data.claimId || `EXP-${data.id}`,
            employeeName: data.submittedByName || data.submittedBy || 'Administrator',
            employeeId: data.submittedById || 'EMP-101',
            department: data.department || 'Operations',
            category: data.category || 'General',
            missionReference: data.notes || data.projectRef || data.description || data.reason || 'Corporate Mission',
            amount: parseFloat(data.amount) || 0,
            currency: data.currency || 'RP',
            dateSubmitted: data.expenseDate || data.submitDate || 'N/A',
            bankName: data.bankName || 'Bank Danamon',
            bankAccountNumber: data.bankAccountNumber || '0000000000000000',
            status: data.status === 'Approved'
              ? 'Approved'
              : data.status === 'Paid'
              ? 'Transferred'
              : data.status === 'Rejected'
              ? 'Rejected'
              : 'In Review',
            workflowSteps: computeWorkflowSteps(
              data.status,
              data.approvalChain || '',
              data.expenseDate || data.submitDate,
              data.approvalTimeline
            ),
            receiptVendor: {
              name: (data.receipts && data.receipts[0]?.name) || `${data.category} Receipt`,
              location: 'Corporate Branch Operations',
              vatId: 'VAT-SA-30049281900003',
              items: [
                { name: data.description || data.reason || data.category, amount: parseFloat(data.amount) || 0 }
              ],
              total: parseFloat(data.amount) || 0,
              paymentMethod: `${data.bankName || 'Bank Danamon'} - ${data.bankAccountNumber || '0000000000000000'}`,
              footerNote: 'Tax invoice & receipt validated for corporate auditing.'
            }
          };
          setClaim(mapped);
          return;
        }
      } catch (err) {
        console.warn('Backend lookup failed, checking local state:', err);
      }

      // 2. Try LocalStorage
      try {
        const localApproved = localStorage.getItem('finance_approved_expenses_v3') || localStorage.getItem('finance_approved_expenses');
        if (localApproved) {
          const parsed = JSON.parse(localApproved);
          if (Array.isArray(parsed)) {
            const found = parsed.find(
              (item: any) =>
                (item.claimId && item.claimId.toLowerCase() === id.toLowerCase()) ||
                item.id === id
            );
            if (found) {
              setClaim({
                id: String(found.id || found.claimId),
                claimId: found.claimId || `EXP-${found.id}`,
                employeeName: found.employee || found.submittedByName || 'Administrator',
                employeeId: found.employeeId || 'EMP-101',
                department: found.department || 'Operations',
                category: found.category || 'General',
                missionReference: found.reason || found.description || 'Corporate Mission',
                amount: parseFloat(found.amount) || 0,
                currency: found.currency || 'RP',
                dateSubmitted: found.approvedDate || 'N/A',
                bankName: found.bankName || 'Bank Danamon',
                bankAccountNumber: found.bankAccountNumber || '0000000000000000',
                status: found.status === 'Paid' || found.status === 'Disbursed' ? 'Transferred' : found.status === 'Approved' ? 'Approved' : 'In Review',
                workflowSteps: computeWorkflowSteps(
                  found.status,
                  found.approvalChain || '',
                  found.approvedDate,
                  found.approvalTimeline
                ),
                receiptVendor: {
                  name: found.receiptName || `${found.category} Receipt`,
                  location: 'Corporate Branch Operations',
                  vatId: 'VAT-SA-30049281900003',
                  items: [{ name: found.reason || found.category, amount: parseFloat(found.amount) || 0 }],
                  total: parseFloat(found.amount) || 0,
                  paymentMethod: `${found.bankName || 'Bank Danamon'} - ${found.bankAccountNumber || '0000000000000000'}`,
                  footerNote: 'Tax invoice validated for corporate auditing.'
                }
              });
              return;
            }
          }
        }
      } catch {
        // ignore
      }

      // 3. Try INITIAL_APPROVED_EXPENSES
      const foundMock = INITIAL_APPROVED_EXPENSES.find(
        (item) => item.claimId.toLowerCase() === id.toLowerCase() || item.id === id
      );
      if (foundMock) {
        setClaim({
          id: String(foundMock.id || foundMock.claimId),
          claimId: foundMock.claimId,
          employeeName: foundMock.employee,
          employeeId: foundMock.employeeId || 'EMP-101',
          department: foundMock.department,
          category: foundMock.category,
          missionReference: foundMock.reason,
          amount: foundMock.amount,
          currency: foundMock.currency || 'RP',
          dateSubmitted: foundMock.approvedDate,
          bankName: foundMock.bankName,
          bankAccountNumber: foundMock.bankAccountNumber,
          status: foundMock.status === 'Disbursed' ? 'Transferred' : 'In Review',
          workflowSteps: computeWorkflowSteps(
            foundMock.status,
            foundMock.approvalChain,
            foundMock.approvedDate
          ),
          receiptVendor: {
            name: foundMock.receiptName || `${foundMock.category} Receipt`,
            location: 'Corporate Branch Operations',
            vatId: 'VAT-SA-30049281900003',
            items: [{ name: foundMock.reason, amount: foundMock.amount }],
            total: foundMock.amount,
            paymentMethod: `${foundMock.bankName} - ${foundMock.bankAccountNumber}`,
            footerNote: foundMock.notes || 'Tax invoice validated for corporate auditing.'
          }
        });
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClaimDetail();
  }, [fetchClaimDetail]);

  const isFullyApproved = useMemo(() => {
    return claim.workflowSteps.every((s) => s.isApproved);
  }, [claim.workflowSteps]);

  const formatAmount = (num: number, curr: string = 'Rp') => {
    const formatted = new Intl.NumberFormat('id-ID').format(num);
    return `${formatted} ${curr}`;
  };

  const handleApprove = async () => {
    if (!canApproveCurrentStep) {
      setActionNotification({
        isOpen: true,
        title: 'Akses Ditolak',
        message: restrictionReason || 'Anda tidak berwenang menyetujui tahap ini.',
        type: 'reject'
      });
      return;
    }

    const nowStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    const updatedSteps = claim.workflowSteps.map((step, idx) => {
      if (idx + 1 === currentActiveStepNumber) {
        return {
          ...step,
          isApproved: true,
          date: nowStr
        };
      }
      return step;
    });

    let nextBackendStatus = 'In Review';
    let nextStatus: 'Pending' | 'In Review' | 'Approved' | 'Transferred' | 'Rejected' = 'In Review';
    let nextChain = `${currentActiveStepNumber}/3 Approved`;

    if (currentActiveStepNumber === 1) {
      nextBackendStatus = 'Mr. Khalid Review';
      nextStatus = 'In Review';
      nextChain = '1/3 Approved';
    } else if (currentActiveStepNumber === 2) {
      nextBackendStatus = 'Ready for Payment';
      nextStatus = 'In Review';
      nextChain = '2/3 Approved';
    } else if (currentActiveStepNumber === 3) {
      nextBackendStatus = 'Approved';
      nextStatus = 'Approved';
      nextChain = '3/3 Approved';
    }

    try {
      await updateCorporateExpenseStatus(claim.id, {
        status: nextBackendStatus,
        notes: comment || undefined
      });
    } catch (err) {
      console.warn('Backend update failed, applying locally:', err);
    }

    // Sync localStorage
    try {
      const localApproved = localStorage.getItem('finance_approved_expenses_v3') || localStorage.getItem('finance_approved_expenses');
      if (localApproved) {
        const parsed = JSON.parse(localApproved);
        if (Array.isArray(parsed)) {
          const nextData = parsed.map((item: any) => {
            if ((item.claimId && item.claimId.toLowerCase() === claim.claimId.toLowerCase()) || item.id === claim.id) {
              return {
                ...item,
                status: nextBackendStatus,
                approvalChain: nextChain,
                notes: comment || item.notes
              };
            }
            return item;
          });
          localStorage.setItem('finance_approved_expenses_v3', JSON.stringify(nextData));
        }
      }
    } catch (e) {
      console.warn('LocalStorage sync failed:', e);
    }

    setClaim((prev) => ({
      ...prev,
      status: nextStatus,
      workflowSteps: updatedSteps
    }));

    setActionNotification({
      isOpen: true,
      title: t('expenseApproval.stageApprovedTitle', { step: currentActiveStepNumber }),
      message: currentActiveStepNumber === 3
        ? t('expenseApproval.fullyApprovedMsg', { claimId: claim.claimId })
        : t('expenseApproval.stepApprovedMsg', { step: currentActiveStepNumber, name: matchedApproverName }),
      type: 'approve'
    });
  };

  const handleReject = async () => {
    if (!canApproveCurrentStep) {
      setActionNotification({
        isOpen: true,
        title: t('expenseApproval.accessDeniedTitle') || 'Akses Ditolak',
        message: restrictionReason || t('expenseApproval.accessDeniedRejectMsg') || 'Anda tidak berwenang menolak klaim pada tahap ini.',
        type: 'reject'
      });
      return;
    }

    try {
      await updateCorporateExpenseStatus(claim.id, {
        status: 'Rejected',
        rejectionReason: comment || `Klaim ditolak oleh ${matchedApproverName}`
      });
    } catch (err) {
      console.warn('Backend reject failed, applying locally:', err);
    }

    setClaim((prev) => ({
      ...prev,
      status: 'Rejected'
    }));

    setActionNotification({
      isOpen: true,
      title: t('expenseApproval.claimRejectedTitle') || 'Claim Rejected',
      message: `${t('expenseApproval.claimRejectedMsg', { claimId: claim.claimId })}${comment ? ` Reason: "${comment}"` : ''}`,
      type: 'reject'
    });
  };

  const handleClarification = () => {
    if (!canApproveCurrentStep) {
      setActionNotification({
        isOpen: true,
        title: t('expenseApproval.accessDeniedTitle') || 'Akses Ditolak',
        message: restrictionReason || t('expenseApproval.accessDeniedClarifyMsg') || 'Anda tidak berwenang meminta klarifikasi pada tahap ini.',
        type: 'reject'
      });
      return;
    }

    setActionNotification({
      isOpen: true,
      title: t('expenseApproval.clarificationRequestedTitle') || 'Clarification Requested',
      message: `${t('expenseApproval.clarificationRequestedMsg', { name: claim.employeeName })}${comment ? ` Note: "${comment}"` : ''}`,
      type: 'clarify'
    });
  };

  const handleTransfer = () => {
    if (matchedApproverName !== 'Mr. Emad Moustafa') {
      setActionNotification({
        isOpen: true,
        title: t('expenseApproval.accessDeniedTitle') || 'Akses Ditolak',
        message: t('expenseApproval.accessDeniedDisburseMsg') || 'Hanya Mr. Emad Moustafa (Financial Controller / Treasury) yang dapat menginisiasi pencairan bank.',
        type: 'reject'
      });
      return;
    }
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
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3 bg-white rounded-2xl border border-slate-100 shadow-xs">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm font-medium text-slate-500">Loading claim details...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-6">
                <ClaimProfileCard
                  claim={claim}
                  comment={comment}
                  setComment={setComment}
                  isFullyApproved={isFullyApproved}
                  isAuthorizedApprover={isAuthorizedApprover}
                  matchedApproverName={matchedApproverName}
                  canApproveCurrentStep={canApproveCurrentStep}
                  currentActiveStepNumber={currentActiveStepNumber}
                  currentRequiredApprover={currentRequiredApprover}
                  currentRequiredRole={currentRequiredRole}
                  restrictionReason={restrictionReason}
                  isITDeveloper={isITDeveloper}
                  itDeveloperName="Ali (IT)"
                  itSimulationRole={itSimulatedApprover}
                  onSelectITSimulationRole={(role) => setItSimulatedApprover(role)}
                  onDirectNavigate={(path) => navigate(path)}
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
          )}
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

