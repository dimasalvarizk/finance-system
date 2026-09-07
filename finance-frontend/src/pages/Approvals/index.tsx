import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import type { ApprovedExpenseItem, ActionSuccessPayload } from './types';
import { INITIAL_APPROVED_EXPENSES } from './mockData';
import { ApprovalStatCards } from './components/ApprovalStatCards';
import { ApprovalTable } from './components/ApprovalTable';
import { ClaimAuditModal } from './components/ClaimAuditModal';
import { AddToPayrollModal } from './components/AddToPayrollModal';
import { BankTransferModal } from './components/BankTransferModal';
import { ActionSuccessModal } from './components/ActionSuccessModal';

const Approvals: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<ApprovedExpenseItem[]>(() => {
    const saved = localStorage.getItem('finance_approved_expenses_v3') || localStorage.getItem('finance_approved_expenses');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 12) {
          return parsed;
        }
      } catch {
        return INITIAL_APPROVED_EXPENSES;
      }
    }
    return INITIAL_APPROVED_EXPENSES;
  });

  const [selectedIds, setSelectedIds] = useState<string[]>(['1', '2']);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  // Modals state
  const [selectedClaimDetail, setSelectedClaimDetail] = useState<ApprovedExpenseItem | null>(null);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [isBankTransferModalOpen, setIsBankTransferModalOpen] = useState(false);
  const [payrollPeriod, setPayrollPeriod] = useState('October 2026 Cycle (End of Month)');
  const [transferRef, setTransferRef] = useState(`TRF-DISB-${Date.now().toString().slice(-6)}`);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionSuccessData, setActionSuccessData] = useState<ActionSuccessPayload | null>(null);

  const saveItems = (updated: ApprovedExpenseItem[]) => {
    setItems(updated);
    localStorage.setItem('finance_approved_expenses_v3', JSON.stringify(updated));
    localStorage.setItem('finance_approved_expenses', JSON.stringify(updated));
  };

  // Active Ready for Payment Queue
  const readyItems = useMemo(() => {
    return items.filter((item) => item.status === 'Ready for Payment');
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return readyItems;
    return readyItems.filter(
      (item) =>
        item.claimId.toLowerCase().includes(q) ||
        item.employee.toLowerCase().includes(q) ||
        item.department.toLowerCase().includes(q) ||
        item.reason.toLowerCase().includes(q) ||
        item.bankName.toLowerCase().includes(q) ||
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

  // Top Metrics
  const awaitingPaymentCount = readyItems.length;
  const processedYTDCount = 114 + items.filter((item) => item.status !== 'Ready for Payment').length;
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
  const handleConfirmAddToPayroll = () => {
    setIsProcessingAction(true);
    setTimeout(() => {
      const updated = items.map((item) => {
        if (selectedIds.includes(item.id)) {
          return { ...item, status: 'Queued for Payroll' as const };
        }
        return item;
      });
      saveItems(updated);
      setIsProcessingAction(false);
      setIsPayrollModalOpen(false);
      setSelectedIds([]);
      setActionSuccessData({
        isOpen: true,
        title: 'Queued to Payroll Successfully!',
        message: `${selectedItems.length} claim(s) totaling ${formatAmount(selectedTotalAmount)} have been successfully scheduled into the ${payrollPeriod}.`,
        type: 'payroll'
      });
    }, 500);
  };

  // Action: Transfer to Bank
  const handleConfirmBankTransfer = () => {
    setIsProcessingAction(true);
    setTimeout(() => {
      const updated = items.map((item) => {
        if (selectedIds.includes(item.id)) {
          return { ...item, status: 'Disbursed' as const };
        }
        return item;
      });
      saveItems(updated);
      setIsProcessingAction(false);
      setIsBankTransferModalOpen(false);
      setSelectedIds([]);
      setActionSuccessData({
        isOpen: true,
        title: 'Bank Disbursement Dispatched!',
        message: `Corporate transfer batch ${transferRef} of ${formatAmount(selectedTotalAmount)} for ${selectedItems.length} recipient(s) has been transmitted to the bank payment gateway.`,
        type: 'bank'
      });
    }, 600);
  };

  return (
    <div className="flex min-h-screen w-full bg-[#f8fafc] select-none font-inter">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <div className="flex-1 p-8 space-y-7 max-w-[1400px] w-full mx-auto">
          {/* Top Header Banner */}
          <div className="space-y-1">
            <h1 className="text-[26px] font-bold text-[#0c0d0f] tracking-tight">
              {t('approvals.title') || 'Finance Processing Dashboard'}
            </h1>
            <p className="text-[13px] text-[#64748b] font-medium">
              {t('approvals.subtitle') || 'Audit approved claims, prepare bank disbursements, export validated listings to your ERP'}
            </p>
          </div>

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
            onSelectAll={handleSelectAll}
            onToggleRow={handleToggleRow}
            onOpenClaimDetail={(item) => setSelectedClaimDetail(item)}
            onOpenPayrollModal={() => setIsPayrollModalOpen(true)}
            onOpenBankTransferModal={() => {
              setTransferRef(`TRF-DISB-${Date.now().toString().slice(-6)}`);
              setIsBankTransferModalOpen(true);
            }}
            formatAmount={formatAmount}
          />
        </div>
      </main>

      {/* Modals */}
      <ClaimAuditModal
        item={selectedClaimDetail}
        onClose={() => setSelectedClaimDetail(null)}
        formatAmount={formatAmount}
      />

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

      <ActionSuccessModal
        data={actionSuccessData}
        onClose={() => setActionSuccessData(null)}
      />
    </div>
  );
};

export default Approvals;
