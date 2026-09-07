import React from 'react';
import { Download, Maximize2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ReceiptVendor } from '../types';

interface ReceiptDocumentCardProps {
  vendor: ReceiptVendor;
  onDownload: () => void;
  onMaximize: () => void;
  formatAmount: (num: number, curr?: string) => string;
}

export const ReceiptDocumentCard: React.FC<ReceiptDocumentCardProps> = ({
  vendor,
  onDownload,
  onMaximize,
  formatAmount
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-7 space-y-5">
      {/* Header with Download and Maximize action icons */}
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">
          {t('expenseApproval.receiptView') || 'Uploaded Receipt Document'}
        </h2>

        <div className="flex items-center space-x-2 text-slate-500">
          <button
            onClick={onDownload}
            title={t('common.download') || 'Download Receipt'}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={onMaximize}
            title={t('common.view') || 'View Fullscreen'}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Receipt Preview Background */}
      <div className="bg-[#f1f5f9]/70 rounded-2xl p-6 sm:p-10 flex items-center justify-center min-h-[460px] border border-slate-100">
        {/* Paper Receipt Card */}
        <div className="bg-white rounded-xl shadow-md border border-slate-100/80 p-7 max-w-sm w-full space-y-5 font-sans">
          {/* Header info */}
          <div className="text-center space-y-1">
            <h4 className="text-[15px] font-extrabold text-slate-900 tracking-wider">
              {vendor.name}
            </h4>
            <p className="text-[11.5px] font-medium text-slate-500">
              {vendor.location}
            </p>
            <p className="text-[11px] font-medium text-slate-400">
              {vendor.vatId}
            </p>
          </div>

          {/* Dotted Divider */}
          <div className="border-b-2 border-dotted border-slate-200 my-3" />

          {/* Line items */}
          <div className="space-y-2 text-[12px]">
            {vendor.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-slate-700">
                <span className="font-medium text-slate-600">{item.name}</span>
                <span className="font-bold text-slate-900 whitespace-nowrap">
                  {formatAmount(item.amount, 'RP')}
                </span>
              </div>
            ))}
          </div>

          {/* Solid Divider */}
          <div className="border-b border-slate-200 my-4" />

          {/* Total Amount Row */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[13px] font-extrabold text-slate-900">
              {t('common.total') || 'TOTAL AMOUNT'}
            </span>
            <span className="text-[16px] font-extrabold text-slate-900">
              {formatAmount(vendor.total, 'RP')}
            </span>
          </div>

          {/* Footer notes */}
          <div className="text-center space-y-0.5 pt-4 text-[10.5px] text-slate-400 font-medium">
            <p>{vendor.paymentMethod}</p>
            <p>{vendor.footerNote}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
