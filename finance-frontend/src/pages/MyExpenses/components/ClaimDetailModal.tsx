import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Receipt, X, Paperclip, FileText, CheckCircle2 } from 'lucide-react';
import type { ExpenseClaim } from '../types';

interface ClaimDetailModalProps {
  claim: ExpenseClaim | null;
  onClose: () => void;
  formatAmount: (num: number, curr: string) => string;
}

export const ClaimDetailModal: React.FC<ClaimDetailModalProps> = ({
  claim,
  onClose,
  formatAmount
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!claim) return null;

  const isPaid = claim.status === 'Paid' || claim.status === 'Disbursed' || claim.status === 'Transferred';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0c0d0f]/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-scale-up font-sans transform-gpu flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-slate-900">{claim.claimId}</h3>
              <p className="text-[11.5px] text-slate-500">{claim.submittedBy} • {claim.department}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto modal-scroll-container flex-1">
          {/* Amount and Status Banner */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                {t('expenses.amount') || 'Claimed Amount'}
              </span>
              <span className="text-xl font-extrabold text-slate-900">{formatAmount(claim.amount, claim.currency)}</span>
            </div>
            <div>
              <span
                className={`px-3 py-1 rounded-md text-[11px] font-bold border ${
                  isPaid
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                {claim.status}
              </span>
            </div>
          </div>

          {/* Claim Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 text-[12.5px]">
            <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-100">
              <span className="text-[11px] text-slate-400 block font-medium">{t('expenses.category') || 'Category'}</span>
              <span className="font-semibold text-slate-800">{claim.category}</span>
            </div>
            <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-100">
              <span className="text-[11px] text-slate-400 block font-medium">{t('expenses.date') || 'Submission Date'}</span>
              <span className="font-semibold text-slate-800">{claim.submitDate}</span>
            </div>
          </div>

          <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-100 text-[12.5px]">
            <span className="text-[11px] text-slate-400 block font-medium mb-0.5">{t('submitExpense.purpose') || 'Reason / Mission Reference'}</span>
            <span className="font-semibold text-slate-800 leading-relaxed block">{claim.reason}</span>
          </div>

          {claim.notes && (
            <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-100 text-[12.5px]">
              <span className="text-[11px] text-slate-400 block font-medium mb-0.5">{t('common.notes') || 'Additional Notes'}</span>
              <p className="text-slate-600 text-[12px] leading-relaxed">{claim.notes}</p>
            </div>
          )}

          {claim.receipts && claim.receipts.length > 0 ? (
            <div className="space-y-2">
              <span className="text-[11px] text-slate-400 block font-medium">
                {t('expenses.receipt') || 'Attached Receipts'} ({claim.receipts.length})
              </span>
              <div className="space-y-1.5">
                {claim.receipts.map((rec, rIdx) => (
                  <div
                    key={rIdx}
                    className="bg-blue-50/60 p-2.5 rounded-lg border border-blue-100 flex items-center justify-between text-[12px]"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      <Paperclip className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="font-semibold text-blue-900 truncate" title={rec.name}>
                        {rec.name}
                      </span>
                      {rec.size && (
                        <span className="text-[10.5px] text-slate-400 font-medium whitespace-nowrap">
                          ({rec.size < 1024 * 1024 ? `${(rec.size / 1024).toFixed(1)} KB` : `${(rec.size / (1024 * 1024)).toFixed(2)} MB`})
                        </span>
                      )}
                    </div>
                    <span className="text-[10.5px] font-bold text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-200 flex-shrink-0">
                      Attached
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : claim.receiptName ? (
            <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-100 flex items-center justify-between text-[12px]">
              <div className="flex items-center space-x-2">
                <Paperclip className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-blue-900 truncate max-w-[240px]">{claim.receiptName}</span>
              </div>
              <span className="text-[11px] font-bold text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-200">
                Attached
              </span>
            </div>
          ) : null}

          {/* Multi-step Approval Chain Timeline */}
          <div className="space-y-3 pt-2">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('expenses.approvalChain') || 'Approval Workflow Timeline'}</h4>
            
            <div className="space-y-3 pl-2 border-l-2 border-slate-200 ml-2">
              {claim.approvalTimeline.map((step, idx) => {
                const isDone = step.status === 'completed';
                const isCurrent = step.status === 'in_progress';
                const isRejected = step.status === 'rejected';

                return (
                  <div key={idx} className="relative pl-5 text-[12px]">
                    <span
                      className={`absolute -left-[17px] top-0.5 w-3 h-3 rounded-full border-2 bg-white ${
                        isDone
                          ? 'border-emerald-500 bg-emerald-500'
                          : isCurrent
                          ? 'border-blue-600 bg-blue-600 animate-pulse'
                          : isRejected
                          ? 'border-rose-500 bg-rose-500'
                          : 'border-slate-300'
                      }`}
                    />
                    <div className="flex items-center justify-between">
                      <span className={`font-bold ${isCurrent ? 'text-blue-700' : isDone ? 'text-slate-800' : 'text-slate-400'}`}>
                        {step.step}
                      </span>
                      {step.date && <span className="text-[10.5px] text-slate-400 font-medium">{step.date}</span>}
                    </div>
                    <p className="text-[11.5px] text-slate-500 font-medium mt-0.5">Assigned: {step.approver}</p>
                    {step.comment && (
                      <div className="mt-1 p-2 bg-rose-50 border border-rose-100 rounded text-[11px] text-rose-700 font-medium">
                        Note: {step.comment}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-semibold rounded-xl text-[12.5px] border border-slate-200 shadow-2xs transition-all cursor-pointer"
          >
            {t('common.close') || 'Tutup'}
          </button>

          <div className="flex items-center gap-2.5">
            {isPaid ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/approvals/action/${claim.claimId}`);
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-[12px] border border-slate-200/90 shadow-2xs transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t('expenses.viewApprovalDetail') || 'Alur Persetujuan'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigate(`/pre-execution-payment/${claim.claimId}`);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[12.5px] shadow-xs transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{t('expenses.viewTransferProof') || 'Bukti Transfer'}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  navigate(`/approvals/action/${claim.claimId}`);
                }}
                className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-xl text-[12.5px] shadow-xs transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap"
              >
                <span>{t('expenses.viewDetail') || 'Lihat Detail'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
