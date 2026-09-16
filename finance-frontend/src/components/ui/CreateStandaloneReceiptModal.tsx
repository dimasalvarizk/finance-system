import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Check, AlertCircle, FileText, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getLocalCompanySettings } from '../../pages/Invoices';
import { createStandaloneReceipt, type StandaloneReceiptPayload } from '../../services/invoiceService';
import type { ReceiptData } from './OfficialDepositReceiptModal';

interface CompanyOption {
  id?: string;
  name: string;
  code: string;
  phone?: string;
  address?: string;
  taxNumber?: string;
  agent?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  availableCompanies: CompanyOption[];
  configuredRates: { usdToIdr: number; sarToIdr: number; usdToSar: number };
  onReceiptGenerated: (receiptData: ReceiptData) => void;
}

export const CreateStandaloneReceiptModal: React.FC<Props> = ({
  isOpen,
  onClose,
  availableCompanies,
  configuredRates,
  onReceiptGenerated,
}) => {
  const { t } = useTranslation();
  const companyDefaults = getLocalCompanySettings();

  // Form State
  const [selectedClientKey, setSelectedClientKey] = useState<string>('Pilih Perusahaan...');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Top details
  const [receiptNo, setReceiptNo] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Payer Details
  const [companyName, setCompanyName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [payerAgent, setPayerAgent] = useState('');
  const [payerAddress, setPayerAddress] = useState('');
  const [payerTaxNumber, setPayerTaxNumber] = useState('');

  // Transaction Details
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('SAR');
  const [exchangeRate, setExchangeRate] = useState<number>(1.0);
  const [paymentMethod, setPaymentMethod] = useState('Bank Wire Transfer');
  const [forPaymentOf, setForPaymentOf] = useState('Advance Deposit for Ground Handling & Accommodation');
  const [groupNumber, setGroupNumber] = useState('');
  const [note, setNote] = useState('');

  // Our Bank Details (Beneficiary)
  const [ourBankName, setOurBankName] = useState(companyDefaults.bankName || 'PT Bank Negara Indonesia (Persero) Tbk');
  const [ourAccountName, setOurAccountName] = useState(companyDefaults.accountName || 'PT ODST AIRLINES INDO');
  const [ourAccountNumber, setOurAccountNumber] = useState(companyDefaults.usdAccountNumber || '009821482561');
  const [ourBankBranch, setOurBankBranch] = useState(companyDefaults.bankBranchAddress || 'Grha BNI, Jakarta Pusat');
  const [ourSwiftCode, setOurSwiftCode] = useState(companyDefaults.swiftCode || 'BNINIDJA');

  // Payer Bank Details (Remitter)
  const [payerBankName, setPayerBankName] = useState('');
  const [payerAccountName, setPayerAccountName] = useState('');
  const [payerAccountNumber, setPayerAccountNumber] = useState('');

  // Proof Upload
  const [proofBase64, setProofBase64] = useState<string | null>(null);
  const [proofFileName, setProofFileName] = useState<string | null>(null);

  // Status
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsClientDropdownOpen(false);
      }
    };
    if (isClientDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isClientDropdownOpen]);

  // Update exchange rate based on currency and configured rates
  useEffect(() => {
    if (currency === 'USD') {
      setExchangeRate(configuredRates.usdToSar || 3.75);
    } else if (currency === 'IDR') {
      setExchangeRate(configuredRates.sarToIdr ? 1 / configuredRates.sarToIdr : 0.000208);
    } else {
      setExchangeRate(1.0);
    }
  }, [currency, configuredRates]);

  // Auto-fill our bank account based on selected currency
  useEffect(() => {
    if (currency === 'IDR') {
      setOurAccountNumber(companyDefaults.idrAccountNumber || '009821482103');
    } else {
      setOurAccountNumber(companyDefaults.usdAccountNumber || '009821482561');
    }
  }, [currency]);

  // Generate automatic numbers
  const generateNumbers = (code: string, dateStr: string) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mmdd = `${mm}${dd}`;
    const cleanCode = (code || 'DEP').toUpperCase().trim();
    const randomRefSuffix = Math.floor(100 + Math.random() * 900);
    const randomSerialSuffix = Math.floor(100000 + Math.random() * 900000);

    const generatedReceipt = `${cleanCode}-${mmdd}-001`;
    const generatedRef = `REF-${mmdd}-${randomRefSuffix}`;
    const generatedSerial = `SR-${randomSerialSuffix}`;
    const generatedGroup = `GRP-${yyyy}-${cleanCode}-${randomRefSuffix}`;

    setReceiptNo(generatedReceipt);
    setReferenceNo(generatedRef);
    setSerialNo(generatedSerial);
    setGroupNumber(generatedGroup);
  };

  // Handle Client Selection
  const handleSelectCompany = (comp: CompanyOption) => {
    const key = `${comp.name} - ${comp.code}`;
    setSelectedClientKey(key);
    setIsClientDropdownOpen(false);
    setCompanyName(comp.name);
    setCompanyCode(comp.code);
    setPayerAgent(comp.agent || '');
    setPayerAddress(comp.address || '');
    setPayerTaxNumber(comp.taxNumber || '');
    setPayerAccountName(comp.name);

    generateNumbers(comp.code, paymentDate);
  };

  const handleSelectOthers = () => {
    setSelectedClientKey('Others');
    setIsClientDropdownOpen(false);
    setCompanyName('');
    setCompanyCode('OTH');
    setPayerAgent('');
    setPayerAddress('');
    setPayerTaxNumber('');
    setPayerAccountName('');
    generateNumbers('OTH', paymentDate);
  };

  // Initialize on open
  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);
    if (availableCompanies && availableCompanies.length > 0) {
      handleSelectCompany(availableCompanies[0]);
    } else {
      handleSelectOthers();
    }
  }, [isOpen]);

  // Handle Proof Upload
  const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage(t('depositReceipt.errProofSize') || 'Ukuran file melebihi batas 10MB');
        return;
      }
      setProofFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        setProofBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage(t('depositReceipt.errAmount') || 'Harap masukkan jumlah nominal deposit yang valid di atas 0');
      return;
    }

    if (!companyName.trim()) {
      setErrorMessage(t('depositReceipt.errPayer') || 'Harap pilih atau masukkan nama perusahaan pembayar');
      return;
    }

    setSubmitting(true);
    try {
      const payload: StandaloneReceiptPayload = {
        companyName: companyName.trim(),
        companyCode: companyCode ? companyCode.trim() : undefined,
        payerAddress: payerAddress.trim() || undefined,
        payerTaxNumber: payerTaxNumber.trim() || undefined,
        payerAgent: payerAgent.trim() || undefined,
        payerBankName: payerBankName.trim() || undefined,
        payerAccountName: payerAccountName.trim() || undefined,
        payerAccountNumber: payerAccountNumber.trim() || undefined,
        ourBankName: ourBankName.trim() || undefined,
        ourAccountName: ourAccountName.trim() || undefined,
        ourAccountNumber: ourAccountNumber.trim() || undefined,
        ourBankBranch: ourBankBranch.trim() || undefined,
        ourSwiftCode: ourSwiftCode.trim() || undefined,
        amount: numAmount,
        currency,
        exchangeRate,
        paymentDate,
        paymentMethod,
        forPaymentOf: forPaymentOf.trim() || 'Advance Deposit for Ground Handling & Accommodation',
        referenceNo: referenceNo.trim() || undefined,
        groupNumber: groupNumber.trim() || undefined,
        note: note.trim() || undefined,
        proofUrl: proofBase64 || undefined,
      };

      const res = await createStandaloneReceipt(payload);
      if (res && res.data) {
        onReceiptGenerated(res.data);
        onClose();
      } else {
        throw new Error('Tidak ada data kuitansi yang diterima dari server');
      }
    } catch (err: any) {
      console.error('Failed to create standalone receipt:', err);
      setErrorMessage(err.response?.data?.message || err.message || 'Gagal menerbitkan kuitansi deposit.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isCustomClient = selectedClientKey === 'Others';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0d0f]/50 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in font-sans"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-[#e2e8f0] shadow-2xl max-w-4xl w-full my-8 overflow-hidden flex flex-col animate-scale-up text-[#0c0d0f]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-[#e2e8f0] flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#fef3c7] text-[#d97706] flex items-center justify-center font-bold">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-[18px] font-black tracking-tight text-[#0c0d0f] font-sans">
                {t('depositReceipt.generateTitle') || 'Buat Kuitansi Resmi Pembayaran Di Muka'}
              </h3>
              <p className="text-[12px] font-medium text-[#64748b]">
                {t('depositReceipt.generateSubtitle') || 'Voucher kuitansi kas/bank langsung dengan verifikasi rekening bank kedua belah pihak'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f1f5f9] text-[#64748b] hover:text-[#0c0d0f] hover:bg-[#e2e8f0] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="bg-[#fef2f2] border-b border-[#fee2e2] px-8 py-3 flex items-center gap-2.5 text-[#ef4444] text-[13px] font-semibold flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-[#ef4444] shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Top Dropdown: Pilihan Nama Perusahaan / Klien */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-sans">
              {t('depositReceipt.selectRegisteredPayer') || 'Pilihan Nama Perusahaan / Klien'}
            </label>
            <button
              type="button"
              onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
              className="w-full px-4 py-3 border border-[#e2e8f0] rounded-xl text-[13px] font-bold text-[#0c0d0f] bg-white hover:border-[#cbd5e1] focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all flex items-center justify-between cursor-pointer font-sans"
            >
              <div className="flex items-center space-x-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${isCustomClient ? 'bg-amber-500' : 'bg-[#f59e0b]'}`} />
                <span>
                  {isCustomClient ? (t('depositReceipt.orCustomPayer') || 'Klien Kustom / Sekali Pakai') : selectedClientKey}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
            {isClientDropdownOpen && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-[#e2e8f0] rounded-xl shadow-xl z-50 py-1.5 divide-y divide-[#f1f5f9] max-h-60 overflow-y-auto">
                <button
                  type="button"
                  onClick={handleSelectOthers}
                  className="w-full px-4 py-2.5 text-left text-[13px] font-bold text-amber-600 bg-amber-50/50 hover:bg-amber-100/70 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>{t('depositReceipt.orCustomPayer') || 'Klien Kustom / Sekali Pakai'}</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-800">
                    Custom
                  </span>
                </button>
                {availableCompanies && availableCompanies.length > 0 ? (
                  availableCompanies.map((comp) => {
                    const key = `${comp.name} - ${comp.code}`;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSelectCompany(comp)}
                        className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-[#1e293b] hover:bg-[#f8fafc] flex items-center space-x-2 cursor-pointer"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                        <span>{key}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="px-4 py-3 text-[13px] text-gray-500 text-center font-semibold bg-[#f8fafc]">
                    Tidak ada data perusahaan
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Top Details Grid (4 Columns) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-sans">
                {t('depositReceipt.receiptNo') || 'Nomor Kuitansi'}
              </label>
              <input
                type="text"
                readOnly
                value={receiptNo}
                className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-bold transition-all font-inter bg-[#f8fafc] text-[#0c0d0f]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-sans">
                {t('depositReceipt.referenceNo') || 'Nomor Referensi'}
              </label>
              <input
                type="text"
                required
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold transition-all font-inter bg-[#f8fafc] text-[#0c0d0f] focus:border-[#f59e0b] focus:ring-[#f59e0b]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-sans">
                {t('depositReceipt.serialNo') || 'Nomor Seri'}
              </label>
              <input
                type="text"
                required
                value={serialNo}
                onChange={(e) => setSerialNo(e.target.value)}
                className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold transition-all font-inter bg-[#f8fafc] text-[#0c0d0f] focus:border-[#f59e0b] focus:ring-[#f59e0b]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-inter">
                {t('depositReceipt.paymentDate') || 'Tanggal Pembayaran'}
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => {
                  setPaymentDate(e.target.value);
                  generateNumbers(companyCode, e.target.value);
                }}
                className="w-full px-3.5 py-2 border border-[#fef3c7] text-[#d97706] bg-[#fffbeb] rounded-xl text-[13px] font-bold transition-all font-inter cursor-pointer focus:border-[#f59e0b] focus:ring-[#f59e0b]"
              />
            </div>
          </div>

          {/* DITAGIHKAN DARI (REKENING KAMI) & DITAGIHKAN KEPADA (DITERIMA DARI) GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rekening Bank Penerima (Perusahaan Kami) */}
            <div className="bg-[#f8fafc] p-5 rounded-2xl border border-[#e2e8f0] flex flex-col justify-between min-h-[180px]">
              <div>
                <h4 className="text-[12px] font-bold text-[#0c0d0f] uppercase tracking-wider font-inter mb-4">
                  {t('depositReceipt.beneficiaryBank') || 'REKENING BANK PENERIMA (PERUSAHAAN KAMI)'}
                </h4>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-[13px] font-sans">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1">
                      {t('depositReceipt.accountName') || 'Nama Pemilik Rekening'}
                    </label>
                    <input
                      type="text"
                      required
                      value={ourAccountName}
                      onChange={(e) => setOurAccountName(e.target.value)}
                      className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-bold text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] transition-all font-inter"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1">
                      {t('depositReceipt.bankName') || 'Nama Bank'}
                    </label>
                    <input
                      type="text"
                      required
                      value={ourBankName}
                      onChange={(e) => setOurBankName(e.target.value)}
                      className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] transition-all font-inter"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1">
                      {t('depositReceipt.accountNumber') || 'Nomor Rekening / IBAN'}
                    </label>
                    <input
                      type="text"
                      required
                      value={ourAccountNumber}
                      onChange={(e) => setOurAccountNumber(e.target.value)}
                      className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-bold text-blue-700 bg-white focus:outline-none focus:border-[#f59e0b] transition-all font-inter"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1">
                      {t('depositReceipt.swiftCode') || 'Kode SWIFT'}
                    </label>
                    <input
                      type="text"
                      required
                      value={ourSwiftCode}
                      onChange={(e) => setOurSwiftCode(e.target.value)}
                      className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] transition-all font-inter"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1">
                      {t('depositReceipt.branch') || 'Cabang Bank'}
                    </label>
                    <input
                      type="text"
                      value={ourBankBranch}
                      onChange={(e) => setOurBankBranch(e.target.value)}
                      className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-medium text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] transition-all font-inter"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Diterima Dari (Pembayar / Klien) */}
            <div className="bg-[#f8fafc] p-5 rounded-2xl border border-[#e2e8f0] flex flex-col justify-between min-h-[180px]">
              <div>
                <h4 className="text-[12px] font-bold text-[#0c0d0f] uppercase tracking-wider font-inter mb-4">
                  {t('depositReceipt.receivedFrom') || 'DITERIMA DARI (PEMBAYAR)'}
                </h4>

                {isCustomClient ? (
                  <div className="space-y-3 text-[13px] font-sans">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1 font-inter">
                          {t('depositReceipt.payerCompanyName') || 'Perusahaan Klien'} <span className="text-[#ef4444]">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Nama Perusahaan"
                          className="w-full px-3 py-1.5 border border-[#e2e8f0] rounded-xl text-[13px] font-bold text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1 font-inter">
                          {t('depositReceipt.payerAgent') || 'Agent'}
                        </label>
                        <input
                          type="text"
                          value={payerAgent}
                          onChange={(e) => setPayerAgent(e.target.value)}
                          placeholder="Nama Agent / PIC"
                          className="w-full px-3 py-1.5 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#d97706] bg-white focus:outline-none focus:border-[#f59e0b]"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1 font-inter">
                          {t('depositReceipt.payerAddress') || 'Alamat Jalan'}
                        </label>
                        <input
                          type="text"
                          value={payerAddress}
                          onChange={(e) => setPayerAddress(e.target.value)}
                          placeholder="Alamat Lengkap"
                          className="w-full px-3 py-1.5 border border-[#e2e8f0] rounded-xl text-[12px] font-medium text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1 font-inter">
                          {t('depositReceipt.payerTaxNumber') || 'NPWP / No. Pajak'}
                        </label>
                        <input
                          type="text"
                          value={payerTaxNumber}
                          onChange={(e) => setPayerTaxNumber(e.target.value)}
                          placeholder="3000-1234-5678"
                          className="w-full px-3 py-1.5 border border-[#e2e8f0] rounded-xl text-[12px] font-medium text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b]"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200">
                      <div>
                        <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1 font-inter">
                          {t('depositReceipt.bankName') || 'Nama Bank Pembayar'}
                        </label>
                        <input
                          type="text"
                          value={payerBankName}
                          onChange={(e) => setPayerBankName(e.target.value)}
                          placeholder="Bank Pembayar"
                          className="w-full px-3 py-1.5 border border-[#e2e8f0] rounded-xl text-[12px] font-medium text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1 font-inter">
                          {t('depositReceipt.accountNumber') || 'No. Rekening Pembayar'}
                        </label>
                        <input
                          type="text"
                          value={payerAccountNumber}
                          onChange={(e) => setPayerAccountNumber(e.target.value)}
                          placeholder="No. Rekening / IBAN"
                          className="w-full px-3 py-1.5 border border-[#e2e8f0] rounded-xl text-[12px] font-medium text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b]"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5 text-[13px] font-sans">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="block text-[10px] font-semibold text-[#94a3b8] mb-0.5 font-inter">
                          {t('invoices.clientCompany') || 'Perusahaan Klien'}
                        </span>
                        <span className="font-bold text-[14px] text-[#0c0d0f] block">
                          {companyName || 'Pilih perusahaan'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] font-semibold text-[#94a3b8] mb-0.5 font-inter">
                          {t('invoices.agent') || 'Agent'}
                        </span>
                        <span className="font-bold text-[13px] text-[#d97706] block">
                          {payerAgent || '-'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="block text-[10px] font-semibold text-[#94a3b8] mb-0.5 font-inter">
                        {t('invoices.streetAddress') || 'Alamat Jalan'}
                      </span>
                      <span className="font-medium text-[12px] text-[#475569] block">
                        {payerAddress || '-'}
                      </span>
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      <span className="block text-[10px] font-semibold text-[#94a3b8] mb-0.5 font-inter">
                        {t('depositReceipt.payerTaxNumber') || 'NPWP / No. Pajak'}
                      </span>
                      <span className="font-mono text-[12px] font-bold text-[#0c0d0f] block">
                        {payerTaxNumber || '-'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                      <div>
                        <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1 font-inter">
                          {t('depositReceipt.bankName') || 'Bank Pembayar'}
                        </label>
                        <input
                          type="text"
                          value={payerBankName}
                          onChange={(e) => setPayerBankName(e.target.value)}
                          placeholder="e.g. Al Rajhi / Mandiri"
                          className="w-full px-3 py-1.5 border border-[#e2e8f0] rounded-xl text-[12px] font-medium text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1 font-inter">
                          {t('depositReceipt.accountNumber') || 'No. Rekening Pembayar'}
                        </label>
                        <input
                          type="text"
                          value={payerAccountNumber}
                          onChange={(e) => setPayerAccountNumber(e.target.value)}
                          placeholder="e.g. SA038000..."
                          className="w-full px-3 py-1.5 border border-[#e2e8f0] rounded-xl text-[12px] font-medium text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RINCIAN TRANSAKSI PEMBAYARAN */}
          <div className="bg-[#f8fafc] p-5 rounded-2xl border border-[#e2e8f0] space-y-4">
            <h4 className="text-[12px] font-bold text-[#0c0d0f] uppercase tracking-wider font-inter">
              {t('depositReceipt.paymentDetails') || 'RINCIAN TRANSAKSI PEMBAYARAN'}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-sans">
                  {t('depositReceipt.depositAmount') || 'Jumlah Pembayaran / DP'} <span className="text-[#ef4444]">*</span>
                </label>
                <div className="flex rounded-xl overflow-hidden border border-[#e2e8f0] focus-within:border-[#f59e0b] focus-within:ring-1 focus-within:ring-[#f59e0b] bg-white">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="h-10 px-3 bg-slate-100 border-r border-slate-200 text-[13px] font-black text-slate-800 cursor-pointer focus:outline-none"
                  >
                    <option value="SAR">SAR</option>
                    <option value="USD">USD</option>
                    <option value="IDR">IDR</option>
                  </select>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 h-10 px-3.5 text-[15px] font-extrabold text-[#0c0d0f] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-sans">
                  {t('depositReceipt.paymentMethod') || 'Metode Pembayaran'}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-10 px-3.5 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] cursor-pointer"
                >
                  <option value="Bank Wire Transfer">Bank Wire Transfer</option>
                  <option value="Cash Deposit">Cash Deposit</option>
                  <option value="Bank Cheque">Bank Cheque</option>
                  <option value="Online / POS Card">Online / POS Card</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-sans">
                  {t('depositReceipt.forPaymentOf') || 'Untuk Pembayaran (Tujuan)'}
                </label>
                <input
                  type="text"
                  value={forPaymentOf}
                  onChange={(e) => setForPaymentOf(e.target.value)}
                  placeholder="Uang Muka Ground Handling"
                  className="w-full h-10 px-3.5 border border-[#e2e8f0] rounded-xl text-[13px] font-medium text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b]"
                />
              </div>
            </div>
          </div>

          {/* INFORMASI TAMBAHAN (OPSIONAL) */}
          <div className="bg-[#f8fafc] p-5 rounded-2xl border border-[#e2e8f0] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-[12px] font-bold text-[#0c0d0f] uppercase tracking-wider font-inter">
                  {t('invoices.additionalInfo') || 'INFORMASI TAMBAHAN (OPSIONAL)'}
                </h4>
                <p className="text-[11px] text-[#64748b] mt-0.5">
                  Detail nomor grup, catatan internal, dan bukti transfer opsional.
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f1f5f9] text-[#64748b]">
                OPTIONAL
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-sans">
                  {t('depositReceipt.groupNo') || 'Nomor Grup'}
                </label>
                <input
                  type="text"
                  value={groupNumber}
                  onChange={(e) => setGroupNumber(e.target.value)}
                  placeholder="cth. GRP-2026-JKT01"
                  className="w-full h-10 px-3.5 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-sans">
                  {t('depositReceipt.note') || 'Catatan Internal'}
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Catatan tambahan..."
                  className="w-full h-10 px-3.5 border border-[#e2e8f0] rounded-xl text-[13px] font-medium text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b]"
                />
              </div>
            </div>

            {/* Upload Bukti Transfer */}
            <div>
              <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-sans">
                {t('depositReceipt.paymentProof') || 'Bukti Transfer (Image / PDF)'}
              </label>
              <label className="border-2 border-dashed border-[#cbd5e1] hover:border-[#f59e0b] rounded-xl p-3.5 flex items-center justify-center space-x-3 bg-white hover:bg-amber-50/20 transition-all cursor-pointer">
                <Upload className="w-5 h-5 text-[#94a3b8]" />
                <div className="text-left">
                  <span className="text-[12.5px] font-bold text-[#0c0d0f] block">
                    {proofFileName || (t('depositReceipt.dropFileHere') || 'Klik atau seret bukti transfer ke sini')}
                  </span>
                  <span className="text-[11px] text-[#94a3b8]">
                    Format Gambar (JPG/PNG) atau PDF (Maks. 10MB)
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleProofChange}
                  className="hidden"
                />
              </label>

              {proofFileName && (
                <div className="mt-2 flex items-center justify-between text-[12px] bg-emerald-50 text-emerald-800 px-3.5 py-2 rounded-xl border border-emerald-200 font-semibold">
                  <span className="truncate max-w-[340px]">✓ {proofFileName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setProofBase64(null);
                      setProofFileName(null);
                    }}
                    className="text-red-500 font-bold hover:underline cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-8 py-5 border-t border-[#e2e8f0] bg-white flex items-center justify-end space-x-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13px] font-bold text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0c0d0f] transition-all cursor-pointer"
          >
            {t('common.cancel') || 'Batal'}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold text-[13px] rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center space-x-2 disabled:opacity-50"
          >
            {submitting ? (
              <span>{t('depositReceipt.generating') || 'Menerbitkan Kuitansi...'}</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{t('depositReceipt.submitGenerate') || 'Buat & Lihat Kuitansi Resmi'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateStandaloneReceiptModal;
