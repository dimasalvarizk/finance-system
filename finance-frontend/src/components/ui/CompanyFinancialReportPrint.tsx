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
  companyName?: string;
  data?: CompanyFinancialReportData;
}

/* ======================================================
 * DEFAULT SAMPLE DATA (Matches Reference Design)
 * ====================================================== */

const defaultData: CompanyFinancialReportData = {
  header: {
    title: "COMPANY FINANCIAL REPORT",
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
    { company: "PT Pariwisata Nusantara", code: "PTN", revenue: 433300, amtPaid: 312800, pending: 86500, overdue: 54000 },
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

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value || 0));
};

/* ======================================================
 * MAIN COMPONENT
 * ====================================================== */

const CompanyFinancialReportPrint: React.FC<CompanyFinancialReportPrintProps> = ({
  companyName = "DST",
  data = defaultData,
}) => {
  const activeData = data || defaultData;
  const { header, summary, monthlyRevenue, invoiceSummary, companyBreakdown, revenueShare, footer } = activeData;

  // Use fallback if lists are empty so print always has full design
  const displaySummary = summary && summary.totalRevenue > 0 ? summary : defaultData.summary;
  const displayMonthly = monthlyRevenue && monthlyRevenue.length > 0 ? monthlyRevenue : defaultData.monthlyRevenue;
  const displayInvoiceSummary = invoiceSummary && invoiceSummary.totalSent > 0 ? invoiceSummary : defaultData.invoiceSummary;
  const displayBreakdown = companyBreakdown && companyBreakdown.length > 0 ? companyBreakdown : defaultData.companyBreakdown;
  const displayRevenueShare = revenueShare && revenueShare.length > 0 ? revenueShare : defaultData.revenueShare;

  // Calculate dynamic maxShare for visual progress bar scaling
  const maxShare = Math.max(...displayRevenueShare.map((r) => r.sharePercent || 0), 1);

  return (
    <>
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }
        @media print {
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #company-financial-report-print-area {
            display: flex !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            max-width: 210mm !important;
            max-height: 297mm !important;
            box-sizing: border-box !important;
            padding: 12mm 14mm !important;
            margin: 0 !important;
            background: #ffffff !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      <div
        id="company-financial-report-print-area"
        className="hidden print:flex flex-col justify-between bg-white text-[#0f172a] font-sans box-border"
        style={{ width: "210mm", height: "297mm", padding: "12mm 14mm", backgroundColor: "#ffffff" }}
      >
        <div className="flex-1 flex flex-col">
          {/* HEADER */}
          <div className="flex justify-between items-center pb-2 border-b-[2.5px] border-[#1e3a5f]">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <img
                src={odstDashboardLogo}
                alt={`${companyName} Logo`}
                className="h-9 w-auto object-contain"
              />
            </div>
            {/* Title & Subtitle */}
            <div className="text-right">
              <h1 className="text-[17px] font-extrabold text-[#1e3a5f] tracking-tight uppercase leading-tight font-sans">
                {header.title || "COMPANY FINANCIAL REPORT"}
              </h1>
              <p className="text-[10px] text-slate-500 font-semibold tracking-normal mt-0.5 font-sans">
                {header.period || "Q3 2026 — Generated AUG 19, 2026"}
              </p>
            </div>
          </div>

          {/* SECTION 1: EXECUTIVE SUMMARY */}
          <div className="mt-3">
            <h2 className="text-[11px] font-extrabold text-[#1e3a5f] uppercase tracking-wider mb-1.5 font-sans">
              EXECUTIVE SUMMARY
            </h2>

            {/* Total Revenue Full Width Box */}
            <div className="border border-slate-200 rounded-lg p-2.5 bg-white mb-2">
              <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block font-sans">
                TOTAL REVENUE
              </span>
              <div className="text-[22px] font-black text-[#0f172a] tracking-tight mt-0.5 font-sans tabular-nums">
                {formatCurrency(displaySummary.totalRevenue)}
              </div>
            </div>

            {/* Net Profit & Outstanding 2-Columns */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="border border-slate-200 rounded-lg p-2.5 bg-white">
                <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block font-sans">
                  NET PROFIT
                </span>
                <div className="text-[19px] font-black text-[#10b981] tracking-tight mt-0.5 font-sans tabular-nums">
                  {formatCurrency(displaySummary.netProfit)}
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-2.5 bg-white">
                <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block font-sans">
                  OUTSTANDING
                </span>
                <div className="text-[19px] font-black text-[#ef4444] tracking-tight mt-0.5 font-sans tabular-nums">
                  {formatCurrency(displaySummary.outstanding)}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: MONTHLY REVENUE & INVOICE SUMMARY (2 COLUMNS) */}
          <div className="grid grid-cols-2 gap-2.5 mt-2.5">
            {/* Monthly Revenue Box */}
            <div className="border border-slate-200 rounded-lg p-2.5 bg-white flex flex-col justify-between">
              <div>
                <h3 className="text-[10.5px] font-extrabold text-[#1e3a5f] uppercase tracking-wider mb-1.5 font-sans">
                  MONTHLY REVENUE
                </h3>
                <div className="rounded-md overflow-hidden">
                  <table className="w-full text-left border-collapse text-[9.5px] font-sans">
                    <thead>
                      <tr className="bg-[#f1f5f9] text-slate-700 text-[9px] font-bold">
                        <th className="py-1 px-2 font-bold">Month</th>
                        <th className="py-1 px-2 font-bold text-right">Revenue</th>
                        <th className="py-1 px-2 font-bold text-right">Expenses</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayMonthly.slice(0, 4).map((row) => (
                        <tr key={row.month}>
                          <td className="py-1 px-2 font-medium text-slate-700">{row.month}</td>
                          <td className="py-1 px-2 text-right font-bold text-[#0f172a] tabular-nums">
                            {formatCurrency(row.revenue)}
                          </td>
                          <td className="py-1 px-2 text-right font-normal text-slate-500 tabular-nums">
                            {formatCurrency(row.expenses)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Invoice Summary Box */}
            <div className="border border-slate-200 rounded-lg p-2.5 bg-white flex flex-col justify-between font-sans">
              <div>
                <h3 className="text-[10.5px] font-extrabold text-[#1e3a5f] uppercase tracking-wider mb-1.5 font-sans">
                  INVOICE SUMMARY
                </h3>
                <div className="space-y-1 pt-0.5 text-[9.5px]">
                  {/* Total Sent */}
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-700 font-semibold text-[9.5px]">Total Sent</span>
                    <span className="font-extrabold text-[#0f172a] text-[11px] tabular-nums">
                      {displayInvoiceSummary.totalSent}
                    </span>
                  </div>

                  {/* Paid */}
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-700 font-semibold text-[9.5px]">{displayInvoiceSummary.paid.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#0f172a] text-[10.5px] tabular-nums">
                        {displayInvoiceSummary.paid.count}
                      </span>
                      <span className="px-2 py-0.2 text-[8px] font-bold rounded-sm bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
                        {displayInvoiceSummary.paid.badge?.label || "Completed"}
                      </span>
                    </div>
                  </div>

                  {/* Pending */}
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-700 font-semibold text-[9.5px]">{displayInvoiceSummary.pending.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#0f172a] text-[10.5px] tabular-nums">
                        {displayInvoiceSummary.pending.count}
                      </span>
                      <span className="px-2 py-0.2 text-[8px] font-bold rounded-sm bg-[#fff9db] text-[#b25e00] border border-[#ffe066]">
                        {displayInvoiceSummary.pending.badge?.label || `${displayInvoiceSummary.pending.count} In Process`}
                      </span>
                    </div>
                  </div>

                  {/* Overdue */}
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-700 font-semibold text-[9.5px]">{displayInvoiceSummary.overdue.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#0f172a] text-[10.5px] tabular-nums">
                        {displayInvoiceSummary.overdue.count}
                      </span>
                      <span className="px-2 py-0.2 text-[8px] font-bold rounded-sm bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]">
                        {displayInvoiceSummary.overdue.badge?.label || "Action Req."}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: COMPANY FINANCIAL BREAKDOWN */}
          <div className="mt-2.5">
            <h2 className="text-[10.5px] font-extrabold text-[#1e3a5f] uppercase tracking-wider mb-1 font-sans">
              COMPANY FINANCIAL BREAKDOWN
            </h2>
            <div className="rounded-md overflow-hidden border border-slate-200">
              <table className="w-full text-left border-collapse text-[9px] font-sans">
                <thead>
                  <tr className="bg-[#f1f5f9] text-slate-700 font-bold text-[8.5px]">
                    <th className="py-1 px-2 font-bold">Company</th>
                    <th className="py-1 px-1.5 font-bold text-center">Code</th>
                    <th className="py-1 px-2 font-bold text-right">Revenue</th>
                    <th className="py-1 px-2 font-bold text-right">Amt Paid</th>
                    <th className="py-1 px-2 font-bold text-right text-[#f59e0b]">Pending</th>
                    <th className="py-1 px-2 font-bold text-right text-[#ef4444]">Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayBreakdown.map((row) => (
                    <tr key={row.code}>
                      <td className="py-0.5 px-2 font-bold text-[#0f172a]">{row.company}</td>
                      <td className="py-0.5 px-1.5 text-center text-slate-500 font-medium">{row.code}</td>
                      <td className="py-0.5 px-2 text-right font-black text-[#0f172a] tabular-nums">
                        {formatCurrency(row.revenue)}
                      </td>
                      <td className="py-0.5 px-2 text-right text-slate-600 font-medium tabular-nums">
                        {formatCurrency(row.amtPaid)}
                      </td>
                      <td className="py-0.5 px-2 text-right font-bold text-[#f59e0b] tabular-nums">
                        {formatCurrency(row.pending)}
                      </td>
                      <td className="py-0.5 px-2 text-right font-bold text-[#ef4444] tabular-nums">
                        {formatCurrency(row.overdue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 4: REVENUE SHARE DISTRIBUTION */}
          <div className="mt-2.5">
            <h2 className="text-[10.5px] font-extrabold text-[#1e3a5f] uppercase tracking-wider mb-1 font-sans">
              REVENUE SHARE DISTRIBUTION
            </h2>
            <div className="rounded-md overflow-hidden border border-slate-200">
              <table className="w-full text-left border-collapse text-[9px] font-sans">
                <thead>
                  <tr className="bg-[#f1f5f9] text-slate-700 font-bold text-[8.5px]">
                    <th className="py-1 px-2 font-bold w-1/3">Company</th>
                    <th className="py-1 px-2 font-bold text-right w-1/4">Revenue</th>
                    <th className="py-1 px-2 font-bold text-right w-5/12">Share (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayRevenueShare.map((row) => (
                    <tr key={row.company}>
                      <td className="py-0.5 px-2 font-bold text-[#0f172a]">{row.company}</td>
                      <td className="py-0.5 px-2 text-right font-black text-[#0f172a] tabular-nums">
                        {formatCurrency(row.revenue)}
                      </td>
                      <td className="py-0.5 px-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Dark Navy Progress Bar */}
                          <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-[#1e3a5f] h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, Math.max((row.sharePercent / maxShare) * 90, row.revenue > 0 ? 5 : 0))}%` }}
                            />
                          </div>
                          <span className="font-bold text-[#0f172a] text-[9px] tabular-nums w-7 text-right">
                            {Math.round(row.sharePercent)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex justify-between items-center text-[8.5px] text-slate-400 pt-2 font-sans">
          <span>{footer.note || "Company Finance — Confidential"}</span>
          <span>{footer.page || "Page 1 of 1"}</span>
        </div>
      </div>
    </>
  );
};

export default CompanyFinancialReportPrint;