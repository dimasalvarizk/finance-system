import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { Plus, RefreshCw, AlertCircle } from 'lucide-react';
import type { ExpenseClaim } from './types';
import { ExpenseStatCards } from './components/ExpenseStatCards';
import { ExpenseTable } from './components/ExpenseTable';
import { ClaimDetailModal } from './components/ClaimDetailModal';
import { getMyCorporateExpenses, getCorporateExpenses } from '../../services/expenseService';

const MyExpenses: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [expenses, setExpenses] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      // 1. Try to fetch from backend API
      let data = await getMyCorporateExpenses().catch(() => null);
      if (!data || data.length === 0) {
        // Fallback to all corporate expenses
        data = await getCorporateExpenses().catch(() => null);
      }

      if (data && Array.isArray(data)) {
        setExpenses(data);
        localStorage.setItem('finance_my_expenses_v2', JSON.stringify(data));
      } else {
        // LocalStorage fallback if server is momentarily offline
        const localSaved = localStorage.getItem('finance_my_expenses_v2') || localStorage.getItem('finance_my_expenses');
        if (localSaved) {
          try {
            const parsed = JSON.parse(localSaved);
            if (Array.isArray(parsed)) setExpenses(parsed);
          } catch {
            setExpenses([]);
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching expenses:', err);
      setErrorMessage(err?.message || 'Gagal memuat daftar pengeluaran dari server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Real Stats Calculation from Live Database Data
  const totalClaimsCount = expenses.length;
  const pendingCount = expenses.filter(
    (e) => e.status === 'Pending' || e.status === 'Mr.Khalid Review' || e.status === 'Mr. Hesham Review'
  ).length;
  const approvedCount = expenses.filter((e) => e.status === 'Approved' || e.status === 'Ready for Payment').length;
  
  // Calculate total paid amount (in USD equivalence or base amount)
  const paidTotalUSD = expenses
    .filter((e) => e.status === 'Paid')
    .reduce((sum, e) => {
      const amt = Number(e.amount) || 0;
      if (e.currency === 'USD') return sum + amt;
      if (e.currency === 'SAR') return sum + amt / 3.75;
      return sum + amt / 16000; // RP / IDR conversion
    }, 0);

  // Filter & Search
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (e.claimId && e.claimId.toLowerCase().includes(q)) ||
        (e.reason && e.reason.toLowerCase().includes(q)) ||
        (e.category && e.category.toLowerCase().includes(q)) ||
        (e.status && e.status.toLowerCase().includes(q)) ||
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

  const formatAmount = (num: number, curr: string = 'RP') => {
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
                {t('expenses.title') || 'Pengeluaran Saya'}
              </h1>
              <p className="text-[13px] text-[#64748b] font-medium">
                {t('expenses.subtitle') || 'Pantau, ajukan, dan kelola semua status klaim pengeluaran & reimbursement perusahaan Anda.'}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={fetchExpenses}
                disabled={loading}
                title="Refresh Data"
                className="p-2.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
              </button>

              <button
                onClick={() => navigate('/submit-expense')}
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-[13px] rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t('expenses.submitNewClaim') || 'Ajukan Klaim Baru'}</span>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

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
