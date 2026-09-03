import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface Invoice {
  ref: string;
  client: string;
  amount: string;
  status: string;
  statusColor: string;
  date: string;
  dueDate?: string;
}

interface InvoiceTableProps {
  invoices: Invoice[];
  isFullWidth?: boolean;
}

const getStatusStyles = (status: string) => {
  switch (status.toLowerCase()) {
    case 'approved':
    case 'fully paid':
    case 'paid':
    case 'lunas':
    case 'disetujui':
    case 'معتمد':
    case 'مدفوع بالكامل':
      return 'bg-[#ecfdf5] text-[#10b981]';
    case 'partial':
    case 'partial payment':
    case 'bayar sebagian':
    case 'دفعة جزئية':
      return 'bg-[#eff6ff] text-[#2563eb]';
    case 'deposit paid':
    case 'dp diterima':
    case 'تم دفع العربون':
      return 'bg-[#fffbeb] text-[#d97706]';
    case 'pending':
    case 'menunggu':
    case 'قيد الانتظار':
      return 'bg-[#fff7ed] text-[#f97316]';
    case 'overdue':
    case 'jatuh tempo':
    case 'lewat jatuh tempo':
    case 'متأخر':
    case 'متأخر السداد':
      return 'bg-[#fef2f2] text-[#ef4444]';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const InvoiceTable: React.FC<InvoiceTableProps> = ({ invoices, isFullWidth = false }) => {
  const { t, i18n } = useTranslation();

  return (
    <div className={`${isFullWidth ? 'lg:col-span-3' : 'lg:col-span-2'} bg-white rounded-xl border border-[#e2e8f0] py-6 shadow-sm flex flex-col justify-between`}>
      <div>
        {/* Header Section */}
        <div className="px-6 flex justify-between items-center mb-6">
          <h3 className="text-[16px] font-bold text-[#0c0d0f] font-sans">
            {t('dashboard.recentConfirmations')}
          </h3>
          <Link
            to="/invoices"
            className="text-[13px] font-semibold text-[#007aff] hover:underline font-sans"
          >
            {t('dashboard.seeAllConfirmations')}
          </Link>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-y border-[#e2e8f0]">
                <th className="pl-6 pr-4 py-2.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider font-inter">
                  {t('dashboard.ref')}
                </th>
                <th className="px-4 py-2.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider font-inter">
                  {t('dashboard.client')}
                </th>
                <th className="px-4 py-2.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider font-inter">
                  {t('common.amount')}
                </th>
                <th className="px-4 py-2.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider font-inter">
                  {t('common.status')}
                </th>
                <th className="px-4 py-2.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider font-inter">
                  {t('dashboard.confDate')}
                </th>
                <th className="pl-4 pr-6 py-2.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider font-inter">
                  {t('dashboard.dueDate')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {invoices.map((invoice, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                  <td className="pl-6 pr-4 py-3.5 text-[13px] font-bold text-[#0c0d0f] font-inter">
                    {invoice.ref}
                  </td>
                  <td className="px-4 py-3.5 text-[13px] font-medium text-[#1e293b] font-inter">
                    {invoice.client}
                  </td>
                  <td className="px-4 py-3.5 text-[13px] font-bold text-[#0c0d0f] font-roboto">
                    {invoice.amount}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold font-inter ${getStatusStyles(
                        invoice.status
                      )}`}
                    >
                      {(() => {
                        const statusMap: Record<string, string> = {
                          'Fully Paid': t('common.statusPaid'),
                          'Paid': t('common.statusPaid'),
                          'Partial Payment': t('common.statusPartial'),
                          'Partial': t('common.statusPartial'),
                          'Deposit Paid': t('common.statusDeposit'),
                          'Deposit': t('common.statusDeposit'),
                          'Overdue': t('common.statusOverdue'),
                          'Pending': t('common.statusPending'),
                          'Approved': t('common.statusApproved'),
                          'Rejected': t('common.statusRejected'),
                          'Cancelled': t('common.statusCancelled'),
                          'Tentative': t('common.statusTentative'),
                          'Confirmed': t('common.statusConfirmed'),
                        };
                        return statusMap[invoice.status] || invoice.status;
                      })()}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[13px] font-medium text-[#94a3b8] font-inter">
                    {invoice.date}
                  </td>
                  <td className="pl-4 pr-6 py-3.5 text-[13px] font-medium text-[#94a3b8] font-inter">
                    {(() => {
                      if (invoice.dueDate) {
                        if (invoice.dueDate.includes('-')) {
                          const parts = invoice.dueDate.split('-');
                          if (parts.length === 3) {
                            const year = parseInt(parts[0]);
                            const month = parseInt(parts[1]) - 1;
                            const day = parseInt(parts[2]);
                            const dObj = new Date(year, month, day);
                            const localeCode = i18n.language === 'id' ? 'id-ID' : i18n.language === 'ar' ? 'ar-SA' : 'en-US';
                            return dObj.toLocaleDateString(localeCode, { month: 'short', day: '2-digit', year: 'numeric' });
                          }
                        }
                        return invoice.dueDate;
                      }
                      return 'N/A';
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InvoiceTable;
