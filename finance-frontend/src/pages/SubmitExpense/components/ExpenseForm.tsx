import React from 'react';
import { useTranslation } from 'react-i18next';
import { EXPENSE_CATEGORIES } from '../constants';
import type { UploadedReceiptItem } from '../types';
import { ReceiptDropzone } from './ReceiptDropzone';

interface ExpenseFormProps {
  expenseCategory: string;
  setExpenseCategory: (cat: string) => void;
  projectRef: string;
  setProjectRef: (ref: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  currency: string;
  setCurrency: (curr: string) => void;
  amount: string;
  setAmount: (amt: string) => void;
  expenseDate: string;
  setExpenseDate: (date: string) => void;
  bankName: string;
  setBankName: (name: string) => void;
  bankAccountNumber: string;
  setBankAccountNumber: (acc: string) => void;
  receiptFiles: UploadedReceiptItem[];
  isDragging: boolean;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (id: string, e: React.MouseEvent) => void;
  isSubmitting: boolean;
  errorMessage: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  expenseCategory,
  setExpenseCategory,
  projectRef,
  setProjectRef,
  description,
  setDescription,
  currency,
  setCurrency,
  amount,
  setAmount,
  expenseDate,
  setExpenseDate,
  bankName,
  setBankName,
  bankAccountNumber,
  setBankAccountNumber,
  receiptFiles,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInputChange,
  onRemoveFile,
  isSubmitting,
  errorMessage,
  onSubmit,
  onCancel
}) => {
  const { t } = useTranslation();

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-7 space-y-6">
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-[12.5px] text-rose-700 font-medium">
          {errorMessage}
        </div>
      )}

      {/* Row 1: Category & Project Reference */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label className="text-[12.5px] font-bold text-slate-800">
            {t('submitExpense.category') || 'Expense Category'} <span className="text-rose-500">*</span>
          </label>
          <select
            value={expenseCategory}
            onChange={(e) => setExpenseCategory(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-[13px] font-medium text-slate-800 focus:outline-none focus:border-blue-500 transition-all"
            required
          >
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[12.5px] font-bold text-slate-800">
            {t('expenses.claimId') || 'Project / Mission Reference ID'}
          </label>
          <input
            type="text"
            placeholder="e.g. PRJ-RYD-2026 or MSH-2024"
            value={projectRef}
            onChange={(e) => setProjectRef(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-[13px] font-medium text-slate-800 focus:outline-none focus:border-blue-500 transition-all placeholder-slate-400"
          />
        </div>
      </div>

      {/* Row 2: Amount, Currency & Expense Date */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="space-y-1.5 md:col-span-1">
          <label className="text-[12.5px] font-bold text-slate-800">
            {t('submitExpense.currency') || 'Currency'} <span className="text-rose-500">*</span>
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-[13px] font-medium text-slate-800 focus:outline-none focus:border-blue-500 transition-all"
            required
          >
            <option value="RP">IDR (RP)</option>
            <option value="SAR">SAR (Saudi Riyal)</option>
            <option value="USD">USD ($)</option>
          </select>
        </div>

        <div className="space-y-1.5 md:col-span-1">
          <label className="text-[12.5px] font-bold text-slate-800">
            {t('submitExpense.amount') || 'Claim Amount'} <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            step="any"
            placeholder="500000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-[13px] font-extrabold text-slate-900 focus:outline-none focus:border-blue-500 transition-all placeholder-slate-400"
            required
          />
        </div>

        <div className="space-y-1.5 md:col-span-1">
          <label className="text-[12.5px] font-bold text-slate-800">
            {t('submitExpense.expenseDate') || 'Expense Date'} <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-[13px] font-medium text-slate-800 focus:outline-none focus:border-blue-500 transition-all"
            required
          />
        </div>
      </div>

      {/* Row 3: Reason / Description */}
      <div className="space-y-1.5">
        <label className="text-[12.5px] font-bold text-slate-800">
          {t('submitExpense.purpose') || 'Reason & Description'} <span className="text-rose-500">*</span>
        </label>
        <textarea
          rows={3}
          placeholder="Describe the operational business purpose, location, or project context..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-[13px] font-medium text-slate-800 focus:outline-none focus:border-blue-500 transition-all placeholder-slate-400 resize-none"
          required
        />
      </div>

      {/* Row 4: Bank Destination Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
        <div className="space-y-1.5">
          <label className="text-[12.5px] font-bold text-slate-800">
            {t('submitExpense.bankDestination') || 'Reimbursement Destination Bank'}
          </label>
          <input
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-[13px] font-medium text-slate-800 focus:outline-none focus:border-blue-500 transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[12.5px] font-bold text-slate-800">
            {t('setupBeneficiary.accountNumber') || 'Bank Account Number'}
          </label>
          <input
            type="text"
            value={bankAccountNumber}
            onChange={(e) => setBankAccountNumber(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-[13px] font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Row 5: Multi-File Dropzone */}
      <ReceiptDropzone
        receiptFiles={receiptFiles}
        isDragging={isDragging}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onFileInputChange={onFileInputChange}
        onRemoveFile={onRemoveFile}
      />

      {/* Form Submission Actions */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-xl text-[13px] hover:bg-slate-50 transition-all cursor-pointer"
        >
          {t('common.cancel') || 'Cancel'}
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-xl text-[13px] shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-2"
        >
          <span>{isSubmitting ? (t('submitExpense.submitting') || 'Submitting Claim...') : (t('submitExpense.submitClaim') || 'Submit Reimbursement Request')}</span>
        </button>
      </div>
    </form>
  );
};
