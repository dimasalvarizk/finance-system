import React, { useState, useEffect } from 'react';
import { X, AlertCircle, FileText, ChevronDown, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type Invoice, type CompanyOption } from './types';
import { formatPrice, convertPrice, splitAddress, getExchangeRatesToShow, calculateConvertedTotals } from './invoiceUtils';
import { createInvoice as createInvoiceAPI, updateInvoice as updateInvoiceAPI } from '../../../services/invoiceService';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  editInvoice: Invoice | null;
  existingInvoices: Invoice[];
  availableCompanies: CompanyOption[];
  availableServices: { name: string; price: number; currency?: string }[];
  configuredRates: { usdToIdr: number; sarToIdr: number; usdToSar: number };
  globalTaxRate: number;
  user: any;
  companySettings: any;
  onSuccess: (savedInvoice: Invoice, isEdit: boolean) => void;
  triggerAlert: (title: string, message: string, type?: 'success' | 'info') => void;
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  isOpen,
  onClose,
  editInvoice,
  existingInvoices,
  availableCompanies,
  availableServices,
  configuredRates,
  globalTaxRate,
  user,
  companySettings,
  onSuccess,
  triggerAlert,
}) => {
  const { t } = useTranslation();

  const [selectedClientKey, setSelectedClientKey] = useState<string>('Select client company...');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [formAgent, setFormAgent] = useState<string>('');
  const [formCurrency, setFormCurrency] = useState<string>('USD');
  const [formInvoiceNo, setFormInvoiceNo] = useState('');
  const [formRef, setFormRef] = useState('');
  const [formSerial, setFormSerial] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formInvoiceDate, setFormInvoiceDate] = useState('');

  // Custom Client Fields (for "Others" one-off clients)
  const [customCompanyName, setCustomCompanyName] = useState('');
  const [customCompanyEmail, setCustomCompanyEmail] = useState('');
  const [customCompanyAgent, setCustomCompanyAgent] = useState('');
  const [customCompanyAddress, setCustomCompanyAddress] = useState('');
  const [customCompanyCityCountry, setCustomCompanyCityCountry] = useState('');
  const [customCompanyTaxNumber, setCustomCompanyTaxNumber] = useState('');

  // Optional Group & Nationality Details
  const [formGroupNumber, setFormGroupNumber] = useState('');
  const [formNationality, setFormNationality] = useState('');

  // Bill From
  const [formEmpName, setFormEmpName] = useState('');
  const [formCompNumber, setFormCompNumber] = useState('');
  const [formEmpId, setFormEmpId] = useState('');
  const [formCompEmail, setFormCompEmail] = useState('');
  const [formEntity, setFormEntity] = useState('');

  // Items
  const [formItems, setFormItems] = useState<{ description: string; qty: number; price: number; isService?: boolean }[]>([]);
  const [formHasAdvancePayment, setFormHasAdvancePayment] = useState(false);
  const [formAdvancePayment, setFormAdvancePayment] = useState('');

  const [formError, setFormError] = useState('');
  const [showValidation, setShowValidation] = useState(false);
  const [activeFocusIndex, setActiveFocusIndex] = useState<{ index: number; field: 'price' | 'qty' } | null>(null);
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCustomClient = selectedClientKey === 'Others';

  const generateInvoiceNumber = (compCode: string, dateStr: string, currentInvoices: Invoice[]) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const mmdd = `${mm}${dd}`;

    const prefix = `${compCode}-${mmdd}-`;
    const matching = currentInvoices.filter(inv => inv.invoiceNo.startsWith(prefix));

    let nextSeq = 1;
    if (matching.length > 0) {
      const seqs = matching.map(inv => {
        const parts = inv.invoiceNo.split('-');
        const lastPart = parts[parts.length - 1];
        return parseInt(lastPart, 10) || 0;
      });
      nextSeq = Math.max(...seqs) + 1;
    }
    const seqStr = String(nextSeq).padStart(3, '0');
    return `${compCode}-${mmdd}-${seqStr}`;
  };

  const handleClientChange = (comp: CompanyOption) => {
    const key = `${comp.name} - ${comp.code}`;
    setSelectedClientKey(key);
    setIsClientDropdownOpen(false);
    setFormAgent(comp.agent || '');
    setCustomCompanyName('');
    setCustomCompanyEmail('');
    setCustomCompanyAgent('');
    setCustomCompanyAddress('');
    setCustomCompanyCityCountry('');
    setCustomCompanyTaxNumber('');

    const today = new Date();
    const futureDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const yyyy = futureDate.getFullYear();
    const mm = String(futureDate.getMonth() + 1).padStart(2, '0');
    const dd = String(futureDate.getDate()).padStart(2, '0');
    const dateToUse = `${yyyy}-${mm}-${dd}`;

    setFormDate(dateToUse);

    const generatedNo = generateInvoiceNumber(comp.code, dateToUse, existingInvoices);
    setFormInvoiceNo(generatedNo);

    const randomRefSuffix = Math.floor(100 + Math.random() * 900);
    const randomSerialSuffix = Math.floor(100000 + Math.random() * 900000);

    const dateObj = new Date(dateToUse);
    const rMm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const rDd = String(dateObj.getDate()).padStart(2, '0');
    const mmdd = `${rMm}${rDd}`;

    setFormRef(`REF-${mmdd}-${randomRefSuffix}`);
    setFormSerial(`SR-${randomSerialSuffix}`);
  };

  const handleSelectOthers = () => {
    setSelectedClientKey('Others');
    setIsClientDropdownOpen(false);
    setFormAgent('');
    setCustomCompanyName('');
    setCustomCompanyEmail('');
    setCustomCompanyAgent('');
    setCustomCompanyAddress('');
    setCustomCompanyCityCountry('');
    setCustomCompanyTaxNumber('');

    const today = new Date();
    const futureDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const yyyy = futureDate.getFullYear();
    const mm = String(futureDate.getMonth() + 1).padStart(2, '0');
    const dd = String(futureDate.getDate()).padStart(2, '0');
    const dateToUse = `${yyyy}-${mm}-${dd}`;

    setFormDate(dateToUse);

    const generatedNo = generateInvoiceNumber('RCN', dateToUse, existingInvoices);
    setFormInvoiceNo(generatedNo);

    const randomRefSuffix = Math.floor(100 + Math.random() * 900);
    const randomSerialSuffix = Math.floor(100000 + Math.random() * 900000);

    const dateObj = new Date(dateToUse);
    const rMm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const rDd = String(dateObj.getDate()).padStart(2, '0');
    const mmdd = `${rMm}${rDd}`;

    setFormRef(`REF-${mmdd}-${randomRefSuffix}`);
    setFormSerial(`SR-${randomSerialSuffix}`);
  };

  const handleDateChange = (newDate: string) => {
    setFormDate(newDate);
    const compCode = selectedClientKey === 'Others' ? 'RCN' : (selectedClientKey.split(' - ')[1] || 'GEN');
    const generatedNo = generateInvoiceNumber(compCode, newDate, existingInvoices);
    setFormInvoiceNo(generatedNo);

    const dateObj = new Date(newDate);
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const mmdd = `${mm}${dd}`;
    const randomRefSuffix = Math.floor(100 + Math.random() * 900);
    setFormRef(`REF-${mmdd}-${randomRefSuffix}`);
  };

  const handleAddItem = () => {
    setFormItems([
      ...formItems,
      {
        description: '',
        qty: 1,
        price: 0,
        isService: false
      },
    ]);
  };

  const handleUpdateItem = (index: number, field: 'description' | 'qty' | 'price', value: any) => {
    const updated = formItems.map((item, idx) => {
      if (idx === index) {
        return {
          ...item,
          [field]: value,
        };
      }
      return item;
    });
    setFormItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    if (formItems.length === 1) {
      setFormItems([{ description: '', qty: 1, price: 0 }]);
    } else {
      const updated = formItems.filter((_, idx) => idx !== index);
      setFormItems(updated);
    }
  };

  const isDueDateInPast = () => {
    if (!formDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(formDate);
    return selectedDate < today;
  };

  const getValidationErrorCount = () => {
    let count = 0;
    if (isCustomClient) {
      if (!customCompanyName.trim()) count += 1;
    } else {
      if (selectedClientKey === 'Select client company...') count += 1;
    }
    if (!formInvoiceNo) count += 1;
    if (!formRef) count += 1;
    if (!formSerial) count += 1;
    if (isDueDateInPast()) count += 1;
    if (!formDate) count += 1;

    formItems.forEach(item => {
      if (!item.description) count += 1;
      if (item.qty < 1) count += 1;
      if (item.price <= 0) count += 1;
    });

    return count;
  };

  // Populate data on open or edit
  useEffect(() => {
    if (!isOpen) return;

    setShowValidation(false);
    setFormError('');

    if (user) {
      setFormEmpName(user.name || '');
      setFormEmpId(user.employeeId || '');
      setFormCompNumber(companySettings.phone || user.phone || '');
      setFormCompEmail(user.email || '');
      setFormEntity(companySettings.companyName || 'ODST Group');
    }

    if (editInvoice) {
      setFormInvoiceNo(editInvoice.invoiceNo);
      setFormRef(editInvoice.referenceNo);
      setFormSerial(editInvoice.serialNo);
      setFormDate(editInvoice.dueDate || '');
      setFormInvoiceDate(editInvoice.date || '');
      setFormCurrency(editInvoice.currency || 'USD');
      setFormGroupNumber(editInvoice.group_number || editInvoice.groupNumber || '');
      setFormNationality(editInvoice.nationality || '');
      setFormItems(editInvoice.items?.map(i => ({ ...i })) || []);
      setFormHasAdvancePayment(!!(editInvoice.advancePayment && editInvoice.advancePayment > 0));
      setFormAdvancePayment(editInvoice.advancePayment ? String(editInvoice.advancePayment) : '');

      if (editInvoice.custom_company_name) {
        setSelectedClientKey('Others');
        setCustomCompanyName(editInvoice.custom_company_name);
        setCustomCompanyEmail(editInvoice.custom_company_email || '');
        setCustomCompanyAgent(editInvoice.custom_agent || editInvoice.agent || '');
        setCustomCompanyTaxNumber(editInvoice.custom_tax_number || '');
        const split = splitAddress(editInvoice.custom_address || '');
        setCustomCompanyAddress(split.address);
        setCustomCompanyCityCountry(split.cityCountry);
      } else {
        const foundComp = availableCompanies.find(c => c.name === editInvoice.company || c.code === editInvoice.companyCode);
        if (foundComp) {
          setSelectedClientKey(`${foundComp.name} - ${foundComp.code}`);
          setFormAgent(foundComp.agent || '');
        } else {
          setSelectedClientKey(`${editInvoice.company} - ${editInvoice.companyCode}`);
          setFormAgent(editInvoice.agent || '');
        }
      }
    } else {
      const today = new Date();
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit', year: 'numeric' };
      setFormInvoiceDate(today.toLocaleDateString('en-US', options));
      setFormItems([]);
      setFormCurrency('USD');
      setFormHasAdvancePayment(false);
      setFormAdvancePayment('');
      setFormGroupNumber('');
      setFormNationality('');

      if (availableCompanies.length > 0) {
        handleClientChange(availableCompanies[0]);
      } else {
        handleSelectOthers();
      }
    }
  }, [isOpen, editInvoice]);

  if (!isOpen) return null;

  const selectedCompanyObj = availableCompanies.find(
    (c) => `${c.name} - ${c.code}` === selectedClientKey
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidation(true);

    const errorCount = getValidationErrorCount();
    if (errorCount > 0) {
      setFormError('Validation failed: Fix errors to proceed');
      return;
    }

    if (!formInvoiceNo) {
      setFormError('Invoice Number is required.');
      return;
    }

    const calculatedSubtotal = formItems.reduce((acc, item) => acc + (item.qty * item.price), 0);
    const calculatedTotal = calculatedSubtotal * (1 + (globalTaxRate / 100));
    const formattedAmount = formatPrice(calculatedTotal, formCurrency);

    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit', year: 'numeric' };
    const todayFormattedDate = today.toLocaleDateString('en-US', options);

    let compName = '';
    let compCode = 'RCN';
    let compAgent = formAgent;

    if (isCustomClient) {
      if (!customCompanyName.trim()) {
        setFormError(t('invoices.customCompanyNameRequired'));
        return;
      }
      compName = customCompanyName.trim();
      compCode = 'RCN';
      compAgent = customCompanyAgent.trim();
    } else {
      const selectedCompany = availableCompanies.find(c => {
        const dbKey = `${c.name} - ${c.code}`.replace(/\s+/g, '').toLowerCase();
        const currentKey = selectedClientKey.replace(/\s+/g, '').toLowerCase();
        return dbKey === currentKey || c.name.trim().toLowerCase() === selectedClientKey.split(' - ')[0].trim().toLowerCase();
      });

      if (!selectedCompany) {
        setFormError('Please select a valid partner company from the database.');
        return;
      }
      compName = selectedCompany.name;
      compCode = selectedCompany.code;
      compAgent = selectedCompany.agent || formAgent;
    }

    const parsedAdv = formHasAdvancePayment ? (parseFloat(formAdvancePayment) || 0) : 0;
    const initialRemaining = Math.max(0, calculatedTotal - parsedAdv);
    const combinedCustomAddress = [customCompanyAddress.trim(), customCompanyCityCountry.trim()].filter(Boolean).join(', ');

    const newInvoice: Invoice = {
      invoiceNo: formInvoiceNo,
      company: compName,
      companyCode: compCode,
      referenceNo: formRef,
      serialNo: formSerial,
      amount: formattedAmount,
      date: editInvoice ? (formInvoiceDate || todayFormattedDate) : todayFormattedDate,
      status: 'Draft',
      usdToIdrRate: configuredRates.usdToIdr,
      sarToIdrRate: configuredRates.sarToIdr,
      dueDate: formDate,
      items: formItems.map(item => ({ ...item })),
      taxRate: globalTaxRate,
      agent: compAgent || undefined,
      currency: formCurrency,
      advancePayment: parsedAdv,
      remainingBalance: initialRemaining,
      company_id: isCustomClient ? null : compCode,
      custom_company_name: isCustomClient ? compName : null,
      custom_company_email: isCustomClient ? (customCompanyEmail.trim() || null) : null,
      custom_agent: isCustomClient ? (compAgent || null) : null,
      custom_address: isCustomClient ? (combinedCustomAddress || null) : null,
      custom_tax_number: isCustomClient ? (customCompanyTaxNumber.trim() || null) : null,
      group_number: formGroupNumber.trim() || null,
      groupNumber: formGroupNumber.trim() || null,
      nationality: formNationality.trim() || null,
    };

    setIsSubmitting(true);
    try {
      if (editInvoice) {
        await updateInvoiceAPI(editInvoice.invoiceNo, newInvoice);
        triggerAlert('Success', 'Invoice updated successfully and approval workflow reset.', 'success');
        onSuccess(newInvoice, true);
      } else {
        await createInvoiceAPI(newInvoice);
        onSuccess(newInvoice, false);
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to save or update invoice via API:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to save invoice';
      setFormError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0d0f]/60 p-4 font-sans">
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col font-sans max-h-[90vh] transform-gpu">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[#e2e8f0] flex justify-between items-center bg-white flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#fffbeb] text-[#f59e0b] border border-[#fef3c7] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-[17px] font-bold text-[#0c0d0f] tracking-tight">
                {editInvoice ? t('invoices.editConfirmation') : t('invoices.generateNewConfirmation')}
              </h3>
              {editInvoice && (
                <span className="text-[12px] text-[#64748b] font-medium font-sans">
                  {t('invoices.modifyConfirmationSubtitle')}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f1f5f9] text-[#64748b] hover:text-[#0c0d0f] flex items-center justify-center hover:bg-gray-200 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Validation Banner */}
        {showValidation && getValidationErrorCount() > 0 && (
          <div className="bg-[#fef2f2] border-b border-[#fecaca] px-6 py-4 flex items-center gap-3 text-[#991b1b] text-[13px] font-semibold font-sans animate-fade-in flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-[#ef4444] flex-shrink-0" />
            <span>{getValidationErrorCount()} {t('invoices.errorsFound')}</span>
            {formError && <span className="sr-only">{formError}</span>}
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSubmit} noValidate className="flex-1 modal-scroll-container p-6 space-y-6">
          {/* Client Selector Dropdown */}
          <div className="space-y-1.5 relative">
            <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-sans">
              {t('invoices.clientSelection')}
            </label>
            <button
              type="button"
              onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-3 border border-[#e2e8f0] rounded-xl text-[13px] font-bold text-[#0c0d0f] bg-white hover:bg-gray-50 transition-all text-left cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <span className={`w-2.5 h-2.5 rounded-full ${selectedClientKey === 'Others' ? 'bg-amber-500' : 'bg-[#f59e0b]'}`} />
                <span>
                  {selectedClientKey === 'Others' ? t('invoices.othersClient') : selectedClientKey}
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
                    <span>{t('invoices.othersClient')}</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-800">
                    One-Off
                  </span>
                </button>
                {availableCompanies.length > 0 ? (
                  availableCompanies.map((comp) => {
                    const key = `${comp.name} - ${comp.code}`;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleClientChange(comp)}
                        className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-[#1e293b] hover:bg-[#f8fafc] flex items-center space-x-2 cursor-pointer"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                        <span>{key}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="px-4 py-3 text-[13px] text-gray-500 text-center font-semibold bg-[#f8fafc]">
                    {t('invoices.noCompaniesAvailable')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Top Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-sans">
                {t('invoices.confirmationNumber')}
              </label>
              <input
                type="text"
                required
                value={formInvoiceNo}
                onChange={(e) => setFormInvoiceNo(e.target.value)}
                className={`w-full px-3.5 py-2 border rounded-xl text-[13px] font-bold transition-all font-inter bg-[#f8fafc] ${
                  showValidation && !formInvoiceNo
                    ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444]'
                    : 'border-[#e2e8f0] text-[#0c0d0f] focus:border-[#f59e0b] focus:ring-[#f59e0b]'
                }`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-sans">
                {t('invoices.referenceNumber')}
              </label>
              <input
                type="text"
                required
                value={formRef}
                onChange={(e) => setFormRef(e.target.value)}
                className={`w-full px-3.5 py-2 border rounded-xl text-[13px] font-semibold transition-all font-inter bg-[#f8fafc] ${
                  showValidation && !formRef
                    ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444]'
                    : 'border-[#e2e8f0] text-[#0c0d0f] focus:border-[#f59e0b] focus:ring-[#f59e0b]'
                }`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-sans">
                {t('invoices.serialNumber')}
              </label>
              <input
                type="text"
                required
                value={formSerial}
                onChange={(e) => setFormSerial(e.target.value)}
                className={`w-full px-3.5 py-2 border rounded-xl text-[13px] font-semibold transition-all font-inter bg-[#f8fafc] ${
                  showValidation && !formSerial
                    ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444]'
                    : 'border-[#e2e8f0] text-[#0c0d0f] focus:border-[#f59e0b] focus:ring-[#f59e0b]'
                }`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-inter">
                {t('invoices.dueDate')}
              </label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className={`w-full px-3.5 py-2 border rounded-xl text-[13px] font-bold transition-all font-inter cursor-pointer ${
                  showValidation && isDueDateInPast()
                    ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444]'
                    : 'border-[#fef3c7] text-[#d97706] bg-[#fffbeb] focus:border-[#f59e0b] focus:ring-[#f59e0b]'
                }`}
              />
            </div>
          </div>

          {/* Bill From / Bill To Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bill From */}
            <div className="bg-[#f8fafc] p-5 rounded-2xl border border-[#e2e8f0] flex flex-col justify-between min-h-[160px]">
              <div>
                <h4 className="text-[12px] font-bold text-[#0c0d0f] uppercase tracking-wider font-inter mb-4">
                  {t('invoices.billFrom')}
                </h4>
                {editInvoice ? (
                  <div className="space-y-3.5 text-[13px] font-sans">
                    <div>
                      <span className="block text-[10px] font-semibold text-[#94a3b8] mb-0.5 font-inter">
                        {t('invoices.entityCompany')}
                      </span>
                      <span className="font-bold text-[14px] text-[#0c0d0f] break-all block">
                        {formEntity || 'ODST Group'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-[#94a3b8] mb-0.5 font-inter">
                        {t('settings.email')}
                      </span>
                      <span className="font-bold text-[14px] text-[#0c0d0f] break-all block">
                        {formCompEmail || 'info@odst.id'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-[13px] font-sans">
                    <div>
                      <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1">{t('settings.name')}</label>
                      <input
                        type="text"
                        required
                        value={formEmpName}
                        onChange={(e) => setFormEmpName(e.target.value)}
                        className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-bold text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] transition-all font-inter"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1">{t('settings.phone')}</label>
                      <input
                        type="text"
                        required
                        value={formCompNumber}
                        onChange={(e) => setFormCompNumber(e.target.value)}
                        className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] transition-all font-inter"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1">{t('settings.employeeId')}</label>
                      <input
                        type="text"
                        required
                        value={formEmpId}
                        onChange={(e) => setFormEmpId(e.target.value)}
                        className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] transition-all font-inter"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1">{t('settings.email')}</label>
                      <input
                        type="email"
                        required
                        value={formCompEmail}
                        onChange={(e) => setFormCompEmail(e.target.value)}
                        className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] transition-all font-inter"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bill To */}
            <div className="bg-[#f8fafc] p-5 rounded-2xl border border-[#e2e8f0] flex flex-col justify-between min-h-[160px]">
              <div>
                <h4 className="text-[12px] font-bold text-[#0c0d0f] uppercase tracking-wider font-inter mb-4">
                  {t('invoices.billTo')}
                </h4>
                {isCustomClient ? (
                  <div className="space-y-3 text-[13px] font-sans">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1 font-inter">
                          {t('invoices.clientCompany')} <span className="text-[#ef4444]">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={customCompanyName}
                          onChange={(e) => setCustomCompanyName(e.target.value)}
                          placeholder="e.g. PT Klien Baru"
                          className="w-full px-3 py-1.5 border rounded-xl text-[13px] font-bold text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] transition-all font-inter"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1 font-inter">
                          {t('invoices.agent')}
                        </label>
                        <input
                          type="text"
                          value={customCompanyAgent}
                          onChange={(e) => setCustomCompanyAgent(e.target.value)}
                          placeholder="e.g. PIC / Contact Person"
                          className="w-full px-3 py-1.5 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] transition-all font-inter"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1 font-inter">
                          {t('settings.email')}
                        </label>
                        <input
                          type="email"
                          value={customCompanyEmail}
                          onChange={(e) => setCustomCompanyEmail(e.target.value)}
                          placeholder="client@email.com"
                          className="w-full px-3 py-1.5 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] bg-white focus:outline-none transition-all font-inter"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1 font-inter">
                          {t('invoices.companyTaxNumber')}
                        </label>
                        <input
                          type="text"
                          value={customCompanyTaxNumber}
                          onChange={(e) => setCustomCompanyTaxNumber(e.target.value)}
                          placeholder="Tax / VAT Number"
                          className="w-full px-3 py-1.5 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] bg-white focus:outline-none transition-all font-inter"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5 text-[13px] font-sans">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="block text-[10px] font-semibold text-[#94a3b8] mb-0.5 font-inter">
                          {t('invoices.clientCompany')}
                        </span>
                        <span className="font-bold text-[14px] text-[#0c0d0f] block mt-1">
                          {selectedCompanyObj?.name || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-semibold text-[#94a3b8] mb-0.5 font-inter">
                          {t('invoices.agent')}
                        </span>
                        <span className="font-bold text-[#f59e0b] block mt-1">
                          {selectedCompanyObj?.agent || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-[#94a3b8] mb-0.5 font-inter">
                        {t('invoices.streetAddress')}
                      </span>
                      <span className="font-semibold text-[#1e293b] block">
                        {selectedCompanyObj?.address ? splitAddress(selectedCompanyObj.address).address : 'N/A'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Additional Information (Optional) */}
          <div className="bg-[#f8fafc] p-5 rounded-2xl border border-[#e2e8f0]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
              <div>
                <h4 className="text-[12px] font-bold text-[#0c0d0f] uppercase tracking-wider font-inter">
                  {t('invoices.additionalInformation')}
                </h4>
                <p className="text-[11px] text-[#64748b] font-medium font-sans">
                  {t('invoices.additionalInformationDesc')}
                </p>
              </div>
              <span className="self-start sm:self-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 text-slate-700 tracking-wide uppercase font-sans">
                Optional
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-sans">
                  {t('invoices.groupNumber')}
                </label>
                <input
                  type="text"
                  value={formGroupNumber}
                  onChange={(e) => setFormGroupNumber(e.target.value)}
                  placeholder={t('invoices.groupNumberPlaceholder')}
                  className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] transition-all font-inter"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-sans">
                  {t('invoices.nationality')}
                </label>
                <input
                  type="text"
                  value={formNationality}
                  onChange={(e) => setFormNationality(e.target.value)}
                  placeholder={t('invoices.nationalityPlaceholder')}
                  className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] transition-all font-inter"
                />
              </div>
            </div>
          </div>

          {/* Itemized Charges Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[12px] font-bold text-[#0c0d0f] uppercase tracking-wider font-inter">
                {t('invoices.itemizedCharges')}
              </h4>
              <div className="flex items-center space-x-2">
                <label className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
                  {t('invoices.currency')}:
                </label>
                <select
                  value={formCurrency}
                  onChange={(e) => {
                    const newCurrency = e.target.value;
                    const oldCurrency = formCurrency;
                    if (oldCurrency !== newCurrency) {
                      const updatedItems = formItems.map(item => ({
                        ...item,
                        price: convertPrice(Number(item.price) || 0, oldCurrency, newCurrency, configuredRates)
                      }));
                      setFormItems(updatedItems);
                      setFormCurrency(newCurrency);
                    }
                  }}
                  className="px-2.5 py-1 border border-[#cbd5e1] rounded-lg text-[12px] font-bold text-[#1e293b] bg-white cursor-pointer"
                >
                  <option value="USD">USD ($)</option>
                  <option value="SAR">SAR (Riyal)</option>
                  <option value="Rp">Rp (Rupiah)</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto border border-[#e2e8f0] rounded-xl bg-white">
              <table className="w-full text-left border-collapse text-[13px] font-sans">
                <thead>
                  <tr className="bg-gray-50 border-b border-[#e2e8f0]">
                    <th className="px-4 py-2.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider font-inter">
                      {t('invoices.description')}
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-center font-inter w-20">
                      {t('invoices.qty')}
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-right font-inter w-32">
                      {t('invoices.unitPrice')}
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-right font-inter w-32">
                      {t('common.total')}
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-center font-inter w-16">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0] font-medium text-[#1e293b]">
                  {formItems.map((item, idx) => (
                    <tr key={idx} className={`hover:bg-gray-50/50 transition-colors ${showValidation && (item.qty < 1 || !item.description || item.price <= 0) ? 'bg-[#fef2f2]' : ''}`}>
                      <td className="p-2">
                        <input
                          type="text"
                          required
                          value={item.description}
                          onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                          placeholder="e.g. Ground handling service"
                          className="w-full px-2 py-1.5 border rounded-lg text-[13px] font-medium transition-all focus:outline-none border-transparent bg-transparent hover:bg-gray-100/50 focus:bg-[#f8fafc]"
                        />
                      </td>
                      <td className="p-2 w-20">
                        <input
                          type="text"
                          required
                          value={
                            activeFocusIndex?.index === idx && activeFocusIndex?.field === 'qty'
                              ? item.qty === 0 ? '' : item.qty
                              : item.qty
                          }
                          onFocus={() => setActiveFocusIndex({ index: idx, field: 'qty' })}
                          onBlur={() => setActiveFocusIndex(null)}
                          onChange={(e) => {
                            const val = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
                            handleUpdateItem(idx, 'qty', val);
                          }}
                          className="w-full px-2 py-1.5 border rounded-lg text-[13px] font-medium text-center focus:outline-none border-transparent bg-transparent hover:bg-gray-100/50 focus:bg-[#f8fafc]"
                        />
                      </td>
                      <td className="p-2 w-32">
                        <input
                          type="text"
                          required
                          readOnly={item.isService}
                          value={
                            activeFocusIndex?.index === idx && activeFocusIndex?.field === 'price' && !item.isService
                              ? item.price
                              : formatPrice(Number(item.price) || 0, formCurrency)
                          }
                          onFocus={() => {
                            if (!item.isService) {
                              setActiveFocusIndex({ index: idx, field: 'price' });
                            }
                          }}
                          onBlur={() => {
                            setActiveFocusIndex(null);
                            if (!item.isService) {
                              handleUpdateItem(idx, 'price', parseFloat(String(item.price)) || 0);
                            }
                          }}
                          onChange={(e) => {
                            if (!item.isService) {
                              const cleanVal = e.target.value.replace(/[^0-9.]/g, '');
                              const dots = cleanVal.split('.');
                              const formattedVal = dots.length > 2 ? `${dots[0]}.${dots.slice(1).join('')}` : cleanVal;
                              handleUpdateItem(idx, 'price', formattedVal);
                            }
                          }}
                          className={`w-full px-2.5 py-2 border rounded-lg text-[13px] font-medium text-right focus:outline-none ${
                            item.isService
                              ? 'bg-gray-50 text-[#94a3b8] cursor-not-allowed border-[#cbd5e1]/40'
                              : 'border-transparent bg-transparent hover:bg-gray-100/50 focus:bg-[#f8fafc]'
                          }`}
                        />
                      </td>
                      <td className="p-2 w-32 text-right font-bold text-[#0c0d0f]">
                        {formatPrice(item.qty * item.price, formCurrency)}
                      </td>
                      <td className="p-2 w-16 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg hover:text-red-700 transition-all cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Dropdown Select Service & Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-1.5 relative h-fit">
                <label className="block text-[11px] font-bold text-[#64748b]">
                  {t('invoices.selectService')}
                </label>
                <button
                  type="button"
                  onClick={() => setIsServiceDropdownOpen(!isServiceDropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-2.5 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] bg-white hover:bg-gray-50 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                    <span>{t('invoices.chooseConfiguredService')}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>
                {isServiceDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-[#e2e8f0] rounded-xl shadow-xl z-50 py-1.5 divide-y divide-[#f1f5f9] max-h-48 overflow-y-auto">
                    {availableServices.map((service, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          const finalPrice = convertPrice(service.price, service.currency || 'USD', formCurrency, configuredRates);
                          setFormItems([
                            ...formItems,
                            {
                              description: service.name,
                              qty: 1,
                              price: finalPrice,
                              isService: true
                            },
                          ]);
                          setIsServiceDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-[12px] font-semibold text-[#1e293b] hover:bg-[#f8fafc] flex justify-between items-center cursor-pointer"
                      >
                        <span className="truncate pr-2">{service.name}</span>
                        <span className="font-bold text-[#0c0d0f] flex-shrink-0">
                          {formatPrice(service.price, service.currency || 'USD')}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center space-x-1.5 mt-3 px-3.5 py-1.5 border border-[#cbd5e1] rounded-lg text-[12px] font-bold text-[#475569] hover:bg-gray-50 hover:text-[#0c0d0f] transition-all font-inter cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('invoices.addCustomItem')}</span>
                </button>
              </div>

              {/* Summary Section */}
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 space-y-3 font-sans text-[13px]">
                <div className="flex justify-between items-center">
                  <span className="text-[#64748b] font-semibold">{t('invoices.subtotal')}</span>
                  <span className="font-bold text-[#0c0d0f]">
                    {formatPrice(formItems.reduce((acc, item) => acc + (item.qty * item.price), 0), formCurrency)}
                  </span>
                </div>
                {formHasAdvancePayment && parseFloat(formAdvancePayment) > 0 && (
                  <div className="flex justify-between items-center text-amber-700 bg-amber-50/70 px-2.5 py-1.5 rounded-lg border border-amber-200/80">
                    <span className="font-semibold">{t('invoices.advancePayment') || 'Deposit'}</span>
                    <span className="font-bold">
                      -{formatPrice(parseFloat(formAdvancePayment) || 0, formCurrency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[#64748b] font-semibold">{t('invoices.taxVat')} ({globalTaxRate}%)</span>
                  <span className="font-bold text-[#0c0d0f]">
                    {formatPrice(formItems.reduce((acc, item) => acc + (item.qty * item.price), 0) * (globalTaxRate / 100), formCurrency)}
                  </span>
                </div>
                <div className="h-px bg-[#e2e8f0] my-2" />
                <div className="flex justify-between items-center text-[14px]">
                  <span className="text-[#0c0d0f] font-bold">{t('invoices.totalDue')}</span>
                  <span className="font-extrabold text-[#2563eb] text-[16px]">
                    {formatPrice(Math.max(0, (formItems.reduce((acc, item) => acc + (item.qty * item.price), 0) - (formHasAdvancePayment ? (parseFloat(formAdvancePayment) || 0) : 0)) + (formItems.reduce((acc, item) => acc + (item.qty * item.price), 0) * (globalTaxRate / 100))), formCurrency)}
                  </span>
                </div>

                {/* Advance Payment Toggle */}
                <div className="pt-2 space-y-2 border-t border-[#e2e8f0]">
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] font-bold text-[#0c0d0f]">{t('invoices.hasAdvancePayment')}</span>
                    <div className="flex items-center space-x-3 text-[12px] font-semibold">
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input
                          type="radio"
                          name="hasAdvance"
                          checked={formHasAdvancePayment}
                          onChange={() => setFormHasAdvancePayment(true)}
                          className="text-[#2563eb]"
                        />
                        <span>{t('common.yes')}</span>
                      </label>
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input
                          type="radio"
                          name="hasAdvance"
                          checked={!formHasAdvancePayment}
                          onChange={() => {
                            setFormHasAdvancePayment(false);
                            setFormAdvancePayment('');
                          }}
                          className="text-[#2563eb]"
                        />
                        <span>{t('common.no')}</span>
                      </label>
                    </div>
                  </div>

                  {formHasAdvancePayment && (
                    <div className="pt-1 space-y-1">
                      <label className="block text-[10px] font-semibold text-[#94a3b8]">
                        {t('invoices.advancePaymentAmount')} ({formCurrency})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Enter DP / Deposit amount..."
                        value={formAdvancePayment}
                        onChange={(e) => setFormAdvancePayment(e.target.value)}
                        className="w-full px-3 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-bold text-[#0c0d0f] bg-white focus:outline-none focus:border-[#2563eb]"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Exchange Rates Summary */}
          <div className="space-y-3">
            <h4 className="text-[12px] font-bold text-[#0c0d0f] uppercase tracking-wider font-inter">
              {t('settings.exchangeRates')}
            </h4>
            <div className="bg-[#f8fafc] p-5 rounded-2xl border border-[#e2e8f0] font-sans space-y-4">
              <div className="flex flex-col space-y-2 text-[13px] font-sans text-slate-600 pb-3 border-b border-[#e2e8f0]">
                {getExchangeRatesToShow(formCurrency, configuredRates.usdToIdr, configuredRates.sarToIdr, configuredRates.usdToSar).map((rate, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span>{rate.text}</span>
                    <span className="font-bold text-[#475569]">{rate.label}</span>
                  </div>
                ))}
              </div>
              {(() => {
                const subtotal = formItems.reduce((acc, item) => acc + (item.qty * item.price), 0);
                const currentAdvAmt = formHasAdvancePayment && formAdvancePayment ? parseFloat(formAdvancePayment) || 0 : 0;
                const currentTotalAmount = Math.max(0, (subtotal - currentAdvAmt) + (subtotal * (globalTaxRate / 100)));
                const converted = calculateConvertedTotals(
                  currentTotalAmount,
                  formCurrency,
                  configuredRates.usdToIdr,
                  configuredRates.sarToIdr,
                  configuredRates.usdToSar
                );
                return (
                  <div className="flex flex-col space-y-2 text-[13px]">
                    <div className="flex justify-between items-center">
                      <span className="text-[#64748b] font-semibold">{t('invoices.totalDue')} (USD)</span>
                      <span className="font-bold text-[#2563eb] text-[15px]">{converted.usdTotal}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#64748b] font-semibold">{t('invoices.totalDue')} (SAR)</span>
                      <span className="font-bold text-[#2563eb] text-[15px]">{converted.sarTotal}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#64748b] font-semibold">{t('invoices.totalDue')} (IDR)</span>
                      <span className="font-bold text-[#2563eb] text-[15px]">{converted.idrTotal}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-[#e2e8f0] mt-6 flex-shrink-0">
            <span className="text-[12px] text-[#94a3b8] font-medium font-sans">
              {editInvoice ? 'Form status: Editable' : t('invoices.formStatusValid')}
            </span>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-[#cbd5e1] rounded-lg text-[13px] font-semibold text-[#1e293b] hover:bg-gray-50 transition-all cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (showValidation && getValidationErrorCount() > 0)}
                className={`px-4 py-2 font-semibold text-[13px] rounded-lg transition-all cursor-pointer ${
                  showValidation && getValidationErrorCount() > 0
                    ? 'bg-[#cbd5e1] text-[#94a3b8] cursor-not-allowed'
                    : 'bg-[#f59e0b] hover:bg-[#d97706] text-white shadow-sm'
                }`}
              >
                {isSubmitting ? 'Saving...' : editInvoice ? t('invoices.saveAndResubmit') : t('invoices.generateConfirmation')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
