export interface WorkflowStep {
  stepNumber: number;
  approver: string;
  role: string;
  isApproved: boolean;
  date?: string;
}

export interface ReceiptItem {
  name: string;
  amount: number;
}

export interface ReceiptVendor {
  name: string;
  location: string;
  vatId: string;
  items: ReceiptItem[];
  total: number;
  paymentMethod: string;
  footerNote: string;
}

export interface ApprovalClaimDetail {
  id: string;
  claimId: string;
  employeeName: string;
  employeeId: string;
  department: string;
  category: string;
  missionReference: string;
  amount: number;
  currency: string;
  dateSubmitted: string;
  bankName: string;
  bankAccountNumber: string;
  status: 'Pending' | 'In Review' | 'Approved' | 'Transferred' | 'Rejected';
  workflowSteps: WorkflowStep[];
  receiptVendor: ReceiptVendor;
}

export interface ActionNotificationState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'approve' | 'reject' | 'clarify';
}
