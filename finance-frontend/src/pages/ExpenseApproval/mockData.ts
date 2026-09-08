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
  currency: 'RP',
  dateSubmitted: 'Oct 24, 2026',
  bankName: 'Bank Danamon',
  bankAccountNumber: '00360098129033',
  status: 'In Review',
  workflowSteps: [
    { stepNumber: 1, approver: 'Mr. Hesham Mokhtar', role: 'Finance Director', isApproved: true, date: 'Oct 24, 2026 10:15' },
    { stepNumber: 2, approver: 'Mr. Khalid Idriss', role: 'Branch General Manager', isApproved: true, date: 'Oct 24, 2026 11:30' },
    { stepNumber: 3, approver: 'Mr. Emad Moustafa', role: 'Financial Controller / Treasury', isApproved: false }
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
    paymentMethod: 'PAID VIA BANK DANAMON (00360098129033)',
    footerNote: 'Thank you for dining with us'
  }
};

