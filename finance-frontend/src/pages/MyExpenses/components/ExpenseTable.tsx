import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, X } from 'lucide-react';
import type { ExpenseClaim } from '../types';

interface ExpenseTableProps {
  expenses: ExpenseClaim[];
  paginatedExpenses: ExpenseClaim[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  isFilterDropdownOpen: boolean;
  setIsFilterDropdownOpen: (open: boolean) => void;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  itemsPerPage: number;
  filteredCount: number;
  onSelectClaim: (claim: ExpenseClaim) => void;
  formatAmount: (num: number, curr: string) => string;
}

export const ExpenseTable: React.FC<ExpenseTableProps> = ({
  paginatedExpenses,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  isFilterDropdownOpen,
  setIsFilterDropdownOpen,
  currentPage,
  setCurrentPage,
  totalPages,
  itemsPerPage,
  filteredCount,
  onSelectClaim,
  formatAmount
}) => {
  const { t } = useTranslation();

  const renderStatusBadge = (status: ExpenseClaim['status']) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="px-3 py-1 rounded-md text-[11px] font-bold bg-[#fef3c7] text-[#b45309] border border-[#fde68a] inline-flex items-center space-x-1">
            <span>{t('expenses.pending') || 'Pending'}</span>
          </span>
        );
      case 'Mr.Khalid Review':
        return (
          <span className="px-3 py-1 rounded-md text-[11px] font-bold bg-[#e0e7ff] text-[#3730a3] border border-[#c7d2fe] inline-flex items-center space-x-1">
            <span>Mr.Khalid Review</span>
          </span>
        );
      case 'Mr. Hesham Review':
        return (
          <span className="px-3 py-1 rounded-md text-[11px] font-bold bg-[#f3e8ff] text-[#6b21a8] border border-[#e9d5ff] inline-flex items-center space-x-1">
            <span>Mr. Hesham Review</span>
          </span>
        );
      case 'Approved':
        return (
          <span className="px-3 py-1 rounded-md text-[11px] font-bold bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0] inline-flex items-center space-x-1">
            <span>{t('expenses.approved') || 'Approved'}</span>
          </span>
        );
      case 'Paid':
        return (
          <span className="px-3 py-1 rounded-md text-[11px] font-bold bg-[#d1fae5] text-[#065f46] border border-[#a7f3d0] inline-flex items-center space-x-1">
            <span>{t('expenses.paid') || 'Paid'}</span>
          </span>
        );
      case 'Rejected':
        return (
          <span className="px-3 py-1 rounded-md text-[11px] font-bold bg-[#fee2e2] text-[#991b1b] border border-[#fecaca] inline-flex items-center space-x-1">
            <span>{t('expenses.rejected') || 'Rejected'}</span>
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Card Header & Search / Filter Controls */}
      <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
        <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">
          {t('expenses.allClaims') || 'My Expense Requests'}
        </h2>

        <div className="flex items-center space-x-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('expenses.searchPlaceholder') || 'Search expenses...'}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-64 pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-[12.5px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all font-medium"
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

          {/* Filter List Button */}
          <div className="relative">
            <button
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className={`px-3.5 py-2 border rounded-xl text-[12.5px] font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
                statusFilter !== 'ALL'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>{t('common.filter') || 'Filter List'}</span>
              {statusFilter !== 'ALL' && (
                <span className="w-2 h-2 rounded-full bg-blue-600" />
              )}
            </button>

            {/* Filter Dropdown */}
            {isFilterDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-fade-in font-sans">
                <div className="px-3 py-1.5 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                  {t('common.status') || 'Filter by Status'}
                </div>
                {['ALL', 'Pending', 'Mr.Khalid Review', 'Mr. Hesham Review', 'Approved', 'Paid', 'Rejected'].map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setStatusFilter(st);
                      setIsFilterDropdownOpen(false);
                      setCurrentPage(1);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-[12px] font-semibold flex items-center justify-between hover:bg-slate-50 transition-all cursor-pointer ${
                      statusFilter === st ? 'text-blue-600 bg-blue-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span>{st === 'ALL' ? (t('common.all') || 'All Statuses') : st}</span>
                    {statusFilter === st && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-slate-50/70 border-b border-slate-100 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3.5">{t('expenses.claimId') || 'CLAIM ID'}</th>
              <th className="px-6 py-3.5">{t('expenses.date') || 'SUBMIT DATE'}</th>
              <th className="px-6 py-3.5">{t('expenses.category') || 'REASON / MISSION REFERENCE'}</th>
              <th className="px-6 py-3.5">{t('expenses.status') || 'STATUS'}</th>
              <th className="px-6 py-3.5 text-right">{t('expenses.amount') || 'AMOUNT'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedExpenses.length > 0 ? (
              paginatedExpenses.map((exp) => (
                <tr
                  key={exp.id}
                  onClick={() => onSelectClaim(exp)}
                  className="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4 font-bold text-slate-900 group-hover:text-blue-600 transition-colors whitespace-nowrap">
                    {exp.claimId}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-500 whitespace-nowrap">
                    {exp.submitDate}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-800">
                    <div className="max-w-md truncate" title={exp.reason}>
                      {exp.reason}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderStatusBadge(exp.status)}
                  </td>
                  <td className="px-6 py-4 text-right font-extrabold text-slate-900 whitespace-nowrap">
                    {formatAmount(exp.amount, exp.currency)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                  No expense requests found matching your filters.
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
            {t('common.previous') || 'Previous'}
          </button>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage >= totalPages}
            className="px-4 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-[12px] font-semibold transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-xs"
          >
            {t('common.next') || 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};
