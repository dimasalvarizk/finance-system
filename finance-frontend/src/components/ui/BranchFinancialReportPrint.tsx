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

const SummaryCard: React.FC<{
  label: string;
  value: string;
  valueClassName?: string;
  subLabel?: string;
  trendIcon?: boolean;
}> = ({ label, value, valueClassName = "text-[#1e293b]", subLabel, trendIcon }) => (
  <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 font-sans">
    <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase font-inter">
      {label}
    </p>
    <p className={`mt-2 text-2xl font-bold flex items-center gap-1 font-roboto ${valueClassName}`}>
      {value}
      {trendIcon && (
        <svg
          className="w-4 h-4 text-emerald-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </p>
    {subLabel && <p className="mt-1 text-xs text-slate-400 font-inter">{subLabel}</p>}
  </div>
);

const InvoiceBadge: React.FC<{ value: number; variant: "approved" | "pending" | "overdue" }> = ({
  value,
  variant,
}) => {
  const styles: Record<string, string> = {
    approved: "bg-[#ecfdf5] text-[#10b981]",
    pending: "bg-[#fff7ed] text-[#f97316]",
    overdue: "bg-[#fef2f2] text-[#ef4444]",
  };
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[32px] px-2.5 py-1 rounded-full text-xs font-bold font-inter ${styles[variant]}`}
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
    <div id="pdf-report-print-area" className="hidden print:block w-full bg-white p-6 font-sans text-slate-800">
      <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl p-6 print:p-5 shadow-none">
        {/* Header */}
        <div className="flex items-start justify-between pb-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <img
              src={logoBranchInvoice}
              alt="Logo"
              className="h-12 w-auto object-contain"
            />
          </div>
          <div className="text-right">
            <h1 className="text-lg font-extrabold text-slate-800 tracking-wide font-inter">
              BRANCH FINANCIAL REPORT
            </h1>
            <p className="text-sm font-semibold text-blue-600 mt-1">
              {selectedBranch} Branch
            </p>
            <p className="text-xs text-slate-400 mt-0.5 font-inter">
              {reportMeta.period} — Generated {reportMeta.generatedDate}
            </p>
          </div>
        </div>

        {/* Executive Summary */}
        <section className="mt-8">
          <h2 className="text-xs font-bold tracking-wider text-slate-700 uppercase mb-3 font-inter">
            Executive Summary
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <SummaryCard
              label="Total Revenue"
              value={branchReport.revenue}
              subLabel={`${selectedBranch.split(' ')[0]} branch contribution`}
            />
            <SummaryCard
              label="Revenue Share"
              value={branchReport.share}
              subLabel="Of consolidated entity revenue"
            />
            <SummaryCard
              label="Quarterly Growth"
              value={branchReport.growth}
              valueClassName={branchReport.growth.startsWith('-') ? "text-rose-500" : "text-green-600"}
              subLabel="Quarter-over-quarter change"
              trendIcon={!branchReport.growth.startsWith('-')}
            />
            <SummaryCard
              label="Outstanding Balance"
              value={branchReport.outstanding}
              valueClassName="text-orange-500"
              subLabel="Awaiting collection"
            />
          </div>
        </section>

        {/* Monthly Revenue & Invoice Summary */}
        <section className="mt-8 grid grid-cols-2 gap-6">
          {/* Monthly Revenue */}
          <div>
            <h2 className="text-xs font-bold tracking-wider text-slate-700 uppercase mb-3 font-inter">
              Monthly Revenue ({reportMeta.period})
            </h2>
            <div className="rounded-xl border border-slate-100 p-3 space-y-3">
              {branchReport.monthlyRevenue && branchReport.monthlyRevenue.map((item, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between text-sm mb-1.5 font-inter">
                    <span className="text-slate-500 font-medium font-sans">{item.month}</span>
                    <span className="font-semibold text-slate-700 font-sans">
                      {item.amount}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: item.width }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invoice Summary */}
          <div>
            <h2 className="text-xs font-bold tracking-wider text-slate-700 uppercase mb-3 font-inter">
              Invoice Summary
            </h2>
            <div className="rounded-xl border border-slate-100 divide-y divide-slate-100">
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-sm text-slate-500 font-medium font-sans">Total Sent</span>
                <span className="text-sm font-semibold text-slate-700 font-inter">
                  {branchReport.distribution.sent}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-sm text-slate-500 font-medium font-sans">Approved</span>
                <InvoiceBadge value={branchReport.distribution.approved} variant="approved" />
              </div>
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-sm text-slate-500 font-medium font-sans">Pending</span>
                <InvoiceBadge value={branchReport.distribution.pending} variant="pending" />
              </div>
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-sm text-slate-500 font-medium font-sans">Overdue</span>
                <InvoiceBadge value={branchReport.distribution.overdue} variant="overdue" />
              </div>
            </div>
          </div>
        </section>

        {/* Quarterly Financial Comparison */}
        <section className="mt-8 font-sans">
          <h2 className="text-xs font-bold tracking-wider text-slate-700 uppercase mb-4 font-inter">
            Quarterly Financial Comparison
          </h2>
          <div className="rounded-xl border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left font-bold text-slate-700 text-xs uppercase tracking-wide px-4 py-3 font-inter">
                    Metric
                  </th>
                  <th className="text-right font-bold text-slate-700 text-xs uppercase tracking-wide px-4 py-3 font-inter">
                    Q3 2024 (Curr)
                  </th>
                  <th className="text-right font-bold text-slate-700 text-xs uppercase tracking-wide px-4 py-3 font-inter">
                    Q2 2024 (Prev)
                  </th>
                  <th className="text-right font-bold text-slate-700 text-xs uppercase tracking-wide px-4 py-3 font-inter">
                    Change
                  </th>
                </tr>
              </thead>
              <tbody>
                {branchReport.comparison.map((row, idx) => {
                  const isPositive = !row.change.startsWith('-');
                  return (
                    <tr key={idx} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-4 py-2 font-medium text-slate-700">{row.metric}</td>
                      <td className="px-4 py-2 text-right font-semibold text-slate-800 font-roboto">
                        {row.curr}
                      </td>
                      <td className="px-4 py-2 text-right text-slate-400 font-roboto">{row.prev}</td>
                      <td
                        className={`px-4 py-2 text-right font-semibold font-inter ${isPositive ? "text-green-600" : "text-rose-500"
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
        </section>

        {/* Branch Contribution Share */}
        <section className="mt-8 font-sans">
          <h2 className="text-xs font-bold tracking-wider text-slate-700 uppercase mb-4 font-inter">
            Branch Contribution Share
          </h2>
          <div className="rounded-xl border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left font-bold text-slate-700 text-xs uppercase tracking-wide px-4 py-3 font-inter">
                    Office Branch
                  </th>
                  <th className="text-right font-bold text-slate-700 text-xs uppercase tracking-wide px-4 py-3 font-inter">
                    Revenue
                  </th>
                  <th className="text-right font-bold text-slate-700 text-xs uppercase tracking-wide px-4 py-3 font-inter">
                    Share (%)
                  </th>
                </tr>
              </thead>
              <tbody>
                {consolidatedBranches.map((b, idx) => {
                  const isCurrent = b.office === selectedBranch;
                  return (
                    <tr key={idx} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-4 py-2">
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${b.dotColor}`} />
                          <span className={isCurrent ? "font-semibold text-slate-800" : "text-slate-600"}>
                            {b.office} {isCurrent ? '(This)' : ''}
                          </span>
                        </span>
                      </td>
                      <td className={`px-4 py-2 text-right font-roboto ${isCurrent ? "font-semibold text-slate-800" : "text-slate-600"}`}>
                        {b.amount}
                      </td>
                      <td className={`px-4 py-2 text-right font-inter ${isCurrent ? "font-semibold text-blue-600" : "text-slate-600"}`}>
                        {b.share.replace('Revenue Share: ', '')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-inter font-bold uppercase tracking-wider">
          <span>{reportMeta.footerNote}</span>
          <span>{reportMeta.pageInfo}</span>
        </div>
      </div>
    </div>
  );
};

export default BranchFinancialReportPrint;
