import React from 'react';
import { X, Trash2, Printer } from 'lucide-react';
import { formatPrice } from './invoiceUtils';
import type { ReceiptData } from '../../../components/ui/OfficialDepositReceiptModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  standaloneReceiptsList: ReceiptData[];
  loading: boolean;
  onViewReceipt: (receipt: ReceiptData) => void;
  onDeleteReceipt: (id: string) => void;
  onOpenGenerateModal: () => void;
  deletingId: string | null;
  canDelete: boolean;
}

export const StandaloneReceiptsListModal: React.FC<Props> = ({
  isOpen,
  onClose,
  standaloneReceiptsList,
  loading,
  onViewReceipt,
  onDeleteReceipt,
  onOpenGenerateModal,
  deletingId,
  canDelete,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-[#0c0d0f]/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden text-slate-800 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div>
            <h3 className="text-[15px] font-extrabold text-[#0c0d0f]">Direct Deposit Receipts</h3>
            <p className="text-[11.5px] text-slate-500">Standalone receipts issued directly without invoices</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-[12px] text-slate-400 font-medium">Loading receipts...</p>
            </div>
          ) : standaloneReceiptsList.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <p className="text-[14px] font-bold text-slate-700">No Direct Deposit Receipts Yet</p>
              <p className="text-[12px] text-slate-400 max-w-xs">Click Generate Deposit Receipt to issue your first direct receipt.</p>
              <button
                onClick={onOpenGenerateModal}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[12px] rounded-xl cursor-pointer transition-all shadow-sm"
              >
                + Generate Deposit Receipt
              </button>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-[12px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="px-4 py-3">Receipt #</th>
                    <th className="px-4 py-3">Payer / Company</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Bank Channel</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {standaloneReceiptsList.map((rec: any) => (
                    <tr key={rec.id || rec.receiptNo} className="hover:bg-slate-50/70 transition-all">
                      <td className="px-4 py-3 font-mono font-bold text-amber-700">{rec.receiptNo}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{rec.receivedFrom?.company || rec.companyName}</td>
                      <td className="px-4 py-3 text-slate-600">{rec.dateOfPayment ? rec.dateOfPayment.split('T')[0] : '-'}</td>
                      <td className="px-4 py-3 font-extrabold text-emerald-600">
                        {formatPrice(rec.amountReceived?.numeric || rec.amount || 0, rec.amountReceived?.currency || rec.currency || 'SAR')}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[11px]">
                        {rec.bankDetails?.payerBank?.bankName || rec.paymentDetails?.paymentMethod || 'Bank Wire'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => onViewReceipt(rec)}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-bold text-[11px] rounded-lg transition-all flex items-center space-x-1 cursor-pointer"
                            title="View & Print Official Receipt"
                          >
                            <Printer className="w-3.5 h-3.5 text-amber-600" />
                            <span>Receipt</span>
                          </button>
                          {canDelete && (
                            <button
                              disabled={deletingId === (rec.id || rec.paymentId)}
                              onClick={() => onDeleteReceipt(rec.id || rec.paymentId)}
                              className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                              title="Delete Receipt"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[12px]">
          <span className="text-slate-500 font-medium">Total: {standaloneReceiptsList.length} receipts</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StandaloneReceiptsListModal;
