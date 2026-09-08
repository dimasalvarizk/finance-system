import React from "react";
import odstDashboardLogo from "../../assets/logoBranchInvoice.png";

/* ======================================================
 * TYPES
 * ====================================================== */

export interface ReportHeaderData {
  title: string;
  period: string;
}

export interface ExecutiveSummaryData {
  totalRevenue: number;
  netProfit: number;
  outstanding: number;
}

export interface MonthlyRevenueRow {
  month: string;
  revenue: number;
  expenses: number;
}

export type InvoiceBadge = {
  label: string;
  bg: string;
  text: string;
  border: string;
};

export interface InvoiceSummaryItem {
  label: string;
  count: number;
  badge?: InvoiceBadge;
}

export interface InvoiceSummaryData {
  totalSent: number;
  paid: InvoiceSummaryItem;
  pending: InvoiceSummaryItem;
  overdue: InvoiceSummaryItem;
}

export interface CompanyFinancialRow {
  company: string;
  code: string;
  revenue: number;
  amtPaid: number;
  pending: number;
  overdue: number;
}

export interface RevenueShareRow {
  company: string;
  revenue: number;
  sharePercent: number;
}

export interface CompanyFinancialReportData {
  header: ReportHeaderData;
  summary: ExecutiveSummaryData;
  monthlyRevenue: MonthlyRevenueRow[];
  invoiceSummary: InvoiceSummaryData;
  companyBreakdown: CompanyFinancialRow[];
  revenueShare: RevenueShareRow[];
  footer: { note: string; page: string };
}

export interface CompanyFinancialReportPrintProps {
  companyName: string;
  data?: CompanyFinancialReportData;
}

/* ======================================================
 * DEFAULT DATA
 * ====================================================== */

const defaultData: CompanyFinancialReportData = {
  header: {
    title: "Company Financial Report",
    period: "Q3 2026 — Generated AUG 19, 2026",
  },
  summary: {
    totalRevenue: 4285600,
    netProfit: 2129300,
    outstanding: 487250,
  },
  monthlyRevenue: [
    { month: "May 2026", revenue: 985400, expenses: 498200 },
    { month: "Jun 2026", revenue: 1042800, expenses: 526100 },
    { month: "Jul 2026", revenue: 1125600, expenses: 562400 },
    { month: "Aug 2026", revenue: 1131800, expenses: 569600 },
  ],
  invoiceSummary: {
    totalSent: 624,
    paid: {
      label: "Paid",
      count: 498,
      badge: { label: "Completed", bg: "#e6f4ea", text: "#137333", border: "#ceead6" },
    },
    pending: {
      label: "Pending",
      count: 78,
      badge: { label: "78 In Process", bg: "#fff9db", text: "#b25e00", border: "#ffe066" },
    },
    overdue: {
      label: "Overdue",
      count: 48,
      badge: { label: "Action Req.", bg: "#fce8e6", text: "#c5221f", border: "#fad2cf" },
    },
  },
  companyBreakdown: [
    { company: "Arie Tours", code: "AIT", revenue: 612500, amtPaid: 534200, pending: 48300, overdue: 30000 },
    { company: "Wayne Enterprises", code: "WEN", revenue: 845200, amtPaid: 756800, pending: 52400, overdue: 36000 },
    { company: "Stark Industries", code: "STI", revenue: 692100, amtPaid: 608400, pending: 49700, overdue: 34000 },
  ],
  revenueShare: [
    { company: "Wayne Enterprises", revenue: 845200, sharePercent: 20 },
    { company: "Stark Industries", revenue: 692100, sharePercent: 16 },
    { company: "Arie Tours", revenue: 612500, sharePercent: 14 },
  ],
  footer: { note: "Company Finance — Confidential", page: "Page 1 of 1" },
};

/* ======================================================
 * HELPERS
 * ====================================================== */

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
};

/* ======================================================
 * SUBCOMPONENTS
 * ====================================================== */

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-2 mb-1.5 pb-0.5 border-b border-slate-200/80">
    <div className="w-1.5 h-3.5 bg-[#1e3a8a] rounded-xs" />
    <h2 className="text-[10.5px] font-black text-[#1e293b] tracking-wider uppercase font-inter">
      {children}
    </h2>
  </div>
);

const StatCard: React.FC<{
  label: string;
  value: string;
  valueClassName?: string;
  subLabel?: string;
}> = ({ label, value, valueClassName = "text-[#0f172a]", subLabel }) => (
  <div className="border border-slate-200 rounded-xl p-3 bg-white shadow-2xs flex flex-col justify-between">
    <div>
      <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block font-inter">
        {label}
      </span>
      <div className={`text-[19px] font-black tracking-tight mt-0.5 tabular-nums font-inter ${valueClassName}`}>
        {value}
      </div>
    </div>
    {subLabel && (
      <span className="text-[9px] font-medium text-slate-400 mt-1 block font-inter">
        {subLabel}
      </span>
    )}
  </div>
);

const Badge: React.FC<{ badge: InvoiceBadge }> = ({ badge }) => (
  <span
    className="px-2 py-0.5 text-[8.5px] font-bold rounded-md border font-inter shadow-2xs"
    style={{ backgroundColor: badge.bg, color: badge.text, borderColor: badge.border }}
  >
    {badge.label}
  </span>
);

const InvoiceRow: React.FC<{ item: InvoiceSummaryItem }> = ({ item }) => (
  <div className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
    <span className="text-slate-600 font-semibold font-inter text-[10.5px]">{item.label}</span>
    <div className="flex items-center gap-2">
      <span className="font-bold text-[#0f172a] font-inter text-[11px]">{item.count}</span>
      {item.badge && <Badge badge={item.badge} />}
    </div>
  </div>
);

/* ======================================================
 * MAIN COMPONENT
 * ====================================================== */

const CompanyFinancialReportPrint: React.FC<CompanyFinancialReportPrintProps> = ({
  companyName,
  data = defaultData,
}) => {
  const { header, summary, monthlyRevenue, invoiceSummary, companyBreakdown, revenueShare, footer } = data;

  const totalBreakdownRevenue = companyBreakdown.reduce((sum, r) => sum + r.revenue, 0);
  const totalBreakdownPaid = companyBreakdown.reduce((sum, r) => sum + r.amtPaid, 0);
  const totalBreakdownPending = companyBreakdown.reduce((sum, r) => sum + r.pending, 0);
  const totalBreakdownOverdue = companyBreakdown.reduce((sum, r) => sum + r.overdue, 0);

  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });

  return (
    <>
      <style>{`
        @page {
          size: A4 portrait;
          margin: 8mm 10mm;
        }
        @media print {
          html, body {
            background: #ffffff !important;
            color: #0f172a !important;
            font-size: 11px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #company-financial-report-print-area {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: white !important;
            box-shadow: none !important;
          }
          .page-break-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      <div
        id="company-financial-report-print-area"
        className="hidden print:block bg-white p-4 font-inter text-[#0f172a] leading-normal w-[800px] mx-auto text-[10.5px]"
      >
        {/* Header Section */}
        <div className="flex justify-between items-center pb-2.5 mb-3 border-b-2 border-[#1e3a8a]">
          <div className="flex items-center gap-3">
            <img
              src={odstDashboardLogo}
              alt={`${companyName || "DST"} Logo`}
              className="h-10 w-auto object-contain"
            />
            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#2563eb] block">
                Official Financial Statement
              </span>
              <h1 className="text-[17px] font-black text-[#0f172a] tracking-tight uppercase font-inter leading-tight">
                {header.title || "Company Financial Report"}
              </h1>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-2 py-0.5 bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] rounded text-[8.5px] font-bold uppercase tracking-wider mb-1">
              Consolidated Audit
            </span>
            <p className="text-[10px] text-slate-500 font-bold font-inter">
              {header.period}
            </p>
            <p className="text-[8.5px] text-slate-400 font-medium font-inter">
              Generated on {currentDate}
            </p>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="mb-3 page-break-avoid">
          <SectionTitle>Executive Summary</SectionTitle>
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="Total Billed Revenue"
              value={formatCurrency(summary.totalRevenue)}
              valueClassName="text-[#0f172a]"
              subLabel="Gross volume from all confirmations"
            />
            <StatCard
              label="Net Profit / Revenue"
              value={formatCurrency(summary.netProfit)}
              valueClassName="text-[#10b981]"
              subLabel="Est. Net Margin (50% Operational)"
            />
            <StatCard
              label="Total Outstanding"
              value={formatCurrency(summary.outstanding)}
              valueClassName="text-[#ef4444]"
              subLabel="Pending & overdue balances"
            />
          </div>
        </div>

        {/* Monthly Revenue & Invoice Summary (2-column layout) */}
        <div className="grid grid-cols-2 gap-3 mb-3 page-break-avoid">
          {/* Monthly Revenue */}
          <div className="border border-slate-200 rounded-xl p-2.5 bg-white flex flex-col justify-between">
            <div>
              <SectionTitle>Monthly Revenue Performance</SectionTitle>
              <div className="overflow-hidden rounded-lg border border-slate-100">
                <table className="w-full text-left border-collapse text-[10px] font-inter">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200/80">
                      <th className="py-1 px-2.5 font-bold uppercase">Month</th>
                      <th className="py-1 px-2.5 font-bold uppercase text-right">Revenue</th>
                      <th className="py-1 px-2.5 font-bold uppercase text-right">Expenses</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {monthlyRevenue.map((row, idx) => (
                      <tr key={row.month} className={idx % 2 === 1 ? "bg-slate-50/40" : ""}>
                        <td className="py-1 px-2.5 font-bold text-[#0f172a]">{row.month}</td>
                        <td className="py-1 px-2.5 text-right font-semibold text-slate-800 tabular-nums">
                          {formatCurrency(row.revenue)}
                        </td>
                        <td className="py-1 px-2.5 text-right text-slate-500 tabular-nums">
                          {formatCurrency(row.expenses)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Invoice Summary */}
          <div className="border border-slate-200 rounded-xl p-2.5 bg-white flex flex-col justify-between text-[10px] font-inter">
            <div>
              <SectionTitle>Confirmation Ledger Status</SectionTitle>
              <div className="space-y-1 pt-0.5">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-600 font-bold font-inter text-[10.5px]">Total Confirmations Issued</span>
                  <span className="font-extrabold text-[#0f172a] text-[12px] font-inter">
                    {invoiceSummary.totalSent}
                  </span>
                </div>
                <InvoiceRow item={invoiceSummary.paid} />
                <InvoiceRow item={invoiceSummary.pending} />
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600 font-semibold font-inter text-[10.5px]">
                    {invoiceSummary.overdue.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#ef4444] font-inter text-[11px]">
                      {invoiceSummary.overdue.count}
                    </span>
                    {invoiceSummary.overdue.badge && <Badge badge={invoiceSummary.overdue.badge} />}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Company Financial Breakdown */}
        <div className="mb-3 page-break-avoid">
          <SectionTitle>Company Financial Breakdown</SectionTitle>
          <div className="overflow-hidden rounded-xl border border-slate-200 shadow-2xs">
            <table className="w-full text-left border-collapse text-[10px] font-inter">
              <thead>
                <tr className="bg-[#1e293b] text-white">
                  <th className="py-1.5 px-2.5 font-bold uppercase text-[9px]">Company / Client</th>
                  <th className="py-1.5 px-2 font-bold uppercase text-[9px]">Code</th>
                  <th className="py-1.5 px-2.5 font-bold uppercase text-right text-[9px]">Billed Revenue</th>
                  <th className="py-1.5 px-2.5 font-bold uppercase text-right text-[9px]">Collected (Paid)</th>
                  <th className="py-1.5 px-2.5 font-bold uppercase text-right text-[9px]">Pending</th>
                  <th className="py-1.5 px-2.5 font-bold uppercase text-right text-[9px]">Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {companyBreakdown.map((row, idx) => (
                  <tr key={row.code} className={idx % 2 === 1 ? "bg-slate-50/50 hover:bg-slate-50" : "hover:bg-slate-50"}>
                    <td className="py-1.5 px-2.5 font-bold text-[#0f172a]">{row.company}</td>
                    <td className="py-1.5 px-2 text-slate-400 font-mono font-semibold">{row.code}</td>
                    <td className="py-1.5 px-2.5 text-right font-semibold text-[#0f172a] tabular-nums">
                      {formatCurrency(row.revenue)}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-semibold text-emerald-700 tabular-nums">
                      {formatCurrency(row.amtPaid)}
                    </td>
                    <td className="py-1.5 px-2.5 text-right text-amber-700 font-bold tabular-nums">
                      {formatCurrency(row.pending)}
                    </td>
                    <td className="py-1.5 px-2.5 text-right text-rose-600 font-bold tabular-nums">
                      {formatCurrency(row.overdue)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100/90 border-t-2 border-slate-300 font-black text-[#0f172a]">
                  <td colSpan={2} className="py-1.5 px-2.5 font-extrabold uppercase text-[9.5px]">
                    Total Summary
                  </td>
                  <td className="py-1.5 px-2.5 text-right tabular-nums text-[#0f172a]">
                    {formatCurrency(totalBreakdownRevenue)}
                  </td>
                  <td className="py-1.5 px-2.5 text-right tabular-nums text-emerald-700">
                    {formatCurrency(totalBreakdownPaid)}
                  </td>
                  <td className="py-1.5 px-2.5 text-right tabular-nums text-amber-700">
                    {formatCurrency(totalBreakdownPending)}
                  </td>
                  <td className="py-1.5 px-2.5 text-right tabular-nums text-rose-600">
                    {formatCurrency(totalBreakdownOverdue)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Revenue Share Distribution */}
        <div className="mb-2 page-break-avoid">
          <SectionTitle>Revenue Share Distribution</SectionTitle>
          <div className="overflow-hidden rounded-xl border border-slate-200 p-2.5 bg-white">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {revenueShare.map((row) => (
                <div key={row.company} className="flex items-center gap-2">
                  <span className="font-bold text-[#0f172a] text-[10px] w-36 truncate" title={row.company}>
                    {row.company}
                  </span>
                  <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#1e3a8a] h-1.5 rounded-full"
                      style={{ width: `${Math.max(row.sharePercent, row.revenue > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                  <span className="font-bold text-slate-700 text-[9.5px] tabular-nums w-10 text-right">
                    {row.sharePercent}%
                  </span>
                  <span className="text-slate-400 font-medium text-[9px] tabular-nums w-18 text-right">
                    {formatCurrency(row.revenue)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center text-[8.5px] text-slate-400 border-t border-slate-200 pt-2 mt-2 page-break-avoid font-inter">
          <span>{footer.note || "Manazil Al-Mukhtara Group / DST Finance · Strictly Confidential"}</span>
          <span>Document Ref: DST-CFR-{new Date().getFullYear()} · {footer.page || "Page 1 of 1"}</span>
        </div>
      </div>
    </>
  );
};

export default CompanyFinancialReportPrint;