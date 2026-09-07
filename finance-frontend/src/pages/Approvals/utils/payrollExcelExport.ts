import * as XLSX from 'xlsx';
import type { ApprovedExpenseItem } from '../types';

/**
 * Generates and downloads a standardized Excel (.xlsx) file for payroll bank disbursement.
 * Header columns are strictly formatted as requested:
 * Column 1: USER NAME
 * Column 2: BANK NAME
 * Column 3: ACCOUNT NUMBER
 */
export const exportPayrollToExcel = (selectedItems: ApprovedExpenseItem[], batchName?: string): void => {
  if (!selectedItems || selectedItems.length === 0) return;

  // Build row data with exact 3 columns
  const rows = selectedItems.map((item) => ({
    'USER NAME': item.employee || '-',
    'BANK NAME': item.bankName || '-',
    'ACCOUNT NUMBER': item.bankAccountNumber ? String(item.bankAccountNumber) : '-'
  }));

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: ['USER NAME', 'BANK NAME', 'ACCOUNT NUMBER']
  });

  // Adjust column widths for optimal reading
  worksheet['!cols'] = [
    { wch: 30 }, // USER NAME
    { wch: 30 }, // BANK NAME
    { wch: 25 }  // ACCOUNT NUMBER
  ];

  // Create workbook and append worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll Batch');

  // Generate clean filename
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const filename = batchName 
    ? `Payroll_Export_${batchName.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`
    : `Payroll_Export_${dateStr}.xlsx`;

  // Trigger browser download
  XLSX.writeFile(workbook, filename);
};
