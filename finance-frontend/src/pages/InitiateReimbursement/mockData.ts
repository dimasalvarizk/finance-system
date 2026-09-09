import type { ReimbursementClaimSummary } from './types';

export const DEFAULT_REIMBURSEMENT_CLAIM: ReimbursementClaimSummary = {
  id: 'EXP-2026-890',
  claimId: 'EXP-2026-890',
  employeeName: 'Emad Moustafa',
  department: 'Finance',
  expenseCategory: 'Mission Meals',
  missionReference: 'PRJ-RYD-2024',
  amount: 500000,
  currency: 'RP',
  bankName: 'Bank Negara Indonesia (BNI)',
  accountHolderName: 'Emad Moustafa',
  accountNumber: '0000000000000000',
  status: 'Approved & Ready'
};
