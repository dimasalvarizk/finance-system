






















































import React, { useState, useMemo, useEffect } from "react";
import { Navigate } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import CompanyFinancialReportPrint from "../../components/ui/CompanyFinancialReportPrint";
import {
  Search,
  Plus,
  X,
  AlertCircle,
  Edit,
  Check,
  HelpCircle,
  Download,
  Building2,
  Trash2
} from "lucide-react";
import { getCompanies, createCompany, updateCompany, getInvoices, deleteCompany } from "../../services/invoiceService";
import NetworkErrorState from "../../components/ui/NetworkErrorState";
import { useAuth } from "../../context/AuthContext";

export interface Company {
  name: string;
  code: string;
  phone: string;
  address: string;
  taxNumber: string;
  agent?: string;
  creditBalance?: number | string;
}

const Companies: React.FC = () => {
  const { user } = useAuth();

  if (user && user.role === 'Accountant') {
    return <Navigate to="/dashboard" replace />;
  }

  const [companies, setCompanies] = useState<Company[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [compList, invList] = await Promise.all([
        getCompanies(),
        getInvoices()
      ]);
      if (compList) setCompanies(compList);
      if (invList) setInvoices(invList);
    } catch (err) {
      console.error("Failed to load companies data from API:", err);
      setError("Failed to load partner companies. Please check backend connections.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (companies && companies.length > 0) {
      localStorage.setItem('finance_companies', JSON.stringify(companies));
    }
  }, [companies]);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // Form states for Add Company
  const [newCompName, setNewCompName] = useState("");
  const [newCompCode, setNewCompCode] = useState("");
  const [newCompPhone, setNewCompPhone] = useState("");
  const [newCompStreet, setNewCompStreet] = useState("");
  const [newCompCity, setNewCompCity] = useState("");
  const [newCompPostal, setNewCompPostal] = useState("");
  const [newCompCountry, setNewCompCountry] = useState("United States");
  const [newCompTax, setNewCompTax] = useState("");
  const [newCompAgent, setNewCompAgent] = useState("");
  const [formError, setFormError] = useState("");
  const [showValidation, setShowValidation] = useState(false);

  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [showAddSuccess, setShowAddSuccess] = useState(false);

  // Form states for Edit Company
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editTaxId, setEditTaxId] = useState("");
  const [editAgent, setEditAgent] = useState("");

  // Delete States
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);

  const itemsPerPage = 8;

  // Filtered companies based on search
  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const q = searchQuery.toLowerCase();
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.taxNumber.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q)
    );
  }, [companies, searchQuery]);

  const totalItems = filteredCompanies.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);

  const displayedCompanies = useMemo(() => {
    const startIdx = (validCurrentPage - 1) * itemsPerPage;
    return filteredCompanies.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredCompanies, validCurrentPage]);

  const parseAmount = (amtStr: string | number): number => {
    if (typeof amtStr === "number") return amtStr;
    if (!amtStr) return 0;
    const parsed = parseFloat(amtStr.replace(/[^0-9.-]/g, ""));
    return isNaN(parsed) ? 0 : parsed;
  };

  const getInvoiceAmountInUsd = (inv: any): number => {
    if (!inv) return 0;
    const rawAmt = parseAmount(inv.amount);
    const currency = String(inv.currency || '').toUpperCase();
    
    // Auto-detect currency from amount string if currency field is missing/empty
    const amtStr = String(inv.amount || '');
    const detectedCurrency = currency || (
      amtStr.includes('Rp') ? 'RP' :
      amtStr.includes('SAR') ? 'SAR' : 'USD'
    );

    if (detectedCurrency === 'RP' || detectedCurrency === 'IDR') {
      const rate = inv.usdToIdrRate || 18025;
      return rawAmt / rate;
    } else if (detectedCurrency === 'SAR') {
      const usdToIdr = inv.usdToIdrRate || 18025;
      const sarToIdr = inv.sarToIdrRate || 4800;
      const usdToSar = usdToIdr / sarToIdr || 3.75;
      return rawAmt / usdToSar;
    }
    return rawAmt;
  };

  const reportData = useMemo(() => {
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;
    let totalSentCount = invoices.length;
    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    invoices.forEach((inv) => {
      const amt = getInvoiceAmountInUsd(inv);
      totalRevenue += amt;
      const status = (inv.status || "").toLowerCase();
      if (status.includes("paid")) {
        totalPaid += amt;
        paidCount++;
      } else if (status.includes("pending")) {
        totalPending += amt;
        pendingCount++;
      } else if (status.includes("overdue")) {
        totalOverdue += amt;
        overdueCount++;
      } else {
        totalPending += amt;
        pendingCount++;
      }
    });

    const totalExpenses = totalRevenue * 0.5;
    const netProfit = totalRevenue - totalExpenses;
    const outstanding = totalPending + totalOverdue;

    const monthlyGroups: Record<string, { revenue: number; sent: number; paid: number; orderDate: Date }> = {};
    invoices.forEach((inv) => {
      const amt = getInvoiceAmountInUsd(inv);
      const dateObj = new Date(inv.date);
      if (isNaN(dateObj.getTime())) return;
      const monthLabel = dateObj.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      const status = (inv.status || "").toLowerCase();

      if (!monthlyGroups[monthLabel]) {
        const orderDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
        monthlyGroups[monthLabel] = { revenue: 0, sent: 0, paid: 0, orderDate };
      }

      monthlyGroups[monthLabel].revenue += amt;
      monthlyGroups[monthLabel].sent += 1;
      if (status.includes("paid")) {
        monthlyGroups[monthLabel].paid += 1;
      }
    });

    const sortedMonths = Object.entries(monthlyGroups)
      .sort((a, b) => a[1].orderDate.getTime() - b[1].orderDate.getTime())
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        sent: data.sent,
        paid: data.paid,
        expenses: data.revenue * 0.5,
      }));

    const companyStats: Record<string, { revenue: number; amtPaid: number; pending: number; overdue: number }> = {};
    
    companies.forEach((comp) => {
      companyStats[comp.code] = { revenue: 0, amtPaid: 0, pending: 0, overdue: 0 };
    });

    invoices.forEach((inv) => {
      const amt = getInvoiceAmountInUsd(inv);
      const status = (inv.status || "").toLowerCase();
      const code = inv.companyCode || "GEN";

      if (!companyStats[code]) {
        companyStats[code] = { revenue: 0, amtPaid: 0, pending: 0, overdue: 0 };
      }

      companyStats[code].revenue += amt;
      if (status.includes("paid")) {
        companyStats[code].amtPaid += amt;
      } else if (status.includes("overdue")) {
        companyStats[code].overdue += amt;
      } else {
        companyStats[code].pending += amt;
      }
    });

    const companyBreakdown = companies.map((comp) => {
      const stats = companyStats[comp.code] || { revenue: 0, amtPaid: 0, pending: 0, overdue: 0 };
      return {
        company: comp.name,
        code: comp.code,
        revenue: stats.revenue,
        amtPaid: stats.amtPaid,
        pending: stats.pending,
        overdue: stats.overdue,
      };
    });

    const sortedCompanyBreakdown = [...companyBreakdown].sort((a, b) => b.revenue - a.revenue);

    const revenueShare = sortedCompanyBreakdown.map((item) => {
      const pct = totalRevenue > 0 ? Math.round((item.revenue / totalRevenue) * 100) : 0;
      return {
        company: item.company,
        revenue: item.revenue,
        sharePercent: pct,
      };
    });

    let period = "All Time";
    if (sortedMonths.length > 0) {
      const firstMonth = sortedMonths[0].month;
      const lastMonth = sortedMonths[sortedMonths.length - 1].month;
      period = `${firstMonth} to ${lastMonth}`;
    }

    return {
      period,
      summary: {
        totalRevenue,
        totalExpenses,
        netProfit,
        outstanding,
      },
      monthlyOverview: sortedMonths,
      companyBreakdown: sortedCompanyBreakdown,
      revenueShare,
      invoiceSummary: {
        totalSent: totalSentCount,
        paid: {
          label: "Paid",
          count: paidCount,
          badge: { label: "Completed", bg: "#e6f4ea", text: "#137333", border: "#ceead6" },
        },
        pending: {
          label: "Pending",
          count: pendingCount,
          badge: { label: `${pendingCount} In Process`, bg: "#fff9db", text: "#b25e00", border: "#ffe066" },
        },
        overdue: {
          label: "Overdue",
          count: overdueCount,
          badge: { label: "Action Req.", bg: "#fce8e6", text: "#c5221f", border: "#fad2cf" },
        },
      },
    };
  }, [invoices, companies]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleOpenDetails = (company: Company) => {
    setSelectedCompany(company);
    setIsDetailsModalOpen(true);
    setIsReportModalOpen(false);
    setIsEditModalOpen(false);
  };

  const handleOpenReport = (company: Company) => {
    setSelectedCompany(company);
    setIsReportModalOpen(true);
    setIsDetailsModalOpen(false);
    setIsEditModalOpen(false);
  };

  const getAddCompanyErrorsCount = () => {
    let count = 0;
    if (!newCompName.trim()) count += 1;
    if (!newCompCode.trim()) count += 1;
    if (!newCompPhone.trim()) count += 1;
    if (!newCompStreet.trim()) count += 1;
    if (!newCompCity.trim()) count += 1;
    if (!newCompPostal.trim()) count += 1;
    if (!newCompTax.trim()) count += 1;
    return count;
  };

  const handleAddCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidation(true);

    if (getAddCompanyErrorsCount() > 0) {
      setFormError("Validation failed: Fix errors to proceed");
      return;
    }

    // Check duplicate code
    if (companies.some(c => c.code.toUpperCase() === newCompCode.toUpperCase())) {
      setFormError("Company code already exists");
      return;
    }

    setFormError("");
    setShowAddConfirm(true);
  };

  const handleConfirmAddCompany = async () => {
    const newCompany: Company = {
      name: newCompName,
      code: newCompCode.toUpperCase(),
      phone: newCompPhone,
      address: `${newCompStreet}, ${newCompCity}, ${newCompPostal}, ${newCompCountry}`,
      taxNumber: newCompTax,
      agent: newCompAgent
    };

    try {
      const saved = await createCompany(newCompany);
      setCompanies(prev => [saved, ...prev]);
      setIsAddModalOpen(false);
      setShowAddConfirm(false);
      setShowAddSuccess(true);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to add company");
      setShowAddConfirm(false);
    }
  };

  const handleCloseAddSuccess = () => {
    setShowAddSuccess(false);

    // Reset Form
    setNewCompName("");
    setNewCompCode("");
    setNewCompPhone("");
    setNewCompStreet("");
    setNewCompCity("");
    setNewCompPostal("");
    setNewCompCountry("United States");
    setNewCompTax("");
    setNewCompAgent("");
    setFormError("");
    setShowValidation(false);
    setCurrentPage(1);
  };

  const getEditCompanyErrorsCount = () => {
    let count = 0;
    if (!editName.trim()) count += 1;
    if (!editCode.trim()) count += 1;
    if (!editPhone.trim()) count += 1;
    if (!editAddress.trim()) count += 1;
    if (!editTaxId.trim()) count += 1;
    return count;
  };

  const handleEditCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    setShowValidation(true);

    if (getEditCompanyErrorsCount() > 0) {
      setFormError("Validation failed: Fix errors to proceed");
      return;
    }

    // Check duplicate code (excluding itself)
    if (
      editCode.toUpperCase() !== selectedCompany.code.toUpperCase() &&
      companies.some(c => c.code.toUpperCase() === editCode.toUpperCase())
    ) {
      setFormError("Company code already exists");
      return;
    }

    const updatedCompany: Company = {
      name: editName,
      code: editCode.toUpperCase(),
      phone: editPhone,
      address: editAddress,
      taxNumber: editTaxId,
      agent: editAgent
    };

    try {
      const saved = await updateCompany(selectedCompany.code, updatedCompany);
      setCompanies(prev =>
        prev.map(c => (c.code === selectedCompany.code ? saved : c))
      );
      setSelectedCompany(saved);
      setIsEditModalOpen(false);
      setIsDetailsModalOpen(true);
      setShowValidation(false);
      setFormError("");
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Failed to update company");
    }
  };

  const handleOpenDeleteConfirm = (company: Company) => {
    setCompanyToDelete(company);
    setShowDeleteConfirm(true);
    setIsDetailsModalOpen(false);
  };

  const handleConfirmDeleteCompany = async () => {
    if (!companyToDelete) return;
    try {
      await deleteCompany(companyToDelete.code);
      setCompanies(prev => prev.filter(c => c.code !== companyToDelete.code));
      setShowDeleteConfirm(false);
      setShowDeleteSuccess(true);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete company");
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#f4f6fa] select-none font-inter">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <div className="flex-1 p-8 space-y-6 max-w-[1400px] w-full mx-auto">
          {/* Welcome Title and Add New Button */}
          <div className="flex justify-between items-center">
            <div className="flex flex-col space-y-1">
              <h1 className="text-[28px] font-bold text-[#0c0d0f] tracking-tight">
                Partner Companies
              </h1>
              <p className="text-[13px] text-[#64748b] font-medium font-sans">
                Manage partner companies and their billing information
              </p>
            </div>
            <button
              onClick={() => {
                setFormError("");
                setShowValidation(false);
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-lg text-[13px] font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer font-sans"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Company</span>
            </button>
          </div>

          {/* Stat Card */}
          <div className={`bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 w-full h-[120px] flex flex-col justify-between ${loading ? 'animate-pulse' : ''}`}>
            <div className="flex justify-between items-start w-full">
              <div>
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block font-sans">
                  Total Partners
                </span>
                <div className="text-[26px] font-extrabold text-[#0F172A] tracking-tight mt-0.5 font-sans">
                  {loading ? <div className="h-7 w-32 bg-slate-200 rounded mt-1"></div> : `${companies.length} Companies`}
                </div>
              </div>
              <div
                className="text-[10px] px-3.5 py-1 font-bold rounded-md uppercase tracking-wider font-sans flex items-center justify-center"
                style={{ backgroundColor: 'rgba(219, 234, 254, 1)', color: 'rgba(37, 99, 235, 1)' }}
              >
                Corporate
              </div>
            </div>
            <span className="text-[11px] text-[#64748B] font-normal block font-sans">
              Registered across all regions
            </span>
          </div>

          {/* Listing Card */}
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
            {error ? (
              <NetworkErrorState
                message="We could not load your partner companies. Please check your connection and try again."
                onRetry={fetchData}
              />
            ) : (
              <>
                {/* Header & Search */}
            <div className="p-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-[#e2e8f0]">
              <h2 className="text-[16px] font-bold text-[#0c0d0f] font-sans whitespace-nowrap">
                Partner Companies Listing
              </h2>
              <div className="relative w-72">
                <input
                  type="text"
                  placeholder="Search company name or code..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-2 border border-[#cbd5e1] rounded-lg text-[13px] font-medium text-[#1e293b] placeholder-gray-400 focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-sans"
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Listing Content (Table or Empty State) */}
            {!loading && companies.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center bg-white px-4 animate-fade-in text-center border-t border-[#e2e8f0]">
                {/* Circle icon wrapper */}
                <div className="w-14 h-14 bg-[#f8fafc] border border-[#f1f5f9] text-[#475569] rounded-full flex items-center justify-center mb-5 shadow-sm mx-auto">
                  <Building2 className="w-6 h-6 text-[#94a3b8]" />
                </div>
                {/* Title */}
                <h4 className="text-[16px] font-bold text-[#0c0d0f] text-center mb-1.5 font-sans">
                  No companies registered yet
                </h4>
                {/* Description */}
                <p className="text-[12.5px] text-[#64748b] text-center font-medium font-sans max-w-sm mb-6 leading-relaxed mx-auto">
                  Add your first partner company to start generating invoices.
                </p>
                {/* Add New Company Button */}
                <button
                  onClick={() => {
                    setFormError("");
                    setShowValidation(false);
                    setIsAddModalOpen(true);
                  }}
                  className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-[13px] rounded-lg shadow-sm transition-all cursor-pointer font-sans"
                >
                  Add New Company
                </button>
              </div>
            ) : !loading && displayedCompanies.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center bg-white px-4 animate-fade-in text-center border-t border-[#e2e8f0]">
                {/* Circle icon wrapper */}
                <div className="w-14 h-14 bg-[#f8fafc] border border-[#f1f5f9] text-[#475569] rounded-full flex items-center justify-center mb-5 shadow-sm mx-auto">
                  <Building2 className="w-6 h-6 text-[#94a3b8]" />
                </div>
                {/* Title */}
                <h4 className="text-[16px] font-bold text-[#0c0d0f] text-center mb-1.5 font-sans">
                  No companies found
                </h4>
                {/* Description */}
                <p className="text-[12.5px] text-[#64748b] text-center font-medium font-sans max-w-sm mb-6 leading-relaxed mx-auto">
                  Try adjusting your search query.
                </p>
              </div>
            ) : (
              <>
                {/* Table */}
                <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                    <th className="text-[10px] font-bold text-[#64748b] py-3.5 px-4 font-sans tracking-wider text-left whitespace-nowrap">
                      COMPANY NAME
                    </th>
                    <th className="text-[10px] font-bold text-[#64748b] py-3.5 px-4 font-sans tracking-wider text-left whitespace-nowrap">
                      CODE
                    </th>
                    <th className="text-[10px] font-bold text-[#64748b] py-3.5 px-4 font-sans tracking-wider text-left whitespace-nowrap">
                      PHONE NUMBER
                    </th>
                    <th className="text-[10px] font-bold text-[#64748b] py-3.5 px-4 font-sans tracking-wider text-left whitespace-nowrap">
                      ADDRESS
                    </th>
                    <th className="text-[10px] font-bold text-[#64748b] py-3.5 px-4 font-sans tracking-wider text-left whitespace-nowrap">
                      TAX NUMBER
                    </th>
                    <th className="text-[10px] font-bold text-[#64748b] py-3.5 px-4 font-sans tracking-wider text-left whitespace-nowrap">
                      CREDIT BALANCE
                    </th>
                    <th className="text-[10px] font-bold text-[#64748b] py-3.5 px-4 font-sans tracking-wider text-center whitespace-nowrap">
                      ACTION
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]/60">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, loadIdx) => (
                      <tr key={`skeleton-comp-${loadIdx}`} className="animate-pulse border-b border-[#e2e8f0]/60">
                        <td className="py-4 px-4"><div className="w-32 h-4 bg-gray-200 rounded"></div></td>
                        <td className="py-4 px-4"><div className="w-12 h-4 bg-gray-200 rounded"></div></td>
                        <td className="py-4 px-4"><div className="w-24 h-4 bg-gray-200 rounded"></div></td>
                        <td className="py-4 px-4"><div className="w-48 h-4 bg-gray-200 rounded"></div></td>
                        <td className="py-4 px-4"><div className="w-28 h-4 bg-gray-200 rounded"></div></td>
                        <td className="py-4 px-4"><div className="w-24 h-4 bg-gray-200 rounded"></div></td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center space-x-2.5">
                            <div className="w-20 h-7 bg-gray-200/80 rounded-lg"></div>
                            <div className="w-24 h-7 bg-gray-200/80 rounded-lg"></div>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : displayedCompanies.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[13px] font-semibold text-slate-400 font-sans">
                        No companies found
                      </td>
                    </tr>
                  ) : (
                    displayedCompanies.map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/30 transition-all">
                        <td className="py-4 px-4 text-[13px] font-bold text-[#0c0d0f] font-sans">
                          {c.name}
                        </td>
                        <td className="py-4 px-4 text-[13px] font-semibold text-[#64748b] font-mono">
                          {c.code}
                        </td>
                        <td className="py-4 px-4 text-[13px] font-normal text-[#475569] font-sans">
                          {c.phone}
                        </td>
                        <td className="py-4 px-4 text-[13px] font-normal text-[#64748b] font-sans max-w-xs truncate" title={c.address}>
                          {c.address}
                        </td>
                        <td className="py-4 px-4 text-[13px] font-normal text-[#475569] font-mono">
                          {c.taxNumber}
                        </td>
                        <td className="py-4 px-4 text-[13px] font-bold text-emerald-600 font-mono">
                          {c.creditBalance ? `$${parseFloat(String(c.creditBalance)).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '$0.00'}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center space-x-2.5">
                            <button
                              onClick={() => handleOpenDetails(c)}
                              className="px-3 py-1.5 text-[#334155] hover:bg-slate-200/80 rounded-lg text-[11px] font-bold transition-all cursor-pointer font-sans shadow-sm"
                              style={{ backgroundColor: 'rgba(241, 245, 249, 1)' }}
                            >
                              View Details
                            </button>
                            <button
                              onClick={() => handleOpenReport(c)}
                              className="px-3 py-1.5 text-white hover:opacity-90 rounded-lg text-[11px] font-semibold transition-all cursor-pointer font-sans shadow-sm"
                              style={{ backgroundColor: 'rgba(46, 84, 176, 1)' }}
                            >
                              Financial Report
                            </button>
                            <button
                              onClick={() => handleOpenDeleteConfirm(c)}
                              className="p-1.5 text-[#ef4444] hover:bg-red-50 hover:text-red-700 rounded-lg transition-all cursor-pointer shadow-sm border border-red-100 bg-white"
                              title="Delete Company"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {totalItems > 0 && (
              <div className="px-6 py-4 flex justify-between items-center border-t border-[#e2e8f0] font-sans">
                <span className="text-[12px] text-[#64748b] font-normal font-sans">
                  Showing {(validCurrentPage - 1) * itemsPerPage + 1} to {Math.min(validCurrentPage * itemsPerPage, totalItems)} of {totalItems} registered companies
                </span>
                <div className="flex items-center space-x-1.5 text-[12px] font-bold font-sans">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={validCurrentPage === 1}
                    className={`px-3 py-1.5 border border-[#e2e8f0] rounded-lg transition-all ${validCurrentPage === 1
                      ? "text-slate-300 bg-gray-50/50 cursor-not-allowed border-[#f1f5f9]"
                      : "text-[#475569] hover:bg-gray-50 cursor-pointer"
                      }`}
                  >
                    Previous
                  </button>

                  {Array.from({ length: totalPages }).map((_, i) => {
                    const page = i + 1;
                    // Show first, last, and pages around current page
                    if (page === 1 || page === totalPages || Math.abs(page - validCurrentPage) <= 1) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-lg border transition-all cursor-pointer ${validCurrentPage === page
                            ? "border-[#f59e0b] bg-[#f59e0b] text-white font-bold"
                            : "border-[#e2e8f0] bg-white text-[#475569] hover:bg-gray-50 font-semibold"
                            }`}
                        >
                          {page}
                        </button>
                      );
                    }
                    if (page === 2 || page === totalPages - 1) {
                      return (
                        <span key={page} className="px-1 text-slate-400 select-none">
                          &bull;&bull;&bull;
                        </span>
                      );
                    }
                    return null;
                  })}

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={validCurrentPage === totalPages}
                    className={`px-3 py-1.5 border border-[#e2e8f0] rounded-lg transition-all ${validCurrentPage === totalPages
                      ? "text-slate-300 bg-gray-50/50 cursor-not-allowed border-[#f1f5f9]"
                      : "text-[#475569] hover:bg-gray-50 cursor-pointer"
                      }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  </main>

      {/* Modal: Add New Company */}
      {isAddModalOpen && (
        <div className="fixed inset-0 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 bg-[#0c0d0f]/40">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-[#e2e8f0] overflow-hidden flex flex-col font-sans">
            {/* Header */}
            <div className="pl-6 pr-4 py-5 flex justify-between items-center bg-white">
              <h3 className="text-[18px] font-bold text-[#1e293b]">Add New Company</h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setFormError("");
                }}
                className="w-6 h-6 rounded-full border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mx-6 border-b border-[#e2e8f0]" />

            {/* Form Body */}
            <form onSubmit={handleAddCompanySubmit} noValidate>
              <div className="p-6 space-y-4">
                {showValidation && getAddCompanyErrorsCount() > 0 && (
                  <div className="p-3 bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] rounded-xl text-[12px] font-semibold flex items-center gap-2 animate-fade-in">
                    <AlertCircle className="w-4.5 h-4.5 text-[#ef4444] flex-shrink-0" />
                    <span>{getAddCompanyErrorsCount()} errors found. Please fix them before submitting.</span>
                  </div>
                )}
                {formError && !showValidation && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-[12px] font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1.5 font-sans">
                    Company Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stark Industries"
                    value={newCompName}
                    onChange={(e) => setNewCompName(e.target.value)}
                    className={`w-full h-[40px] px-3 py-2 border rounded-lg text-[13px] font-medium transition-all font-sans focus:outline-none ${
                      showValidation && !newCompName.trim()
                        ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
                        : 'border-[#cbd5e1] text-[#1e293b] placeholder-slate-400 focus:border-[#f59e0b] focus:ring-[#f59e0b]'
                    }`}
                  />
                  {showValidation && !newCompName.trim() && (
                    <span className="block text-[11px] text-[#ef4444] font-semibold mt-1 animate-fade-in font-sans">
                      Company Name is required
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1.5 font-sans">
                    Company Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    placeholder="e.g. STI"
                    value={newCompCode}
                    onChange={(e) => setNewCompCode(e.target.value.replace(/[^a-zA-Z]/g, ""))}
                    className={`w-full h-[40px] px-3 py-2 border rounded-lg text-[13px] font-medium transition-all font-sans focus:outline-none ${
                      showValidation && !newCompCode.trim()
                        ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
                        : 'border-[#cbd5e1] text-[#1e293b] placeholder-slate-400 focus:border-[#f59e0b] focus:ring-[#f59e0b]'
                    }`}
                  />
                  {showValidation && !newCompCode.trim() ? (
                    <span className="block text-[11px] text-[#ef4444] font-semibold mt-1 animate-fade-in font-sans">
                      Company Code is required
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-normal mt-1 block font-sans">
                      Unique 3-letter identifier
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1.5 font-sans">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +1 310 555 0147"
                    value={newCompPhone}
                    onChange={(e) => setNewCompPhone(e.target.value)}
                    className={`w-full h-[40px] px-3 py-2 border rounded-lg text-[13px] font-medium transition-all font-sans focus:outline-none ${
                      showValidation && !newCompPhone.trim()
                        ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
                        : 'border-[#cbd5e1] text-[#1e293b] placeholder-slate-400 focus:border-[#f59e0b] focus:ring-[#f59e0b]'
                    }`}
                  />
                  {showValidation && !newCompPhone.trim() && (
                    <span className="block text-[11px] text-[#ef4444] font-semibold mt-1 animate-fade-in font-sans">
                      Phone Number is required
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1.5 font-sans">
                    Street Address
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10880 Malibu Point"
                    value={newCompStreet}
                    onChange={(e) => setNewCompStreet(e.target.value)}
                    className={`w-full h-[40px] px-3 py-2 border rounded-lg text-[13px] font-medium transition-all font-sans focus:outline-none ${
                      showValidation && !newCompStreet.trim()
                        ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
                        : 'border-[#cbd5e1] text-[#1e293b] placeholder-slate-400 focus:border-[#f59e0b] focus:ring-[#f59e0b]'
                    }`}
                  />
                  {showValidation && !newCompStreet.trim() && (
                    <span className="block text-[11px] text-[#ef4444] font-semibold mt-1 animate-fade-in font-sans">
                      Street Address is required
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1.5 font-sans">
                      City
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Malibu"
                      value={newCompCity}
                      onChange={(e) => setNewCompCity(e.target.value)}
                      className={`w-full h-[40px] px-3 py-2 border rounded-lg text-[13px] font-medium transition-all font-sans focus:outline-none ${
                        showValidation && !newCompCity.trim()
                          ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
                          : 'border-[#cbd5e1] text-[#1e293b] placeholder-slate-400 focus:border-[#f59e0b] focus:ring-[#f59e0b]'
                      }`}
                    />
                    {showValidation && !newCompCity.trim() && (
                      <span className="block text-[11px] text-[#ef4444] font-semibold mt-1 animate-fade-in font-sans">
                        City is required
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1.5 font-sans">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="90265"
                      value={newCompPostal}
                      onChange={(e) => setNewCompPostal(e.target.value)}
                      className={`w-full h-[40px] px-3 py-2 border rounded-lg text-[13px] font-medium transition-all font-sans focus:outline-none ${
                        showValidation && !newCompPostal.trim()
                          ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
                          : 'border-[#cbd5e1] text-[#1e293b] placeholder-slate-400 focus:border-[#f59e0b] focus:ring-[#f59e0b]'
                      }`}
                    />
                    {showValidation && !newCompPostal.trim() && (
                      <span className="block text-[11px] text-[#ef4444] font-semibold mt-1 animate-fade-in font-sans">
                        Postal Code is required
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1.5 font-sans">
                      Country
                    </label>
                    <select
                      value={newCompCountry}
                      onChange={(e) => setNewCompCountry(e.target.value)}
                      className="w-full h-[40px] px-3 py-2 border border-[#cbd5e1] rounded-lg text-[13px] font-medium text-[#1e293b] focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] bg-white cursor-pointer font-sans"
                    >
                      <option value="United States">United States</option>
                      <option value="Indonesia">Indonesia</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Saudi Arabia">Saudi Arabia</option>
                      <option value="Singapore">Singapore</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1.5 font-sans">
                      Tax Identification Number
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="87.654.321.0-087.000"
                      value={newCompTax}
                      onChange={(e) => setNewCompTax(e.target.value)}
                      className={`w-full h-[40px] px-3 py-2 border rounded-lg text-[13px] font-medium transition-all font-sans focus:outline-none ${
                        showValidation && !newCompTax.trim()
                          ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
                          : 'border-[#cbd5e1] text-[#1e293b] placeholder-slate-400 focus:border-[#f59e0b] focus:ring-[#f59e0b]'
                      }`}
                    />
                    {showValidation && !newCompTax.trim() && (
                      <span className="block text-[11px] text-[#ef4444] font-semibold mt-1 animate-fade-in font-sans">
                        Tax ID is required
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1.5 font-sans">
                    Agent
                  </label>
                  <select
                    value={newCompAgent}
                    onChange={(e) => setNewCompAgent(e.target.value)}
                    className="w-full h-[40px] px-3 py-2 border border-[#cbd5e1] rounded-lg text-[13px] font-medium text-[#1e293b] focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] bg-white cursor-pointer font-sans"
                  >
                    <option value="">None (No Agent)</option>
                    <option value="Hasoob Technology Trading - 2067">Hasoob Technology Trading - 2067</option>
                    <option value="ODST Travel and Tourism - 2114">ODST Travel and Tourism - 2114</option>
                  </select>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-6 py-4 border-t border-[#e2e8f0] bg-[#f8fafc] flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setFormError("");
                    setShowValidation(false);
                  }}
                  className="px-5 py-2 border border-[#cbd5e1] rounded-lg text-[13px] font-bold text-[#334155] hover:bg-slate-50 transition-all cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={showValidation && getAddCompanyErrorsCount() > 0}
                  className={`px-5 py-2 text-white rounded-lg text-[13px] font-bold transition-all cursor-pointer ${
                    showValidation && getAddCompanyErrorsCount() > 0
                      ? 'bg-[#cbd5e1] text-[#94a3b8] cursor-not-allowed shadow-none'
                      : 'bg-[#f59e0b] hover:bg-[#d97706]'
                  }`}
                >
                  Add Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: View Details */}
      {isDetailsModalOpen && selectedCompany && (
        <div className="fixed inset-0 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 bg-[#0c0d0f]/40 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-[#e2e8f0] overflow-hidden flex flex-col font-inter">
            {/* Header */}
            <div className="pl-6 pr-4 py-5 flex justify-between items-center bg-white">
              <h3 className="text-[18px] font-bold text-[#1e293b]">Company Details</h3>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="w-6 h-6 rounded-full border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mx-6 border-b border-[#e2e8f0]" />

            {/* Profile Content */}
            <div className="p-6 space-y-4 text-[13px]">
              <div>
                <span className="text-slate-400 block text-[11px] font-medium uppercase tracking-wider mb-1 font-inter">COMPANY NAME</span>
                <span className="font-medium text-[#1e293b] text-[14px] font-inter">{selectedCompany.name}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-medium uppercase tracking-wider mb-1 font-inter">CODE</span>
                <span className="font-medium text-[#1e293b] text-[14px] font-inter">{selectedCompany.code}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-medium uppercase tracking-wider mb-1 font-inter">PHONE</span>
                <span className="font-medium text-[#1e293b] text-[14px] font-inter">{selectedCompany.phone}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-medium uppercase tracking-wider mb-1 font-inter">ADDRESS</span>
                <span className="font-medium text-[#1e293b] text-[14px] font-inter block leading-relaxed">{selectedCompany.address}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-medium uppercase tracking-wider mb-1 font-inter">TAX ID</span>
                <span className="font-medium text-[#1e293b] text-[14px] font-inter font-mono">{selectedCompany.taxNumber}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-medium uppercase tracking-wider mb-1 font-inter">AGENT</span>
                <span className="font-medium text-[#1e293b] text-[14px] font-inter">{selectedCompany.agent || "N/A"}</span>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#e2e8f0] bg-[#f8fafc] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => handleOpenDeleteConfirm(selectedCompany)}
                className="mr-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[13px] font-semibold transition-all cursor-pointer font-inter shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Company</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenReport(selectedCompany)}
                className="px-4 py-2 border border-[#cbd5e1] hover:bg-slate-50 text-[#334155] rounded-lg text-[13px] font-semibold transition-all cursor-pointer font-inter bg-white shadow-sm"
              >
                Financial Report
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditName(selectedCompany.name);
                  setEditCode(selectedCompany.code);
                  setEditPhone(selectedCompany.phone);
                  setEditAddress(selectedCompany.address);
                  setEditTaxId(selectedCompany.taxNumber);
                  setEditAgent(selectedCompany.agent || "");
                  setIsDetailsModalOpen(false);
                  setIsEditModalOpen(true);
                }}
                className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg text-[13px] font-semibold flex items-center gap-2 cursor-pointer transition-all shadow-sm font-inter"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Details</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Details */}
      {isEditModalOpen && selectedCompany && (
        <div className="fixed inset-0 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 bg-[#0c0d0f]/40 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-[#e2e8f0] overflow-hidden flex flex-col font-inter">
            {/* Header */}
            <div className="pl-6 pr-4 py-5 flex justify-between items-center bg-white">
              <h3 className="text-[18px] font-bold text-[#1e293b]">Edit Company Details</h3>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setIsDetailsModalOpen(true);
                }}
                className="w-6 h-6 rounded-full border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mx-6 border-b border-[#e2e8f0]" />

            {/* Form Body */}
            <form onSubmit={handleEditCompanySubmit} noValidate>
              <div className="p-6 space-y-4 text-[13px]">
                {showValidation && getEditCompanyErrorsCount() > 0 && (
                  <div className="p-3 bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] rounded-xl text-[12px] font-semibold flex items-center gap-2 animate-fade-in">
                    <AlertCircle className="w-4.5 h-4.5 text-[#ef4444] flex-shrink-0" />
                    <span>{getEditCompanyErrorsCount()} errors found. Please fix them before submitting.</span>
                  </div>
                )}
                {formError && !showValidation && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-[12px] font-medium flex items-center gap-2">
                    <AlertCircle className="w-4.5 h-4.5 text-red-600 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="text-slate-500 block text-[12px] font-medium mb-1.5 font-inter">Company Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-[13px] font-medium transition-all font-inter focus:outline-none ${
                      showValidation && !editName.trim()
                        ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
                        : 'border-[#cbd5e1] text-[#1e293b] focus:border-[#2563eb] focus:ring-[#2563eb]'
                    }`}
                  />
                  {showValidation && !editName.trim() && (
                    <span className="block text-[11px] text-[#ef4444] font-semibold mt-1 animate-fade-in font-sans">
                      Company Name is required
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-slate-500 block text-[12px] font-medium mb-1.5 font-inter">Code</label>
                  <input
                    type="text"
                    required
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-[13px] font-medium transition-all font-inter focus:outline-none ${
                      showValidation && !editCode.trim()
                        ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
                        : 'border-[#cbd5e1] text-[#1e293b] focus:border-[#2563eb] focus:ring-[#2563eb]'
                    }`}
                  />
                  {showValidation && !editCode.trim() && (
                    <span className="block text-[11px] text-[#ef4444] font-semibold mt-1 animate-fade-in font-sans">
                      Company Code is required
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-slate-500 block text-[12px] font-medium mb-1.5 font-inter">Phone</label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-[13px] font-medium transition-all font-inter focus:outline-none ${
                      showValidation && !editPhone.trim()
                        ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
                        : 'border-[#cbd5e1] text-[#1e293b] focus:border-[#2563eb] focus:ring-[#2563eb]'
                    }`}
                  />
                  {showValidation && !editPhone.trim() && (
                    <span className="block text-[11px] text-[#ef4444] font-semibold mt-1 animate-fade-in font-sans">
                      Phone Number is required
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-slate-500 block text-[12px] font-medium mb-1.5 font-inter">Address</label>
                  <input
                    type="text"
                    required
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-[13px] font-medium transition-all font-inter focus:outline-none ${
                      showValidation && !editAddress.trim()
                        ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
                        : 'border-[#cbd5e1] text-[#1e293b] focus:border-[#2563eb] focus:ring-[#2563eb]'
                    }`}
                  />
                  {showValidation && !editAddress.trim() && (
                    <span className="block text-[11px] text-[#ef4444] font-semibold mt-1 animate-fade-in font-sans">
                      Address is required
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-slate-500 block text-[12px] font-medium mb-1.5 font-inter">Tax ID</label>
                  <input
                    type="text"
                    required
                    value={editTaxId}
                    onChange={(e) => setEditTaxId(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-[13px] font-medium transition-all font-inter focus:outline-none ${
                      showValidation && !editTaxId.trim()
                        ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
                        : 'border-[#cbd5e1] text-[#1e293b] focus:border-[#2563eb] focus:ring-[#2563eb]'
                    }`}
                  />
                  {showValidation && !editTaxId.trim() && (
                    <span className="block text-[11px] text-[#ef4444] font-semibold mt-1 animate-fade-in font-sans">
                      Tax ID is required
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-slate-500 block text-[12px] font-medium mb-1.5 font-inter">Agent</label>
                  <select
                    value={editAgent}
                    onChange={(e) => setEditAgent(e.target.value)}
                    className="w-full px-3 py-2 border border-[#cbd5e1] rounded-lg text-[13px] font-medium text-[#1e293b] focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] bg-white cursor-pointer font-sans"
                  >
                    <option value="">None (No Agent)</option>
                    <option value="Hasoob Technology Trading - 2067">Hasoob Technology Trading - 2067</option>
                    <option value="ODST Travel and Tourism - 2114">ODST Travel and Tourism - 2114</option>
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-[#e2e8f0] bg-[#f8fafc] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setIsDetailsModalOpen(true);
                    setShowValidation(false);
                    setFormError("");
                  }}
                  className="px-4 py-2 border border-[#cbd5e1] hover:bg-slate-50 text-[#334155] rounded-lg text-[13px] font-bold transition-all cursor-pointer font-inter bg-white shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={showValidation && getEditCompanyErrorsCount() > 0}
                  className={`px-4 py-2 text-white rounded-lg text-[13px] font-bold transition-all cursor-pointer font-inter shadow-sm ${
                    showValidation && getEditCompanyErrorsCount() > 0
                      ? 'bg-[#cbd5e1] text-[#94a3b8] cursor-not-allowed shadow-none'
                      : 'bg-[#2563eb] hover:bg-[#1d4ed8]'
                  }`}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Financial Report */}
      {isReportModalOpen && selectedCompany && (
        <div className="fixed inset-0 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 bg-[#0c0d0f]/40 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-[#e2e8f0] overflow-hidden flex flex-col font-inter">
            {/* Header */}
            <div className="pl-6 pr-4 py-5 border-b border-[#e2e8f0] flex justify-between items-center bg-white">
              <div>
                <h3 className="text-[18px] font-bold text-[#1e293b]">Company Financial Report</h3>
                <p className="text-[11px] text-slate-400 font-medium font-inter mt-0.5">Financial Summary — {reportData.period}</p>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="w-6 h-6 rounded-full border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Financial Contents */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              {/* Stat Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-inter">TOTAL REVENUE</span>
                  <div className="text-[20px] font-bold text-[#0c0d0f] font-inter mt-1.5">{"$" + reportData.summary.totalRevenue.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-inter">NET PROFIT</span>
                  <div className="text-[20px] font-bold text-[#10b981] font-inter mt-1.5">{"$" + reportData.summary.netProfit.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-inter">OUTSTANDING</span>
                  <div className="text-[20px] font-bold text-[#ef4444] font-inter mt-1.5">{"$" + reportData.summary.outstanding.toLocaleString()}</div>
                </div>
              </div>

              {/* Monthly Financial Overview */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-[#0c0d0f] uppercase tracking-wider font-inter">MONTHLY FINANCIAL OVERVIEW</h4>
                <div className="overflow-hidden border border-[#e2e8f0] rounded-xl text-[12px] font-inter">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#223F6E] border-b border-[#223F6E] text-white">
                        <th className="py-2.5 px-4 font-bold text-[10px] uppercase">MONTH</th>
                        <th className="py-2.5 px-4 font-bold text-[10px] uppercase">REVENUE</th>
                        <th className="py-2.5 px-4 font-bold text-[10px] uppercase">INVOICES SENT</th>
                        <th className="py-2.5 px-4 font-bold text-[10px] uppercase">INVOICES PAID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[#475569]">
                      {reportData.monthlyOverview.map((row, idx) => (
                        <tr key={row.month} className={idx % 2 === 1 ? "bg-slate-50/20 hover:bg-slate-50/50" : "hover:bg-slate-50/50"}>
                          <td className="py-3 px-4 font-semibold text-[#0c0d0f]">{row.month}</td>
                          <td className="py-3 px-4">{"$" + row.revenue.toLocaleString()}</td>
                          <td className="py-3 px-4">{row.sent}</td>
                          <td className="py-3 px-4">{row.paid}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Company Financial Breakdown */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-[#0c0d0f] uppercase tracking-wider font-inter">COMPANY FINANCIAL BREAKDOWN</h4>
                <div className="overflow-hidden border border-[#e2e8f0] rounded-xl text-[12px] font-inter">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#223F6E] border-b border-[#223F6E] text-white">
                        <th className="py-2.5 px-4 font-bold text-[10px] uppercase">COMPANY</th>
                        <th className="py-2.5 px-4 font-bold text-[10px] uppercase">CODE</th>
                        <th className="py-2.5 px-4 font-bold text-[10px] uppercase">REVENUE</th>
                        <th className="py-2.5 px-4 font-bold text-[10px] uppercase">AMOUNT PAID</th>
                        <th className="py-2.5 px-4 font-bold text-[10px] uppercase">PENDING</th>
                        <th className="py-2.5 px-4 font-bold text-[10px] uppercase">OVERDUE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[#475569] font-medium">
                      {reportData.companyBreakdown.map((row, idx) => (
                        <tr key={row.code} className={idx % 2 === 1 ? "bg-slate-50/20 hover:bg-slate-50/50" : "hover:bg-slate-50/50"}>
                          <td className="py-3 px-4 font-bold text-[#0c0d0f]">{row.company}</td>
                          <td className="py-3 px-4 text-slate-400 font-mono">{row.code}</td>
                          <td className="py-3 px-4">{"$" + row.revenue.toLocaleString()}</td>
                          <td className="py-3 px-4">{"$" + row.amtPaid.toLocaleString()}</td>
                          <td className="py-3 px-4 text-[#f59e0b] font-bold">{"$" + row.pending.toLocaleString()}</td>
                          <td className="py-3 px-4 text-[#ef4444] font-bold">{"$" + row.overdue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#e2e8f0] bg-[#f8fafc] flex justify-between items-center">
              <div className="flex items-center gap-2 text-[12px] text-slate-400 font-medium font-inter">
                <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                <span>Data consolidated for all companies</span>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 border border-[#cbd5e1] hover:bg-slate-50 text-slate-600 rounded-lg text-[13px] font-bold transition-all cursor-pointer font-inter bg-white shadow-sm"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-[#10b981] hover:bg-[#059669] text-white rounded-lg text-[13px] font-bold transition-all cursor-pointer font-inter flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Export PDF Report</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Confirmation */}
      {showAddConfirm && (
        <div className="fixed inset-0 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 bg-[#0c0d0f]/40 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl border border-[#e2e8f0] animate-scale-up font-inter">
            <div className="w-16 h-16 bg-[#fffbeb] text-[#f59e0b] rounded-full flex items-center justify-center mx-auto border border-[#fef3c7]">
              <HelpCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-[20px] font-bold text-[#0c0d0f] font-inter">Are you sure?</h3>
              <p className="text-[14px] text-slate-500 font-inter leading-relaxed">
                Are you sure that you want to add <span className="font-semibold text-slate-800">{newCompName}</span> to the system list?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddConfirm(false)}
                className="py-2.5 border border-[#cbd5e1] hover:bg-slate-50 text-slate-600 rounded-xl text-[13px] font-bold transition-all cursor-pointer font-inter bg-white shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAddCompany}
                className="py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-xl text-[13px] font-bold transition-all cursor-pointer font-inter shadow-sm"
              >
                Yes, Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {showDeleteConfirm && companyToDelete && (
        <div className="fixed inset-0 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 bg-[#0c0d0f]/40 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl border border-[#e2e8f0] animate-scale-up font-inter">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-100">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-[20px] font-bold text-[#0c0d0f] font-inter">Delete Company?</h3>
              <p className="text-[14px] text-slate-500 font-inter leading-relaxed">
                Are you sure you want to delete <span className="font-semibold text-slate-800">{companyToDelete.name}</span> ({companyToDelete.code})? This will permanently remove the company.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="py-2.5 border border-[#cbd5e1] hover:bg-slate-50 text-slate-600 rounded-xl text-[13px] font-bold transition-all cursor-pointer font-inter bg-white shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCompany}
                className="py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[13px] font-bold transition-all cursor-pointer font-inter shadow-sm"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Success */}
      {showDeleteSuccess && companyToDelete && (
        <div className="fixed inset-0 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 bg-[#0c0d0f]/40 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl border border-[#e2e8f0] animate-scale-up font-inter">
            <div className="w-16 h-16 bg-[#e6f4ea] text-[#137333] rounded-full flex items-center justify-center mx-auto border border-[#ceead6]">
              <Check className="w-8 h-8 stroke-[3px]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-[20px] font-bold text-[#0c0d0f] font-inter">Successfully Deleted</h3>
              <p className="text-[14px] text-slate-500 font-inter leading-relaxed">
                <span className="font-semibold text-slate-800">{companyToDelete.name}</span> has been successfully removed from the system.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowDeleteSuccess(false);
                setCompanyToDelete(null);
                setCurrentPage(1);
              }}
              className="w-full py-3 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-xl text-[14px] font-bold transition-all cursor-pointer font-inter shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}
      {showAddSuccess && (
        <div className="fixed inset-0 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 bg-[#0c0d0f]/40 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl border border-[#e2e8f0] animate-scale-up font-inter">
            <div className="w-16 h-16 bg-[#e6f4ea] text-[#137333] rounded-full flex items-center justify-center mx-auto border border-[#ceead6]">
              <Check className="w-8 h-8 stroke-[3px]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-[20px] font-bold text-[#0c0d0f] font-inter">Successfully Added</h3>
              <p className="text-[14px] text-slate-500 font-inter leading-relaxed">
                <span className="font-semibold text-slate-800">{newCompName}</span> has been added to the system list.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCloseAddSuccess}
              className="w-full py-3 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-xl text-[14px] font-bold transition-all cursor-pointer font-inter shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}
      {/* Printable Area */}
      <CompanyFinancialReportPrint
        companyName={selectedCompany?.name || ""}
        data={{
          header: {
            title: "Company Financial Report",
            period: `Financial Summary — ${reportData.period}`,
          },
          summary: reportData.summary,
          monthlyRevenue: reportData.monthlyOverview,
          invoiceSummary: reportData.invoiceSummary,
          companyBreakdown: reportData.companyBreakdown,
          revenueShare: reportData.revenueShare,
          footer: { note: "Company Finance — Confidential", page: "Page 1 of 1" },
        }}
      />

      {/* Styles for print overrides */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page {
            size: portrait;
            margin: 6mm 10mm;
          }
          html, body, #root {
            height: 100% !important;
            overflow: hidden !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          body * {
            visibility: hidden !important;
          }
          #company-financial-report-print-area, #company-financial-report-print-area * {
            visibility: visible !important;
          }
          #company-financial-report-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            max-height: 297mm !important;
            overflow: hidden !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            page-break-inside: avoid !important;
          }
        }
      `}} />
    </div>
  );
};

export default Companies;
