import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import StatCard from '../../components/ui/StatCard';
import InvoiceTable from '../../components/ui/InvoiceTable';
import QueueCard from '../../components/ui/QueueCard';
import BranchCard from '../../components/ui/BranchCard';
import { useAuth } from '../../context/AuthContext';
import { X, FileText, Folder } from 'lucide-react';
import BranchFinancialReportPrint, { type ReportMeta, type BranchReport } from '../../components/ui/BranchFinancialReportPrint';
import { getInvoices } from '../../services/invoiceService';
import { getBranches } from '../../services/settingService';
import NetworkErrorState from '../../components/ui/NetworkErrorState';

// Dynamic branch reports computed from database
const getInvoiceBranch = (inv: any, dbBranches: any[]): string => {
  if (!inv) return 'CBC Office';

  // 1. Prioritize invoice's own branch field if it exists
  if (inv.branch && Array.isArray(dbBranches)) {
    const match = dbBranches.find(b => (b.name || '').toLowerCase() === (inv.branch || '').toLowerCase());
    if (match) {
      return match.name;
    }
  }

  // 2. Fallback to match company/client name
  let branch = '';
  if (Array.isArray(dbBranches)) {
    const match = dbBranches.find(b =>
      (b.name || '').toLowerCase() === (inv.company || '').toLowerCase() ||
      (b.name || '').toLowerCase().includes((inv.companyCode || '').toLowerCase()) ||
      (inv.company || '').toLowerCase().includes((b.name || '').toLowerCase())
    );
    if (match) {
      branch = match.name;
    }
  }

  if (Array.isArray(dbBranches) && dbBranches.length > 0) {
    if (!branch) {
      branch = dbBranches[0].name;
    }
  } else {
    branch = 'CBC Office';
  }
  return branch;
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  const isAuthorizedForConsolidated = useMemo(() => {
    return !!user && ['Super Admin', 'Chief Accountant', 'Division Director'].includes(user.role);
  }, [user]);

  const formatBranchName = (name: string) => {
    return name === 'Graha Al Badegel' ? 'ODST Group' : name;
  };
  const [invoices, setInvoices] = useState<any[]>([]);
  const [dbBranches, setDbBranches] = useState<any[]>([]);

  // New Loading & Error States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reportMeta = useMemo<ReportMeta>(() => {
    let latestDate = new Date();
    if (Array.isArray(invoices) && invoices.length > 0) {
      const dates = invoices.map(inv => inv ? new Date(inv.date).getTime() : 0).filter(t => !isNaN(t));
      if (dates.length > 0) {
        latestDate = new Date(Math.max(...dates));
      }
    }
    const q = Math.floor(latestDate.getMonth() / 3) + 1;
    const year = latestDate.getFullYear();
    const genDate = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();

    return {
      branchName: formatBranchName(selectedBranch || (dbBranches[0]?.name || "Main Office")),
      period: `Q${q} ${year}`,
      generatedDate: genDate,
      companyName: "DST",
      footerNote: "DST Finance · Confidential",
      pageInfo: "Page 1 of 1",
    };
  }, [selectedBranch, invoices, dbBranches]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedInvoices, fetchedBranches] = await Promise.all([
        getInvoices(),
        getBranches()
      ]);
      if (fetchedInvoices) setInvoices(fetchedInvoices);
      if (fetchedBranches) setDbBranches(fetchedBranches);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to fetch dashboard metrics. Please check server connections.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getFirstName = (fullName?: string) => {
    if (!fullName) return 'Guest';
    const parts = fullName.split(' ');
    if ((parts[0] === 'Mr.' || parts[0] === 'Mrs.' || parts[0] === 'Ms.') && parts.length > 1) {
      return `${parts[0]} ${parts[1]}`;
    }
    return parts[0];
  };

  const parseAmount = (amtStr: any): number => {
    if (!amtStr) return 0;
    const str = String(amtStr);
    const val = parseFloat(str.replace(/[^0-9.-]+/g, ""));
    return isNaN(val) ? 0 : val;
  };

  // Stats calculation by branch
  const branchStats = useMemo(() => {
    const stats: Record<string, {
      revenue: number;
      outstanding: number;
      sent: number;
      approved: number;
      pending: number;
      overdue: number;
    }> = {};

    // Initialize with database branches
    if (Array.isArray(dbBranches)) {
      dbBranches.forEach(b => {
        stats[b.name] = { revenue: 0, outstanding: 0, sent: 0, approved: 0, pending: 0, overdue: 0 };
      });
    }

    if (Array.isArray(invoices)) {
      invoices.forEach(inv => {
        if (!inv) return;

        // If no branches in DB, do not map to anything
        if (!Array.isArray(dbBranches) || dbBranches.length === 0) {
          return;
        }

        // Find which branch this invoice belongs to dynamically.
        const branch = getInvoiceBranch(inv, dbBranches);

        // Ensure stats entry exists
        if (!stats[branch]) {
          stats[branch] = { revenue: 0, outstanding: 0, sent: 0, approved: 0, pending: 0, overdue: 0 };
        }

        const amt = parseAmount(inv.amount);
        stats[branch].sent += 1;
        const status = String(inv.status || 'Pending').toLowerCase();
        
        // 1. Revenue & Approvals
        if (status === 'approved' || status === '3/3 approved' || status.includes('paid')) {
          stats[branch].approved += 1;
          stats[branch].revenue += amt;
        } else if (status === 'rejected') {
          stats[branch].overdue += 1;
        } else if (status.includes('pending') || status === '1/3 approved' || status === '2/3 approved') {
          stats[branch].pending += 1;
        }

        // 2. Outstanding Balance: only active unpaid invoices (excluding archived, cancelled, or rejected)
        const isOutstanding = !status.includes('paid') && 
                              status !== 'archived' && 
                              status !== 'cancelled' && 
                              status !== 'rejected';
        if (isOutstanding) {
          stats[branch].outstanding += amt;
        }
      });
    }

    return stats;
  }, [invoices, dbBranches]);

  const pendingInvoices = Array.isArray(invoices) ? invoices.filter(inv => {
    if (!inv) return false;
    const status = String(inv.status || '').toLowerCase();
    return status.includes('pending') || status === '1/3 approved' || status === '2/3 approved';
  }) : [];

  const totalRev = Object.values(branchStats).reduce((sum, b) => sum + b.revenue, 0);
  const totalInvoicesCount = Array.isArray(invoices) ? invoices.length : 0;
  const pendingCount = Object.values(branchStats).reduce((sum, b) => sum + b.pending, 0);
  const totalOutstanding = Object.values(branchStats).reduce((sum, b) => sum + b.outstanding, 0);

  const formattedTotalRev = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(totalRev);

  const formattedOutstanding = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(totalOutstanding);

  const metricsData = [
    {
      title: 'Total Revenue',
      value: formattedTotalRev,
      subtext: 'This quarter so far',
      badgeText: totalInvoicesCount > 0 ? '+12.4%' : '',
      badgeColorClass: 'bg-[#ecfdf5] text-[#10b981]',
    },
    {
      title: 'Total Invoices',
      value: `${totalInvoicesCount} Sent`,
      subtext: 'Across all active branches',
      badgeText: totalInvoicesCount > 0 ? 'Q3 Target' : '',
      badgeColorClass: 'bg-[#e0f2fe] text-[#0284c7]',
    },
    {
      title: 'Pending Approvals',
      value: `${pendingCount} Invoices`,
      subtext: 'Awaiting final clearance',
      badgeText: totalInvoicesCount > 0 ? (pendingCount > 0 ? `${pendingCount} Critical` : '0 Critical') : '',
      badgeColorClass: pendingCount > 0 ? 'bg-[#fef2f2] text-[#ef4444]' : 'bg-[#ecfdf5] text-[#10b981]',
    },
    {
      title: 'Outstanding Balance',
      value: formattedOutstanding,
      subtext: 'Past due collections',
      badgeText: '',
      badgeColorClass: 'bg-[#fff7ed] text-[#f97316]',
    },
  ];

  const recentInvoices = (Array.isArray(invoices) ? invoices : []).slice(0, 5).map(inv => {
    if (!inv) return { ref: '', client: '', amount: '$0', status: 'Pending', statusColor: '', date: '' };
    let status = String(inv.status || 'Pending');
    if (status.includes('Approved') || status === 'Approved') {
      status = 'Approved';
    } else if (status.includes('Pending') || status === 'Pending Review') {
      status = 'Pending';
    } else if (status === 'Rejected') {
      status = 'Overdue';
    }
    return {
      ref: inv.invoiceNo || '',
      client: inv.company || '',
      amount: inv.amount || '$0',
      status: status,
      statusColor: '',
      date: inv.date || '',
      dueDate: inv.dueDate || ''
    };
  });

  const approvalQueue = pendingInvoices.slice(0, 3).map(inv => {
    if (!inv) return { client: '', refNo: '', amount: '$0', due: 'Awaiting review' };
    let dueText = 'Awaiting review';
    if (inv.dueDate) {
      const today = new Date();
      const due = new Date(inv.dueDate);
      const diffTime = due.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        dueText = `Overdue by ${Math.abs(diffDays)} days`;
      } else if (diffDays === 0) {
        dueText = 'Due today';
      } else {
        dueText = `Due in ${diffDays} days`;
      }
    }
    return {
      client: inv.company || '',
      refNo: inv.invoiceNo || '',
      amount: inv.amount || '$0',
      due: dueText
    };
  });

  const totalRevenueForShare = totalRev || 1;
  const COLORS = ['bg-[#007aff]', 'bg-[#10b981]', 'bg-[#3b82f6]', 'bg-[#f97316]', 'bg-[#8b5cf6]', 'bg-[#ec4899]'];

  const consolidatedBranches = useMemo(() => {
    const list = Array.isArray(dbBranches) ? dbBranches.map(b => b.name) : [];

    return list.map((name, idx) => {
      const stats = branchStats[name] || { revenue: 0 };
      return {
        office: formatBranchName(name),
        officeKey: name,
        share: `Revenue Share: ${((stats.revenue / totalRevenueForShare) * 100).toFixed(0)}%`,
        amount: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(stats.revenue),
        dotColor: COLORS[idx % COLORS.length]
      };
    });
  }, [dbBranches, branchStats, totalRevenueForShare]);

  const selectedBranchReport = useMemo<BranchReport | null>(() => {
    if (!selectedBranch || !branchStats[selectedBranch]) return null;
    const b = branchStats[selectedBranch];

    // Formatter helper
    const fmt = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

    // 1. Find the latest date among all invoices to establish the 3-month range
    let latestDate = new Date();
    if (Array.isArray(invoices) && invoices.length > 0) {
      const dates = invoices.map(inv => inv ? new Date(inv.date).getTime() : 0).filter(t => !isNaN(t));
      if (dates.length > 0) {
        latestDate = new Date(Math.max(...dates));
      }
    }

    // 2. Get the 3 months ending at latestDate
    const targetMonths: { monthName: string; year: number; label: string }[] = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(latestDate.getFullYear(), latestDate.getMonth() - i, 1);
      const mName = d.toLocaleString('en-US', { month: 'short' });
      const y = d.getFullYear();
      targetMonths.push({ monthName: mName, year: y, label: `${mName} ${y}` });
    }

    // 3. Compute revenue for each target month
    const monthlyValues = targetMonths.map(tm => {
      let amt = 0;
      if (Array.isArray(invoices)) {
        invoices.forEach(inv => {
          if (!inv) return;
          const branch = getInvoiceBranch(inv, dbBranches);
          if (branch !== selectedBranch) return;

          const status = String(inv.status || 'Pending').toLowerCase();
          if (status === 'approved' || status === '3/3 approved' || status.includes('paid')) {
            const invDate = new Date(inv.date);
            if (invDate.toLocaleString('en-US', { month: 'short' }) === tm.monthName && invDate.getFullYear() === tm.year) {
              amt += parseAmount(inv.amount);
            }
          }
        });
      }
      return { month: tm.label, amount: amt };
    });

    const maxVal = Math.max(...monthlyValues.map(mv => mv.amount), 1);
    const monthlyRevenue = monthlyValues.map(mv => ({
      month: mv.month,
      amount: fmt(mv.amount),
      width: `${Math.max(5, (mv.amount / maxVal) * 100)}%`
    }));

    // 4. Calculate QoQ growth
    const getQuarter = (d: Date) => Math.floor(d.getMonth() / 3) + 1;
    const currQ = getQuarter(latestDate);
    const currYear = latestDate.getFullYear();

    let prevQ = currQ - 1;
    let prevYear = currYear;
    if (prevQ === 0) {
      prevQ = 4;
      prevYear = currYear - 1;
    }

    let currQRevenue = 0;
    let prevQRevenue = 0;

    if (Array.isArray(invoices)) {
      invoices.forEach(inv => {
        if (!inv) return;
        const branch = getInvoiceBranch(inv, dbBranches);
        if (branch !== selectedBranch) return;

        const status = String(inv.status || 'Pending').toLowerCase();
        if (status === 'approved' || status === '3/3 approved' || status.includes('paid')) {
          const invDate = new Date(inv.date);
          const q = getQuarter(invDate);
          const y = invDate.getFullYear();
          const amt = parseAmount(inv.amount);

          if (q === currQ && y === currYear) {
            currQRevenue += amt;
          } else if (q === prevQ && y === prevYear) {
            prevQRevenue += amt;
          }
        }
      });
    }

    let growthPct = 0;
    if (prevQRevenue > 0) {
      growthPct = ((currQRevenue - prevQRevenue) / prevQRevenue) * 100;
    } else if (currQRevenue > 0) {
      growthPct = 100;
    }
    const growthStr = growthPct >= 0 ? `+${growthPct.toFixed(1)}%` : `${growthPct.toFixed(1)}%`;

    return {
      revenue: fmt(b.revenue),
      share: `${((b.revenue / totalRevenueForShare) * 100).toFixed(0)}%`,
      growth: growthStr,
      outstanding: fmt(b.outstanding),
      distribution: {
        sent: b.sent,
        approved: b.approved,
        pending: b.pending,
        overdue: b.overdue
      },
      comparison: [
        { metric: 'Revenue', curr: fmt(currQRevenue), prev: fmt(prevQRevenue), change: growthStr },
        { metric: 'Net Profit', curr: fmt(currQRevenue * 0.7), prev: fmt(prevQRevenue * 0.7), change: growthStr },
        { metric: 'Profit Margin', curr: currQRevenue > 0 ? '70.0%' : '0.0%', prev: prevQRevenue > 0 ? '70.0%' : '0.0%', change: (currQRevenue > 0 && prevQRevenue > 0) ? '+0.0%' : (currQRevenue > 0 ? '+70.0%' : '0.0%') },
      ],
      monthlyRevenue
    };
  }, [selectedBranch, branchStats, totalRevenueForShare, invoices, dbBranches]);

  const handleReview = (refNo: string) => {
    navigate('/requests', { state: { selectInvoiceNo: refNo } });
  };

  return (
    <div className="flex min-h-screen w-full bg-[#f4f6fa] select-none font-inter relative">
      {/* Sidebar Layout */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header Layout */}
        <Header />

        {/* Content Body */}
        <div className="flex-1 p-8 space-y-8 max-w-[1400px] w-full mx-auto">
          {/* Welcome Banner */}
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-3">
              <h1 className="text-[26px] font-bold text-[#0c0d0f] tracking-tight">
                Welcome, {getFirstName(user?.name)}
              </h1>
              <span className="px-2.5 py-0.5 bg-[#dbeafe] text-[#2563eb] font-semibold text-[11px] rounded-full">
                {user?.role || 'Guest'}
              </span>
            </div>
            <p className="text-[13px] text-[#64748b] font-medium font-sans">
              ODST Finance Corporate Treasury Portal
            </p>
          </div>

          {loading ? (
            <div className="space-y-8 animate-pulse">
              {/* Metric Cards Skeleton Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-xl border border-[#e2e8f0] flex flex-col justify-between shadow-sm h-[130px]">
                    <div className="flex justify-between items-start">
                      <div className="w-16 h-3 bg-gray-200/80 rounded-md"></div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="w-24 h-7 bg-gray-200/50 rounded-md"></div>
                      <div className="w-32 h-3.5 bg-gray-100 rounded-md"></div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Main Section Skeleton */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e2e8f0] p-6 space-y-6 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <div className="w-32 h-4 bg-gray-200/80 rounded-md"></div>
                    <div className="w-16 h-4 bg-gray-200/50 rounded-md"></div>
                  </div>
                  {/* Table Layout Mock */}
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-5 gap-4 bg-slate-50/70 p-4 border-b border-gray-100">
                      <div className="w-12 h-3 bg-gray-200/80 rounded-md"></div>
                      <div className="w-16 h-3 bg-gray-200/80 rounded-md"></div>
                      <div className="w-16 h-3 bg-gray-200/80 rounded-md"></div>
                      <div className="w-12 h-3 bg-gray-200/80 rounded-md"></div>
                      <div className="w-16 h-3 bg-gray-200/80 rounded-md"></div>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {Array.from({ length: 5 }).map((_, rowIdx) => (
                        <div key={rowIdx} className="grid grid-cols-5 gap-4 p-4 items-center">
                          <div className="w-16 h-3.5 bg-gray-200/50 rounded-md"></div>
                          <div className="w-24 h-3.5 bg-gray-200/50 rounded-md"></div>
                          <div className="w-20 h-3.5 bg-gray-200/50 rounded-md"></div>
                          <div className="w-10 h-3.5 bg-gray-200/50 rounded-md"></div>
                          <div className="w-16 h-3.5 bg-gray-200/50 rounded-md"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 space-y-6 shadow-sm flex flex-col">
                  <div className="flex justify-between items-center">
                    <div className="w-28 h-4 bg-gray-200/80 rounded-md"></div>
                    <div className="w-16 h-4 bg-gray-200/50 rounded-md"></div>
                  </div>
                  <div className="space-y-4 flex-1">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div key={idx} className="border border-gray-100 rounded-xl p-4 flex justify-between items-center">
                        <div className="space-y-2">
                          <div className="w-32 h-3.5 bg-gray-200/60 rounded-md"></div>
                          <div className="w-20 h-3 bg-gray-200/40 rounded-md"></div>
                        </div>
                        <div className="w-12 h-6 bg-gray-200/50 rounded-md"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden py-10">
              <NetworkErrorState
                message="We could not load your dashboard metrics. Please check your connection and try again."
                onRetry={fetchDashboardData}
              />
            </div>
          ) : (
            <>
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {metricsData.map((metric, idx) => (
                  <StatCard key={idx} {...metric} />
                ))}
              </div>

              {totalInvoicesCount === 0 ? (
                /* Empty State Container */
                <div className="bg-white rounded-xl border border-[#e2e8f0] p-16 shadow-sm flex flex-col items-center justify-center min-h-[420px] text-center animate-fade-in">
                  <div className="w-[72px] h-[72px] rounded-full bg-[#f8fafc] border border-[#f1f5f9] flex items-center justify-center mb-6">
                    <Folder className="w-[28px] h-[28px] text-[#94a3b8]" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-[20px] font-bold text-[#0f172a] font-sans mb-2 tracking-tight">
                    No activity yet
                  </h3>
                  <p className="text-[13.5px] text-[#64748b] font-normal font-sans max-w-[420px] leading-relaxed mb-8">
                    Start by adding partner companies and generating your first<br />invoice.
                  </p>
                  <div className="flex items-center space-x-3">
                    {user?.role !== 'Accountant' && (
                      <button
                        onClick={() => navigate('/companies')}
                        className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold rounded-lg transition-all text-[13px] font-sans shadow-sm cursor-pointer"
                      >
                        Add Company
                      </button>
                    )}
                    <button
                      onClick={() => navigate('/invoices')}
                      className="px-5 py-2.5 bg-white text-[#334155] border border-[#cbd5e1] font-semibold rounded-lg hover:bg-gray-50 transition-all text-[13px] font-sans shadow-sm cursor-pointer"
                    >
                      Generate Invoice
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Middle Layout (Recent Invoices & Approval Queue) */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recent Invoices Table */}
                    <InvoiceTable 
                      invoices={recentInvoices} 
                      isFullWidth={user?.role === 'Accountant'}
                    />

                    {/* Approval Queue Section */}
                    {user?.role !== 'Accountant' && (
                      <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[16px] font-bold text-[#0c0d0f] font-sans">
                              Approval Queue
                            </h3>
                            <span className="px-2 py-0.5 bg-[#fef2f2] text-[#ef4444] font-bold text-[11px] rounded-full font-inter">
                              Awaiting Me
                            </span>
                          </div>

                          <div className="space-y-4">
                            {approvalQueue.map((item, idx) => (
                              <QueueCard
                                key={idx}
                                {...item}
                                onReview={() => handleReview(item.refNo)}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Section: Consolidated Branch Performance */}
                  {isAuthorizedForConsolidated && consolidatedBranches.length > 0 && (
                    <div className="space-y-4 pt-8">
                      <h3 className="text-[16px] font-bold text-[#0c0d0f] font-sans">
                        Consolidated Branch Performance
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {consolidatedBranches.map((branch, idx) => (
                          <BranchCard
                            key={idx}
                            office={branch.office}
                            share={branch.share}
                            amount={branch.amount}
                            dotColor={branch.dotColor}
                            onClick={() => setSelectedBranch(branch.officeKey)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>

      {/* Financial Report Modal */}
      {selectedBranch && selectedBranchReport && (isAuthorizedForConsolidated || selectedBranch === user?.branch) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0d0f]/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col animate-scale-up">
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#e2e8f0] flex justify-between items-center bg-gray-50">
              <div className="flex flex-col">
                <h3 className="text-[18px] font-bold text-[#0c0d0f] font-sans">
                  {formatBranchName(selectedBranch)} — Financial Report
                </h3>
                <span className="text-[12px] text-[#64748b] font-medium mt-0.5">
                  Q3 2024 Performance Summary
                </span>
              </div>
              <button
                onClick={() => setSelectedBranch(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
              {/* Stat Cards Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Revenue */}
                <div className="bg-[#f8fafc] p-4 rounded-xl border border-[#e2e8f0]">
                  <span className="block text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-1 font-inter">
                    Total Revenue
                  </span>
                  <span className="text-[20px] font-bold text-[#0c0d0f] font-roboto">
                    {selectedBranchReport.revenue}
                  </span>
                </div>
                {/* Revenue Share */}
                <div className="bg-[#f8fafc] p-4 rounded-xl border border-[#e2e8f0]">
                  <span className="block text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-1 font-inter">
                    Revenue Share
                  </span>
                  <span className="text-[20px] font-bold text-[#0c0d0f] font-roboto">
                    {selectedBranchReport.share}
                  </span>
                </div>
                {/* Growth */}
                <div className="bg-[#f8fafc] p-4 rounded-xl border border-[#e2e8f0]">
                  <span className="block text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-1 font-inter">
                    Growth (QoQ)
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <span className={`text-[20px] font-bold font-roboto ${selectedBranchReport.growth.startsWith('-') ? 'text-red-600' : 'text-emerald-600'
                      }`}>
                      {selectedBranchReport.growth}
                    </span>
                    <span className={`text-[12px] ${selectedBranchReport.growth.startsWith('-') ? 'text-red-600' : 'text-emerald-600'
                      }`}>
                      {selectedBranchReport.growth.startsWith('-') ? '▼' : '▲'}
                    </span>
                  </div>
                </div>
                {/* Outstanding */}
                <div className="bg-[#f8fafc] p-4 rounded-xl border border-[#e2e8f0]">
                  <span className="block text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-1 font-inter">
                    Outstanding
                  </span>
                  <span className="text-[20px] font-bold text-[#c2410c] font-roboto">
                    {selectedBranchReport.outstanding}
                  </span>
                </div>
              </div>

              {/* Quarterly Financial Comparison Table */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-[#0c0d0f] uppercase tracking-wider font-inter">
                  Quarterly Financial Comparison
                </h4>
                <div className="overflow-x-auto border border-[#e2e8f0] rounded-xl">
                  <table className="w-full text-left border-collapse text-[13px] font-sans">
                    <thead>
                      <tr className="bg-gray-50 border-b border-[#e2e8f0]">
                        <th className="px-4 py-2.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider font-inter">
                          Metric
                        </th>
                        <th className="px-4 py-2.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-right font-inter">
                          Q3 2024 (Curr)
                        </th>
                        <th className="px-4 py-2.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-right font-inter">
                          Q2 2024 (Prev)
                        </th>
                        <th className="px-4 py-2.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-right font-inter">
                          Change
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0] font-medium text-[#1e293b]">
                      {selectedBranchReport.comparison.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-semibold text-[#1e293b]">
                            {row.metric}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-[#0c0d0f] font-roboto">
                            {row.curr}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-500 font-roboto">
                            {row.prev}
                          </td>
                          <td className={`px-4 py-3 text-right font-bold font-inter ${row.change.startsWith('-') ? 'text-red-600' : 'text-emerald-600'
                            }`}>
                            {row.change}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Invoice Distribution Overview */}
              <div className="space-y-3 font-sans">
                <h4 className="text-[11px] font-bold text-[#0c0d0f] uppercase tracking-wider font-inter">
                  Invoice Distribution Overview
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Total Sent */}
                  <div className="bg-white px-4 py-3.5 border border-[#e2e8f0] rounded-xl flex items-center justify-between shadow-sm">
                    <span className="text-[13px] text-[#64748b] font-semibold font-sans">
                      Total Sent
                    </span>
                    <span className="px-2.5 py-0.5 bg-[#f1f5f9] text-[#475569] font-bold text-[13px] rounded-lg font-inter">
                      {selectedBranchReport.distribution.sent}
                    </span>
                  </div>
                  {/* Approved */}
                  <div className="bg-white px-4 py-3.5 border border-[#e2e8f0] rounded-xl flex items-center justify-between shadow-sm">
                    <span className="text-[13px] text-[#64748b] font-semibold font-sans">
                      Approved
                    </span>
                    <span className="px-2.5 py-0.5 bg-[#ecfdf5] text-[#10b981] font-bold text-[13px] rounded-lg font-inter">
                      {selectedBranchReport.distribution.approved}
                    </span>
                  </div>
                  {/* Pending */}
                  <div className="bg-white px-4 py-3.5 border border-[#e2e8f0] rounded-xl flex items-center justify-between shadow-sm">
                    <span className="text-[13px] text-[#64748b] font-semibold font-sans">
                      Pending
                    </span>
                    <span className="px-2.5 py-0.5 bg-[#fff7ed] text-[#f97316] font-bold text-[13px] rounded-lg font-inter">
                      {selectedBranchReport.distribution.pending}
                    </span>
                  </div>
                  {/* Overdue */}
                  <div className="bg-white px-4 py-3.5 border border-[#e2e8f0] rounded-xl flex items-center justify-between shadow-sm">
                    <span className="text-[13px] text-[#64748b] font-semibold font-sans">
                      Overdue
                    </span>
                    <span className="px-2.5 py-0.5 bg-[#fef2f2] text-[#ef4444] font-bold text-[13px] rounded-lg font-inter">
                      {selectedBranchReport.distribution.overdue}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#e2e8f0] bg-gray-50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
                <span className="text-[12px] text-[#64748b] font-semibold">
                  Data consolidated for {formatBranchName(selectedBranch)}
                </span>
              </div>
              <div className="flex items-center space-x-3 self-end sm:self-auto">
                <button
                  onClick={() => setSelectedBranch(null)}
                  className="px-4 py-2 border border-[#cbd5e1] rounded-lg text-[13px] font-semibold text-[#1e293b] hover:bg-gray-100 transition-all font-inter"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-2 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-[13px] rounded-lg shadow-sm transition-all font-inter"
                >
                  <FileText className="w-4 h-4" />
                  <span>Export PDF Report</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Styles for print overrides */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page {
            size: portrait;
            margin: 6mm 8mm;
          }
          body {
            visibility: visible !important;
            background: white !important;
          }
          .min-h-screen {
            display: block !important;
            background: white !important;
            min-height: 0 !important;
            height: auto !important;
            padding: 0 !important;
          }
          .min-h-screen > :not(#pdf-report-print-area) {
            display: none !important;
          }
          #pdf-report-print-area {
            display: block !important;
            width: 100% !important;
            max-height: 280mm !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Spacing overrides for 1-page budget */
          #pdf-report-print-area .mt-8 {
            margin-top: 0.85rem !important;
          }
          #pdf-report-print-area .pb-6 {
            padding-bottom: 0.4rem !important;
          }
          #pdf-report-print-area .p-4 {
            padding: 0.4rem 0.6rem !important;
          }
          #pdf-report-print-area .p-10, #pdf-report-print-area .p-6 {
            padding: 1rem !important;
          }
          #pdf-report-print-area .gap-6 {
            gap: 0.6rem !important;
          }
          #pdf-report-print-area .gap-4 {
            gap: 0.4rem !important;
          }
          #pdf-report-print-area td.py-3, #pdf-report-print-area td.py-2 {
            padding-top: 0.25rem !important;
            padding-bottom: 0.25rem !important;
          }
          #pdf-report-print-area th.py-3 {
            padding-top: 0.25rem !important;
            padding-bottom: 0.25rem !important;
          }
          #pdf-report-print-area .text-2xl {
            font-size: 1.25rem !important;
            line-height: 1.75rem !important;
          }
          #pdf-report-print-area .space-y-4 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 0.35rem !important;
          }
        }
      `}} />

      {/* Hidden Print Area for PDF Report */}
      {selectedBranch && selectedBranchReport && (
        <BranchFinancialReportPrint
          selectedBranch={formatBranchName(selectedBranch)}
          reportMeta={reportMeta}
          branchReport={selectedBranchReport}
          consolidatedBranches={consolidatedBranches.map(b => ({
            ...b,
            office: formatBranchName(b.officeKey)
          }))}
        />
      )}
    </div>
  );
};

export default Dashboard;
