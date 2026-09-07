import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { Plus } from 'lucide-react';
import type { ExpenseClaim } from './types';
import { INITIAL_EXPENSES } from './mockData';
import { ExpenseStatCards } from './components/ExpenseStatCards';
import { ExpenseTable } from './components/ExpenseTable';
import { ClaimDetailModal } from './components/ClaimDetailModal';

const MyExpenses: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [expenses] = useState<ExpenseClaim[]>(() => {
    const saved = localStorage.getItem('finance_my_expenses_v2') || localStorage.getItem('finance_my_expenses');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 14) {
          return parsed;
        }
      } catch {
        return INITIAL_EXPENSES;
      }
    }
    return INITIAL_EXPENSES;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Stats calculation
  const totalClaimsCount = expenses.length;
  const pendingCount = expenses.filter(
    (e) => e.status === 'Pending' || e.status === 'Mr.Khalid Review' || e.status === 'Mr. Hesham Review'
  ).length;
  const approvedCount = expenses.filter((e) => e.status === 'Approved' || e.status === 'Paid').length;
  const paidTotalUSD = 4850.0;

  // Filter & Search
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        e.claimId.toLowerCase().includes(q) ||
        e.reason.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.status.toLowerCase().includes(q) ||
        String(e.amount).includes(q);

      const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [expenses, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage) || 1;
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredExpenses.slice(start, start + itemsPerPage);
  }, [filteredExpenses, currentPage]);

  const formatAmount = (num: number, curr: string) => {
    const formatted = new Intl.NumberFormat('id-ID').format(num);
    return `${formatted} ${curr.toUpperCase()}`;
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
                {t('expenses.title') || 'My Expense Dashboard'}
              </h1>
              <p className="text-[13px] text-[#64748b] font-medium">
                {t('expenses.subtitle') || 'Track and manage your submitted claim requests and business expenses'}
              </p>
            </div>

            <button
              onClick={() => navigate('/submit-expense')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-[13px] rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('expenses.submitNewClaim') || 'Submit New Expense'}</span>
            </button>
          </div>

          {/* 4 Stat Cards */}
          <ExpenseStatCards
            totalClaimsCount={totalClaimsCount}
            pendingCount={pendingCount}
            approvedCount={approvedCount}
            paidTotalUSD={paidTotalUSD}
          />

          {/* Main Table Container */}
          <ExpenseTable
            expenses={expenses}
            paginatedExpenses={paginatedExpenses}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            isFilterDropdownOpen={isFilterDropdownOpen}
            setIsFilterDropdownOpen={setIsFilterDropdownOpen}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            filteredCount={filteredExpenses.length}
            onSelectClaim={(claim) => setSelectedClaim(claim)}
            formatAmount={formatAmount}
          />
        </div>
      </main>

      {/* Claim Details Modal */}
      <ClaimDetailModal
        claim={selectedClaim}
        onClose={() => setSelectedClaim(null)}
        formatAmount={formatAmount}
      />
    </div>
  );
};

export default MyExpenses;
