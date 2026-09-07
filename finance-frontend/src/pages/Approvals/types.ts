export interface ApprovedExpenseItem {
  id: string;
  claimId: string;
  employee: string;
  employeeId: string;
  department: string;
  reason: string;
  category: string;
  approvedDate: string;
  approvalChain: string;
  amount: number;
  currency: string;
  bankName: string;
  bankAccountNumber: string;
  status: 'Ready for Payment' | 'Queued for Payroll' | 'Disbursed';
  receiptsCount: number;
  receiptName?: string;
  notes?: string;
}

export interface ActionSuccessPayload {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'payroll' | 'bank';
}
