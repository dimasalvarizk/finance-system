import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { useAuth } from '../../context/AuthContext';
import type { ExpenseClaim, ExpenseReceipt } from '../MyExpenses/types';
import type { UploadedReceiptItem, SubmitSuccessState } from './types';
import { ExpenseForm } from './components/ExpenseForm';
import { SubmitSuccessModal } from './components/SubmitSuccessModal';
import { submitCorporateExpense } from '../../services/expenseService';

const SubmitExpense: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

  // Form State
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

  // Multi-File Upload State
  const [receiptFiles, setReceiptFiles] = useState<UploadedReceiptItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success Modal & Error
  const [successModalData, setSuccessModalData] = useState<SubmitSuccessState | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const processFiles = (files: File[]) => {
    setErrorMessage('');
    const newItems: UploadedReceiptItem[] = [];

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage(`File "${file.name}" exceeds the maximum limit of 10MB.`);
        continue;
      }

      if (receiptFiles.some((f) => f.name === file.name && f.size === file.size)) {
        continue;
      }

      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const isImg = file.type.startsWith('image/');

      const item: UploadedReceiptItem = {
        id,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        previewUrl: isImg ? URL.createObjectURL(file) : undefined
      };

      newItems.push(item);
    }

    setReceiptFiles((prev) => [...prev, ...newItems]);
  };

  const handleRemoveFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReceiptFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please provide a valid claim amount.');
      return;
    }

    if (!description.trim()) {
      setErrorMessage('Please provide a reason / mission reference for your expense.');
      return;
    }

    setIsSubmitting(true);

    try {
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const claimId = `EXP-2026-${randomSuffix}`;
      const dateFormatted = new Date(expenseDate).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      });

      const processedReceipts: ExpenseReceipt[] = receiptFiles.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
        url: f.previewUrl
      }));

      const newClaim: ExpenseClaim = {
        id: String(Date.now()),
        claimId,
        submitDate: dateFormatted,
        reason: description,
        category: expenseCategory,
        status: 'Pending',
        amount: numAmount,
        currency,
        department: user?.department || 'Operations',
        submittedBy: user?.name || 'Administrator',
        receiptsCount: processedReceipts.length,
        receiptName: processedReceipts[0]?.name || undefined,
        receipts: processedReceipts,
        notes: projectRef ? `Mission Project Code: ${projectRef}` : undefined,
        approvalTimeline: [
          {
            step: 'Claim Submitted',
            approver: user?.name || 'Administrator',
            status: 'completed',
            date: `${dateFormatted} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          },
          { step: 'Direct Manager Review', approver: 'Mr. Khalid Al-Otaibi', status: 'in_progress' },
          { step: 'Finance Director Review', approver: 'Mr. Hesham Mokhtar', status: 'pending' },
          { step: 'Disbursement & Payment', approver: 'Finance Treasury', status: 'pending' }
        ]
      };

      // Call backend API
      try {
        await submitCorporateExpense({
          claimId,
          projectRef: projectRef || undefined,
          category: expenseCategory,
          currency,
          amount: numAmount,
          expenseDate,
          description: description.trim(),
          bankName,
          bankAccountNumber,
          bankAccountHolder: user?.name || 'Administrator',
          receipts: processedReceipts,
          submittedByName: user?.name || 'Administrator',
          submittedByEmail: user?.email || undefined,
          department: user?.department || 'Operations',
          notes: projectRef ? `Mission Project Code: ${projectRef}` : undefined
        });
      } catch (backendErr) {
        console.warn('Backend expense-service not available, cached locally:', backendErr);
      }

      // Keep offline/local storage synchronized
      try {
        const existing = localStorage.getItem('finance_my_expenses_v2') || localStorage.getItem('finance_my_expenses');
        const parsed: ExpenseClaim[] = existing ? JSON.parse(existing) : [];
        const updated = [newClaim, ...parsed];
        localStorage.setItem('finance_my_expenses_v2', JSON.stringify(updated));
        localStorage.setItem('finance_my_expenses', JSON.stringify(updated));
      } catch (storageErr) {
        console.error('Error saving claim locally:', storageErr);
      }

      setSuccessModalData({ isOpen: true, claimId });

      // Reset form fields
      setDescription('');
      setAmount('500000');
      setReceiptFiles([]);
    } catch (err: any) {
      console.error('Error submitting claim:', err);
      setErrorMessage(err?.response?.data?.message || err?.message || 'Gagal mengirim pengajuan pengeluaran.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#f8fafc] select-none font-inter">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <div className="flex-1 p-8 space-y-7 max-w-[1400px] w-full mx-auto">
          {/* Header Banner */}
          <div className="space-y-1">
            <h1 className="text-[26px] font-bold text-[#0c0d0f] tracking-tight">
              {t('submitExpense.title') || 'Submit Corporate Expense'}
            </h1>
            <p className="text-[13px] text-[#64748b] font-medium">
              {t('submitExpense.subtitle') || 'Upload valid receipts, invoices, and vouchers for departmental review and finance audit.'}
            </p>
          </div>

          {/* Modular Expense Form */}
          <ExpenseForm
            expenseCategory={expenseCategory}
            setExpenseCategory={setExpenseCategory}
            projectRef={projectRef}
            setProjectRef={setProjectRef}
            description={description}
            setDescription={setDescription}
            currency={currency}
            setCurrency={setCurrency}
            amount={amount}
            setAmount={setAmount}
            expenseDate={expenseDate}
            setExpenseDate={setExpenseDate}
            bankName={bankName}
            setBankName={setBankName}
            bankAccountNumber={bankAccountNumber}
            setBankAccountNumber={setBankAccountNumber}
            receiptFiles={receiptFiles}
            isDragging={isDragging}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            onFileInputChange={handleFileInputChange}
            onRemoveFile={handleRemoveFile}
            isSubmitting={isSubmitting}
            errorMessage={errorMessage}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/my-expenses')}
          />
        </div>
      </main>

      {/* Success Modal */}
      <SubmitSuccessModal
        data={successModalData}
        onClose={() => setSuccessModalData(null)}
      />
    </div>
  );
};

export default SubmitExpense;
