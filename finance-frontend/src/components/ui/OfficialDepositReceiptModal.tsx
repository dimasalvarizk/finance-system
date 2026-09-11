import React from 'react';
import { X, Printer, ShieldCheck, FileCheck } from 'lucide-react';
import odstLogo from '../../assets/odstlogo.png';
import { amountToEnglishWords } from '../../utils/numberToWordsEnglish';

export interface ReceiptData {
  receiptNo: string;
  sequence: number;
  paymentId: string;
  invoiceNo: string;
  referenceNo?: string;
  serialNo?: string;
  confirmationDate?: string;
  dateOfPayment: string;
  receivedFrom: {
    company: string;
    companyCode?: string;
    address?: string;
    taxNumber?: string;
    email?: string;
    agent?: string;
  };
  amountReceived: {
    numeric: number;
    currency: string;
    amountInWords?: string;
    exchangeRate?: number;
    baseCurrency?: string;
  };
  forPaymentOf: string;
  ledgerSummary: {
    totalConfirmationAmount: number;
    advancePayment?: number;
    paymentAmountInThisReceipt: number;
    totalPaidToDate: number;
    remainingBalance: number;
    currency: string;
  };
  paymentDetails: {
    paymentDate: string;
    note?: string;
    proofUrl?: string;
    createdBy?: string;
    createdAt?: string;
  };
  issuedBy?: string;
  issuedAt?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  receiptData: ReceiptData | null;
  loading?: boolean;
}

const formatDisplayPrice = (amount: number, currency: string = 'SAR'): string => {
  const code = (currency || 'SAR').toUpperCase().trim();
  const num = parseFloat(String(amount)) || 0;

  if (code === 'IDR' || code === 'RP') {
    return `Rp ${num.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  if (code === 'USD') {
    return `$ ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (code === 'SAR') {
    return `SAR ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${code} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDateEnglish = (dateStr?: string): string => {
  if (!dateStr) return 'N/A';
  try {
    const clean = dateStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  } catch (e) {}
  return dateStr;
};

export const OfficialDepositReceiptModal: React.FC<Props> = ({
  isOpen,
  onClose,
  receiptData,
  loading = false,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  if (loading || !receiptData) {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0c0d0f]/60 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] font-bold text-slate-700">Generating Official Receipt...</p>
        </div>
      </div>
    );
  }

  const {
    receiptNo,
    invoiceNo,
    referenceNo,
    serialNo,
    dateOfPayment,
    receivedFrom,
    amountReceived,
    forPaymentOf,
    ledgerSummary,
    paymentDetails
  } = receiptData;

  const paymentCurrency = (amountReceived.currency || ledgerSummary.currency || 'SAR').toUpperCase();
  const baseCurrency = (ledgerSummary.currency || 'SAR').toUpperCase();
  const numericAmount = amountReceived.numeric;
  const englishWords = amountReceived.amountInWords || amountToEnglishWords(numericAmount, paymentCurrency);

  return (
    <>
      {/* Modal Dialog for On-Screen Review */}
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0c0d0f]/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto animate-fade-in print:hidden"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full my-6 overflow-hidden flex flex-col animate-scale-up text-slate-800 font-sans"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Modal Bar */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 font-bold">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-extrabold text-[#0c0d0f] font-sans">
                  Official Deposit Receipt Preview
                </h3>
                <p className="text-[11.5px] text-slate-500 font-medium">
                  Standard International Document · English (US)
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrint}
                className="px-3.5 py-1.5 bg-[#1d2857] hover:bg-[#151d3f] text-white font-bold text-[12px] rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
                title="Print or Save PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Receipt Preview Body */}
          <div className="p-6 sm:p-8 bg-slate-50/40 overflow-y-auto max-h-[75vh]">
            {/* The Document Sheet */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
              
              {/* Document Header */}
              <div className="pb-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2 max-w-sm">
                  <img
                    src={odstLogo}
                    alt="Manazil AL.Mukhtara / ODST"
                    className="h-12 w-auto object-contain"
                  />
                  <div className="text-[10px] text-slate-500 leading-relaxed font-sans">
                    <p className="font-bold text-slate-700">MANAZIL AL.MUKHTARA GROUP · ODST AIRLINES INDO</p>
                    <p>Graha Al Badgel, Jl. Hajjah Tutty Alawiyah No.7, Kalibata, Jakarta Selatan 12740</p>
                    <p>Saudi Arabia Branches: Makkah Al Mukarramah · Madinah Al Munawwarah · Jeddah</p>
                  </div>
                </div>

                <div className="text-left sm:text-right space-y-1">
                  <div className="inline-block px-3 py-1 bg-amber-50 border border-amber-200/80 rounded-lg text-amber-700 text-[10px] font-black uppercase tracking-wider mb-1">
                    DEPOSIT / PARTIAL PAYMENT
                  </div>
                  <h1 className="text-[22px] font-black text-[#1d2857] uppercase tracking-tight">
                    OFFICIAL RECEIPT
                  </h1>
                  <div className="text-[11px] font-bold text-slate-700 font-mono">
                    <span className="text-slate-400">Receipt No: </span>
                    <span className="text-amber-600 bg-amber-50/50 px-1.5 py-0.5 rounded border border-amber-200">{receiptNo}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    <span className="text-slate-400">Date: </span>
                    <span className="font-semibold text-slate-700">{formatDateEnglish(dateOfPayment)}</span>
                  </div>
                </div>
              </div>

              {/* Reference Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 text-[11px]">
                <div>
                  <span className="text-slate-400 text-[9.5px] font-bold uppercase block">Confirmation Ref #</span>
                  <span className="font-extrabold text-slate-800 font-mono">{invoiceNo}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[9.5px] font-bold uppercase block">Reference #</span>
                  <span className="font-bold text-slate-700">{referenceNo || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[9.5px] font-bold uppercase block">Serial #</span>
                  <span className="font-bold text-slate-700">{serialNo || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[9.5px] font-bold uppercase block">Payment Sequence</span>
                  <span className="font-bold text-amber-700">Installment #{receiptData.sequence}</span>
                </div>
              </div>

              {/* Received From Section */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Received With Thanks From:
                </span>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-[15px] font-black text-slate-900">
                      {receivedFrom.company}
                    </h2>
                    {receivedFrom.companyCode && (
                      <span className="text-[11px] font-bold text-slate-500 font-mono">
                        Company Code: {receivedFrom.companyCode}
                      </span>
                    )}
                  </div>
                  {receivedFrom.agent && receivedFrom.agent !== '-' && (
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold">Handling Agent</span>
                      <span className="text-[12px] font-bold text-slate-700">{receivedFrom.agent}</span>
                    </div>
                  )}
                </div>
                {receivedFrom.address && (
                  <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 mt-2">
                    {receivedFrom.address}
                  </p>
                )}
              </div>

              {/* Amount Highlight Box */}
              <div className="bg-gradient-to-r from-emerald-50/80 via-emerald-50/50 to-blue-50/60 border-2 border-emerald-200/80 rounded-2xl p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider">
                    Amount Received (Payment In Full / Deposit Portion)
                  </span>
                  <span className="text-[24px] font-black text-emerald-700 font-mono tracking-tight">
                    {formatDisplayPrice(numericAmount, paymentCurrency)}
                  </span>
                </div>

                {/* Amount in English Words */}
                <div className="bg-white/90 backdrop-blur-xs p-3.5 rounded-xl border border-emerald-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Amount in Words (Standard English):
                  </span>
                  <p className="text-[12.5px] font-extrabold text-slate-800 italic mt-0.5 leading-snug">
                    "{englishWords}"
                  </p>
                </div>

                {/* Cross currency note if different */}
                {paymentCurrency !== baseCurrency && (
                  <div className="text-[11px] text-blue-700 font-medium flex items-center space-x-1.5 pt-1">
                    <span className="font-bold">Base Currency Equivalent:</span>
                    <span>
                      {formatDisplayPrice(
                        amountReceived.numeric * (amountReceived.exchangeRate || 1),
                        baseCurrency
                      )}{' '}
                      (Rate: {amountReceived.exchangeRate || 1})
                    </span>
                  </div>
                )}
              </div>

              {/* For Payment Of & Description */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      Payment Purpose / For Payment Of:
                    </span>
                    <p className="text-[13px] font-bold text-slate-800 mt-0.5">
                      {forPaymentOf}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Payment Channel</span>
                    <span className="text-[11.5px] font-bold text-slate-700">Bank Transfer / Cash</span>
                  </div>
                </div>
                {paymentDetails.note && (
                  <div className="pt-2 border-t border-slate-100 text-[11.5px] text-slate-600">
                    <span className="font-bold text-slate-700">Payment Note / Memo: </span>
                    <span>{paymentDetails.note}</span>
                  </div>
                )}
              </div>

              {/* Financial Ledger Status Breakdown */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="bg-slate-100/70 px-4 py-2 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                  Confirmation Financial Balance Summary
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 text-[11.5px]">
                  <div className="p-3">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Total Billed</span>
                    <span className="font-bold text-slate-800">
                      {formatDisplayPrice(ledgerSummary.totalConfirmationAmount, baseCurrency)}
                    </span>
                  </div>
                  <div className="p-3">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">This Payment</span>
                    <span className="font-bold text-emerald-600">
                      {formatDisplayPrice(numericAmount, paymentCurrency)}
                    </span>
                  </div>
                  <div className="p-3">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Total Paid To Date</span>
                    <span className="font-bold text-blue-700">
                      {formatDisplayPrice(ledgerSummary.totalPaidToDate, baseCurrency)}
                    </span>
                  </div>
                  <div className="p-3 bg-amber-50/40">
                    <span className="text-[10px] font-bold text-amber-700 uppercase block">Outstanding Balance</span>
                    <span className="font-black text-amber-800">
                      {formatDisplayPrice(ledgerSummary.remainingBalance, baseCurrency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signature & System Verification Footer */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-slate-400">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-700">Digitally Verified Official Document</p>
                    <p>Generated by ODST & Manazil AL.Mukhtara Group Finance System</p>
                  </div>
                </div>

                <div className="text-center sm:text-right">
                  <div className="border border-slate-300 rounded px-3 py-1 bg-slate-50 font-mono text-[9.5px] text-slate-600 inline-block mb-1">
                    OFFICIALLY RECORDED & VALIDATED
                  </div>
                  <p className="text-[9px] text-slate-400">Computer generated receipt. No signature required.</p>
                </div>
              </div>

            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium">
              Receipt ID: <span className="font-mono text-slate-700 font-bold">{receiptData.paymentId}</span>
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-[12px] transition-all cursor-pointer"
              >
                Close Preview
              </button>
              <button
                onClick={handlePrint}
                className="px-5 py-2 bg-[#1d2857] hover:bg-[#151d3f] text-white font-bold rounded-xl text-[12px] flex items-center space-x-2 transition-all cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Receipt</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Print Stylesheet */}
      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #official-deposit-receipt-print-area,
          #official-deposit-receipt-print-area * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #official-deposit-receipt-print-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            max-width: 210mm !important;
            max-height: 297mm !important;
            box-sizing: border-box !important;
            padding: 12mm 14mm !important;
            margin: 0 !important;
            background: white !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            overflow: hidden !important;
            z-index: 9999999 !important;
          }
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }
        }
      `}</style>

      {/* Hidden Dedicated Print Sheet (Visible ONLY during window.print()) */}
      <div
        id="official-deposit-receipt-print-area"
        className="hidden print:block bg-white font-sans text-slate-800 box-border p-[12mm]"
        style={{ width: '210mm', minHeight: '297mm', margin: '0 auto' }}
      >
        <div className="w-full bg-white p-0 flex flex-col justify-between h-full space-y-6">
          
          {/* Print Header */}
          <div className="pb-4 border-b-2 border-slate-800 flex items-start justify-between">
            <div className="space-y-1.5 w-1/2">
              <img
                src={odstLogo}
                alt="Logo"
                className="h-14 w-auto object-contain"
              />
              <div className="text-[8.5px] text-slate-600 leading-snug font-sans">
                <p className="font-bold text-slate-800">MANAZIL AL.MUKHTARA GROUP · PT. ODST AIRLINES INDO</p>
                <p>Graha Al Badgel, Jl. Hajjah Tutty Alawiyah No.7, Kalibata, Jakarta Selatan, Indonesia 12740</p>
                <p>Saudi Operations: Makkah · Madinah · Jeddah</p>
              </div>
            </div>

            <div className="text-right flex flex-col items-end w-1/2 space-y-1">
              <div className="px-2.5 py-0.5 bg-slate-100 border border-slate-400 text-slate-800 text-[8.5px] font-bold uppercase tracking-wider rounded">
                DEPOSIT / PARTIAL PAYMENT
              </div>
              <h1 className="text-[24px] font-black text-slate-900 tracking-tight leading-none uppercase">
                OFFICIAL RECEIPT
              </h1>
              <div className="text-[10.5px] font-bold text-slate-800 font-mono">
                <span>Receipt No: </span>
                <span className="font-extrabold">{receiptNo}</span>
              </div>
              <div className="text-[10px] text-slate-600">
                <span>Date of Payment: </span>
                <span className="font-bold text-slate-800">{formatDateEnglish(dateOfPayment)}</span>
              </div>
            </div>
          </div>

          {/* Reference Row */}
          <div className="grid grid-cols-4 gap-2 bg-slate-100/80 p-2.5 rounded border border-slate-300 text-[9.5px]">
            <div>
              <span className="text-slate-500 font-bold uppercase block text-[8px]">Confirmation #</span>
              <span className="font-bold text-slate-900 font-mono">{invoiceNo}</span>
            </div>
            <div>
              <span className="text-slate-500 font-bold uppercase block text-[8px]">Reference #</span>
              <span className="font-semibold text-slate-800">{referenceNo || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-bold uppercase block text-[8px]">Serial #</span>
              <span className="font-semibold text-slate-800">{serialNo || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-bold uppercase block text-[8px]">Installment</span>
              <span className="font-bold text-slate-800">Sequence #{receiptData.sequence}</span>
            </div>
          </div>

          {/* Received From */}
          <div className="border border-slate-300 rounded p-3 bg-white space-y-1 text-[10px]">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
              Received With Thanks From:
            </span>
            <div className="flex justify-between items-baseline">
              <span className="text-[14px] font-black text-slate-900">{receivedFrom.company}</span>
              {receivedFrom.companyCode && (
                <span className="font-mono font-bold text-slate-600 text-[10px]">Code: {receivedFrom.companyCode}</span>
              )}
            </div>
            {receivedFrom.address && (
              <p className="text-[9px] text-slate-600">{receivedFrom.address}</p>
            )}
          </div>

          {/* Amount Box */}
          <div className="border-2 border-slate-800 rounded p-4 bg-slate-50/50 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                Amount Received:
              </span>
              <span className="text-[20px] font-black text-slate-900 font-mono">
                {formatDisplayPrice(numericAmount, paymentCurrency)}
              </span>
            </div>

            <div className="p-2.5 bg-white rounded border border-slate-300">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
                Amount in Words (English Standard):
              </span>
              <p className="text-[11px] font-bold text-slate-900 italic mt-0.5">
                "{englishWords}"
              </p>
            </div>

            {paymentCurrency !== baseCurrency && (
              <div className="text-[9.5px] text-slate-700 font-medium">
                <span className="font-bold">Base Equivalent: </span>
                <span>
                  {formatDisplayPrice(
                    amountReceived.numeric * (amountReceived.exchangeRate || 1),
                    baseCurrency
                  )}{' '}
                  (Exchange Rate: {amountReceived.exchangeRate || 1})
                </span>
              </div>
            )}
          </div>

          {/* For Payment Of */}
          <div className="border border-slate-300 rounded p-3 space-y-1 text-[10px]">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
              For Payment Of:
            </span>
            <p className="text-[11.5px] font-bold text-slate-800">{forPaymentOf}</p>
            {paymentDetails.note && (
              <p className="text-[9.5px] text-slate-600 pt-1 border-t border-slate-200">
                <span className="font-bold">Note: </span>
                {paymentDetails.note}
              </p>
            )}
          </div>

          {/* Balance Breakdown Table */}
          <div className="border border-slate-300 rounded overflow-hidden">
            <div className="bg-slate-200 px-3 py-1 text-[8.5px] font-bold text-slate-700 uppercase tracking-wider">
              Account Ledger Status
            </div>
            <div className="grid grid-cols-4 divide-x divide-slate-200 text-[10px] text-center">
              <div className="p-2">
                <span className="text-[8px] text-slate-500 uppercase block">Total Confirmation</span>
                <span className="font-bold text-slate-900">
                  {formatDisplayPrice(ledgerSummary.totalConfirmationAmount, baseCurrency)}
                </span>
              </div>
              <div className="p-2">
                <span className="text-[8px] text-slate-500 uppercase block">This Payment</span>
                <span className="font-bold text-slate-900">
                  {formatDisplayPrice(numericAmount, paymentCurrency)}
                </span>
              </div>
              <div className="p-2">
                <span className="text-[8px] text-slate-500 uppercase block">Total Paid To Date</span>
                <span className="font-bold text-slate-900">
                  {formatDisplayPrice(ledgerSummary.totalPaidToDate, baseCurrency)}
                </span>
              </div>
              <div className="p-2 bg-slate-50">
                <span className="text-[8px] font-bold text-slate-700 uppercase block">Remaining Balance</span>
                <span className="font-black text-slate-900">
                  {formatDisplayPrice(ledgerSummary.remainingBalance, baseCurrency)}
                </span>
              </div>
            </div>
          </div>

          {/* Signatures and Stamp */}
          <div className="pt-8 flex justify-between items-end text-[10px]">
            <div className="space-y-1">
              <p className="font-bold text-slate-800">Manazil AL.Mukhtara Group / PT. ODST</p>
              <p className="text-[8.5px] text-slate-500">Finance & Treasury Operations</p>
              <p className="text-[8px] text-slate-400 font-mono">Receipt Hash: {paymentDetails.createdAt || new Date().toISOString()}</p>
            </div>

            <div className="text-center space-y-1">
              <div className="w-36 border-b border-slate-400 pb-8 text-[9px] text-slate-400 italic">
                Authorized Cashier / Finance
              </div>
              <span className="text-[8px] text-slate-400 uppercase font-bold">Official Stamp / Signature</span>
            </div>
          </div>

          {/* Print Footer */}
          <div className="pt-4 border-t border-slate-200 text-center text-[8px] text-slate-400">
            This is an official computer-generated receipt issued by Manazil AL.Mukhtara Group & ODST Finance System. 100% International Standard Document.
          </div>

        </div>
      </div>
    </>
  );
};

export default OfficialDepositReceiptModal;
