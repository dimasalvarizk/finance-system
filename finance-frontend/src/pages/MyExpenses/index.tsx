import React, { useState, useMemo } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import {
  Plus,
  Search,
  Filter,
  X,
  Paperclip,
  Receipt
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface ExpenseClaim {
  id: string;
  claimId: string;
  submitDate: string;
  reason: string;
  category: string;
  status: 'Pending' | 'Mr.Khalid Review' | 'Mr. Hesham Review' | 'Approved' | 'Paid' | 'Rejected';
  amount: number;
  currency: string;
  department: string;
  submittedBy: string;
  receiptsCount: number;
  receiptName?: string;
  notes?: string;
  approvalTimeline: {
    step: string;
    approver: string;
    status: 'completed' | 'in_progress' | 'pending' | 'rejected';
    date?: string;
    comment?: string;
  }[];
}

const INITIAL_EXPENSES: ExpenseClaim[] = [
  {
    id: '1',
    claimId: 'EXP-2024-890',
    submitDate: 'Oct 05, 2026',
    reason: 'Whatsapp Summit Fuel & Transport Expenses',
    category: 'Transportation & Fuel',
    status: 'Pending',
    amount: 500000,
    currency: 'RP',
    department: 'Operations',
    submittedBy: 'Emad Moustafa',
    receiptsCount: 2,
    receiptName: 'Fuel_Receipt_Oct05.pdf',
    notes: 'Operational transport logistics for attending WhatsApp Meta Summit event in Riyadh.',
    approvalTimeline: [
      { step: 'Claim Submitted', approver: 'Emad Moustafa', status: 'completed', date: 'Oct 05, 2026 09:15' },
      { step: 'Direct Manager Review', approver: 'Mr. Khalid Al-Otaibi', status: 'in_progress' },
      { step: 'Finance Director Review', approver: 'Mr. Hesham Mokhtar', status: 'pending' },
      { step: 'Disbursement & Payment', approver: 'Finance Treasury', status: 'pending' }
    ]
  },
  {
    id: '2',
    claimId: 'EXP-2024-889',
    submitDate: 'Oct 05, 2026',
    reason: 'Mission Meals for Site Engineering Team',
    category: 'Meals & Per Diem',
    status: 'Mr.Khalid Review',
    amount: 500000,
    currency: 'RP',
    department: 'Engineering',
    submittedBy: 'Emad Moustafa',
    receiptsCount: 1,
    receiptName: 'Catering_Invoice_Makkah.pdf',
    notes: 'Dinner and lunch per diem allowances for weekend site inspections.',
    approvalTimeline: [
      { step: 'Claim Submitted', approver: 'Emad Moustafa', status: 'completed', date: 'Oct 05, 2026 08:30' },
      { step: 'Direct Manager Review', approver: 'Mr. Khalid Al-Otaibi', status: 'in_progress' },
      { step: 'Finance Director Review', approver: 'Mr. Hesham Mokhtar', status: 'pending' },
      { step: 'Disbursement & Payment', approver: 'Finance Treasury', status: 'pending' }
    ]
  },
  {
    id: '3',
    claimId: 'EXP-2024-885',
    submitDate: 'Oct 05, 2026',
    reason: 'Client Dinner & Catering Accommodation',
    category: 'Client Entertainment',
    status: 'Mr. Hesham Review',
    amount: 500000,
    currency: 'RP',
    department: 'Business Development',
    submittedBy: 'Emad Moustafa',
    receiptsCount: 3,
    receiptName: 'Restaurant_Tax_Invoice.pdf',
    notes: 'Dinner hosting delegation from Indonesian Umrah partner agencies.',
    approvalTimeline: [
      { step: 'Claim Submitted', approver: 'Emad Moustafa', status: 'completed', date: 'Oct 04, 2026 18:20' },
      { step: 'Direct Manager Review', approver: 'Mr. Khalid Al-Otaibi', status: 'completed', date: 'Oct 05, 2026 10:00' },
      { step: 'Finance Director Review', approver: 'Mr. Hesham Mokhtar', status: 'in_progress' },
      { step: 'Disbursement & Payment', approver: 'Finance Treasury', status: 'pending' }
    ]
  },
  {
    id: '4',
    claimId: 'EXP-2024-878',
    submitDate: 'Oct 05, 2026',
    reason: 'Inter-office Logistics & Courier Service',
    category: 'Office Supplies & Logistics',
    status: 'Paid',
    amount: 500000,
    currency: 'RP',
    department: 'Administration',
    submittedBy: 'Emad Moustafa',
    receiptsCount: 1,
    receiptName: 'DHL_AirwayBill_Oct03.pdf',
    notes: 'Urgent contract document courier delivery from Jakarta to Jeddah office.',
    approvalTimeline: [
      { step: 'Claim Submitted', approver: 'Emad Moustafa', status: 'completed', date: 'Oct 03, 2026 11:00' },
      { step: 'Direct Manager Review', approver: 'Mr. Khalid Al-Otaibi', status: 'completed', date: 'Oct 03, 2026 14:15' },
      { step: 'Finance Director Review', approver: 'Mr. Hesham Mokhtar', status: 'completed', date: 'Oct 04, 2026 09:30' },
      { step: 'Disbursement & Payment', approver: 'Finance Treasury', status: 'completed', date: 'Oct 05, 2026 11:45' }
    ]
  },
  {
    id: '5',
    claimId: 'EXP-2024-870',
    submitDate: 'Oct 05, 2026',
    reason: 'Overtime Office Supplies & Printing',
    category: 'Stationery & Printing',
    status: 'Rejected',
    amount: 500000,
    currency: 'RP',
    department: 'Administration',
    submittedBy: 'Emad Moustafa',
    receiptsCount: 1,
    receiptName: 'Paper_Supply_Store.pdf',
    notes: 'Special high-grade paper reams for official contract stamp printing.',
    approvalTimeline: [
      { step: 'Claim Submitted', approver: 'Emad Moustafa', status: 'completed', date: 'Oct 02, 2026 16:00' },
      { step: 'Direct Manager Review', approver: 'Mr. Khalid Al-Otaibi', status: 'rejected', date: 'Oct 03, 2026 09:10', comment: 'Please attach detailed unit breakdown and purchase order approval first.' }
    ]
  },
  {
    id: '6',
    claimId: 'EXP-2024-862',
    submitDate: 'Oct 02, 2026',
    reason: 'Hotel Inspection Travel Tolls & Parking',
    category: 'Transportation & Fuel',
    status: 'Approved',
    amount: 350000,
    currency: 'RP',
    department: 'Operations',
    submittedBy: 'Emad Moustafa',
    receiptsCount: 2,
    receiptName: 'Toll_Tickets.pdf',
    notes: 'Highway toll gate receipts for visiting Manazil branch hotels in Madinah.',
    approvalTimeline: [
      { step: 'Claim Submitted', approver: 'Emad Moustafa', status: 'completed', date: 'Oct 02, 2026 14:00' },
      { step: 'Direct Manager Review', approver: 'Mr. Khalid Al-Otaibi', status: 'completed', date: 'Oct 02, 2026 17:00' },
      { step: 'Finance Director Review', approver: 'Mr. Hesham Mokhtar', status: 'completed', date: 'Oct 03, 2026 10:00' },
      { step: 'Disbursement & Payment', approver: 'Finance Treasury', status: 'in_progress' }
    ]
  },
  {
    id: '7',
    claimId: 'EXP-2024-855',
    submitDate: 'Sep 29, 2026',
    reason: 'Annual Cloud Backup Subscription Extension',
    category: 'IT & Software',
    status: 'Paid',
    amount: 1200000,
    currency: 'RP',
    department: 'IT',
    submittedBy: 'Emad Moustafa',
    receiptsCount: 1,
    receiptName: 'Cloud_Hosting_Invoice.pdf',
    notes: 'Monthly enterprise server backup and data archiving tier renewal.',
    approvalTimeline: [
      { step: 'Claim Submitted', approver: 'Emad Moustafa', status: 'completed', date: 'Sep 29, 2026 10:00' },
      { step: 'Direct Manager Review', approver: 'Mr. Khalid Al-Otaibi', status: 'completed', date: 'Sep 29, 2026 12:00' },
      { step: 'Finance Director Review', approver: 'Mr. Hesham Mokhtar', status: 'completed', date: 'Sep 30, 2026 09:00' },
      { step: 'Disbursement & Payment', approver: 'Finance Treasury', status: 'completed', date: 'Sep 30, 2026 15:00' }
    ]
  }
];

const MyExpenses: React.FC = () => {
  const { user } = useAuth();

  const [expenses, setExpenses] = useState<ExpenseClaim[]>(() => {
    const saved = localStorage.getItem('finance_my_expenses');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
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

  // New Expense Modal State
  const [isNewExpenseModalOpen, setIsNewExpenseModalOpen] = useState(false);
  const [newReason, setNewReason] = useState('');
  const [newCategory, setNewCategory] = useState('Transportation & Fuel');
  const [newAmount, setNewAmount] = useState('');
  const [newCurrency, setNewCurrency] = useState('RP');
  const [newNotes, setNewNotes] = useState('');
  const [newReceiptName, setNewReceiptName] = useState('');

  // Save to localStorage when changed
  const saveExpenses = (updated: ExpenseClaim[]) => {
    setExpenses(updated);
    localStorage.setItem('finance_my_expenses', JSON.stringify(updated));
  };

  // Stats calculation
  const totalClaimsCount = expenses.length;
  const pendingCount = expenses.filter(e => e.status === 'Pending' || e.status === 'Mr.Khalid Review' || e.status === 'Mr. Hesham Review').length;
  const approvedCount = expenses.filter(e => e.status === 'Approved' || e.status === 'Paid').length;
  const paidTotalUSD = 4850.00; // Visual matching screenshot metric

  // Filter & Search
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
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

  const renderStatusBadge = (status: ExpenseClaim['status']) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="px-3 py-1 rounded-md text-[11px] font-bold bg-[#fef3c7] text-[#b45309] border border-[#fde68a] inline-flex items-center space-x-1">
            <span>Pending</span>
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
            <span>Approved</span>
          </span>
        );
      case 'Paid':
        return (
          <span className="px-3 py-1 rounded-md text-[11px] font-bold bg-[#d1fae5] text-[#065f46] border border-[#a7f3d0] inline-flex items-center space-x-1">
            <span>Paid</span>
          </span>
        );
      case 'Rejected':
        return (
          <span className="px-3 py-1 rounded-md text-[11px] font-bold bg-[#fee2e2] text-[#991b1b] border border-[#fecaca] inline-flex items-center space-x-1">
            <span>Rejected</span>
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

  const handleCreateExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(newAmount);
    if (!newReason || isNaN(numAmt) || numAmt <= 0) return;

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

    const newClaim: ExpenseClaim = {
      id: String(Date.now()),
      claimId: `EXP-2024-${randomSuffix}`,
      submitDate: dateStr,
      reason: newReason,
      category: newCategory,
      status: 'Pending',
      amount: numAmt,
      currency: newCurrency,
      department: 'Operations',
      submittedBy: user?.name || 'Emad Moustafa',
      receiptsCount: newReceiptName ? 1 : 0,
      receiptName: newReceiptName || undefined,
      notes: newNotes,
      approvalTimeline: [
        { step: 'Claim Submitted', approver: user?.name || 'Emad Moustafa', status: 'completed', date: `${dateStr} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` },
        { step: 'Direct Manager Review', approver: 'Mr. Khalid Al-Otaibi', status: 'in_progress' },
        { step: 'Finance Director Review', approver: 'Mr. Hesham Mokhtar', status: 'pending' },
        { step: 'Disbursement & Payment', approver: 'Finance Treasury', status: 'pending' }
      ]
    };

    saveExpenses([newClaim, ...expenses]);
    setIsNewExpenseModalOpen(false);
    setNewReason('');
    setNewAmount('');
    setNewNotes('');
    setNewReceiptName('');
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
                My Expense Dashboard
              </h1>
              <p className="text-[13px] text-[#64748b] font-medium">
                Track and manage your submitted claim requests and business expenses
              </p>
            </div>

            <button
              onClick={() => setIsNewExpenseModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-[13px] rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Submit New Expense</span>
            </button>
          </div>

          {/* 4 Stat Cards Grid (Matching screenshot pixel-by-pixel) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Claims */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-slate-500">Total Claims</span>
              </div>
              <div className="text-[26px] font-extrabold text-[#0c0d0f] tracking-tight">
                {totalClaimsCount} Requests
              </div>
              <div className="flex items-center space-x-2 pt-1">
                <span className="w-1 h-3.5 bg-slate-800 rounded-full flex-shrink-0" />
                <span className="text-[11.5px] font-medium text-slate-400">YTD claims submitted</span>
              </div>
            </div>

            {/* Card 2: Pending Approval */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-slate-500">Pending Approval</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#fef3c7] text-[#b45309]">
                  Pending
                </span>
              </div>
              <div className="text-[26px] font-extrabold text-[#0c0d0f] tracking-tight">
                {pendingCount} Requests
              </div>
              <div className="flex items-center space-x-2 pt-1">
                <span className="w-1 h-3.5 bg-[#d97706] rounded-full flex-shrink-0" />
                <span className="text-[11.5px] font-medium text-slate-400">Awaiting review chain</span>
              </div>
            </div>

            {/* Card 3: Approved Claims */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-slate-500">Approved Claims</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#dcfce7] text-[#15803d]">
                  Approved
                </span>
              </div>
              <div className="text-[26px] font-extrabold text-[#0c0d0f] tracking-tight">
                {approvedCount} Requests
              </div>
              <div className="flex items-center space-x-2 pt-1">
                <span className="w-1 h-3.5 bg-[#16a34a] rounded-full flex-shrink-0" />
                <span className="text-[11.5px] font-medium text-slate-400">Verified by Direct Manager</span>
              </div>
            </div>

            {/* Card 4: Paid Reimbursements */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-slate-500">Paid Reimbursements</span>
              </div>
              <div className="text-[26px] font-extrabold text-[#0c0d0f] tracking-tight">
                ${paidTotalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center space-x-2 pt-1">
                <span className="w-1 h-3.5 bg-[#2563eb] rounded-full flex-shrink-0" />
                <span className="text-[11.5px] font-medium text-slate-400">Disbursed to bank account</span>
              </div>
            </div>
          </div>

          {/* Main Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            {/* Card Header & Search / Filter Controls */}
            <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
              <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">
                My Expense Requests
              </h2>

              <div className="flex items-center space-x-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search expenses..."
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                    <span>Filter List</span>
                    {statusFilter !== 'ALL' && (
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                    )}
                  </button>

                  {/* Filter Dropdown */}
                  {isFilterDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-fade-in font-sans">
                      <div className="px-3 py-1.5 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                        Filter by Status
                      </div>
                      {['ALL', 'Pending', 'Mr.Khalid Review', 'Mr. Hesham Review', 'Approved', 'Paid', 'Rejected'].map((st) => (
                        <button
                          key={st}
                          onClick={() => {
                            setStatusFilter(st);
                            setIsFilterDropdownOpen(false);
                            setCurrentPage(1);
                          }}
                          className={`w-full text-left px-3.5 py-2 text-[12px] font-semibold flex items-center justify-between hover:bg-slate-50 transition-all ${
                            statusFilter === st ? 'text-blue-600 bg-blue-50/50' : 'text-slate-700'
                          }`}
                        >
                          <span>{st === 'ALL' ? 'All Statuses' : st}</span>
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
                    <th className="px-6 py-3.5">CLAIM ID</th>
                    <th className="px-6 py-3.5">SUBMIT DATE</th>
                    <th className="px-6 py-3.5">REASON / MISSION REFERENCE</th>
                    <th className="px-6 py-3.5">STATUS</th>
                    <th className="px-6 py-3.5 text-right">AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedExpenses.length > 0 ? (
                    paginatedExpenses.map((exp) => (
                      <tr
                        key={exp.id}
                        onClick={() => setSelectedClaim(exp)}
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
                Showing {filteredExpenses.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
                {Math.min(currentPage * itemsPerPage, filteredExpenses.length)} of {filteredExpenses.length} requests
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage <= 1}
                  className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-[12px] font-semibold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage >= totalPages}
                  className="px-4 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-[12px] font-semibold transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-xs"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Claim Details Modal */}
      {selectedClaim && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0c0d0f]/60 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setSelectedClaim(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-scale-up font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-slate-900">{selectedClaim.claimId}</h3>
                  <p className="text-[11.5px] text-slate-500">{selectedClaim.submitDate}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedClaim(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Amount & Status Banner */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Total Claim Amount</span>
                  <span className="text-xl font-extrabold text-slate-900">{formatAmount(selectedClaim.amount, selectedClaim.currency)}</span>
                </div>
                <div>{renderStatusBadge(selectedClaim.status)}</div>
              </div>

              {/* Claim Information */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Claim Information</h4>
                
                <div className="grid grid-cols-2 gap-3 text-[12.5px]">
                  <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-100">
                    <span className="text-[11px] text-slate-400 block font-medium">Category</span>
                    <span className="font-semibold text-slate-800">{selectedClaim.category}</span>
                  </div>
                  <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-100">
                    <span className="text-[11px] text-slate-400 block font-medium">Department</span>
                    <span className="font-semibold text-slate-800">{selectedClaim.department}</span>
                  </div>
                </div>

                <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-100 text-[12.5px]">
                  <span className="text-[11px] text-slate-400 block font-medium mb-0.5">Reason / Mission Reference</span>
                  <span className="font-semibold text-slate-800 leading-relaxed block">{selectedClaim.reason}</span>
                </div>

                {selectedClaim.notes && (
                  <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-100 text-[12.5px]">
                    <span className="text-[11px] text-slate-400 block font-medium mb-0.5">Additional Notes</span>
                    <p className="text-slate-600 text-[12px] leading-relaxed">{selectedClaim.notes}</p>
                  </div>
                )}

                {selectedClaim.receiptName && (
                  <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-100 flex items-center justify-between text-[12px]">
                    <div className="flex items-center space-x-2">
                      <Paperclip className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-blue-900 truncate max-w-[240px]">{selectedClaim.receiptName}</span>
                    </div>
                    <span className="text-[11px] font-bold text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-200">
                      Attached
                    </span>
                  </div>
                )}
              </div>

              {/* Multi-step Approval Chain Timeline */}
              <div className="space-y-3 pt-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Approval Workflow Timeline</h4>
                
                <div className="space-y-3 pl-2 border-l-2 border-slate-200 ml-2">
                  {selectedClaim.approvalTimeline.map((step, idx) => {
                    const isDone = step.status === 'completed';
                    const isCurrent = step.status === 'in_progress';
                    const isRejected = step.status === 'rejected';

                    return (
                      <div key={idx} className="relative pl-4 text-[12px]">
                        <span
                          className={`absolute -left-[15px] top-0.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                            isDone
                              ? 'border-emerald-500 text-emerald-500'
                              : isCurrent
                              ? 'border-blue-500 bg-blue-50 text-blue-500'
                              : isRejected
                              ? 'border-rose-500 text-rose-500'
                              : 'border-slate-300 text-slate-300'
                          }`}
                        >
                          {isDone ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          ) : isCurrent ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          ) : isRejected ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          )}
                        </span>

                        <div className="flex items-center justify-between">
                          <span className={`font-bold ${isCurrent ? 'text-blue-700' : isDone ? 'text-slate-800' : 'text-slate-400'}`}>
                            {step.step}
                          </span>
                          {step.date && <span className="text-[10.5px] text-slate-400 font-medium">{step.date}</span>}
                        </div>
                        <p className="text-[11.5px] text-slate-500 font-medium mt-0.5">Assigned: {step.approver}</p>
                        {step.comment && (
                          <div className="mt-1 p-2 bg-rose-50 border border-rose-100 rounded text-[11px] text-rose-700 font-medium">
                            Note: {step.comment}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedClaim(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-[12px] transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit New Expense Modal */}
      {isNewExpenseModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0c0d0f]/60 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setIsNewExpenseModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-up font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-[16px] font-bold text-[#0c0d0f]">Submit New Expense Claim</h3>
              </div>
              <button onClick={() => setIsNewExpenseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExpenseSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Reason / Mission Reference</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Client Dinner & Catering Accommodation"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-[13px] font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Expense Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[12.5px] font-semibold text-slate-800 focus:outline-none focus:border-blue-500 bg-slate-50"
                  >
                    <option value="Transportation & Fuel">Transportation & Fuel</option>
                    <option value="Meals & Per Diem">Meals & Per Diem</option>
                    <option value="Client Entertainment">Client Entertainment</option>
                    <option value="Office Supplies & Logistics">Office Supplies & Logistics</option>
                    <option value="Stationery & Printing">Stationery & Printing</option>
                    <option value="IT & Software">IT & Software</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Currency</label>
                  <select
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[12.5px] font-semibold text-slate-800 focus:outline-none focus:border-blue-500 bg-slate-50"
                  >
                    <option value="RP">RP (IDR)</option>
                    <option value="SAR">SAR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Claim Amount</label>
                <input
                  type="number"
                  required
                  step="any"
                  placeholder="e.g. 500000"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-[13px] font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Attach Receipt / Invoice File</label>
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setNewReceiptName(e.target.files[0].name);
                    }
                  }}
                  className="w-full text-[12px] text-slate-500 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-[12px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Additional Notes</label>
                <textarea
                  rows={2}
                  placeholder="Brief description of the mission expense..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-[12.5px] font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewExpenseModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-[12px] font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[12px] font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Submit Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyExpenses;
