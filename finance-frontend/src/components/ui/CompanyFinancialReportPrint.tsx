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
 * DEFAULT DATA (fallback jika prop `data` tidak dikirim)
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
    { company: "Cyberdyne Systems", code: "CYB", revenue: 498300, amtPaid: 385600, pending: 68200, overdue: 44500 },
    { company: "Aperture Labs", code: "APL", revenue: 578400, amtPaid: 502300, pending: 42100, overdue: 34000 },
    { company: "Weyland-Yutani", code: "WYU", revenue: 625800, amtPaid: 498500, pending: 72550, overdue: 54750 },
    { company: "PT Pariwisata Nusantara", code: "PTN", revenue: 433300, amtPaid: 312800, pending: 66500, overdue: 54000 },
  ],
  revenueShare: [
    { company: "Wayne Enterprises", revenue: 845200, sharePercent: 20 },
    { company: "Stark Industries", revenue: 692100, sharePercent: 16 },
    { company: "Weyland-Yutani", revenue: 625800, sharePercent: 15 },
    { company: "Arie Tours", revenue: 612500, sharePercent: 14 },
    { company: "Aperture Labs", revenue: 578400, sharePercent: 14 },
    { company: "Cyberdyne Systems", revenue: 498300, sharePercent: 12 },
    { company: "PT Pariwisata Nusantara", revenue: 433300, sharePercent: 10 },
  ],
  footer: { note: "Company Finance — Confidential", page: "Page 1 of 1" },
};

/* ======================================================
 * HELPERS
 * ====================================================== */

const formatCurrency = (value: number): string =>
  `$${value.toLocaleString("en-US")}`;

/* ======================================================
 * SMALL PRESENTATIONAL SUBCOMPONENTS
 * ====================================================== */

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-[11px] font-black text-[rgba(30,58,95,1)] tracking-wider uppercase pb-0.5 font-inter">
    {children}
  </h2>
);

const StatCard: React.FC<{
  label: string;
  value: string;
  valueClassName?: string;
  size?: "lg" | "md";
}> = ({ label, value, valueClassName = "text-[#0c0d0f]", size = "md" }) => (
  <div className="border border-[#e2e8f0] rounded-xl p-3 bg-white shadow-sm flex flex-col justify-between">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-inter">
      {label}
    </span>
    <div
      className={`${size === "lg" ? "text-[24px]" : "text-[18px]"} font-black mt-0.5 font-inter ${valueClassName}`}
    >
      {value}
    </div>
  </div>
);

const Badge: React.FC<{ badge: InvoiceBadge }> = ({ badge }) => (
  <span
    className="px-2 py-0.5 text-[9px] font-bold rounded border font-inter"
    style={{ backgroundColor: badge.bg, color: badge.text, borderColor: badge.border }}
  >
    {badge.label}
  </span>
);

const InvoiceRow: React.FC<{ item: InvoiceSummaryItem }> = ({ item }) => (
  <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
    <span className="text-slate-500 font-semibold font-inter">{item.label}</span>
    <div className="flex items-center gap-2">
      <span className="font-bold text-[#0c0d0f] font-inter">{item.count}</span>
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

  return (
    <div
      id="company-financial-report-print-area"
      className="hidden print:block bg-white p-5 font-inter text-[#0c0d0f] leading-normal w-[820px] mx-auto text-[11px]"
    >
      {/* Header */}
      <div className="flex justify-between items-end border-b-2 border-[rgba(30,58,95,1)] pb-2 mb-3">
        <img src={odstDashboardLogo} alt={`${companyName} Logo`} className="h-10 w-auto object-contain" />
        <div className="text-right">
          <h1 className="text-[20px] font-black text-[rgba(30,58,95,1)] tracking-tight uppercase font-inter">
            {header.title}
          </h1>
          <p className="text-[11px] text-[#64748b] font-semibold mt-1 font-inter">{header.period}</p>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="space-y-2 mb-3">
        <SectionTitle>Executive Summary</SectionTitle>

        <StatCard label="Total Revenue" value={formatCurrency(summary.totalRevenue)} size="lg" />

        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Net Profit" value={formatCurrency(summary.netProfit)} valueClassName="text-[#10b981]" />
          <StatCard label="Outstanding" value={formatCurrency(summary.outstanding)} valueClassName="text-[#ef4444]" />
        </div>
      </div>

      {/* Monthly Revenue & Invoice Summary */}
      <div className="grid grid-cols-2 gap-5 mb-3">
        {/* Monthly Revenue */}
        <div className="border border-[#cbd5e1] rounded-xl p-3 bg-white flex flex-col">
          <div className="mb-2">
            <SectionTitle>Monthly Revenue</SectionTitle>
          </div>
          <div className="overflow-hidden">
            <table className="w-full text-left border-collapse text-[11px] font-inter">
              <thead>
                <tr className="bg-[#f8fafc] text-slate-500">
                  <th className="py-1.5 px-3 font-bold uppercase font-inter">Month</th>
                  <th className="py-1.5 px-3 font-bold uppercase text-right font-inter">Revenue</th>
                  <th className="py-1.5 px-3 font-bold uppercase text-right font-inter">Expenses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {monthlyRevenue.map((row) => (
                  <tr key={row.month}>
                    <td className="py-1.5 px-3 font-bold text-[#0c0d0f] font-inter">{row.month}</td>
                    <td className="py-1.5 px-3 text-right font-semibold font-inter">
                      {formatCurrency(row.revenue)}
                    </td>
                    <td className="py-1.5 px-3 text-right text-slate-500 font-inter">
                      {formatCurrency(row.expenses)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoice Summary */}
        <div className="border border-[#cbd5e1] rounded-xl p-3 bg-white flex flex-col text-[11px] font-inter">
          <div className="mb-2">
            <SectionTitle>Invoice Summary</SectionTitle>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center pb-1 border-b border-slate-100">
              <span className="text-slate-500 font-semibold font-inter">Total Sent</span>
              <span className="font-bold text-[#0c0d0f] text-[13px] font-inter">
                {invoiceSummary.totalSent}
              </span>
            </div>
            <InvoiceRow item={invoiceSummary.paid} />
            <InvoiceRow item={invoiceSummary.pending} />
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold font-inter">{invoiceSummary.overdue.label}</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#0c0d0f] font-inter">{invoiceSummary.overdue.count}</span>
                {invoiceSummary.overdue.badge && <Badge badge={invoiceSummary.overdue.badge} />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Company Financial Breakdown */}
      <div className="space-y-2 mb-3">
        <SectionTitle>Company Financial Breakdown</SectionTitle>
        <div className="overflow-hidden">
          <table className="w-full text-left border-collapse text-[11px] font-inter">
            <thead>
              <tr className="bg-[#f8fafc] text-slate-500">
                <th className="py-1.5 px-3 font-bold uppercase font-inter">Company</th>
                <th className="py-1.5 px-3 font-bold uppercase font-inter">Code</th>
                <th className="py-1.5 px-3 font-bold uppercase text-right font-inter">Revenue</th>
                <th className="py-1.5 px-3 font-bold uppercase text-right font-inter">Amt Paid</th>
                <th className="py-1.5 px-3 font-bold uppercase text-right font-inter">Pending</th>
                <th className="py-1.5 px-3 font-bold uppercase text-right font-inter">Overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {companyBreakdown.map((row) => (
                <tr key={row.code}>
                  <td className="py-1.5 px-3 font-bold text-[#0c0d0f] font-inter">{row.company}</td>
                  <td className="py-1.5 px-3 text-slate-400 font-mono">{row.code}</td>
                  <td className="py-1.5 px-3 text-right font-semibold font-inter">
                    {formatCurrency(row.revenue)}
                  </td>
                  <td className="py-1.5 px-3 text-right font-semibold font-inter">
                    {formatCurrency(row.amtPaid)}
                  </td>
                  <td className="py-1.5 px-3 text-right text-[#f59e0b] font-bold font-inter">
                    {formatCurrency(row.pending)}
                  </td>
                  <td className="py-1.5 px-3 text-right text-[#ef4444] font-bold font-inter">
                    {formatCurrency(row.overdue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue Share Distribution */}
      <div className="space-y-2 mb-3">
        <SectionTitle>Revenue Share Distribution</SectionTitle>
        <div className="overflow-hidden">
          <table className="w-full text-left border-collapse text-[11px] font-inter">
            <thead>
              <tr className="bg-[#f8fafc] text-slate-500">
                <th className="py-1.5 px-3 font-bold uppercase font-inter">Company</th>
                <th className="py-1.5 px-3 font-bold uppercase text-right font-inter">Revenue</th>
                <th className="py-1.5 px-3 font-bold uppercase text-center w-48 font-inter">Share (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {revenueShare.map((row) => (
                <tr key={row.company}>
                  <td className="py-1.5 px-3 font-bold text-[#0c0d0f] font-inter">{row.company}</td>
                  <td className="py-1.5 px-3 text-right font-semibold font-inter">
                    {formatCurrency(row.revenue)}
                  </td>
                  <td className="py-1.5 px-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-slate-100 rounded-full h-2">
                        <div
                          className="bg-[#242e69] h-2 rounded-full"
                          style={{ width: `${row.sharePercent}%` }}
                        />
                      </div>
                      <span className="font-bold w-8 text-right font-inter">{row.sharePercent}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-200 pt-2.5 mt-3">
        <span className="font-inter">{footer.note}</span>
        <span className="font-inter">{footer.page}</span>
      </div>
    </div>
  );
};

export default CompanyFinancialReportPrint;