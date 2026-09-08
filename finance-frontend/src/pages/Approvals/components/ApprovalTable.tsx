import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, Send, Trash2 } from 'lucide-react';
import type { ApprovedExpenseItem } from '../types';

interface ApprovalTableProps {
  paginatedItems: ApprovedExpenseItem[];
  filteredCount: number;
  selectedIds: string[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  itemsPerPage: number;
  isAuthorized?: boolean;
  onSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleRow: (id: string, e: React.MouseEvent) => void;
  onOpenClaimDetail: (item: ApprovedExpenseItem) => void;
  onOpenPayrollModal: () => void;
  onOpenBulkDeleteModal: () => void;
  onOpenBankTransferModal: () => void;
  formatAmount: (num: number, curr?: string) => string;
}

export const ApprovalTable: React.FC<ApprovalTableProps> = ({
  paginatedItems,
  filteredCount,
  selectedIds,
  searchQuery,
  setSearchQuery,
  currentPage,
  setCurrentPage,
  totalPages,
  itemsPerPage,
  isAuthorized = true,
  onSelectAll,
  onToggleRow,
  onOpenClaimDetail,
  onOpenPayrollModal,
  onOpenBulkDeleteModal,
  onOpenBankTransferModal,
  formatAmount
}) => {
  const { t } = useTranslation();
  const isAllCurrentPageSelected =
    paginatedItems.length > 0 && paginatedItems.every((item) => selectedIds.includes(item.id));

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Table Action Bar */}
      <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 bg-white">
        <div className="flex items-center space-x-3">
          <h2 className="text-[15px] font-bold text-slate-900 tracking-tight flex items-center">
            <span>Approved Expenses — Ready for Payment</span>
            {selectedIds.length > 0 && (
              <span className="ml-2.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#dcfce7] text-[#15803d]">
                {selectedIds.length} {t('common.selected') || 'Selected'}
              </span>
            )}
          </h2>
        </div>

        {/* Action Buttons when Selected OR Search Box */}
        <div className="flex items-center space-x-3">
          {selectedIds.length > 0 ? (
            <div className="flex items-center space-x-2.5 animate-fade-in">
              <button
                type="button"
                onClick={onOpenPayrollModal}
                disabled={!isAuthorized}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white text-slate-700 font-semibold text-[12.5px] rounded-xl transition-all cursor-pointer shadow-xs whitespace-nowrap"
              >
                {t('approvals.addToPayroll') || 'Add to Payroll'}
              </button>

              <button
                type="button"
                onClick={onOpenBulkDeleteModal}
                disabled={!isAuthorized}
                className="px-4 py-2 bg-[#dc2626] hover:bg-[#b91c1c] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-[12.5px] rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('approvals.delete') || 'Delete'}</span>
              </button>

              <button
                type="button"
                onClick={onOpenBankTransferModal}
                disabled={!isAuthorized}
                className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-[12.5px] rounded-xl flex items-center space-x-2 transition-all cursor-pointer shadow-xs whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t('approvals.transferToBank') || 'Transfer to Bank'}</span>
              </button>
            </div>
          ) : null}


          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('common.search') || 'Search'}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-56 pl-9 pr-4 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-[12.5px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-slate-50/70 border-b border-slate-100 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3.5 w-10">
                <input
                  type="checkbox"
                  checked={isAllCurrentPageSelected}
                  onChange={onSelectAll}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3.5">{t('expenses.claimId') || 'CLAIM ID'}</th>
              <th className="px-4 py-3.5">{t('approvals.employee') || 'EMPLOYEE'}</th>
              <th className="px-4 py-3.5">{t('approvals.department') || 'DEPARTMENT'}</th>
              <th className="px-4 py-3.5">{t('expenses.category') || 'REASON / MISSION REFERENCE'}</th>
              <th className="px-4 py-3.5">{t('expenses.date') || 'APPROVED DATE'}</th>
              <th className="px-4 py-3.5">{t('expenses.approvalChain') || 'APPROVAL CHAIN'}</th>
              <th className="px-6 py-3.5 text-right">{t('expenses.amount') || 'AMOUNT'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedItems.length > 0 ? (
              paginatedItems.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <tr
                    key={item.id}
                    onClick={() => onOpenClaimDetail(item)}
                    className={`transition-colors cursor-pointer group ${
                      isSelected ? 'bg-blue-50/40 hover:bg-blue-50/60' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <td className="px-5 py-4" onClick={(e) => onToggleRow(item.id, e)}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-4 font-bold text-slate-900 group-hover:text-blue-600 transition-colors whitespace-nowrap">
                      {item.claimId}
                    </td>
                    <td className="px-4 py-4 font-bold text-slate-900 whitespace-nowrap">
                      {item.employee}
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-500 whitespace-nowrap">
                      {item.department}
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-800">
                      <div className="max-w-xs truncate" title={item.reason}>
                        {item.reason}
                      </div>
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-500 whitespace-nowrap">
                      {item.approvedDate}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#fef3c7] text-[#b45309] border border-[#fde68a]">
                        {item.approvalChain}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-extrabold text-slate-900 whitespace-nowrap">
                      {formatAmount(item.amount, item.currency)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-medium">
                  No approved expense claims waiting for disbursement.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Summary Footer */}
      <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12.5px] font-medium text-slate-500">
        <div>
          Showing {filteredCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
          {Math.min(currentPage * itemsPerPage, filteredCount)} of {filteredCount} requests
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage <= 1}
            className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-[12px] font-semibold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage >= totalPages}
            className="px-4 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-[12px] font-semibold transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-xs"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
