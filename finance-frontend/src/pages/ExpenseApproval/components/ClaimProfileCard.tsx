import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import type { ApprovalClaimDetail } from '../types';

interface ClaimProfileCardProps {
  claim: ApprovalClaimDetail;
  comment: string;
  setComment: (val: string) => void;
  isFullyApproved: boolean;
  onApprove: () => void;
  onReject: () => void;
  onClarify: () => void;
  onTransfer: () => void;
  formatAmount: (num: number, curr?: string) => string;
}

export const ClaimProfileCard: React.FC<ClaimProfileCardProps> = ({
  claim,
  comment,
  setComment,
  isFullyApproved,
  onApprove,
  onReject,
  onClarify,
  onTransfer,
  formatAmount
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-7 space-y-6">
      <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">
        {t('expenseApproval.claimProfile') || 'Claim Profile'}
      </h2>

      {/* Key - Value List */}
      <div className="space-y-3.5 text-[13px]">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">{t('approvals.employee') || 'Employee Name'}</span>
          <span className="text-slate-900 font-bold">{claim.employeeName}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">Employee ID</span>
          <span className="text-slate-900 font-bold">{claim.employeeId}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">{t('approvals.department') || 'Department'}</span>
          <span className="text-slate-900 font-bold">{claim.department}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">{t('expenses.category') || 'Category'}</span>
          <span className="text-slate-900 font-bold">{claim.category}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">{t('submitExpense.purpose') || 'Mission Reference'}</span>
          <span className="text-slate-900 font-bold">{claim.missionReference}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">{t('expenses.amount') || 'Amount'}</span>
          <span className="text-slate-900 font-extrabold text-[14px]">
            {formatAmount(claim.amount, claim.currency)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">{t('expenses.date') || 'Date Submitted'}</span>
          <span className="text-slate-900 font-bold">{claim.dateSubmitted}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">{t('setupBeneficiary.bankName') || 'Bank Name'}</span>
          <span className="text-slate-900 font-bold">{claim.bankName}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">{t('setupBeneficiary.accountNumber') || 'Bank Account Number'}</span>
          <span className="text-slate-900 font-bold tracking-wider">{claim.bankAccountNumber}</span>
        </div>
      </div>

      {/* Approval Workflow Stepper */}
      <div className="border-t border-slate-100 pt-5 space-y-4">
        <h3 className="text-[13px] font-bold text-slate-800">
          {t('expenseApproval.workflowStepper') || 'Approval Workflow'}
        </h3>

        <div className="flex items-center justify-between relative px-2 py-2">
          {claim.workflowSteps.map((step, idx) => {
            const isLast = idx === claim.workflowSteps.length - 1;
            return (
              <React.Fragment key={step.stepNumber}>
                <div className="flex flex-col items-center text-center z-10 space-y-1.5 flex-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] transition-all ${
                      step.isApproved
                        ? 'bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0]'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {step.isApproved ? (
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <span>{step.stepNumber}</span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-semibold truncate max-w-[100px] ${
                      step.isApproved ? 'text-slate-800 font-bold' : 'text-slate-400'
                    }`}
                    title={step.approver}
                  >
                    {step.approver}
                  </span>
                </div>

                {!isLast && (
                  <div
                    className={`h-[2px] flex-1 -mt-4 transition-all ${
                      step.isApproved && claim.workflowSteps[idx + 1].isApproved
                        ? 'bg-[#15803d]'
                        : step.isApproved
                        ? 'bg-[#15803d]'
                        : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Comments / Feedback */}
      <div className="space-y-2 pt-1">
        <label className="text-[12.5px] font-bold text-slate-800">
          {t('common.notes') || 'Approval Comments / Feedback'}
        </label>
        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add reasoning if requesting clarification or rejecting..."
          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-[12.5px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
        />
      </div>

      {/* Action Buttons: State 1 vs State 2 */}
      <div className="pt-2">
        {isFullyApproved ? (
          <button
            onClick={onTransfer}
            className="w-full py-3 bg-[#dcfce7] hover:bg-[#bbf7d0] text-[#15803d] font-bold text-[13.5px] rounded-xl transition-all shadow-xs cursor-pointer active:scale-[0.99] flex items-center justify-center space-x-2"
          >
            <span>{t('expenseApproval.transferAmount') || 'Transfer Amount'}</span>
          </button>
        ) : (
          <div className="flex items-center space-x-3">
            <button
              onClick={onReject}
              className="px-5 py-2.5 bg-[#fee2e2] hover:bg-[#fecaca] text-[#ef4444] font-bold text-[12.5px] rounded-xl transition-all cursor-pointer"
            >
              {t('expenseApproval.rejectClaim') || 'Reject'}
            </button>

            <button
              onClick={onClarify}
              className="flex-1 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-[12.5px] rounded-xl transition-all cursor-pointer text-center"
            >
              {t('expenseApproval.requestClarification') || 'Request Clarification'}
            </button>

            <button
              onClick={onApprove}
              className="px-6 py-2.5 bg-[#dcfce7] hover:bg-[#bbf7d0] text-[#15803d] font-bold text-[12.5px] rounded-xl transition-all cursor-pointer"
            >
              {t('expenseApproval.approveClaim') || 'Approve'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
