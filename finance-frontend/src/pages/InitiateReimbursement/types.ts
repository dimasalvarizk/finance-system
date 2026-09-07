export interface ReimbursementClaimSummary {
  id: string;
  claimId: string;
  employeeName: string;
  department: string;
  expenseCategory: string;
  missionReference: string;
  amount: number;
  currency: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  status: 'Approved & Ready' | 'Processing' | 'Disbursed';
}

export interface ReimbursementSuccessState {
  isOpen: boolean;
  transactionRef: string;
  amount: number;
  currency: string;
  employeeName: string;
  bankName: string;
  accountNumber: string;
}
