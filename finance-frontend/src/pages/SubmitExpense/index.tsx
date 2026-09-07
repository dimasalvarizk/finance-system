import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import {
  UploadCloud,
  CheckCircle2,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { ExpenseClaim } from '../MyExpenses';

const EXPENSE_CATEGORIES = [
  'Mission Meals',
  'Transportation & Fuel',
  'Client Dinner & Catering Accommodation',
  'Client Entertainment',
  'Inter-office Logistics & Courier',
  'Office Supplies & Stationery',
  'Hotel & Lodging Inspection',
  'IT & Cloud Infrastructure',
  'Emergency Medical & Operational Allowance',
  'Others'
];

const SubmitExpense: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Form State matching screenshot
  const [expenseCategory, setExpenseCategory] = useState('Mission Meals');
  const [projectRef, setProjectRef] = useState('PRJ-JKT-2026');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('RP');
  const [amount, setAmount] = useState('500000');
  const [expenseDate, setExpenseDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [bankName, setBankName] = useState('Bank Danamon');
  const [bankAccountNumber, setBankAccountNumber] = useState('0000000000000000');

  // File Upload State
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success Modal
  const [successModalData, setSuccessModalData] = useState<{ isOpen: boolean; claimId: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('File size exceeds maximum limit of 10MB.');
      return;
    }
    setErrorMessage('');
    setReceiptFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setReceiptPreviewUrl(null);
    }
  };

  const removeFile = () => {
    setReceiptFile(null);
    setReceiptPreviewUrl(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const numAmount = parseFloat(amount.replace(/[^0-9.-]/g, ''));
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid expense amount.');
      return;
    }

    if (!expenseCategory || !projectRef) {
      setErrorMessage('Please fill in the category and mission reference.');
      return;
    }

    setIsSubmitting(true);

    try {
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const claimId = `EXP-2024-${randomSuffix}`;
      const dateObj = new Date(expenseDate);
      const submitDateFormatted = dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      });

      const newClaim: ExpenseClaim = {
        id: String(Date.now()),
        claimId,
        submitDate: submitDateFormatted,
        reason: `${expenseCategory} - ${projectRef}`,
        category: expenseCategory,
        status: 'Pending',
        amount: numAmount,
        currency,
        department: 'Operations',
        submittedBy: user?.name || 'Emad Moustafa',
        receiptsCount: receiptFile ? 1 : 0,
        receiptName: receiptFile ? receiptFile.name : undefined,
        notes: description || undefined,
        approvalTimeline: [
          {
            step: 'Claim Submitted',
            approver: user?.name || 'Emad Moustafa',
            status: 'completed',
            date: `${submitDateFormatted} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          },
          { step: 'Direct Manager Review', approver: 'Mr. Khalid Al-Otaibi', status: 'in_progress' },
          { step: 'Finance Director Review', approver: 'Mr. Hesham Mokhtar', status: 'pending' },
          { step: 'Disbursement & Payment', approver: 'Finance Treasury', status: 'pending' }
        ]
      };

      // Read existing expenses and save
      const existingStr = localStorage.getItem('finance_my_expenses');
      let existingList: ExpenseClaim[] = [];
      if (existingStr) {
        try {
          existingList = JSON.parse(existingStr);
        } catch (err) {
          existingList = [];
        }
      }

      const updated = [newClaim, ...existingList];
      localStorage.setItem('finance_my_expenses', JSON.stringify(updated));

      setIsSubmitting(false);
      setSuccessModalData({ isOpen: true, claimId });
    } catch (err) {
      console.error('Error saving claim:', err);
      setIsSubmitting(false);
      setErrorMessage('Failed to submit expense request. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#f8fafc] select-none font-inter">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <div className="flex-1 p-8 space-y-6 max-w-[1400px] w-full mx-auto">
          {/* Top Header & Breadcrumb */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-[26px] font-bold text-[#0c0d0f] tracking-tight">
                Submit New Expense Request
              </h1>
              <p className="text-[13px] text-[#64748b] font-medium">
                Fill in your claim parameters and upload corresponding receipt images for audit
              </p>
            </div>

            {/* Breadcrumb path */}
            <div className="flex items-center space-x-2 text-[12.5px] font-medium">
              <span className="text-slate-400">Expenses & Reimbursements</span>
              <span className="text-slate-300">/</span>
              <span className="text-blue-600 font-semibold">Submit Expense</span>
            </div>
          </div>

          {/* Form Card */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-8 space-y-7">
              <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">
                Claim Details
              </h2>

              {errorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-[12.5px] text-rose-700 font-medium flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Grid 1: Expense Category & Mission / Project Reference */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5">
                    Expense Category
                  </label>
                  <div className="relative">
                    <select
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] text-slate-800 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
                    >
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5">
                    Mission / Project Reference
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PRJ-JKT-2026"
                    value={projectRef}
                    onChange={(e) => setProjectRef(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] text-slate-800 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Description Field */}
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Write the description.."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] text-slate-800 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400 resize-y"
                />
              </div>

              {/* Grid 2: Amount & Currency + Date of Expense */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5">
                    Amount & Currency
                  </label>
                  <div className="flex rounded-xl border border-slate-200 overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="px-3.5 py-2.5 bg-slate-50 border-r border-slate-200 text-[13px] font-bold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="RP">RP</option>
                      <option value="SAR">SAR</option>
                      <option value="USD">USD</option>
                    </select>
                    <input
                      type="text"
                      required
                      placeholder="500.000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-white text-[13px] text-slate-800 font-bold focus:outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5">
                    Date of Expense
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] text-slate-800 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Grid 3: Bank Name & Bank Account Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5">
                    Bank name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bank Danamon"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] text-slate-800 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0000000000000000"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] text-slate-800 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Upload Dropzone: Supporting Receipt / Invoice */}
              <div className="space-y-2 pt-2">
                <label className="block text-[12px] font-bold text-slate-700">
                  Supporting Receipt / Invoice
                </label>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center transition-all ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/40'
                      : 'border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  {receiptFile ? (
                    <div className="flex flex-col items-center space-y-3">
                      {receiptPreviewUrl ? (
                        <img
                          src={receiptPreviewUrl}
                          alt="Receipt Preview"
                          className="max-h-36 rounded-lg object-contain shadow-xs border border-slate-200"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <FileText className="w-7 h-7" />
                        </div>
                      )}

                      <div className="text-center">
                        <p className="text-[13px] font-bold text-slate-800 truncate max-w-xs">
                          {receiptFile.name}
                        </p>
                        <p className="text-[11.5px] text-slate-400 font-medium">
                          {(receiptFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={removeFile}
                        className="px-3 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-[11.5px] font-bold transition-all cursor-pointer"
                      >
                        Remove File
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center space-y-3.5 w-full">
                      <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                        <UploadCloud className="w-7 h-7" />
                      </div>

                      <div className="space-y-1">
                        <p className="text-[13.5px] font-bold text-slate-800">
                          Drag & drop receipt here or click to upload
                        </p>
                        <p className="text-[11.5px] text-slate-400 font-medium">
                          Supports PDF, JPG, PNG — Max 10MB
                        </p>
                      </div>

                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={handleFileInputChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Footer Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/my-expenses')}
                className="px-6 py-2.5 border border-slate-200 hover:bg-slate-100/80 bg-white text-slate-700 font-semibold text-[13px] rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-[13px] rounded-xl shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Success Modal */}
      {successModalData?.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0c0d0f]/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-scale-up font-sans">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900">
                Claim Submitted Successfully!
              </h3>
              <p className="text-[12.5px] text-slate-500 leading-relaxed">
                Your expense request <span className="font-bold text-slate-800">{successModalData.claimId}</span> has been created and sent to <span className="font-semibold text-slate-700">Mr. Khalid Al-Otaibi</span> for review.
              </p>
            </div>

            <div className="flex flex-col space-y-2 pt-2">
              <button
                onClick={() => navigate('/my-expenses')}
                className="w-full py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-[13px] rounded-xl shadow-sm transition-all cursor-pointer"
              >
                View in My Expenses
              </button>
              <button
                onClick={() => {
                  setSuccessModalData(null);
                  setDescription('');
                  setReceiptFile(null);
                  setReceiptPreviewUrl(null);
                }}
                className="w-full py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-[13px] rounded-xl transition-all cursor-pointer"
              >
                Submit Another Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmitExpense;
