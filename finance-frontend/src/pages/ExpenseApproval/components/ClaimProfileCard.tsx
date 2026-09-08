import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Clock, ShieldCheck, ArrowRight, Lock, ExternalLink } from 'lucide-react';
import type { ApprovalClaimDetail } from '../types';

interface ClaimProfileCardProps {
  claim: ApprovalClaimDetail;
  comment: string;
  setComment: (val: string) => void;
  isFullyApproved: boolean;
  isAuthorizedApprover?: boolean;
  matchedApproverName?: string | null;
  canApproveCurrentStep?: boolean;
  currentActiveStepNumber?: number;
  currentRequiredApprover?: string;
  currentRequiredRole?: string;
  restrictionReason?: string;
  isITDeveloper?: boolean;
  itDeveloperName?: string;
  itSimulationRole?: 'Mr. Hesham Mokhtar' | 'Mr. Khalid Idriss' | 'Mr. Emad Moustafa' | 'BYPASS_ALL' | null;
  onSelectITSimulationRole?: (role: 'Mr. Hesham Mokhtar' | 'Mr. Khalid Idriss' | 'Mr. Emad Moustafa' | 'BYPASS_ALL' | null) => void;
  onDirectNavigate?: (path: string) => void;
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
  isAuthorizedApprover = false,
  matchedApproverName = null,
  canApproveCurrentStep = false,
  currentActiveStepNumber = 1,
  currentRequiredApprover = 'Mr. Hesham Mokhtar',
  currentRequiredRole = 'Finance Director',
  restrictionReason,
  isITDeveloper = false,
  itDeveloperName,
  itSimulationRole = null,
  onSelectITSimulationRole,
  onDirectNavigate,
  onApprove,
  onReject,
  onClarify,
  onTransfer,
  formatAmount
}) => {
  const { t } = useTranslation();

  const approvedCount = claim.workflowSteps.filter((s) => s.isApproved).length;
  const totalSteps = claim.workflowSteps.length || 3;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-6">
      {/* IT Developer Inspection Toolbar */}
      {isITDeveloper && (
        <div className="p-3.5 bg-slate-900 text-white rounded-xl border border-slate-800 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-bold text-slate-200">
              {t('expenseApproval.itMode')}{itDeveloperName ? ` (${itDeveloperName})` : ''}
            </span>
            {itSimulationRole && (
              <button
                onClick={() => onSelectITSimulationRole?.(null)}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold cursor-pointer underline underline-offset-2"
                title="Reset simulation"
              >
                {t('expenseApproval.resetSimulation')}
              </button>
            )}
          </div>

          {/* Simulation buttons */}
          <div className="space-y-1.5 pt-1.5 border-t border-slate-800">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
              {t('expenseApproval.approverSimulation')}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
              <button
                onClick={() => onSelectITSimulationRole?.('Mr. Hesham Mokhtar')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold border transition-all cursor-pointer text-center truncate ${
                  itSimulationRole === 'Mr. Hesham Mokhtar'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-xs'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/80'
                }`}
              >
                1. Hesham (Step 1)
              </button>

              <button
                onClick={() => onSelectITSimulationRole?.('Mr. Khalid Idriss')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold border transition-all cursor-pointer text-center truncate ${
                  itSimulationRole === 'Mr. Khalid Idriss'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-xs'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/80'
                }`}
              >
                2. Khalid (Step 2)
              </button>

              <button
                onClick={() => onSelectITSimulationRole?.('Mr. Emad Moustafa')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold border transition-all cursor-pointer text-center truncate ${
                  itSimulationRole === 'Mr. Emad Moustafa'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-xs'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/80'
                }`}
              >
                3. Emad (Step 3)
              </button>

              <button
                onClick={() => onSelectITSimulationRole?.('BYPASS_ALL')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold border transition-all cursor-pointer text-center truncate ${
                  itSimulationRole === 'BYPASS_ALL'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-xs'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/80'
                }`}
              >
                {t('expenseApproval.fullItBypass')}
              </button>
            </div>
          </div>

          {/* Direct Navigation Links for Testing */}
          <div className="space-y-1.5 pt-1.5 border-t border-slate-800">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
              {t('expenseApproval.flowShortcuts')}
            </span>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <button
                onClick={() => onDirectNavigate?.(`/initiate-reimbursement/${claim.claimId}`)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-medium cursor-pointer transition-colors"
              >
                {t('expenseApproval.initiateReimbursementShortcut')}
              </button>
              <button
                onClick={() => onDirectNavigate?.(`/pre-execution-payment/${claim.claimId}`)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-medium cursor-pointer transition-colors"
              >
                {t('expenseApproval.preExecutionPaymentShortcut')}
              </button>
              <button
                onClick={() => onDirectNavigate?.(`/setup-beneficiary/${claim.claimId}`)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-medium cursor-pointer transition-colors"
              >
                {t('expenseApproval.employeeBankDataShortcut')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-[16px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{t('expenseApproval.claimProfile') || 'Claim Profile'}</span>
            <span className="text-[12px] font-mono text-slate-400 font-normal">({claim.claimId})</span>
          </h2>
          <p className="text-[12px] text-slate-500 mt-0.5">
            {claim.category} • {claim.department}
          </p>
        </div>

        <div>
          <span
            className={`px-3 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 border ${claim.status === 'Transferred' || claim.status === 'Approved' || approvedCount === totalSteps
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : claim.status === 'Rejected'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
          >
            {claim.status === 'Transferred' ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{t('common.statusPaid') || 'Transferred'}</span>
              </>
            ) : claim.status === 'Approved' || approvedCount === totalSteps ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{t('common.statusApproved') || '3/3 Approved'}</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{approvedCount}/{totalSteps} {t('common.statusApproved') || 'Approved'}</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Key - Value List */}
      <div className="space-y-3 text-[13px] bg-slate-50/70 p-4 rounded-xl border border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">{t('approvals.employee') || 'Employee Name'}</span>
          <span className="text-slate-900 font-bold">{claim.employeeName}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">Employee ID</span>
          <span className="text-slate-900 font-mono font-semibold text-[12px]">{claim.employeeId}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">{t('approvals.department') || 'Department'}</span>
          <span className="text-slate-900 font-semibold">{claim.department}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">{t('expenses.category') || 'Category'}</span>
          <span className="text-slate-900 font-semibold">{claim.category}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">{t('submitExpense.purpose') || 'Mission Reference'}</span>
          <span className="text-slate-900 font-semibold text-right max-w-[200px] truncate" title={claim.missionReference}>
            {claim.missionReference}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
          <span className="text-slate-600 font-bold">{t('expenses.amount') || 'Claim Amount'}</span>
          <span className="text-blue-700 font-extrabold text-[15px]">
            {formatAmount(claim.amount, claim.currency)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">{t('expenses.date') || 'Date Submitted'}</span>
          <span className="text-slate-900 font-medium">{claim.dateSubmitted}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">{t('setupBeneficiary.bankName') || 'Bank Name'}</span>
          <span className="text-slate-900 font-semibold">{claim.bankName}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">{t('setupBeneficiary.accountNumber') || 'Account Number'}</span>
          <span className="text-slate-900 font-mono font-bold tracking-wider">{claim.bankAccountNumber}</span>
        </div>
      </div>

      {/* Approval Workflow Stepper */}
      <div className="border border-slate-200/90 rounded-xl p-4 bg-white space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[13px] font-bold text-slate-900">
              {t('expenseApproval.workflowStepper') || 'Approval Workflow'}
            </h3>
            <p className="text-[11px] text-slate-400">
              {t('expenseApproval.workflowSubtitle') || '3-Tier Executive Authorization Chain'}
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
            {t('preExecutionPayment.stepOf', { current: Math.min(approvedCount + 1, totalSteps), total: totalSteps }) || `Step ${Math.min(approvedCount + 1, totalSteps)} of ${totalSteps}`}
          </span>
        </div>

        <div className="flex items-center justify-between relative px-1 pt-2 pb-1">
          {claim.workflowSteps.map((step, idx) => {
            const isLast = idx === claim.workflowSteps.length - 1;
            const isCurrentActive =
              !step.isApproved &&
              (idx === 0 || claim.workflowSteps[idx - 1]?.isApproved);

            return (
              <React.Fragment key={step.stepNumber}>
                <div className="flex flex-col items-center text-center z-10 space-y-1.5 flex-1 min-w-0">
                  {/* Step Circle Badge */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[12px] transition-all shadow-xs ${step.isApproved
                      ? 'bg-emerald-500 text-white ring-4 ring-emerald-100'
                      : isCurrentActive
                        ? 'bg-amber-500 text-white ring-4 ring-amber-100 animate-pulse'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                  >
                    {step.isApproved ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : isCurrentActive ? (
                      <Clock className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <span>{step.stepNumber}</span>
                    )}
                  </div>

                  {/* Approver Name */}
                  <div className="w-full px-1">
                    <span
                      className={`text-[11px] block truncate ${step.isApproved
                        ? 'text-slate-900 font-bold'
                        : isCurrentActive
                          ? 'text-amber-900 font-bold'
                          : 'text-slate-400 font-medium'
                        }`}
                      title={step.approver}
                    >
                      {step.approver}
                    </span>
                    <span
                      className="text-[9.5px] text-slate-400 block truncate max-w-[100px] mx-auto mt-0.5"
                      title={step.role}
                    >
                      {step.role}
                    </span>
                  </div>

                  {/* Status Tag */}
                  <div>
                    {step.isApproved ? (
                      <span className="inline-flex items-center text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        {t('common.statusApproved') || 'Approved'}
                      </span>
                    ) : isCurrentActive ? (
                      <span className="inline-flex items-center text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                        {t('common.inProgress') || 'In Review'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[9px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {t('common.statusPending') || 'Pending'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Connecting Line */}
                {!isLast && (
                  <div
                    className={`h-[2px] flex-1 -mt-10 mx-1 transition-all ${step.isApproved && claim.workflowSteps[idx + 1]?.isApproved
                      ? 'bg-emerald-500'
                      : step.isApproved
                        ? 'bg-gradient-to-r from-emerald-500 to-slate-200'
                        : 'bg-slate-200'
                      }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Security Gating: Stage-Specific Authorization Status */}
      {claim.status === 'Transferred' ? (
        <div className="p-4 bg-emerald-50/90 border border-emerald-200/90 rounded-xl space-y-1.5 text-[12px] text-emerald-950">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-bold text-emerald-950 text-[13px]">
              {t('expenseApproval.statusTransferred')}
            </span>
          </div>
          <p className="text-[11.5px] text-emerald-800 leading-relaxed">
            {t('expenseApproval.statusTransferredDesc', { name: claim.employeeName })}
          </p>
        </div>
      ) : !isAuthorizedApprover ? (
        <div className="p-4 bg-rose-50/90 border border-rose-200/80 rounded-xl space-y-1.5 text-[12px] text-rose-900">
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-bold text-rose-950">
              {t('expenseApproval.accessDeniedApprover')}
            </span>
          </div>
          <p className="text-[11.5px] text-rose-800 leading-relaxed">
            {restrictionReason || t('expenseApproval.accessDeniedDesc')}
          </p>
        </div>
      ) : !canApproveCurrentStep && !isFullyApproved ? (
        <div className="p-4 bg-amber-50/90 border border-amber-200/80 rounded-xl space-y-1.5 text-[12px] text-amber-900">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-bold text-amber-950">
              {t('expenseApproval.notYourTurn')}
            </span>
          </div>
          <p className="text-[11.5px] text-amber-800 leading-relaxed">
            {t('expenseApproval.notYourTurnDesc', {
              name: matchedApproverName,
              step: currentActiveStepNumber,
              approver: currentRequiredApprover,
              role: currentRequiredRole
            })}
          </p>
        </div>
      ) : canApproveCurrentStep ? (
        <div className="p-3.5 bg-emerald-50/90 border border-emerald-200/80 rounded-xl flex items-center justify-between text-[12px] text-emerald-950">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-emerald-900">
                {t('expenseApproval.yourTurn', { name: matchedApproverName })}
              </p>
              <p className="text-[11px] text-emerald-700">
                {t('expenseApproval.yourTurnDesc', { step: currentActiveStepNumber, role: currentRequiredRole })}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-emerald-600 text-white px-2.5 py-1 rounded-md shadow-xs">
            {t('expenseApproval.authorized')}
          </span>
        </div>
      ) : null}

      {/* Comments / Feedback */}
      <div className="space-y-2 pt-1">
        <label className="text-[12.5px] font-bold text-slate-800">
          {t('common.notes') || 'Approval Comments / Feedback'}
        </label>
        <textarea
          rows={3}
          value={comment}
          disabled={claim.status === 'Transferred' || (!canApproveCurrentStep && !isFullyApproved)}
          onChange={(e) => setComment(e.target.value)}
          placeholder={
            claim.status === 'Transferred'
              ? t('expenseApproval.claimClosedNotes')
              : canApproveCurrentStep
                ? t('expenseApproval.approvalNotesPlaceholder')
                : t('expenseApproval.noApprovalNotesPermitted')
          }
          className="w-full px-3.5 py-2.5 bg-white disabled:bg-slate-50 disabled:text-slate-400 border border-slate-200 rounded-xl text-[12.5px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
        />
      </div>

      {/* Action Buttons: Gated strictly by state */}
      <div className="pt-2">
        {claim.status === 'Transferred' ? (
          <div className="space-y-3">
            <div className="w-full p-4 bg-emerald-50/90 border border-emerald-200 rounded-xl flex items-center justify-between text-[13px] text-emerald-950">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Check className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <p className="font-bold text-emerald-950">
                    {t('expenseApproval.disbursedCompleteTitle')}
                  </p>
                  <p className="text-[11.5px] text-emerald-700">
                    {t('expenseApproval.disbursedCompleteDesc', {
                      name: claim.employeeName,
                      bank: claim.bankName,
                      account: claim.bankAccountNumber
                    })}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-2.5 py-1 rounded-md shadow-xs whitespace-nowrap">
                {t('expenseApproval.fullSettled')}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onDirectNavigate?.(`/pre-execution-payment/${claim.claimId}`)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center space-x-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{t('expenseApproval.viewTransferProofAndAudit')}</span>
            </button>
          </div>
        ) : isFullyApproved || claim.status === 'Approved' ? (
          matchedApproverName === 'Mr. Emad Moustafa' ? (
            <button
              onClick={onTransfer}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13.5px] rounded-xl transition-all shadow-sm cursor-pointer active:scale-[0.99] flex items-center justify-center space-x-2"
            >
              <span>{t('expenseApproval.transferAmount') || 'Initiate Bank Reimbursement'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-full py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[13px] rounded-xl flex items-center justify-center space-x-2 cursor-default">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{t('expenseApproval.fullyApprovedWaitingDisbursement')}</span>
            </div>
          )
        ) : !canApproveCurrentStep ? (
          <div className="w-full py-3 bg-slate-100 border border-slate-200 text-slate-400 font-bold text-[12.5px] rounded-xl flex items-center justify-center space-x-2 cursor-not-allowed">
            <Lock className="w-4 h-4 text-slate-400" />
            <span>
              {!isAuthorizedApprover
                ? t('expenseApproval.approvalDisabledNoAuth')
                : t('expenseApproval.approvalDisabledWaiting', {
                    step: currentActiveStepNumber,
                    approver: currentRequiredApprover
                  })}
            </span>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <button
              onClick={onReject}
              className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-[12.5px] rounded-xl transition-all cursor-pointer"
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
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[12.5px] rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{t('expenseApproval.approveStage', { step: currentActiveStepNumber, name: matchedApproverName })}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};



