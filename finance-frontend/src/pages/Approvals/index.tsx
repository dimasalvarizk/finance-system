import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { RefreshCw, AlertCircle } from 'lucide-react';
import type { ApprovedExpenseItem, ActionSuccessPayload } from './types';
import { ApprovalStatCards } from './components/ApprovalStatCards';
import { ApprovalTable } from './components/ApprovalTable';
import { ClaimAuditModal } from './components/ClaimAuditModal';
import { AddToPayrollModal } from './components/AddToPayrollModal';
import { BulkDeleteModal } from './components/BulkDeleteModal';
import { BankTransferModal } from './components/BankTransferModal';
import { ActionSuccessModal } from './components/ActionSuccessModal';
import { useAuth } from '../../context/AuthContext';
import { checkIsAuthorizedApprover } from '../../utils/approvalPermissions';
import {
  getCorporateExpenses,
  bulkActionCorporateExpenses
} from '../../services/expenseService';

const Approvals: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { isAuthorizedApprover } = useMemo(() => {
    return checkIsAuthorizedApprover(user);
  }, [user]);

  const [items, setItems] = useState<ApprovedExpenseItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modals state
  const [selectedClaimDetail, setSelectedClaimDetail] = useState<ApprovedExpenseItem | null>(null);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBankTransferModalOpen, setIsBankTransferModalOpen] = useState(false);
  const [payrollPeriod, setPayrollPeriod] = useState('October 2026 Cycle (End of Month)');
  const [transferRef, setTransferRef] = useState(`TRF-DISB-${Date.now().toString().slice(-6)}`);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionSuccessData, setActionSuccessData] = useState<ActionSuccessPayload | null>(null);

  const computeApprovalChain = (d: any): string => {
    if (d.status === 'Paid' || d.status === 'Disbursed') {
      return 'Disbursed';
    }
    if (Array.isArray(d.approvalTimeline) && d.approvalTimeline.length > 0) {
      const completedCount = d.approvalTimeline.filter((s: any) => s.status === 'completed').length;
      const count = Math.min(Math.max(completedCount, 1), 3);
      return `${count}/3 Approved`;
    }
    if (d.status === 'Approved' || d.status === 'Ready for Payment') {
      return '2/3 Approved';
    }
    if (d.status === 'Mr. Hesham Review') {
      return '2/3 Approved';
    }
    if (d.status === 'Mr. Khalid Review' || d.status === 'Mr.Khalid Review') {
      return '1/3 Approved';
    }
    if (d.status === 'Pending') {
      return '1/3 Approved';
    }
    if (d.status === 'Rejected') {
      return 'Rejected';
    }
    if (typeof d.approvalChain === 'string' && d.approvalChain.includes('/3')) {
      return d.approvalChain;
    }
    return '2/3 Approved';
  };

  const fetchApprovalClaims = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await getCorporateExpenses().catch(() => null);
      if (data && Array.isArray(data)) {
        const mapped: ApprovedExpenseItem[] = data.map((d: any) => ({
          id: String(d.id || d.claimId),
          claimId: d.claimId || `EXP-${d.id}`,
          employee: d.submittedByName || d.submittedBy || 'Administrator',
          employeeId: d.submittedById || 'EMP-101',
          department: d.department || 'Operations',
          reason: d.description || d.reason || 'Corporate Expense',
          category: d.category || 'General',
          approvedDate: d.expenseDate || d.submitDate || 'N/A',
          approvalChain: computeApprovalChain(d),
          amount: parseFloat(d.amount) || 0,
          currency: d.currency || 'RP',
          bankName: d.bankName || 'Bank Danamon',
          bankAccountNumber: d.bankAccountNumber || '0000000000000000',
          status: d.status === 'Paid'
            ? 'Disbursed'
            : d.disbursementMethod === 'Payroll'
            ? 'Queued for Payroll'
            : 'Ready for Payment',
          receiptsCount: d.receiptsCount || (d.receipts ? d.receipts.length : 0),
          receiptName: d.receipts && d.receipts[0]?.name,
          notes: d.notes
        }));
        setItems(mapped);
      } else {
        const localSaved = localStorage.getItem('finance_approved_expenses_v3') || localStorage.getItem('finance_approved_expenses');
        if (localSaved) {
          try {
            const parsed = JSON.parse(localSaved);
            if (Array.isArray(parsed)) setItems(parsed);
          } catch {
            setItems([]);
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching approval expenses:', err);
      setErrorMessage(err?.message || 'Gagal memuat antrean persetujuan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovalClaims();
  }, [fetchApprovalClaims]);

  // Active Ready for Payment Queue
  const readyItems = useMemo(() => {
    return items.filter((item) => item.status === 'Ready for Payment');
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return readyItems;
    return readyItems.filter(
      (item) =>
        (item.claimId && item.claimId.toLowerCase().includes(q)) ||
        (item.employee && item.employee.toLowerCase().includes(q)) ||
        (item.department && item.department.toLowerCase().includes(q)) ||
        (item.reason && item.reason.toLowerCase().includes(q)) ||
        (item.bankName && item.bankName.toLowerCase().includes(q)) ||
        String(item.amount).includes(q)
    );
  }, [readyItems, searchQuery]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  const selectedItems = useMemo(() => {
    return items.filter((item) => selectedIds.includes(item.id));
  }, [items, selectedIds]);

  const selectedTotalAmount = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.amount, 0);
  }, [selectedItems]);

  // Top Metrics from Real DB Data
  const awaitingPaymentCount = readyItems.length;
  const processedYTDCount = items.filter((item) => item.status !== 'Ready for Payment').length;
  const totalPendingPayoutAmount = readyItems.reduce((sum, item) => sum + item.amount, 0);

  const formatAmount = (num: number, curr: string = 'RP') => {
    const formatted = new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(num);
    return `${formatted} ${curr.toUpperCase()}`;
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allCurrentPageIds = paginatedItems.map((item) => item.id);
      const union = Array.from(new Set([...selectedIds, ...allCurrentPageIds]));
      setSelectedIds(union);
    } else {
      const currentIds = paginatedItems.map((item) => item.id);
      setSelectedIds(selectedIds.filter((id) => !currentIds.includes(id)));
    }
  };

  const handleToggleRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Action: Add to Payroll
  const handleConfirmAddToPayroll = async () => {
    setIsProcessingAction(true);
    try {
      await bulkActionCorporateExpenses({
        action: 'payroll',
        ids: selectedIds,
        payrollPeriod
      });
      setItems((prev) =>
        prev.map((item) =>
          selectedIds.includes(item.id) ? { ...item, status: 'Queued for Payroll' as const } : item
        )
      );
      setIsPayrollModalOpen(false);
      setActionSuccessData({
        isOpen: true,
        title: 'Queued to Payroll Successfully!',
        message: `${selectedItems.length} claim(s) totaling ${formatAmount(selectedTotalAmount)} have been successfully scheduled into the ${payrollPeriod}.`,
        type: 'payroll'
      });
      setSelectedIds([]);
    } catch (err: any) {
      console.error('Error adding to payroll:', err);
      alert('Gagal memproses klaim ke payroll: ' + (err?.message || 'Server error'));
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Action: Transfer to Bank
  const handleConfirmBankTransfer = async () => {
    setIsProcessingAction(true);
    try {
      await bulkActionCorporateExpenses({
        action: 'bank_transfer',
        ids: selectedIds,
        transferRef
      });
      setItems((prev) =>
        prev.map((item) =>
          selectedIds.includes(item.id) ? { ...item, status: 'Disbursed' as const } : item
        )
      );
      setIsBankTransferModalOpen(false);
      setActionSuccessData({
        isOpen: true,
        title: 'Bank Disbursement Dispatched!',
        message: `Corporate transfer batch ${transferRef} of ${formatAmount(selectedTotalAmount)} for ${selectedItems.length} recipient(s) has been transmitted to the bank payment gateway.`,
        type: 'bank'
      });
      setSelectedIds([]);
    } catch (err: any) {
      console.error('Error in bank transfer:', err);
      alert('Gagal memproses transfer bank: ' + (err?.message || 'Server error'));
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Action: Bulk Delete Selected Claims
  const handleConfirmBulkDelete = async () => {
    setIsProcessingAction(true);
    try {
      await bulkActionCorporateExpenses({
        action: 'delete',
        ids: selectedIds
      });
      const deletedCount = selectedItems.length;
      setItems((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
      setIsBulkDeleteModalOpen(false);
      setActionSuccessData({
        isOpen: true,
        title: 'Claims Deleted Successfully!',
        message: `${deletedCount} claim(s) have been permanently removed from the payment queue.`,
        type: 'bank'
      });
      setSelectedIds([]);
    } catch (err: any) {
      console.error('Error deleting claims:', err);
      alert('Gagal menghapus klaim: ' + (err?.message || 'Server error'));
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#f8fafc] select-none font-inter">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <div className="flex-1 p-8 space-y-7 max-w-[1400px] w-full mx-auto">
          {/* Top Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-[26px] font-bold text-[#0c0d0f] tracking-tight">
                {t('approvals.title') || 'Finance Processing Dashboard'}
              </h1>
              <p className="text-[13px] text-[#64748b] font-medium">
                {t('approvals.subtitle') || 'Audit approved claims, prepare bank disbursements, export validated listings to your ERP'}
              </p>
            </div>

            <button
              onClick={fetchApprovalClaims}
              disabled={loading}
              title="Refresh Data"
              className="p-2.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50 self-start sm:self-auto"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>

          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 3 Stat Cards */}
          <ApprovalStatCards
            awaitingPaymentCount={awaitingPaymentCount}
            processedYTDCount={processedYTDCount}
            totalPendingPayoutAmount={totalPendingPayoutAmount}
          />

          {/* Table Container */}
          <ApprovalTable
            paginatedItems={paginatedItems}
            filteredCount={filteredItems.length}
            selectedIds={selectedIds}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            isAuthorized={isAuthorizedApprover}
            onSelectAll={handleSelectAll}
            onToggleRow={handleToggleRow}
            onOpenPayrollModal={() => {
              if (!isAuthorizedApprover) {
                alert('Akses Ditolak: Hanya 3 pejabat persetujuan resmi (Mr. Hesham Mokhtar, Mr. Khalid Idriss, Mr. Emad Moustafa) yang dapat memproses klaim ke payroll.');
                return;
              }
              setIsPayrollModalOpen(true);
            }}
            onOpenBankTransferModal={() => {
              if (!isAuthorizedApprover) {
                alert('Akses Ditolak: Hanya 3 pejabat persetujuan resmi (Mr. Hesham Mokhtar, Mr. Khalid Idriss, Mr. Emad Moustafa) yang dapat memproses transfer bank.');
                return;
              }
              setIsBankTransferModalOpen(true);
            }}
            onOpenBulkDeleteModal={() => {
              if (!isAuthorizedApprover) {
                alert('Akses Ditolak: Hanya pejabat berwenang yang dapat menghapus klaim persetujuan.');
                return;
              }
              setIsBulkDeleteModalOpen(true);
            }}
            onOpenClaimDetail={(item) => setSelectedClaimDetail(item)}
            formatAmount={formatAmount}
          />
        </div>
      </main>

      {/* Claim Audit Modal */}
      <ClaimAuditModal
        item={selectedClaimDetail}
        onClose={() => setSelectedClaimDetail(null)}
        formatAmount={formatAmount}
      />

      {/* Action Modals */}
      <AddToPayrollModal
        isOpen={isPayrollModalOpen}
        onClose={() => setIsPayrollModalOpen(false)}
        selectedItems={selectedItems}
        selectedTotalAmount={selectedTotalAmount}
        payrollPeriod={payrollPeriod}
        setPayrollPeriod={setPayrollPeriod}
        isProcessing={isProcessingAction}
        onConfirm={handleConfirmAddToPayroll}
        formatAmount={formatAmount}
      />

      <BankTransferModal
        isOpen={isBankTransferModalOpen}
        onClose={() => setIsBankTransferModalOpen(false)}
        selectedItems={selectedItems}
        selectedTotalAmount={selectedTotalAmount}
        transferRef={transferRef}
        setTransferRef={setTransferRef}
        isProcessing={isProcessingAction}
        onConfirm={handleConfirmBankTransfer}
        formatAmount={formatAmount}
      />

      <BulkDeleteModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        selectedItems={selectedItems}
        isProcessing={isProcessingAction}
        onConfirm={handleConfirmBulkDelete}
        formatAmount={formatAmount}
      />

      {/* Success Notification Modal */}
      <ActionSuccessModal
        data={actionSuccessData}
        onClose={() => setActionSuccessData(null)}
      />
    </div>
  );
};

export default Approvals;
