import React from 'react';
import { Building2, X, Download } from 'lucide-react';
import type { ApprovalClaimDetail } from '../types';

interface ReceiptFullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: ApprovalClaimDetail;
  onDownload: () => void;
  formatAmount: (num: number, curr?: string) => string;
}

export const ReceiptFullscreenModal: React.FC<ReceiptFullscreenModalProps> = ({
  isOpen,
  onClose,
  claim,
  onDownload,
  formatAmount
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl space-y-6 relative animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h3 className="text-[16px] font-bold text-slate-900">
              Receipt Document #{claim.claimId}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Large receipt view */}
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/80 space-y-6">
          <div className="text-center space-y-1.5">
            <h4 className="text-[18px] font-extrabold text-slate-900 tracking-wider">
              {claim.receiptVendor.name}
            </h4>
            <p className="text-[12.5px] font-medium text-slate-600">
              {claim.receiptVendor.location}
            </p>
            <p className="text-[12px] font-mono text-slate-400">
              {claim.receiptVendor.vatId}
            </p>
          </div>

          <div className="border-b-2 border-dotted border-slate-300" />

          <div className="space-y-3 text-[13px]">
            {claim.receiptVendor.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-slate-700">
                <span className="font-medium text-slate-700">{item.name}</span>
                <span className="font-bold text-slate-900">{formatAmount(item.amount, 'RP')}</span>
              </div>
            ))}
          </div>

          <div className="border-b border-slate-300" />

          <div className="flex items-center justify-between">
            <span className="text-[15px] font-extrabold text-slate-900">TOTAL AMOUNT</span>
            <span className="text-[18px] font-extrabold text-slate-900">
              {formatAmount(claim.receiptVendor.total, 'RP')}
            </span>
          </div>

          <div className="text-center space-y-1 text-[11px] text-slate-400 pt-3">
            <p>{claim.receiptVendor.paymentMethod}</p>
            <p>{claim.receiptVendor.footerNote}</p>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            onClick={onDownload}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[13px] rounded-xl flex items-center space-x-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Proof</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-[13px] rounded-xl cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
