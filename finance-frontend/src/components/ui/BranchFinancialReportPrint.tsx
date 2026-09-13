import React from "react";
import logoBranchInvoice from "../../assets/logoBranchInvoice.png";

// ============ Types ============

export interface BranchReport {
  revenue: string;
  share: string;
  growth: string;
  outstanding: string;
  distribution: {
    sent: number;
    approved: number;
    pending: number;
    overdue: number;
  };
  comparison: {
    metric: string;
    curr: string;
    prev: string;
    change: string;
  }[];
  monthlyRevenue: {
    month: string;
    amount: string;
    width: string;
  }[];
}

export interface ReportMeta {
  branchName: string;
  period: string;
  generatedDate: string;
  companyName: string;
  footerNote: string;
  pageInfo: string;
}

export interface ConsolidatedBranch {
  office: string;
  amount: string;
  share: string;
  dotColor: string;
}

interface Props {
  selectedBranch: string;
  reportMeta: ReportMeta;
  branchReport: BranchReport;
  consolidatedBranches: ConsolidatedBranch[];
}

// ============ Small UI Sub-components ============

const InvoiceBadge: React.FC<{ value: number; variant: "approved" | "pending" | "overdue" }> = ({
  value,
  variant,
}) => {
  const styles: Record<string, string> = {
    approved: "bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0]",
    pending: "bg-[#fff7ed] text-[#f97316] border border-[#fed7aa]",
    overdue: "bg-[#fef2f2] text-[#ef4444] border border-[#fecaca]",
  };
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded text-[9px] font-bold font-inter ${styles[variant]}`}
    >
      {value}
    </span>
  );
};

// ============ Main Component ============

const BranchFinancialReportPrint: React.FC<Props> = ({
  selectedBranch,
  reportMeta,
  branchReport,
  consolidatedBranches,
}) => {
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
          #branch-financial-report-print-area,
          #pdf-report-print-area {
            display: flex !important;
            position: fixed !important;
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
            visibility: visible !important;
            z-index: 9999999 !important;
          }
          #branch-financial-report-print-area *,
          #pdf-report-print-area * {
            visibility: visible !important;
          }
        }
      `}</style>

      <div
        id="branch-financial-report-print-area"
        className="hidden print:flex flex-col justify-between bg-white text-[#0f172a] font-sans box-border"
        style={{ width: "210mm", height: "297mm", padding: "12mm 14mm", backgroundColor: "#ffffff" }}
      >
        <div className="flex-1 flex flex-col">
          {/* HEADER */}
          <div className="flex justify-between items-center pb-2.5 border-b-[2.5px] border-[#1e3a5f]">
            <div className="flex items-center gap-2">
              <img
                src={logoBranchInvoice}
                alt="Logo"
                className="h-9 w-auto object-contain"
              />
            </div>
            <div className="text-right">
              <h1 className="text-[17px] font-extrabold text-[#1e3a5f] tracking-tight uppercase leading-tight font-sans">
                BRANCH FINANCIAL REPORT
              </h1>
              <p className="text-[11px] font-bold text-blue-600 mt-0.5 font-sans">
                {selectedBranch} Branch
              </p>
              <p className="text-[9.5px] text-slate-500 font-semibold tracking-normal mt-0.5 font-sans">
                {reportMeta.period} — Generated {reportMeta.generatedDate}
              </p>
            </div>
          </div>

          {/* SECTION 1: EXECUTIVE SUMMARY */}
          <div className="mt-3">
            <h2 className="text-[11px] font-extrabold text-[#1e3a5f] uppercase tracking-wider mb-1.5 font-sans">
              EXECUTIVE SUMMARY
            </h2>
            <div className="grid grid-cols-4 gap-2.5">
              {/* Total Revenue */}
              <div className="border border-slate-200 rounded-lg p-2.5 bg-white">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block font-sans">
                  TOTAL REVENUE
                </span>
                <div className="text-[17px] font-black text-[#0f172a] tracking-tight mt-0.5 font-sans tabular-nums">
                  {branchReport.revenue}
                </div>
                <span className="text-[8.5px] text-slate-400 block mt-0.5">
                  {selectedBranch.split(' ')[0]} contribution
                </span>
              </div>

              {/* Revenue Share */}
              <div className="border border-slate-200 rounded-lg p-2.5 bg-white">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block font-sans">
                  REVENUE SHARE
                </span>
                <div className="text-[17px] font-black text-blue-600 tracking-tight mt-0.5 font-sans tabular-nums">
                  {branchReport.share}
                </div>
                <span className="text-[8.5px] text-slate-400 block mt-0.5">
                  Of entity revenue
                </span>
              </div>

              {/* Quarterly Growth */}
              <div className="border border-slate-200 rounded-lg p-2.5 bg-white">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block font-sans">
                  QOQ GROWTH
                </span>
                <div className={`text-[17px] font-black tracking-tight mt-0.5 font-sans tabular-nums ${
                  branchReport.growth.startsWith('-') ? 'text-rose-600' : 'text-emerald-600'
                }`}>
                  {branchReport.growth}
                </div>
                <span className="text-[8.5px] text-slate-400 block mt-0.5">
                  Quarter over quarter
                </span>
              </div>

              {/* Outstanding */}
              <div className="border border-slate-200 rounded-lg p-2.5 bg-white">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block font-sans">
                  OUTSTANDING
                </span>
                <div className="text-[17px] font-black text-[#f97316] tracking-tight mt-0.5 font-sans tabular-nums">
                  {branchReport.outstanding}
                </div>
                <span className="text-[8.5px] text-slate-400 block mt-0.5">
                  Awaiting collection
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: MONTHLY REVENUE & INVOICE SUMMARY */}
          <div className="grid grid-cols-2 gap-2.5 mt-2.5">
            {/* Monthly Revenue */}
            <div className="border border-slate-200 rounded-lg p-2.5 bg-white flex flex-col justify-between">
              <div>
                <h3 className="text-[10.5px] font-extrabold text-[#1e3a5f] uppercase tracking-wider mb-1.5 font-sans">
                  MONTHLY REVENUE ({reportMeta.period})
                </h3>
                <div className="space-y-1.5 pt-0.5">
                  {branchReport.monthlyRevenue && branchReport.monthlyRevenue.map((item, idx) => (
                    <div key={idx} className="text-[9.5px]">
                      <div className="flex items-center justify-between font-medium mb-0.5">
                        <span className="text-slate-600 font-sans">{item.month}</span>
                        <span className="font-bold text-[#0f172a] font-sans">{item.amount}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#1e3a5f]"
                          style={{ width: item.width }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Invoice Summary */}
            <div className="border border-slate-200 rounded-lg p-2.5 bg-white flex flex-col justify-between font-sans">
              <div>
                <h3 className="text-[10.5px] font-extrabold text-[#1e3a5f] uppercase tracking-wider mb-1.5 font-sans">
                  INVOICE SUMMARY
                </h3>
                <div className="space-y-1 pt-0.5 text-[9.5px]">
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-700 font-semibold">Total Sent</span>
                    <span className="font-extrabold text-[#0f172a] text-[11px] tabular-nums">
                      {branchReport.distribution.sent}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-700 font-semibold">Approved / Paid</span>
                    <InvoiceBadge value={branchReport.distribution.approved} variant="approved" />
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-700 font-semibold">Pending Review</span>
                    <InvoiceBadge value={branchReport.distribution.pending} variant="pending" />
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-700 font-semibold">Overdue</span>
                    <InvoiceBadge value={branchReport.distribution.overdue} variant="overdue" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: QUARTERLY FINANCIAL COMPARISON */}
          <div className="mt-2.5">
            <h2 className="text-[10.5px] font-extrabold text-[#1e3a5f] uppercase tracking-wider mb-1 font-sans">
              QUARTERLY FINANCIAL COMPARISON
            </h2>
            <div className="rounded-md overflow-hidden border border-slate-200">
              <table className="w-full text-left border-collapse text-[9px] font-sans">
                <thead>
                  <tr className="bg-[#f1f5f9] text-slate-700 font-bold text-[8.5px]">
                    <th className="py-1 px-2.5 font-bold">Metric</th>
                    <th className="py-1 px-2.5 font-bold text-right">Current Quarter</th>
                    <th className="py-1 px-2.5 font-bold text-right">Previous Quarter</th>
                    <th className="py-1 px-2.5 font-bold text-right">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {branchReport.comparison.map((row, idx) => {
                    const isPositive = !row.change.startsWith('-');
                    return (
                      <tr key={idx}>
                        <td className="py-1 px-2.5 font-bold text-[#0f172a]">{row.metric}</td>
                        <td className="py-1 px-2.5 text-right font-black text-[#0f172a] tabular-nums">
                          {row.curr}
                        </td>
                        <td className="py-1 px-2.5 text-right text-slate-500 font-medium tabular-nums">
                          {row.prev}
                        </td>
                        <td
                          className={`py-1 px-2.5 text-right font-bold tabular-nums ${
                            isPositive ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {row.change}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 4: BRANCH CONTRIBUTION SHARE */}
          <div className="mt-2.5">
            <h2 className="text-[10.5px] font-extrabold text-[#1e3a5f] uppercase tracking-wider mb-1 font-sans">
              BRANCH CONTRIBUTION SHARE
            </h2>
            <div className="rounded-md overflow-hidden border border-slate-200">
              <table className="w-full text-left border-collapse text-[9px] font-sans">
                <thead>
                  <tr className="bg-[#f1f5f9] text-slate-700 font-bold text-[8.5px]">
                    <th className="py-1 px-2.5 font-bold w-1/3">Office Branch</th>
                    <th className="py-1 px-2.5 font-bold text-right w-1/3">Revenue</th>
                    <th className="py-1 px-2.5 font-bold text-right w-1/3">Share (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {consolidatedBranches.map((b, idx) => {
                    const isCurrent = b.office === selectedBranch;
                    const cleanShare = b.share.replace(/[^0-9.]/g, '') || '0';
                    return (
                      <tr key={idx} className={isCurrent ? "bg-blue-50/40" : ""}>
                        <td className="py-1 px-2.5">
                          <span className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${b.dotColor}`} />
                            <span className={`font-bold ${isCurrent ? "text-blue-700" : "text-[#0f172a]"}`}>
                              {b.office} {isCurrent ? '(Active)' : ''}
                            </span>
                          </span>
                        </td>
                        <td className={`py-1 px-2.5 text-right tabular-nums ${isCurrent ? "font-black text-blue-700" : "font-bold text-[#0f172a]"}`}>
                          {b.amount}
                        </td>
                        <td className="py-1 px-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full ${isCurrent ? "bg-blue-600" : "bg-[#1e3a5f]"}`}
                                style={{ width: `${Math.min(100, Math.max(Number(cleanShare), 5))}%` }}
                              />
                            </div>
                            <span className={`font-bold text-[9px] tabular-nums w-8 text-right ${isCurrent ? "text-blue-700" : "text-[#0f172a]"}`}>
                              {cleanShare}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex justify-between items-center text-[8.5px] text-slate-400 pt-2 font-sans border-t border-slate-100">
          <span>{reportMeta.footerNote || "DST Finance · Confidential"}</span>
          <span>{reportMeta.pageInfo || "Page 1 of 1"}</span>
        </div>
      </div>
    </>
  );
};

export default BranchFinancialReportPrint;
