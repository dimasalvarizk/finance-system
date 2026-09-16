import React, { useState, useEffect } from 'react';
import { X, Plus, Edit3, Trash2, Receipt, Upload, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatPrice, convertPrice } from './invoiceUtils';
import { type Invoice } from './types';
import {
  getInvoicePayments,
  addInvoicePayment,
  updateInvoicePayment,
  deleteInvoicePayment,
} from '../../../services/invoiceService';

interface Props {
  isOpen: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  configuredRates: { usdToIdr: number; sarToIdr: number; usdToSar: number };
  onOpenReceipt: (pay: any, inv: Invoice, pIndex?: number) => void;
  triggerAlert: (title: string, message: string, type?: 'success' | 'info') => void;
  onRefreshInvoices?: () => void;
  userRole?: string;
}

export const PaymentHistoryModal: React.FC<Props> = ({
  isOpen,
  invoice,
  onClose,
  configuredRates,
  onOpenReceipt,
  triggerAlert,
  onRefreshInvoices,
  userRole,
}) => {
  const { t } = useTranslation();

  const [paymentHistoryList, setPaymentHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Add / Edit Payment Sub-Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [formAmount, setFormAmount] = useState('');
  const [formCurrency, setFormCurrency] = useState('SAR');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formNote, setFormNote] = useState('');
  const [formProof, setFormProof] = useState<string | null>(null);
  const [formProofName, setFormProofName] = useState<string | null>(null);
  const [saveOverpaymentCredit, setSaveOverpaymentCredit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // View Proof & Delete Dialog
  const [viewingProof, setViewingProof] = useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  const fetchPayments = async () => {
    if (!invoice) return;
    setLoadingHistory(true);
    try {
      const history = await getInvoicePayments(invoice.invoiceNo);
      setPaymentHistoryList(history || []);
    } catch (err) {
      console.error('Failed to load payment history:', err);
      setPaymentHistoryList([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen && invoice) {
      fetchPayments();
    }
  }, [isOpen, invoice]);

  if (!isOpen || !invoice) return null;

  const rawAmt = parseFloat(String(invoice.amount || '0').replace(/[^0-9.-]/g, '')) || 0;
  const baseCurrency = (invoice.currency || 'USD').toUpperCase();
  const advAmt = parseFloat(String(invoice.advancePayment || 0));

  const rates = {
    usdToIdr: invoice.usdToIdrRate || configuredRates.usdToIdr || 18025,
    sarToIdr: invoice.sarToIdrRate || configuredRates.sarToIdr || 4800,
    usdToSar: (invoice.usdToIdrRate && invoice.sarToIdrRate) ? (invoice.usdToIdrRate / invoice.sarToIdrRate) : (configuredRates.usdToSar || 3.75)
  };

  let totalInstallmentsInBase = 0;
  paymentHistoryList.forEach(item => {
    const payCurr = (item.currency || baseCurrency).toUpperCase();
    const payAmt = parseFloat(item.amount) || 0;
    totalInstallmentsInBase += convertPrice(payAmt, payCurr, baseCurrency, rates);
  });

  const totalPaidInBase = advAmt + totalInstallmentsInBase;
  const remaining = Math.max(0, rawAmt - totalPaidInBase);

  const canManagePayment = userRole !== 'Viewer';
  const invStatusClean = String(invoice.status || '').toLowerCase().trim();
  const canAddPayment =
    invStatusClean === '4/4 approved' ||
    invStatusClean === 'approved' ||
    invStatusClean === '3/3 approved' ||
    invStatusClean.includes('partial') ||
    invStatusClean.includes('deposit') ||
    invStatusClean.includes('paid') ||
    invStatusClean === 'overdue';

  const handleOpenAdd = () => {
    setEditingPaymentId(null);
    setFormAmount('');
    setFormCurrency(baseCurrency);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormNote('');
    setFormProof(null);
    setFormProofName(null);
    setSaveOverpaymentCredit(false);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (pay: any) => {
    setEditingPaymentId(pay.id);
    setFormAmount(String(pay.amount || ''));
    setFormCurrency((pay.currency || baseCurrency).toUpperCase());
    setFormDate(pay.paymentDate ? pay.paymentDate.split('T')[0] : new Date().toISOString().split('T')[0]);
    setFormNote(pay.note || '');
    setFormProof(pay.proofUrl || null);
    setFormProofName(pay.proofUrl ? 'Attached Proof' : null);
    setSaveOverpaymentCredit(false);
    setIsFormModalOpen(true);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(formAmount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    setSubmitting(true);
    try {
      if (editingPaymentId) {
        await updateInvoicePayment(editingPaymentId, {
          amount: numAmount,
          currency: formCurrency,
          paymentDate: formDate,
          note: formNote,
          proofUrl: formProof || undefined
        });
        triggerAlert('Success', 'Payment updated successfully!', 'success');
      } else {
        await addInvoicePayment(invoice.invoiceNo, {
          amount: numAmount,
          currency: formCurrency,
          paymentDate: formDate,
          note: formNote,
          proofUrl: formProof || undefined,
          saveOverpaymentCredit,
          companyCode: invoice.companyCode
        });
        triggerAlert('Success', 'Payment recorded successfully!', 'success');
      }
      setIsFormModalOpen(false);
      await fetchPayments();
      if (onRefreshInvoices) onRefreshInvoices();
    } catch (err: any) {
      console.error('Failed to submit payment:', err);
      triggerAlert('Error', err.response?.data?.message || 'Failed to submit payment.', 'info');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingPaymentId) return;
    try {
      await deleteInvoicePayment(deletingPaymentId);
      triggerAlert('Success', 'Payment deleted successfully!', 'success');
      setDeletingPaymentId(null);
      await fetchPayments();
      if (onRefreshInvoices) onRefreshInvoices();
    } catch (err) {
      console.error('Failed to delete payment:', err);
      triggerAlert('Error', 'Failed to delete payment.', 'info');
    }
  };

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFormProofName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setFormProof(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0c0d0f]/60 p-4 animate-fade-in font-sans"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[12px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  {invoice.invoiceNo}
                </span>
                <span className="text-[13px] font-extrabold text-[#0c0d0f]">
                  {invoice.company}
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5 font-medium">
                {t('invoices.paymentHistoryTitle') || 'Payment History & Installment Ledger'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Total Confirmation
                </span>
                <span className="text-[16px] font-extrabold text-slate-900 block font-inter">
                  {formatPrice(rawAmt, baseCurrency)}
                </span>
              </div>

              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-1">
                  Initial Deposit (DP)
                </span>
                <span className="text-[16px] font-extrabold text-amber-900 block font-inter">
                  {formatPrice(advAmt, baseCurrency)}
                </span>
              </div>

              <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block mb-1">
                  Total Paid To Date
                </span>
                <span className="text-[16px] font-extrabold text-blue-900 block font-inter">
                  {formatPrice(totalPaidInBase, baseCurrency)}
                </span>
              </div>

              <div className={`rounded-xl p-3.5 border ${
                remaining <= 0
                  ? 'bg-emerald-50/70 border-emerald-200/80'
                  : 'bg-red-50/70 border-red-200/80'
              }`}>
                <span className={`text-[11px] font-bold uppercase tracking-wider block mb-1 ${
                  remaining <= 0 ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  Remaining Balance
                </span>
                <span className={`text-[16px] font-extrabold block font-inter ${
                  remaining <= 0 ? 'text-emerald-900' : 'text-red-900'
                }`}>
                  {formatPrice(remaining, baseCurrency)}
                </span>
              </div>
            </div>

            {/* Table Action Bar */}
            <div className="flex items-center justify-between pt-2">
              <h4 className="text-[13px] font-bold text-slate-800">
                Payment Transactions & Receipts
              </h4>

              {canManagePayment && canAddPayment && remaining > 0 && (
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="px-3.5 py-1.5 bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold text-[12px] rounded-lg shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Installment Payment</span>
                </button>
              )}
            </div>

            {/* Transactions Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-[12px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Payment Date</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Equivalent ({baseCurrency})</th>
                    <th className="px-4 py-3">Proof / Note</th>
                    <th className="px-4 py-3 text-center">Receipt & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {/* Row for Advance Payment (if exists) */}
                  {advAmt > 0 && (
                    <tr className="bg-amber-50/20">
                      <td className="px-4 py-3 font-mono font-bold text-slate-400">00</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800">
                          Initial DP
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {invoice.date || 'At Confirmation'}
                      </td>
                      <td className="px-4 py-3 font-bold font-inter text-slate-900">
                        {formatPrice(advAmt, baseCurrency)}
                      </td>
                      <td className="px-4 py-3 font-inter text-slate-500">
                        {formatPrice(advAmt, baseCurrency)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[11px] italic">
                        Recorded at generation
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            onOpenReceipt(
                              {
                                id: 'dp-initial',
                                amount: advAmt,
                                currency: baseCurrency,
                                paymentDate: invoice.date,
                                note: 'Initial Advance Payment / Deposit',
                                createdBy: invoice.createdBy
                              },
                              invoice,
                              0
                            );
                          }}
                          className="px-2.5 py-1 bg-white border border-amber-300 text-amber-800 hover:bg-amber-50 rounded-md font-bold text-[11px] inline-flex items-center space-x-1 cursor-pointer shadow-2xs"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                      </td>
                    </tr>
                  )}

                  {/* Installment rows */}
                  {loadingHistory ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Loading payment history...
                      </td>
                    </tr>
                  ) : paymentHistoryList.length === 0 && advAmt <= 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No payment records registered yet.
                      </td>
                    </tr>
                  ) : (
                    paymentHistoryList.map((pay, idx) => {
                      const payCurr = (pay.currency || baseCurrency).toUpperCase();
                      const payAmt = parseFloat(pay.amount) || 0;
                      const eqAmt = convertPrice(payAmt, payCurr, baseCurrency, rates);

                      return (
                        <tr key={pay.id || idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-400">
                            {String(idx + 1).padStart(2, '0')}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-100 text-blue-800">
                              Installment
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {pay.paymentDate ? pay.paymentDate.split('T')[0] : '-'}
                          </td>
                          <td className="px-4 py-3 font-bold font-inter text-slate-900">
                            {formatPrice(payAmt, payCurr)}
                          </td>
                          <td className="px-4 py-3 font-inter text-slate-600">
                            {formatPrice(eqAmt, baseCurrency)}
                          </td>
                          <td className="px-4 py-3 text-[11px] text-slate-600">
                            <div className="flex items-center space-x-2">
                              {pay.proofUrl && (
                                <button
                                  type="button"
                                  onClick={() => setViewingProof(pay.proofUrl)}
                                  className="text-blue-600 hover:text-blue-800 font-bold inline-flex items-center space-x-1 cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Proof</span>
                                </button>
                              )}
                              <span className="truncate max-w-[140px]" title={pay.note}>
                                {pay.note || '-'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              {/* Official Receipt Button */}
                              <button
                                type="button"
                                onClick={() => onOpenReceipt(pay, invoice, idx + (advAmt > 0 ? 1 : 0))}
                                className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 rounded-md font-bold text-[11px] inline-flex items-center space-x-1 cursor-pointer text-slate-700"
                              >
                                <Receipt className="w-3.5 h-3.5 text-amber-600" />
                                <span>Receipt</span>
                              </button>

                              {/* Edit Payment */}
                              {canManagePayment && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(pay)}
                                  className="p-1 hover:bg-slate-100 text-blue-600 rounded cursor-pointer"
                                  title="Edit Payment"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete Payment */}
                              {canManagePayment && (
                                <button
                                  type="button"
                                  onClick={() => setDeletingPaymentId(pay.id)}
                                  className="p-1 hover:bg-red-50 text-red-500 rounded cursor-pointer"
                                  title="Delete Payment"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-[12px] cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Record / Edit Payment Modal */}
      {isFormModalOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-[#0c0d0f]/60 p-4 font-sans"
          onClick={() => setIsFormModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[15px] font-bold text-[#0c0d0f]">
                {editingPaymentId ? 'Edit Payment Record' : 'Record Installment Payment'}
              </h3>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-4 text-[12px]">
              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  Payment Amount <span className="text-red-500">*</span>
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="Enter amount..."
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-xl font-bold text-[13px] text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-800 bg-white"
                  >
                    <option value="SAR">SAR</option>
                    <option value="USD">USD</option>
                    <option value="Rp">IDR (Rp)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  Payment Note / Reference
                </label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="e.g. Bank Transfer BNI, Ref #1234"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  Proof of Transfer Document (Optional)
                </label>
                <label className="border border-dashed border-slate-300 hover:border-amber-500 rounded-xl p-3.5 flex items-center justify-center space-x-2 text-slate-600 hover:text-amber-600 cursor-pointer bg-slate-50 transition-colors">
                  <Upload className="w-4 h-4" />
                  <span className="font-semibold truncate max-w-[200px]">
                    {formProofName || 'Upload image or PDF'}
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleProofUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {!editingPaymentId && (
                <label className="flex items-center space-x-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveOverpaymentCredit}
                    onChange={(e) => setSaveOverpaymentCredit(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-slate-700 font-medium text-[11.5px]">
                    Save excess amount as client Credit Balance (if overpaid)
                  </span>
                </label>
              )}

              <div className="flex space-x-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="flex-1 py-2 border border-slate-300 hover:bg-slate-50 font-bold rounded-xl text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  {submitting ? 'Saving...' : editingPaymentId ? 'Update Payment' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Viewing Proof Lightbox */}
      {viewingProof && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setViewingProof(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 bg-slate-900 text-white flex justify-between items-center">
              <span className="text-[13px] font-bold">Transfer Proof Document</span>
              <button
                type="button"
                onClick={() => setViewingProof(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(85vh-60px)] flex items-center justify-center bg-slate-100">
              {viewingProof.startsWith('data:application/pdf') ? (
                <iframe src={viewingProof} title="Proof PDF" className="w-full h-[65vh] rounded-lg border border-slate-200" />
              ) : (
                <img src={viewingProof} alt="Proof" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Payment Confirm Modal */}
      {deletingPaymentId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0c0d0f]/60 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center font-sans">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 border border-red-200 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h4 className="text-[15px] font-bold text-slate-900 mb-1">Delete Payment Record</h4>
            <p className="text-[12px] text-slate-600 mb-5">
              Are you sure you want to remove this payment transaction? The invoice remaining balance will be recalculated.
            </p>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setDeletingPaymentId(null)}
                className="flex-1 py-2 border border-slate-300 hover:bg-slate-50 font-bold rounded-xl text-[12px] text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-[12px] shadow-sm transition-all cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
