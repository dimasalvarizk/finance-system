import type { ExpenseClaim } from './types';

export const INITIAL_EXPENSES: ExpenseClaim[] = [
  {
    id: '1',
    claimId: 'EXP-2024-890',
    submitDate: 'Oct 05, 2026',
    reason: 'Whatsapp Summit Fuel & Transport Expenses',
    category: 'Transportation & Fuel',
    status: 'Pending',
    amount: 500000,
    currency: 'RP',
    department: 'Operations',
    submittedBy: 'Emad Moustafa',
    receiptsCount: 2,
    receiptName: 'Fuel_Receipt_Oct05.pdf',
    notes: 'Operational transport logistics for attending WhatsApp Meta Summit event in Riyadh.',
    approvalTimeline: [
      { step: 'Claim Submitted', approver: 'Emad Moustafa', status: 'completed', date: 'Oct 05, 2026 09:15' },
      { step: 'Direct Manager Review', approver: 'Mr. Khalid Al-Otaibi', status: 'in_progress' },
      { step: 'Finance Director Review', approver: 'Mr. Hesham Mokhtar', status: 'pending' },
      { step: 'Disbursement & Payment', approver: 'Finance Treasury', status: 'pending' }
    ]
  },
  {
    id: '2',
    claimId: 'EXP-2024-889',
    submitDate: 'Oct 05, 2026',
    reason: 'Mission Meals for Site Engineering Team',
    category: 'Meals & Per Diem',
    status: 'Mr.Khalid Review',
    amount: 500000,
    currency: 'RP',
    department: 'Engineering',
    submittedBy: 'Emad Moustafa',
    receiptsCount: 1,
    receiptName: 'Catering_Invoice_Makkah.pdf',
    notes: 'Dinner and lunch per diem allowances for weekend site inspections.',
    approvalTimeline: [
      { step: 'Claim Submitted', approver: 'Emad Moustafa', status: 'completed', date: 'Oct 05, 2026 08:30' },
      { step: 'Direct Manager Review', approver: 'Mr. Khalid Al-Otaibi', status: 'in_progress' },
      { step: 'Finance Director Review', approver: 'Mr. Hesham Mokhtar', status: 'pending' },
      { step: 'Disbursement & Payment', approver: 'Finance Treasury', status: 'pending' }
    ]
  },
  {
    id: '3',
    claimId: 'EXP-2024-885',
    submitDate: 'Oct 05, 2026',
    reason: 'Client Dinner & Catering Accommodation',
    category: 'Client Entertainment',
    status: 'Mr. Hesham Review',
    amount: 500000,
    currency: 'RP',
    department: 'Business Development',
    submittedBy: 'Emad Moustafa',
    receiptsCount: 3,
    receiptName: 'Restaurant_Tax_Invoice.pdf',
    notes: 'Dinner hosting delegation from Indonesian Umrah partner agencies.',
    approvalTimeline: [
      { step: 'Claim Submitted', approver: 'Emad Moustafa', status: 'completed', date: 'Oct 04, 2026 18:20' },
      { step: 'Direct Manager Review', approver: 'Mr. Khalid Al-Otaibi', status: 'completed', date: 'Oct 05, 2026 10:00' },
      { step: 'Finance Director Review', approver: 'Mr. Hesham Mokhtar', status: 'in_progress' },
      { step: 'Disbursement & Payment', approver: 'Finance Treasury', status: 'pending' }
    ]
  },
  {
    id: '4',
    claimId: 'EXP-2024-878',
    submitDate: 'Oct 05, 2026',
    reason: 'Inter-office Logistics & Courier Service',
    category: 'Office Supplies & Logistics',
    status: 'Paid',
    amount: 500000,
    currency: 'RP',
    department: 'Administration',
    submittedBy: 'Emad Moustafa',
    receiptsCount: 1,
    receiptName: 'DHL_AirwayBill_Oct03.pdf',
    notes: 'Urgent contract document courier delivery from Jakarta to Jeddah office.',
    approvalTimeline: [
      { step: 'Claim Submitted', approver: 'Emad Moustafa', status: 'completed', date: 'Oct 03, 2026 11:00' },
      { step: 'Direct Manager Review', approver: 'Mr. Khalid Al-Otaibi', status: 'completed', date: 'Oct 03, 2026 14:15' },
      { step: 'Finance Director Review', approver: 'Mr. Hesham Mokhtar', status: 'completed', date: 'Oct 04, 2026 09:30' },
      { step: 'Disbursement & Payment', approver: 'Finance Treasury', status: 'completed', date: 'Oct 05, 2026 11:45' }
    ]
  },
  {
    id: '5',
    claimId: 'EXP-2024-870',
    submitDate: 'Oct 05, 2026',
    reason: 'Overtime Office Supplies & Printing',
    category: 'Stationery & Printing',
    status: 'Rejected',
    amount: 500000,
    currency: 'RP',
    department: 'Administration',
    submittedBy: 'Emad Moustafa',
    receiptsCount: 1,
    receiptName: 'Paper_Supply_Store.pdf',
    notes: 'Special high-grade paper reams for official contract stamp printing.',
    approvalTimeline: [
      { step: 'Claim Submitted', approver: 'Emad Moustafa', status: 'completed', date: 'Oct 02, 2026 16:00' },
      { step: 'Direct Manager Review', approver: 'Mr. Khalid Al-Otaibi', status: 'rejected', date: 'Oct 03, 2026 09:10', comment: 'Please attach detailed unit breakdown and purchase order approval first.' }
    ]
  },
  {
    id: '6',
    claimId: 'EXP-2024-862',
    submitDate: 'Oct 02, 2026',
    reason: 'Hotel Inspection Travel Tolls & Parking',
    category: 'Transportation & Fuel',
    status: 'Approved',
    amount: 350000,
    currency: 'RP',
    department: 'Operations',
    submittedBy: 'Emad Moustafa',
    receiptsCount: 2,
    receiptName: 'Toll_Tickets.pdf',
    notes: 'Highway toll gate receipts for visiting Manazil branch hotels in Madinah.',
    approvalTimeline: [
      { step: 'Claim Submitted', approver: 'Emad Moustafa', status: 'completed', date: 'Oct 02, 2026 14:00' },
      { step: 'Direct Manager Review', approver: 'Mr. Khalid Al-Otaibi', status: 'completed', date: 'Oct 02, 2026 17:00' },
      { step: 'Finance Director Review', approver: 'Mr. Hesham Mokhtar', status: 'completed', date: 'Oct 03, 2026 10:00' },
      { step: 'Disbursement & Payment', approver: 'Finance Treasury', status: 'in_progress' }
    ]
  },
  {
    id: '7',
    claimId: 'EXP-2024-855',
    submitDate: 'Sep 29, 2026',
    reason: 'Annual Cloud Backup Subscription Extension',
    category: 'IT & Software',
    status: 'Paid',
    amount: 1200000,
    currency: 'RP',
    department: 'IT',
    submittedBy: 'Emad Moustafa',
    receiptsCount: 1,
    receiptName: 'Cloud_Hosting_Invoice.pdf',
    notes: 'Monthly enterprise server backup and data archiving tier renewal.',
    approvalTimeline: [
      { step: 'Claim Submitted', approver: 'Emad Moustafa', status: 'completed', date: 'Sep 29, 2026 10:00' },
      { step: 'Direct Manager Review', approver: 'Mr. Khalid Al-Otaibi', status: 'completed', date: 'Sep 29, 2026 12:00' },
      { step: 'Finance Director Review', approver: 'Mr. Hesham Mokhtar', status: 'completed', date: 'Sep 30, 2026 09:00' },
      { step: 'Disbursement & Payment', approver: 'Finance Treasury', status: 'completed', date: 'Sep 30, 2026 15:00' }
    ]
  },
  {
    id: '8',
    claimId: 'EXP-2024-850',
    submitDate: 'Sep 25, 2026',
    reason: 'Madinah Branch Hardware & Maintenance Supplies',
    category: 'Office Supplies & Logistics',
    status: 'Approved',
    amount: 450000,
    currency: 'RP',
    department: 'Operations',
    submittedBy: 'Emad Moustafa',
    receiptsCount: 2,
    receiptName: 'Hardware_Store_Receipt.pdf',
    notes: 'Branch office network cabling and router replacement.',
    approvalTimeline: [
      { step: 'Claim Submitted', approver: 'Emad Moustafa', status: 'completed', date: 'Sep 25, 2026 11:00' },
      { step: 'Direct Manager Review', approver: 'Mr. Khalid Al-Otaibi', status: 'completed', date: 'Sep 25, 2026 14:00' },
      { step: 'Finance Director Review', approver: 'Mr. Hesham Mokhtar', status: 'completed', date: 'Sep 26, 2026 09:30' },
      { step: 'Disbursement & Payment', approver: 'Finance Treasury', status: 'in_progress' }
    ]
  },
  {
    id: '9',
    claimId: 'EXP-2024-845',
    submitDate: 'Sep 20, 2026',
    reason: 'VIP Pilgrim Group Catering Allowance',
    category: 'Meals & Per Diem',
    status: 'Approved',
    amount: 650000,
    currency: 'RP',
    department: 'Operations',
    submittedBy: 'Emad Moustafa',
    receiptsCount: 1,
    receiptName: 'Pilgrim_Catering_Invoice.pdf',
    notes: 'Refreshments and dinner for Indonesian Umrah group coordinators.',
    approvalTimeline: [
      { step: 'Claim Submitted', approver: 'Emad Moustafa', status: 'completed', date: 'Sep 20, 2026 15:00' },
      { step: 'Direct Manager Review', approver: 'Mr. Khalid Al-Otaibi', status: 'completed', date: 'Sep 20, 2026 18:00' },
      { step: 'Finance Director Review', approver: 'Mr. Hesham Mokhtar', status: 'completed', date: 'Sep 21, 2026 10:00' },
      { step: 'Disbursement & Payment', approver: 'Finance Treasury', status: 'in_progress' }
    ]
  },
  {
    id: '10',
    claimId: 'EXP-2024-840',
    submitDate: 'Sep 18, 2026',
    reason: 'Fleet Vehicle Regular Service & Inspection',
    category: 'Transportation & Fuel',
    status: 'Paid',
    amount: 800000,
    currency: 'RP',
    department: 'Operations',
    submittedBy: 'Emad Moustafa',
    receiptsCount: 1,
    receiptName: 'Auto_Service_Makkah.pdf',
    notes: 'Periodic maintenance and engine oil replacement for company operational van.',
    approvalTimeline: [
      { step: 'Claim Submitted', approver: 'Emad Moustafa', status: 'completed', date: 'Sep 18, 2026 09:00' },
      { step: 'Direct Manager Review', approver: 'Mr. Khalid Al-Otaibi', status: 'completed', date: 'Sep 18, 2026 13:00' },
      { step: 'Finance Director Review', approver: 'Mr. Hesham Mokhtar', status: 'completed', date: 'Sep 19, 2026 11:00' },
      { step: 'Disbursement & Payment', approver: 'Finance Treasury', status: 'completed', date: 'Sep 19, 2026 16:30' }
    ]
  },
  {
    id: '11',
    claimId: 'EXP-2024-835',
    submitDate: 'Sep 15, 2026',
    reason: 'Emergency Medical Kit Supplies for Hotels',
    category: 'Office Supplies & Logistics',
    status: 'Approved',
    amount: 200000,
    currency: 'RP',
    department: 'Operations',
    submittedBy: 'Emad Moustafa',
    receiptsCount: 1,
    receiptName: 'Pharmacy_Tax_Invoice.pdf',
    notes: 'First aid kits replenishment for hotel front-desks.',
    approvalTimeline: [
      { step: 'Claim Submitted', approver: 'Emad Moustafa', status: 'completed', date: 'Sep 15, 2026 14:00' },
      { step: 'Direct Manager Review', approver: 'Mr. Khalid Al-Otaibi', status: 'completed', date: 'Sep 15, 2026 16:30' },
      { step: 'Finance Director Review', approver: 'Mr. Hesham Mokhtar', status: 'completed', date: 'Sep 16, 2026 10:00' },
      { step: 'Disbursement & Payment', approver: 'Finance Treasury', status: 'in_progress' }
    ]
  },
  {
    id: '12',
    claimId: 'EXP-2024-830',
    submitDate: 'Sep 10, 2026',
    reason: 'Marketing Exhibition Rollup Banners',
    category: 'Stationery & Printing',
    status: 'Approved',
    amount: 400000,
    currency: 'RP',
    department: 'Operations',
    submittedBy: 'Emad Moustafa',
    receiptsCount: 2,
    receiptName: 'Banner_Print_Receipt.pdf',
    notes: 'Rollup promotional banners printed for international travel expo.',
    approvalTimeline: [
      { step: 'Claim Submitted', approver: 'Emad Moustafa', status: 'completed', date: 'Sep 10, 2026 10:00' },
      { step: 'Direct Manager Review', approver: 'Mr. Khalid Al-Otaibi', status: 'completed', date: 'Sep 10, 2026 14:00' },
      { step: 'Finance Director Review', approver: 'Mr. Hesham Mokhtar', status: 'completed', date: 'Sep 11, 2026 09:00' },
      { step: 'Disbursement & Payment', approver: 'Finance Treasury', status: 'in_progress' }
    ]
  },
  {
    id: '13',
    claimId: 'EXP-2024-825',
    submitDate: 'Sep 05, 2026',
    reason: 'Client Meeting Venue Reservation Fee',
    category: 'Client Entertainment',
    status: 'Approved',
    amount: 900000,
    currency: 'RP',
    department: 'Operations',
    submittedBy: 'Emad Moustafa',
    receiptsCount: 1,
    receiptName: 'Meeting_Hall_Invoice.pdf',
    notes: 'Meeting room booking for agency executive coordination.',
    approvalTimeline: [
      { step: 'Claim Submitted', approver: 'Emad Moustafa', status: 'completed', date: 'Sep 05, 2026 09:30' },
      { step: 'Direct Manager Review', approver: 'Mr. Khalid Al-Otaibi', status: 'completed', date: 'Sep 05, 2026 11:45' },
      { step: 'Finance Director Review', approver: 'Mr. Hesham Mokhtar', status: 'completed', date: 'Sep 06, 2026 10:00' },
      { step: 'Disbursement & Payment', approver: 'Finance Treasury', status: 'in_progress' }
    ]
  },
  {
    id: '14',
    claimId: 'EXP-2024-820',
    submitDate: 'Aug 28, 2026',
    reason: 'Branch Stationery & Office Document Laminating',
    category: 'Stationery & Printing',
    status: 'Rejected',
    amount: 150000,
    currency: 'RP',
    department: 'Operations',
    submittedBy: 'Emad Moustafa',
    receiptsCount: 1,
    receiptName: 'Stationery_Receipt.pdf',
    notes: 'Lamination pouches and document binders.',
    approvalTimeline: [
      { step: 'Claim Submitted', approver: 'Emad Moustafa', status: 'completed', date: 'Aug 28, 2026 14:00' },
      { step: 'Direct Manager Review', approver: 'Mr. Khalid Al-Otaibi', status: 'rejected', date: 'Aug 29, 2026 10:00', comment: 'Please purchase via bulk office stationery procurement schedule.' }
    ]
  }
];
