import React, { useState } from 'react';
import { X, Printer, ShieldCheck, FileCheck, Paperclip } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import odstLogo from '../../assets/odstlogo.png';
import { amountToLocalizedWords } from '../../utils/numberToWords';

export interface ReceiptData {
  isStandalone?: boolean;
  receiptNo: string;
  sequence?: number;
  paymentId: string;
  invoiceNo?: string;
  referenceNo?: string;
  serialNo?: string;
  groupNumber?: string | null;
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
  bankDetails?: {
    ourBank?: {
      bankName: string;
      accountName: string;
      accountNumber?: string;
      branchAddress?: string;
      swiftCode?: string;
    };
    payerBank?: {
      bankName?: string;
      accountName?: string;
      accountNumber?: string;
    };
  };
  ledgerSummary?: {
    totalConfirmationAmount: number;
    advancePayment?: number;
    paymentAmountInThisReceipt: number;
    totalPaidToDate: number;
    remainingBalance: number;
    currency: string;
  };
  paymentDetails: {
    paymentDate: string;
    paymentMethod?: string;
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

type ReceiptLang = 'en' | 'id' | 'ar';

const formatDisplayPrice = (amount: number | string | undefined | null, currency: string = 'SAR'): string => {
  const code = (currency || 'SAR').toUpperCase().trim();
  const num = typeof amount === 'number' ? (isNaN(amount) ? 0 : amount) : (parseFloat(String(amount ?? 0)) || 0);

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

const formatDateByLang = (dateStr?: string, lang: ReceiptLang = 'en'): string => {
  if (!dateStr) return 'N/A';
  try {
    const clean = dateStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      const d = new Date(year, month, day);
      const locale = lang === 'ar' ? 'ar-SA' : lang === 'id' ? 'id-ID' : 'en-US';
      return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
    }
  } catch (e) {}
  return dateStr;
};

// Dictionary for Receipt Document
const DOC_TEXTS: Record<ReceiptLang, {
  previewTitle: string;
  previewSubtitle: string;
  docTitle: string;
  badge: string;
  receiptNo: string;
  date: string;
  confRef: string;
  refNo: string;
  serialNo: string;
  sequence: string;
  receivedFrom: string;
  companyCode: string;
  amountReceived: string;
  amountInWords: string;
  baseEquivalent: string;
  rate: string;
  forPaymentOf: string;
  paymentChannel: string;
  note: string;
  ledgerTitle: string;
  totalBilled: string;
  thisPayment: string;
  totalPaid: string;
  outstandingBalance: string;
  verifiedTitle: string;
  verifiedSub: string;
  verifiedBadge: string;
  noSignReq: string;
  receiptId: string;
  close: string;
  printPdf: string;
  viewProof: string;
  dualBankTitle: string;
  beneficiaryBank: string;
  remitterBank: string;
}> = {
  en: {
    previewTitle: 'Official Deposit Receipt Preview',
    previewSubtitle: 'Standard International Document · English (US)',
    docTitle: 'OFFICIAL RECEIPT',
    badge: 'DEPOSIT / PARTIAL PAYMENT',
    receiptNo: 'Receipt No.',
    date: 'Date',
    confRef: 'CONFIRMATION REF #',
    refNo: 'REFERENCE #',
    serialNo: 'SERIAL #',
    sequence: 'PAYMENT SEQUENCE',
    receivedFrom: 'RECEIVED WITH THANKS FROM:',
    companyCode: 'Company Code',
    amountReceived: 'AMOUNT RECEIVED (PAYMENT IN FULL / DEPOSIT PORTION)',
    amountInWords: 'AMOUNT IN WORDS (STANDARD ENGLISH):',
    baseEquivalent: 'Base Currency Equivalent',
    rate: 'Rate',
    forPaymentOf: 'PAYMENT PURPOSE / FOR PAYMENT OF:',
    paymentChannel: 'PAYMENT CHANNEL',
    note: 'Note',
    ledgerTitle: 'CONFIRMATION FINANCIAL BALANCE SUMMARY',
    totalBilled: 'TOTAL BILLED',
    thisPayment: 'THIS PAYMENT',
    totalPaid: 'TOTAL PAID TO DATE',
    outstandingBalance: 'OUTSTANDING BALANCE',
    verifiedTitle: 'Digitally Verified Official Document',
    verifiedSub: 'Generated by ODST & Manazil AL.Mukhtara Group Finance System',
    verifiedBadge: 'OFFICIALLY RECORDED & VALIDATED',
    noSignReq: 'Computer generated receipt. No signature required.',
    receiptId: 'Receipt ID',
    close: 'Close Preview',
    printPdf: 'Print Official Receipt',
    viewProof: 'View Attached Proof',
    dualBankTitle: 'DUAL COMPANY BANK SETTLEMENT VERIFICATION',
    beneficiaryBank: 'Beneficiary Bank (Receiving / Ours)',
    remitterBank: 'Remitter Bank (Paid From / Client)',
  },
  id: {
    previewTitle: 'Pratinjau Kuitansi Deposit Resmi',
    previewSubtitle: 'Dokumen Standar Resmi Keuangan · Bahasa Indonesia',
    docTitle: 'KUITANSI RESMI',
    badge: 'PEMBAYARAN DEPOSIT / UANG MUKA',
    receiptNo: 'No. Kuitansi',
    date: 'Tanggal',
    confRef: 'NO. KONFIRMASI',
    refNo: 'NO. REFERENSI',
    serialNo: 'NO. SERI',
    sequence: 'URUTAN PEMBAYARAN',
    receivedFrom: 'TELAH DITERIMA DARI:',
    companyCode: 'Kode Perusahaan',
    amountReceived: 'JUMLAH UANG DITERIMA (PEMBAYARAN / DEPOSIT)',
    amountInWords: 'TERBILANG (BAHASA INDONESIA):',
    baseEquivalent: 'Nilai Setara Mata Uang Utama',
    rate: 'Kurs',
    forPaymentOf: 'UNTUK PEMBAYARAN / TUJUAN TRANSAKSI:',
    paymentChannel: 'SALURAN PEMBAYARAN',
    note: 'Catatan',
    ledgerTitle: 'RINGKASAN STATUS KEUANGAN & SALDO KONFIRMASI',
    totalBilled: 'TOTAL TAGIHAN',
    thisPayment: 'PEMBAYARAN INI',
    totalPaid: 'TOTAL TELAH DIBAYAR',
    outstandingBalance: 'SISA TAGIHAN',
    verifiedTitle: 'Dokumen Resmi Terverifikasi Digital',
    verifiedSub: 'Diterbitkan otomatis oleh Sistem Keuangan ODST & Manazil AL.Mukhtara Group',
    verifiedBadge: 'TERCATAT & TERSAHKAN RESMI',
    noSignReq: 'Kuitansi komputer resmi. Tidak memerlukan tanda tangan fisik.',
    receiptId: 'ID Kuitansi',
    close: 'Tutup Pratinjau',
    printPdf: 'Cetak Kuitansi Resmi',
    viewProof: 'Lihat Bukti Transfer',
    dualBankTitle: 'VERIFIKASI REKENING BANK KEDUA PIHAK',
    beneficiaryBank: 'Rekening Bank Penerima (Perusahaan Kami)',
    remitterBank: 'Rekening Bank Pengirim (Klien / Pembayar)',
  },
  ar: {
    previewTitle: 'معاينة سند القبض الرسمي',
    previewSubtitle: 'وثيقة مالية معتمدة دولياً · اللغة العربية',
    docTitle: 'سند قبض رسمي',
    badge: 'دفعة مقدمة / سداد جزئي',
    receiptNo: 'رقم السند',
    date: 'التاريخ',
    confRef: 'رقم التأكيد',
    refNo: 'الرقم المرجعي',
    serialNo: 'الرقم التسلسلي',
    sequence: 'تسلسل الدفعة',
    receivedFrom: 'استلمنا من السادة:',
    companyCode: 'رمز الشركة',
    amountReceived: 'المبلغ المقبوض (الدفعة المقدمة / السداد الجزئي)',
    amountInWords: 'المبلغ كتابة (باللغة العربية):',
    baseEquivalent: 'المعادل بالعملة الأساسية',
    rate: 'سعر الصرف',
    forPaymentOf: 'وذلك عن / الغرض من الدفع:',
    paymentChannel: 'طريقة الدفع',
    note: 'ملاحظة',
    ledgerTitle: 'ملخص الحساب المالي والرصيد',
    totalBilled: 'إجمالي المبلغ',
    thisPayment: 'هذه الدفعة',
    totalPaid: 'إجمالي المسدد',
    outstandingBalance: 'المبلغ المتبقي',
    verifiedTitle: 'وثيقة رسمية معتمدة وموثقة إلكترونياً',
    verifiedSub: 'صادرة آلياً عبر النظام المالي لمجموعة منازل المختارة وشركة أودست',
    verifiedBadge: 'معتمد ومسجل رسمياً بالنظام',
    noSignReq: 'سند إلكتروني صادر آلياً من النظام المالي. لا يتطلب توقيعاً خطياً.',
    receiptId: 'معرف السند',
    close: 'إغلاق المعاينة',
    printPdf: 'طباعة السند الرسمي',
    viewProof: 'عرض إشعار التحويل',
    dualBankTitle: 'بيانات التسوية البنكية لكلا الطرفين',
    beneficiaryBank: 'البنك المستفيد (حساب شركتنا)',
    remitterBank: 'البنك المحوّل (حساب العميل)',
  },
};

export const OfficialDepositReceiptModal: React.FC<Props> = ({
  isOpen,
  onClose,
  receiptData,
  loading = false,
}) => {
  const { i18n } = useTranslation();
  const [docLang, setDocLang] = useState<ReceiptLang>(() => {
    const current = (i18n.language || 'en').toLowerCase();
    if (current.startsWith('ar')) return 'ar';
    if (current.startsWith('id')) return 'id';
    return 'en';
  });
  const [viewingProof, setViewingProof] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  if (loading || !receiptData) {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0c0d0f]/60 p-4 animate-fade-in font-sans">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] font-bold text-slate-700 font-sans">Generating Official Receipt...</p>
        </div>
      </div>
    );
  }

  const {
    receiptNo,
    invoiceNo,
    referenceNo,
    serialNo,
    groupNumber,
    dateOfPayment,
    receivedFrom,
    forPaymentOf,
    paymentDetails,
    bankDetails
  } = receiptData;

  const rawRec = receiptData as any;
  const numAmt = receiptData.amountReceived?.numeric ?? rawRec?.amount ?? rawRec?.numericAmount ?? 0;
  const numericAmount = typeof numAmt === 'number' ? numAmt : parseFloat(String(numAmt)) || 0;

  const paymentCurrency = (receiptData.amountReceived?.currency || rawRec?.currency || receiptData.ledgerSummary?.currency || 'SAR').toUpperCase();
  const baseCurrency = (receiptData.amountReceived?.baseCurrency || rawRec?.baseCurrency || receiptData.ledgerSummary?.currency || 'SAR').toUpperCase();
  const localizedWords = amountToLocalizedWords(numericAmount, paymentCurrency, docLang);
  const text = DOC_TEXTS[docLang];
  const isRtl = docLang === 'ar';

  const rawRate = receiptData.amountReceived?.exchangeRate ?? rawRec?.exchangeRate ?? rawRec?.exchange_rate ?? 1.0;
  const numRate = typeof rawRate === 'number' ? rawRate : parseFloat(String(rawRate));
  const exchangeRate = (!isNaN(numRate) && numRate > 0) ? numRate : 1.0;
  const isDifferentCurrency = paymentCurrency !== baseCurrency && exchangeRate > 0;
  const baseEquivalentAmount = isDifferentCurrency ? numericAmount / exchangeRate : numericAmount;

  // Safe fallback financial numbers for Ledger Summary
  const totalBilled = receiptData.ledgerSummary?.totalConfirmationAmount ?? rawRec?.totalConfirmationAmount ?? rawRec?.totalBilled ?? numericAmount;
  const thisPayment = receiptData.ledgerSummary?.paymentAmountInThisReceipt ?? numericAmount;
  const totalPaid = receiptData.ledgerSummary?.totalPaidToDate ?? rawRec?.totalPaidToDate ?? rawRec?.totalPaid ?? numericAmount;
  const remainingBalance = receiptData.ledgerSummary?.remainingBalance ?? rawRec?.remainingBalance ?? 0;

  return (
    <>
      {/* Modal Dialog for On-Screen Review */}
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0c0d0f]/60 p-2 sm:p-4 overflow-y-auto animate-fade-in print:hidden"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full my-6 overflow-hidden flex flex-col animate-scale-up text-slate-800 font-sans"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Modal Bar */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 font-bold">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-[#0c0d0f] font-sans">
                  {text.previewTitle}
                </h3>
                <p className="text-[11.5px] text-slate-500 font-medium">
                  {text.previewSubtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Language Switcher */}
              <div className="inline-flex rounded-lg p-1 bg-slate-200/80 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setDocLang('en')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    docLang === 'en' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setDocLang('id')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    docLang === 'id' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ID
                </button>
                <button
                  type="button"
                  onClick={() => setDocLang('ar')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    docLang === 'ar' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  العربية
                </button>
              </div>

              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-[#1d2857] hover:bg-[#151d3f] text-white font-bold text-[12px] rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
                title="Print or Save PDF"
              >
                <Printer className="w-4 h-4" />
                <span>{text.printPdf}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Receipt Preview Body */}
          <div className="p-6 sm:p-8 bg-slate-50/50 overflow-y-auto max-h-[75vh]">
            {/* The Document Sheet */}
            <div
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6"
              dir={isRtl ? 'rtl' : 'ltr'}
            >
              {/* Document Header */}
              <div className="pb-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2 max-w-sm">
                  <img
                    src={odstLogo}
                    alt="Manazil AL.Mukhtara / ODST"
                    className="h-12 w-auto object-contain"
                  />
                  <div className="text-[10.5px] text-slate-500 leading-relaxed font-sans">
                    <p className="font-bold text-slate-800 uppercase tracking-wide">
                      MANAZIL AL.MUKHTARA GROUP · ODST AIRLINES INDO
                    </p>
                    <p>Graha Al Badgel, Jl. Hajjah Tutty Alawiyah No.7, Kalibata, Jakarta Selatan 12740</p>
                    <p>Saudi Arabia Branches: Makkah Al Mukarramah · Madinah Al Munawwarah · Jeddah</p>
                  </div>
                </div>

                <div className="text-left sm:text-right space-y-1 rtl:text-right sm:rtl:text-left">
                  <div className="inline-block px-3 py-1 bg-amber-50 border border-amber-200/80 rounded-full text-amber-700 text-[10.5px] font-bold uppercase tracking-wider mb-1">
                    {text.badge}
                  </div>
                  <h1 className="text-[22px] font-black text-[#1d2857] uppercase tracking-tight font-sans">
                    {text.docTitle}
                  </h1>
                  <div className="text-[11.5px] font-bold text-slate-700 font-mono">
                    <span className="text-slate-400 font-sans">{text.receiptNo}: </span>
                    <span className="text-amber-800 bg-[#fef9c3] px-2 py-0.5 rounded border border-amber-200 font-mono">
                      {receiptNo}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    <span className="text-slate-400">{text.date}: </span>
                    <span className="font-bold text-slate-800">
                      {formatDateByLang(dateOfPayment, docLang)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reference Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#f8fafc] p-4 rounded-xl border border-slate-100 text-[11px]">
                <div>
                  <span className="text-slate-400 text-[9.5px] font-bold uppercase block">{text.confRef}</span>
                  <span className="font-extrabold text-slate-800 font-mono">{invoiceNo || referenceNo || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[9.5px] font-bold uppercase block">{text.refNo}</span>
                  <span className="font-bold text-slate-700 font-mono">{referenceNo || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[9.5px] font-bold uppercase block">{text.serialNo}</span>
                  <span className="font-bold text-slate-700 font-mono">{serialNo || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[9.5px] font-bold uppercase block">{text.sequence}</span>
                  <span className="font-bold text-amber-600">
                    {receiptData.sequence
                      ? `Installment #${receiptData.sequence}`
                      : (groupNumber ? `Group: ${groupNumber}` : 'Deposit Portion')}
                  </span>
                </div>
              </div>

              {/* Received With Thanks From Section */}
              <div className="border border-slate-200 rounded-xl p-4 bg-[#f8fafc] space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  {text.receivedFrom}
                </span>
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <h2 className="text-[16px] font-black text-slate-900">
                    {receivedFrom.company}
                  </h2>
                  {receivedFrom.companyCode && (
                    <span className="text-[11px] font-bold text-slate-500 font-mono">
                      {text.companyCode}: {receivedFrom.companyCode}
                    </span>
                  )}
                </div>
                {receivedFrom.address && (
                  <p className="text-[11.5px] text-slate-600">{receivedFrom.address}</p>
                )}
              </div>

              {/* Amount Received Box (Mint Green Accent Card) */}
              <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-xl p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[11px] font-black uppercase text-emerald-800 tracking-wider">
                    {text.amountReceived}
                  </span>
                  <span className="text-[22px] font-black text-emerald-700 font-mono">
                    {formatDisplayPrice(numericAmount, paymentCurrency)}
                  </span>
                </div>

                {/* Amount in Words Inner Box */}
                <div className="p-3.5 bg-white rounded-lg border border-emerald-100/80 shadow-2xs">
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">
                    {text.amountInWords}
                  </span>
                  <p className="text-[12.5px] font-bold text-slate-800 italic mt-0.5 font-serif leading-relaxed">
                    "{localizedWords}"
                  </p>
                </div>

                {/* Base Currency Equivalent (if applicable) */}
                {isDifferentCurrency && (
                  <div className="text-[11px] text-emerald-800 font-semibold pt-0.5 flex flex-wrap items-center gap-1.5">
                    <span>{text.baseEquivalent}:</span>
                    <strong className="font-mono text-emerald-950">
                      {formatDisplayPrice(baseEquivalentAmount, baseCurrency)}
                    </strong>
                    <span className="text-emerald-700 text-[10.5px]">
                      ({text.rate}: {exchangeRate.toFixed(4)})
                    </span>
                  </div>
                )}
              </div>

              {/* Payment Purpose / For Payment Of */}
              <div className="border border-slate-200 rounded-xl p-4 bg-[#f8fafc] space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      {text.forPaymentOf}
                    </span>
                    <p className="text-[13px] font-bold text-slate-900 mt-0.5">
                      {forPaymentOf}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      {text.paymentChannel}
                    </span>
                    <p className="text-[13px] font-bold text-slate-800 mt-0.5">
                      {paymentDetails.paymentMethod || 'Bank Transfer / Cash'}
                    </p>
                  </div>
                </div>

                {paymentDetails.proofUrl && (
                  <div className="pt-2 border-t border-slate-200 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setViewingProof(true)}
                      className="px-3 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-[11px] rounded-lg transition-all flex items-center space-x-1 rtl:space-x-reverse cursor-pointer"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>{text.viewProof}</span>
                    </button>
                  </div>
                )}

                {paymentDetails.note && (
                  <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600">
                    <span className="font-bold text-slate-700">{text.note}: </span>
                    <span>{paymentDetails.note}</span>
                  </div>
                )}
              </div>

              {/* Dual Bank Accounts Settlement Verification (if available) */}
              {bankDetails && bankDetails.ourBank && (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="bg-slate-100/90 px-4 py-2 text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
                    {text.dualBankTitle}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x rtl:md:divide-x-reverse divide-slate-100 text-[11.5px]">
                    {/* Beneficiary */}
                    <div className="p-3.5 space-y-1 bg-slate-50/40">
                      <span className="text-emerald-700 font-bold text-[10.5px] uppercase block">
                        {text.beneficiaryBank}
                      </span>
                      <div className="font-bold text-slate-900">{bankDetails.ourBank.bankName}</div>
                      <div className="text-slate-600">
                        <span className="text-slate-400">A/C Name: </span>
                        <span className="font-semibold text-slate-800">{bankDetails.ourBank.accountName}</span>
                      </div>
                      <div className="text-slate-700 font-mono">
                        <span className="text-slate-400">A/C No: </span>
                        <span className="font-bold text-blue-700">{bankDetails.ourBank.accountNumber}</span>
                      </div>
                      {bankDetails.ourBank.swiftCode && (
                        <div className="text-[10.5px] text-slate-500 font-mono">
                          SWIFT: {bankDetails.ourBank.swiftCode}
                        </div>
                      )}
                    </div>

                    {/* Remitter */}
                    <div className="p-3.5 space-y-1 bg-slate-50/40">
                      <span className="text-blue-700 font-bold text-[10.5px] uppercase block">
                        {text.remitterBank}
                      </span>
                      <div className="font-bold text-slate-900">{bankDetails.payerBank?.bankName || 'Client Bank Account'}</div>
                      <div className="text-slate-600">
                        <span className="text-slate-400">A/C Name: </span>
                        <span className="font-semibold text-slate-800">{bankDetails.payerBank?.accountName || receivedFrom.company}</span>
                      </div>
                      <div className="text-slate-700 font-mono">
                        <span className="text-slate-400">A/C No: </span>
                        <span className="font-bold text-slate-800">{bankDetails.payerBank?.accountNumber || 'Confirmed via Wire'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Confirmation Financial Balance Summary / Ledger Card */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-[#f8fafc]">
                <div className="px-4 py-2 border-b border-slate-200/80 bg-slate-100/60">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                    {text?.ledgerTitle || 'RINGKASAN STATUS KEUANGAN & SALDO KONFIRMASI'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x rtl:sm:divide-x-reverse divide-slate-200 text-[11.5px] text-center">
                  <div className="p-3">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">
                      {text?.totalBilled || 'TOTAL TAGIHAN'}
                    </span>
                    <span className="font-bold text-slate-800 font-mono block mt-1">
                      {formatDisplayPrice(totalBilled ?? numericAmount ?? 0, baseCurrency || 'SAR')}
                    </span>
                  </div>
                  <div className="p-3">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">
                      {text?.thisPayment || 'PEMBAYARAN INI'}
                    </span>
                    <span className="font-bold text-emerald-600 font-mono block mt-1">
                      {formatDisplayPrice(thisPayment ?? numericAmount ?? 0, paymentCurrency || 'SAR')}
                    </span>
                  </div>
                  <div className="p-3">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">
                      {text?.totalPaid || 'TOTAL TELAH DIBAYAR'}
                    </span>
                    <span className="font-bold text-blue-700 font-mono block mt-1">
                      {formatDisplayPrice(totalPaid ?? numericAmount ?? 0, baseCurrency || 'SAR')}
                    </span>
                  </div>
                  <div className="p-3 bg-amber-50/40">
                    <span className="text-[10px] font-bold text-amber-700 uppercase block">
                      {text?.outstandingBalance || 'SISA TAGIHAN'}
                    </span>
                    <span className="font-black text-amber-800 font-mono block mt-1">
                      {formatDisplayPrice(remainingBalance ?? 0, baseCurrency || 'SAR')}
                    </span>
                  </div>
                </div>
              </div>

              {/* System Verification Footer (No Manual Signature Box) */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-slate-400">
                <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-700">{text.verifiedTitle}</p>
                    <p>{text.verifiedSub}</p>
                  </div>
                </div>

                <div className="text-center sm:text-right rtl:sm:text-left">
                  <div className="border border-slate-300 rounded-md px-3 py-1 bg-slate-50 font-mono text-[9.5px] font-bold text-slate-700 inline-block mb-1">
                    {text.verifiedBadge}
                  </div>
                  <p className="text-[9px] text-slate-400">{text.noSignReq}</p>
                </div>
              </div>

            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between font-sans">
            <span className="text-[11px] text-slate-500 font-medium">
              {text.receiptId}: <strong className="font-mono text-slate-700">{receiptData.paymentId || receiptNo}</strong>
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-[12px] transition-all cursor-pointer"
              >
                {text.close}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-5 py-2 bg-[#1d2857] hover:bg-[#151d3f] text-white font-bold rounded-xl text-[12px] flex items-center space-x-2 transition-all cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>{text.printPdf}</span>
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

      {/* Dedicated Print Sheet (Visible ONLY during window.print()) */}
      <div
        id="official-deposit-receipt-print-area"
        className="hidden print:block bg-white font-sans text-slate-800 box-border p-[12mm]"
        style={{ width: '210mm', minHeight: '297mm', margin: '0 auto' }}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="w-full bg-white p-0 flex flex-col justify-between h-full space-y-5">
          {/* Print Header */}
          <div className="pb-4 border-b-2 border-slate-800 flex items-start justify-between">
            <div className="space-y-1 w-1/2">
              <img
                src={odstLogo}
                alt="Logo"
                className="h-12 w-auto object-contain"
              />
              <div className="text-[8.5px] text-slate-600 leading-snug font-sans">
                <p className="font-bold text-slate-800">MANAZIL AL.MUKHTARA GROUP · PT. ODST AIRLINES INDO</p>
                <p>Graha Al Badgel, Jl. Hajjah Tutty Alawiyah No.7, Kalibata, Jakarta Selatan, Indonesia 12740</p>
                <p>Saudi Operations: Makkah · Madinah · Jeddah</p>
              </div>
            </div>

            <div className="text-right flex flex-col items-end w-1/2 space-y-1 rtl:text-left rtl:items-start">
              <div className="px-2.5 py-0.5 bg-slate-100 border border-slate-400 text-slate-800 text-[8.5px] font-bold uppercase tracking-wider rounded">
                {text.badge}
              </div>
              <h1 className="text-[22px] font-black text-slate-900 tracking-tight leading-none uppercase">
                {text.docTitle}
              </h1>
              <div className="text-[10.5px] font-bold text-slate-800 font-mono">
                <span>{text.receiptNo}: </span>
                <span className="font-extrabold">{receiptNo}</span>
              </div>
              <div className="text-[10px] text-slate-600">
                <span>{text.date}: </span>
                <span className="font-bold text-slate-800">{formatDateByLang(dateOfPayment, docLang)}</span>
              </div>
            </div>
          </div>

          {/* Reference Row */}
          <div className="grid grid-cols-4 gap-2 bg-slate-100/80 p-2.5 rounded border border-slate-300 text-[9.5px]">
            <div>
              <span className="text-slate-500 font-bold uppercase block text-[8px]">{text.confRef}</span>
              <span className="font-bold text-slate-900 font-mono">{invoiceNo || referenceNo || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-bold uppercase block text-[8px]">{text.refNo}</span>
              <span className="font-semibold text-slate-800 font-mono">{referenceNo || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-bold uppercase block text-[8px]">{text.serialNo}</span>
              <span className="font-semibold text-slate-800 font-mono">{serialNo || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-bold uppercase block text-[8px]">{text.sequence}</span>
              <span className="font-bold text-slate-800">
                {receiptData.sequence
                  ? `Installment #${receiptData.sequence}`
                  : (groupNumber ? `Group: ${groupNumber}` : 'Deposit Portion')}
              </span>
            </div>
          </div>

          {/* Received From */}
          <div className="border border-slate-300 rounded p-3 bg-white space-y-1 text-[10px]">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
              {text.receivedFrom}
            </span>
            <div className="flex justify-between items-baseline">
              <span className="text-[14px] font-black text-slate-900">{receivedFrom.company}</span>
              {receivedFrom.companyCode && (
                <span className="font-mono font-bold text-slate-600 text-[10px]">
                  {text.companyCode}: {receivedFrom.companyCode}
                </span>
              )}
            </div>
            {receivedFrom.address && (
              <p className="text-[9px] text-slate-600">{receivedFrom.address}</p>
            )}
          </div>

          {/* Amount Box */}
          <div className="border-2 border-slate-800 rounded p-3.5 bg-slate-50/50 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                {text.amountReceived}
              </span>
              <span className="text-[18px] font-black text-slate-900 font-mono">
                {formatDisplayPrice(numericAmount, paymentCurrency)}
              </span>
            </div>

            <div className="p-2.5 bg-white rounded border border-slate-300">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
                {text.amountInWords}
              </span>
              <p className="text-[11px] font-bold text-slate-900 italic mt-0.5 font-serif">
                "{localizedWords}"
              </p>
            </div>

            {isDifferentCurrency && (
              <div className="text-[9.5px] text-slate-700 font-medium">
                <span className="font-bold">{text.baseEquivalent}: </span>
                <span>
                  {formatDisplayPrice(baseEquivalentAmount, baseCurrency)} ({text.rate}: {exchangeRate.toFixed(4)})
                </span>
              </div>
            )}
          </div>

          {/* Dual Bank (if present) */}
          {bankDetails && bankDetails.ourBank && (
            <div className="border border-slate-300 rounded overflow-hidden">
              <div className="bg-slate-200 px-3 py-1 text-[8.5px] font-bold text-slate-700 uppercase tracking-wider">
                {text.dualBankTitle}
              </div>
              <div className="grid grid-cols-2 divide-x rtl:divide-x-reverse divide-slate-200 text-[9.5px]">
                <div className="p-2 space-y-0.5">
                  <span className="font-bold text-emerald-800 uppercase block text-[8px]">{text.beneficiaryBank}</span>
                  <div className="font-bold text-slate-900">{bankDetails.ourBank.bankName}</div>
                  <div>A/C: <strong>{bankDetails.ourBank.accountName}</strong></div>
                  <div className="font-mono">No: <strong>{bankDetails.ourBank.accountNumber}</strong></div>
                </div>
                <div className="p-2 space-y-0.5">
                  <span className="font-bold text-blue-800 uppercase block text-[8px]">{text.remitterBank}</span>
                  <div className="font-bold text-slate-900">{bankDetails.payerBank?.bankName || 'Client Bank'}</div>
                  <div>A/C: <strong>{bankDetails.payerBank?.accountName || receivedFrom.company}</strong></div>
                  <div className="font-mono">No: <strong>{bankDetails.payerBank?.accountNumber || 'Confirmed via Wire'}</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* For Payment Of */}
          <div className="border border-slate-300 rounded p-3 space-y-1 text-[10px]">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
              {text.forPaymentOf}
            </span>
            <p className="text-[11.5px] font-bold text-slate-800">{forPaymentOf}</p>
            {paymentDetails.note && (
              <p className="text-[9.5px] text-slate-600 pt-1 border-t border-slate-200">
                <span className="font-bold">{text.note}: </span>
                {paymentDetails.note}
              </p>
            )}
          </div>

          {/* Balance Breakdown Table */}
          <div className="border border-slate-300 rounded overflow-hidden">
            <div className="bg-slate-200 px-3 py-1 text-[8.5px] font-bold text-slate-700 uppercase tracking-wider">
              {text?.ledgerTitle || 'RINGKASAN STATUS KEUANGAN & SALDO KONFIRMASI'}
            </div>
            <div className="grid grid-cols-4 divide-x rtl:divide-x-reverse divide-slate-200 text-[9.5px] text-center">
              <div className="p-2">
                <span className="text-[8px] text-slate-500 uppercase block">
                  {text?.totalBilled || 'TOTAL TAGIHAN'}
                </span>
                <span className="font-bold text-slate-900 block mt-0.5">
                  {formatDisplayPrice(totalBilled ?? numericAmount ?? 0, baseCurrency || 'SAR')}
                </span>
              </div>
              <div className="p-2">
                <span className="text-[8px] text-slate-500 uppercase block">
                  {text?.thisPayment || 'PEMBAYARAN INI'}
                </span>
                <span className="font-bold text-slate-900 block mt-0.5">
                  {formatDisplayPrice(thisPayment ?? numericAmount ?? 0, paymentCurrency || 'SAR')}
                </span>
              </div>
              <div className="p-2">
                <span className="text-[8px] text-slate-500 uppercase block">
                  {text?.totalPaid || 'TOTAL TELAH DIBAYAR'}
                </span>
                <span className="font-bold text-slate-900 block mt-0.5">
                  {formatDisplayPrice(totalPaid ?? numericAmount ?? 0, baseCurrency || 'SAR')}
                </span>
              </div>
              <div className="p-2 bg-slate-50">
                <span className="text-[8px] font-bold text-slate-700 uppercase block">
                  {text?.outstandingBalance || 'SISA TAGIHAN'}
                </span>
                <span className="font-black text-slate-900 block mt-0.5">
                  {formatDisplayPrice(remainingBalance ?? 0, baseCurrency || 'SAR')}
                </span>
              </div>
            </div>
          </div>

          {/* Print Footer */}
          <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-[8.5px] text-slate-500">
            <div>
              <span className="font-bold text-slate-700">{text.verifiedTitle}</span> · {text.verifiedSub}
            </div>
            <div className="font-mono font-bold">
              {text.verifiedBadge} · {text.noSignReq}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox for Payment Proof */}
      {viewingProof && paymentDetails.proofUrl && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-4 print:hidden"
          onClick={() => setViewingProof(false)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 bg-slate-900 text-white flex justify-between items-center">
              <span className="text-[13px] font-bold">Transfer Proof Document</span>
              <button
                type="button"
                onClick={() => setViewingProof(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(85vh-60px)] flex items-center justify-center bg-slate-100">
              {paymentDetails.proofUrl.startsWith('data:application/pdf') ? (
                <iframe src={paymentDetails.proofUrl} title="Proof PDF" className="w-full h-[65vh] rounded-lg border border-slate-200" />
              ) : (
                <img src={paymentDetails.proofUrl} alt="Proof" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OfficialDepositReceiptModal;
