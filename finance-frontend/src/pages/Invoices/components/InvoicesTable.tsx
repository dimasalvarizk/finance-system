import React from 'react';
import { Search, FileText, Check, Copy, Receipt, Upload, Edit3, XCircle, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type Invoice, type CompanyOption } from './types';
import { formatLocalizedDate } from '../../../i18n';
import NetworkErrorState from '../../../components/ui/NetworkErrorState';

interface InvoicesTableProps {
  invoices: Invoice[];
  paginatedInvoices: Invoice[];
  filteredInvoices: Invoice[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterCompany: string;
  setFilterCompany: (c: string) => void;
  filterStatus: string;
  setFilterStatus: (s: string) => void;
  filterDate: string;
  setFilterDate: (d: string) => void;
  currentPage: number;
  setCurrentPage: (p: number | ((prev: number) => number)) => void;
  totalPages: number;
  itemsPerPage: number;
  availableCompanies: CompanyOption[];
  selectedInvoiceIds: string[];
  setSelectedInvoiceIds: (ids: string[]) => void;
  copiedInvoiceNo: string | null;
  handleCopyInvoiceNo: (invoiceNo: string) => void;
  onSelectInvoice: (inv: Invoice) => void;
  onOpenCreateModal: () => void;
  onOpenPaymentHistory: (inv: Invoice) => void;
  onViewProof: (inv: Invoice) => void;
  onTriggerUploadProof: (inv: Invoice) => void;
  onEditInvoice: (inv: Invoice) => void;
  onCancelInvoice: (invoiceNo: string) => void;
  onDeleteInvoice: (invoiceNo: string) => void;
  onBulkExport: () => void;
  onBulkSendForApproval: () => void;
  onBulkCancel: () => void;
  onBulkDelete: () => void;
  onRetryFetch: () => void;
  userRole?: string;
  i18nLanguage: string;
}

export const InvoicesTable: React.FC<InvoicesTableProps> = ({
  invoices,
  paginatedInvoices,
  filteredInvoices,
  loading,
  error,
  searchQuery,
  setSearchQuery,
  filterCompany,
  setFilterCompany,
  filterStatus,
  setFilterStatus,
  filterDate,
  setFilterDate,
  currentPage,
  setCurrentPage,
  totalPages,
  itemsPerPage,
  availableCompanies,
  selectedInvoiceIds,
  setSelectedInvoiceIds,
  copiedInvoiceNo,
  handleCopyInvoiceNo,
  onSelectInvoice,
  onOpenCreateModal,
  onOpenPaymentHistory,
  onViewProof,
  onTriggerUploadProof,
  onEditInvoice,
  onCancelInvoice,
  onDeleteInvoice,
  onBulkExport,
  onBulkSendForApproval,
  onBulkCancel,
  onBulkDelete,
  onRetryFetch,
  userRole,
  i18nLanguage,
}) => {
  const { t } = useTranslation();

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Approved':
      case '3/3 Approved':
      case '4/4 Approved':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'Pending':
      case 'Pending Review':
      case '0/3 Pending':
      case '1/3 Approved':
      case '2/3 Approved':
      case '0/4 Pending':
      case '1/4 Approved':
      case '2/4 Approved':
      case '3/4 Approved':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'Rejected':
      case 'Cancelled':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'Overdue':
      case 'OVERDUE':
        return 'bg-orange-50 text-orange-700 border border-orange-200';
      case 'Paid':
      case 'Paid and closed':
      case 'FULLY_PAID':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  };

  const renderStatusBadge = (inv: Invoice) => {
    const rawAmt = parseFloat(String(inv.amount || '0').replace(/[^0-9.-]/g, '')) || 0;
    const advAmt = parseFloat(String(inv.advancePayment || 0));
    const totalInst = parseFloat(String(inv.totalInstallments || 0));
    const totalPaid = inv.totalPaid !== undefined ? parseFloat(String(inv.totalPaid)) : (advAmt + totalInst);
    const isOverdue = inv.dueDate && new Date(inv.dueDate) < new Date(new Date().toISOString().split('T')[0]);

    if ((totalPaid >= rawAmt && rawAmt > 0) || inv.status === 'FULLY_PAID' || inv.status === 'Paid') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          {t('common.statusPaid')}
        </span>
      );
    }

    if (totalPaid > 0 && totalPaid < rawAmt) {
      if (totalInst > 0 || String(inv.status).toLowerCase().includes('partial')) {
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            {t('common.statusPartial')}
          </span>
        );
      }
      if (advAmt > 0) {
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            {t('common.statusDeposit')}
          </span>
        );
      }
    }

    if (isOverdue && inv.status !== 'Cancelled' && inv.status !== 'Rejected') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
          {t('common.statusOverdue')}
        </span>
      );
    }

    let displayStatus = inv.status;
    if (!displayStatus || ['PARTIAL', 'Partial', 'Partial Payment', 'DEPOSIT_PAID', 'FULLY_PAID'].includes(displayStatus)) {
      displayStatus = '0/4 Pending';
    }

    const statusMap: Record<string, string> = {
      'Pending': t('common.statusPending'),
      'Approved': t('common.statusApproved'),
      'Rejected': t('common.statusRejected'),
      'Cancelled': t('common.statusCancelled'),
      'Tentative': t('common.statusTentative'),
      'Confirmed': t('common.statusConfirmed'),
    };

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getStatusBadgeClass(displayStatus)}`}>
        {statusMap[displayStatus] || displayStatus}
      </span>
    );
  };

  const isViewer = userRole === 'Viewer';
  const isSuperOrAccountant = ['Super Admin', 'Chief Accountant', 'Division Director', 'Madinah Branch Accountant'].includes(userRole || '');

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
      {/* Table Header Section */}
      <div className="px-6 py-5 flex items-center justify-between border-b border-[#e2e8f0]">
        <h3 className="text-[15px] font-bold text-[#0c0d0f] font-sans">
          {t('invoices.recentApprovedConfirmations')}
        </h3>
        {invoices.length > 0 && !loading && (
          <div className="relative w-64">
            <input
              type="text"
              placeholder={t('invoices.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 border border-[#cbd5e1] rounded-xl text-[12px] font-semibold text-[#1e293b] placeholder-gray-400 focus:outline-none focus:border-[#2563eb] bg-white transition-all font-sans"
            />
            <Search className="absolute left-3.5 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        )}
      </div>

      {error ? (
        <NetworkErrorState
          message="We could not load your confirmations. Please check your connection and try again."
          onRetry={onRetryFetch}
        />
      ) : loading ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px] font-sans">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <th className="px-4 py-3 text-center w-12">
                  <input type="checkbox" disabled className="rounded border-gray-300 w-4 h-4" />
                </th>
                {['CONFIRMATION #', 'COMPANY', 'COMPANY CODE', 'REFERENCE #', 'SERIAL #', 'AMOUNT', 'DATE', 'STATUS', 'ACTIONS'].map((h) => (
                  <th key={h} className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {Array.from({ length: 5 }).map((_, loadIdx) => (
                <tr key={`skeleton-${loadIdx}`} className="animate-pulse border-b border-[#e2e8f0]">
                  <td className="px-4 py-4"><div className="w-4 h-4 bg-gray-200 rounded mx-auto" /></td>
                  <td className="px-6 py-4"><div className="w-20 h-4 bg-gray-200 rounded" /></td>
                  <td className="px-6 py-4"><div className="w-32 h-4 bg-gray-200 rounded" /></td>
                  <td className="px-6 py-4"><div className="w-12 h-4 bg-gray-200 rounded" /></td>
                  <td className="px-6 py-4"><div className="w-24 h-4 bg-gray-200 rounded" /></td>
                  <td className="px-6 py-4"><div className="w-20 h-4 bg-gray-200 rounded" /></td>
                  <td className="px-6 py-4"><div className="w-16 h-4 bg-gray-200 rounded" /></td>
                  <td className="px-6 py-4"><div className="w-20 h-4 bg-gray-200 rounded" /></td>
                  <td className="px-6 py-4"><div className="w-16 h-4 bg-gray-200 rounded" /></td>
                  <td className="px-6 py-4"><div className="w-20 h-4 bg-gray-200 rounded" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : invoices.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center bg-white px-4">
          <div className="w-12 h-12 bg-slate-50 border border-slate-200 text-slate-400 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-5 h-5 text-slate-400" />
          </div>
          <h4 className="text-[15px] font-bold text-[#0c0d0f] text-center mb-1">
            No confirmations yet
          </h4>
          <p className="text-[12px] text-[#64748b] text-center font-medium max-w-sm mb-5 leading-relaxed">
            Generate your first confirmation to get started.
          </p>
          {!isViewer && (
            <button
              onClick={onOpenCreateModal}
              className="px-4 py-2 bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold text-[13px] rounded-xl shadow-sm transition-all cursor-pointer"
            >
              Generate Confirmation
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Filters Bar */}
          <div className="px-6 py-3.5 border-b border-[#e2e8f0] bg-slate-50/50 flex flex-wrap items-center gap-3">
            <div className="relative w-60">
              <input
                type="text"
                placeholder={t('invoices.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-3 py-1.5 border border-[#cbd5e1] rounded-lg text-[12px] font-medium text-[#1e293b] placeholder-gray-400 focus:outline-none focus:border-[#f59e0b] bg-white transition-all font-sans"
              />
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>

            <select
              value={filterCompany}
              onChange={(e) => {
                setFilterCompany(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-[#cbd5e1] rounded-lg text-[12px] font-medium text-[#1e293b] px-3 py-1.5 focus:outline-none focus:border-[#f59e0b] bg-white transition-all cursor-pointer"
            >
              <option value="">{t('invoices.allCompanies')}</option>
              {availableCompanies.map((c) => (
                <option key={c.code} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-[#cbd5e1] rounded-lg text-[12px] font-medium text-[#1e293b] px-3 py-1.5 focus:outline-none focus:border-[#f59e0b] bg-white transition-all cursor-pointer"
            >
              <option value="">{t('invoices.allStatuses')}</option>
              <option value="Pending">{t('common.statusPending')}</option>
              <option value="Approved">{t('common.statusApproved')}</option>
              <option value="Partial Payment">{t('common.statusPartial')}</option>
              <option value="Paid">{t('common.statusPaid')}</option>
              <option value="Overdue">{t('common.statusOverdue')}</option>
              <option value="Rejected">{t('common.statusRejected')}</option>
              <option value="Cancelled">{t('common.statusCancelled')}</option>
            </select>

            <input
              type="date"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-[#cbd5e1] rounded-lg text-[12px] font-medium text-[#1e293b] px-3 py-1.5 focus:outline-none focus:border-[#f59e0b] bg-white transition-all cursor-pointer"
            />

            {(searchQuery || filterCompany || filterStatus || filterDate) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterCompany('');
                  setFilterStatus('');
                  setFilterDate('');
                  setCurrentPage(1);
                }}
                className="text-[12px] font-semibold text-[#f59e0b] hover:text-[#d97706] transition-colors cursor-pointer ml-auto"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Bulk Actions Banner */}
          {selectedInvoiceIds.length > 0 && (
            <div className="bg-[#f0f9ff] border-b border-[#e0f2fe] px-6 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={true}
                  onChange={() => setSelectedInvoiceIds([])}
                  className="rounded border-gray-300 text-[#2563eb] focus:ring-[#2563eb] w-4 h-4 cursor-pointer"
                />
                <span className="text-[12px] text-[#1d4ed8] font-bold">
                  {selectedInvoiceIds.length} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onBulkExport}
                  className="px-3 py-1 bg-white border border-[#2563eb] text-[#2563eb] rounded-lg text-[11px] font-bold hover:bg-blue-50 transition-all cursor-pointer"
                >
                  Export CSV
                </button>
                <button
                  onClick={onBulkSendForApproval}
                  className="px-3 py-1 bg-[#2563eb] text-white rounded-lg text-[11px] font-bold hover:bg-[#1d4ed8] transition-all cursor-pointer"
                >
                  Send for Approval
                </button>
                <button
                  onClick={onBulkCancel}
                  className="px-3 py-1 bg-white border border-[#ef4444] text-[#ef4444] rounded-lg text-[11px] font-bold hover:bg-red-50 transition-all cursor-pointer"
                >
                  Void
                </button>
                {isSuperOrAccountant && (
                  <button
                    onClick={onBulkDelete}
                    className="px-3 py-1 bg-red-600 text-white rounded-lg text-[11px] font-bold hover:bg-red-700 transition-all cursor-pointer"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px] font-sans">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                  {!isViewer && (
                    <th className="px-4 py-3 text-center w-12">
                      <input
                        type="checkbox"
                        checked={paginatedInvoices.length > 0 && paginatedInvoices.every(inv => selectedInvoiceIds.includes(inv.invoiceNo))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const newSelected = [...selectedInvoiceIds];
                            paginatedInvoices.forEach(inv => {
                              if (!newSelected.includes(inv.invoiceNo)) newSelected.push(inv.invoiceNo);
                            });
                            setSelectedInvoiceIds(newSelected);
                          } else {
                            setSelectedInvoiceIds(selectedInvoiceIds.filter(id => !paginatedInvoices.map(inv => inv.invoiceNo).includes(id)));
                          }
                        }}
                        className="rounded border-gray-300 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter">
                    {t('hotelReservations.confNo')}
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter">
                    {t('companies.companyName')}
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter">
                    {t('companies.companyCode')}
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter">
                    {t('dashboard.ref')}
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter">
                    {t('invoices.serialNo')}
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter">
                    {t('common.amount')}
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter">
                    {t('dashboard.confDate')}
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter">
                    {t('dashboard.dueDate')}
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter">
                    {t('common.status')}
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter text-center">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {paginatedInvoices.length > 0 ? (
                  paginatedInvoices.map((inv, idx) => (
                    <tr
                      key={idx}
                      onClick={() => onSelectInvoice(inv)}
                      className={`group transition-colors font-medium text-[13px] text-[#0c0d0f] cursor-pointer ${
                        selectedInvoiceIds.includes(inv.invoiceNo)
                          ? 'bg-[#f0f9ff] hover:bg-[#e0f2fe]'
                          : 'hover:bg-slate-50/50'
                      }`}
                    >
                      {!isViewer && (
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedInvoiceIds.includes(inv.invoiceNo)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedInvoiceIds([...selectedInvoiceIds, inv.invoiceNo]);
                              } else {
                                setSelectedInvoiceIds(selectedInvoiceIds.filter(id => id !== inv.invoiceNo));
                              }
                            }}
                            className="rounded border-gray-300 text-[#2563eb] focus:ring-[#2563eb] w-4 h-4 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="px-6 py-3 font-bold font-inter text-[#0c0d0f]">
                        <div className="flex items-center space-x-1.5">
                          <span>{inv.invoiceNo}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyInvoiceNo(inv.invoiceNo);
                            }}
                            title="Copy Confirmation #"
                            className={`p-1 rounded-md transition-all cursor-pointer ${
                              copiedInvoiceNo === inv.invoiceNo
                                ? 'opacity-100 text-emerald-600 bg-emerald-50'
                                : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700'
                            }`}
                          >
                            {copiedInvoiceNo === inv.invoiceNo ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-[#1e293b]">{inv.company}</td>
                      <td className="px-6 py-3 text-[#64748b] font-inter">{inv.companyCode}</td>
                      <td className="px-6 py-3 text-[#64748b] font-inter">{inv.referenceNo}</td>
                      <td className="px-6 py-3 text-[#64748b] font-inter">{inv.serialNo}</td>
                      <td className="px-6 py-3 font-bold font-inter text-[#0c0d0f]">{inv.amount}</td>
                      <td className="px-6 py-3 text-[#64748b] font-inter">
                        {inv.date ? formatLocalizedDate(inv.date, i18nLanguage) : '-'}
                      </td>
                      <td className="px-6 py-3 text-[#64748b] font-inter">
                        {inv.dueDate ? formatLocalizedDate(inv.dueDate, i18nLanguage) : 'N/A'}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        {renderStatusBadge(inv)}
                      </td>
                      <td className="px-6 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center space-x-1">
                          {/* Payment Ledger / History */}
                          <button
                            onClick={() => onOpenPaymentHistory(inv)}
                            title="Payment History & Ledger"
                            className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-600 transition-all cursor-pointer"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>

                          {/* Payment Proof */}
                          {inv.paymentAttachment ? (
                            <button
                              onClick={() => onViewProof(inv)}
                              title="View Payment Proof"
                              className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-all cursor-pointer"
                            >
                              <Upload className="w-4 h-4 text-emerald-600" />
                            </button>
                          ) : (
                            !isViewer && (
                              <button
                                onClick={() => onTriggerUploadProof(inv)}
                                title="Upload Payment Proof"
                                className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-all cursor-pointer"
                              >
                                <Upload className="w-4 h-4" />
                              </button>
                            )
                          )}

                          {/* Edit Confirmation */}
                          {!isViewer && (
                            <button
                              onClick={() => onEditInvoice(inv)}
                              title="Edit Confirmation"
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-blue-500 transition-all cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Cancel Confirmation */}
                          {!isViewer && inv.status !== 'Cancelled' && inv.status !== 'Archived' && (
                            <button
                              onClick={() => onCancelInvoice(inv.invoiceNo)}
                              title="Cancel Confirmation"
                              className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-all cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete Confirmation */}
                          {isSuperOrAccountant && (
                            <button
                              onClick={() => onDeleteInvoice(inv.invoiceNo)}
                              title="Delete Confirmation"
                              className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 hover:text-red-700 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={isViewer ? 9 : 10} className="px-6 py-12 text-center text-[#64748b] font-medium">
                      <div className="flex flex-col items-center justify-center space-y-1.5">
                        <FileText className="w-6 h-6 text-gray-300" />
                        <span className="text-[13px] font-bold text-slate-600">No invoices match your criteria</span>
                        <span className="text-[11px] text-slate-400">Try adjusting your filters or search terms.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {filteredInvoices.length > 0 && (
            <div className="px-6 py-3.5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-t border-[#e2e8f0] font-inter">
              <span className="text-[12px] text-[#64748b] font-medium">
                {t('invoices.showing')} {Math.min((currentPage - 1) * itemsPerPage + 1, filteredInvoices.length)} {t('invoices.to')}{' '}
                {Math.min(currentPage * itemsPerPage, filteredInvoices.length)} {t('invoices.of')}{' '}
                {filteredInvoices.length} {t('invoices.approvedInvoices')}
              </span>

              <div className="flex items-center space-x-1.5 self-end sm:self-auto">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-[#e2e8f0] rounded-md text-[12px] font-semibold text-[#1e293b] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {t('common.previous')}
                </button>

                {Array.from({ length: totalPages }, (_, i) => {
                  const pageNum = i + 1;
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    Math.abs(pageNum - currentPage) <= 1
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-md text-[12px] font-bold border transition-all ${
                          currentPage === pageNum
                            ? 'bg-[#f59e0b] border-[#f59e0b] text-white'
                            : 'border-[#e2e8f0] text-[#1e293b] hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  if (
                    (pageNum === 2 && currentPage > 3) ||
                    (pageNum === totalPages - 1 && currentPage < totalPages - 2)
                  ) {
                    return (
                      <span key={pageNum} className="px-1 text-gray-400 text-[12px]">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border border-[#e2e8f0] rounded-md text-[12px] font-semibold text-[#1e293b] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {t('common.next')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
