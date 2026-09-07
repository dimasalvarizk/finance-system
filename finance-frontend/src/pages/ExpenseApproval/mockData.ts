import type { ApprovalClaimDetail } from './types';

export const DEFAULT_CLAIM_DETAIL: ApprovalClaimDetail = {
  id: 'EXP-2026-890',
  claimId: 'EXP-2026-890',
  employeeName: 'Emad Moustafa',
  employeeId: 'EMP-4001',
  department: 'Finance',
  category: 'Mission Meals',
  missionReference: 'PRJ-RYD-2024',
  amount: 500000,
  currency: 'Rp',
  dateSubmitted: 'Oct 24, 2026',
  bankName: 'Danamon',
  bankAccountNumber: '00000000000000',
  status: 'In Review',
  workflowSteps: [
    { stepNumber: 1, approver: 'Mr.Hesham Mokhtar', role: 'Finance Director', isApproved: true, date: 'Oct 24, 2026 10:15' },
    { stepNumber: 2, approver: 'Mr.Khalid Idriss', role: 'Branch General Manager', isApproved: false },
    { stepNumber: 3, approver: 'Mr.Emad Moustafa', role: 'Internal Auditor / Treasury', isApproved: false }
  ],
  receiptVendor: {
    name: 'GRAND REEF CATERING',
    location: 'Jakarta Pusat , Kemayoran',
    vatId: 'VAT ID: 300459812200003',
    items: [
      { name: 'Executive Business Lunch x3', amount: 200000 },
      { name: 'Beverages & Appetizers', amount: 100000 },
      { name: 'VAT 15%', amount: 100000 },
      { name: 'Service Charge', amount: 100000 }
    ],
    total: 500000,
    paymentMethod: 'PAID VIA CREDIT CARD (xxxx-4231)',
    footerNote: 'Thank you for dining with us'
  }
};
