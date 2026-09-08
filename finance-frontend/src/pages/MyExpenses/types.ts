export interface ExpenseReceipt {
  name: string;
  size?: number;
  type?: string;
  url?: string;
}

export interface ExpenseTimelineStep {
  step: string;
  approver: string;
  status: 'completed' | 'in_progress' | 'pending' | 'rejected';
  date?: string;
  comment?: string;
}

export interface ExpenseClaim {
  id: string;
  claimId: string;
  submitDate: string;
  reason: string;
  category: string;
  status: 'Pending' | 'Mr.Khalid Review' | 'Mr. Hesham Review' | 'Approved' | 'Paid' | 'Disbursed' | 'Transferred' | 'Rejected' | 'Ready for Payment';
  amount: number;
  currency: string;
  department: string;
  submittedBy: string;
  receiptsCount: number;
  receiptName?: string;
  receipts?: ExpenseReceipt[];
  notes?: string;
  approvalTimeline: ExpenseTimelineStep[];
}
