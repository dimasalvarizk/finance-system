
import React, { useState, useMemo, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import StatCard from '../../components/ui/StatCard';
import { Search, Plus, X, AlertCircle, FileText, ChevronDown, Check, Edit3, XCircle, Trash2, Upload, Receipt } from 'lucide-react';
import InvoiceDetailsModal from '../../components/ui/InvoiceDetailsModal';
import ReservationConfirmationPrint from '../../components/ui/ReservationNumberPrint';
import { getInvoices, createInvoice as createInvoiceAPI, getCompanies, updateInvoice as updateInvoiceAPI, cancelInvoice as cancelInvoiceAPI, updateInvoiceStatus, deleteInvoices as deleteInvoicesAPI, uploadPaymentProof, addInvoicePayment, getInvoicePayments, updateInvoicePayment, deleteInvoicePayment } from '../../services/invoiceService';
import { createRequest } from '../../services/requestService';
import { getExchangeRates, getServices, getTeamMembers, getTaxSetting, getCompanySetting } from '../../services/settingService';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { formatLocalizedDate } from '../../i18n';
import NetworkErrorState from '../../components/ui/NetworkErrorState';

export interface Invoice {
  invoiceNo: string;
  company: string;
  companyCode: string;
  referenceNo: string;
  serialNo: string;
  amount: string;
  date: string;
  status: string;
  usdToIdrRate?: number;
  sarToIdrRate?: number;
  dueDate?: string;
  advancePayment?: number;
  remainingBalance?: number;
  items?: {
    description: string;
    qty: number;
    price: number;
  }[];
  createdBy?: string;
  branch?: string;
  taxRate?: number;
  paymentAttachment?: string;
  agent?: string;
  currency?: string;
  company_id?: string | null;
  custom_company_name?: string | null;
  custom_company_email?: string | null;
  custom_agent?: string | null;
  custom_address?: string | null;
  custom_tax_number?: string | null;
}



export interface InvoiceDetail {
  dueDate: string;
  billFrom: {
    name: string;
    id: string;
    entity: string;
    phone: string;
    email: string;
    tax: string;
  };
  billTo: {
    company: string;
    tax: string;
    address: string;
    cityCountry: string;
    agent?: string;
  };
  items: {
    description: string;
    qty: number;
    price: string;
    total: string;
  }[];
  subtotal: string;
  tax: string;
  total: string;
  totalAmount: number;
  usdToIdrRate?: number;
  sarToIdrRate?: number;
  taxRate?: number;
  currency?: string;
}

export const getLocalCompanySettings = () => {
  const saved = localStorage.getItem('finance_company_settings');
  const defaults = {
    companyName: 'ODST Group',
    phone: '+62 856 9332 3122',
    taxNumber: '0000-0000-0000',
    defaultNotes: "Please ensure the Invoice Number (e.g. AIT-2608-011) is listed as the payment description reference.\nAttach hotel booking confirmation numbers where applicable for ground handling operations.",
    termsAndConditions: "Payment is due strictly by the specified date on the ledger. For billing inquiries, contact ODST Admin Team. Thank you for your continued partnership.",
    bankName: 'Danamon',
    accountName: 'PT ODST Airlines Indo',
    idrAccountNumber: '102-8829-011',
    usdAccountNumber: '102-8829-022'
  };
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed) {
        return {
          companyName: parsed.companyName || defaults.companyName,
          phone: parsed.phone || defaults.phone,
          taxNumber: parsed.taxNumber || defaults.taxNumber,
          defaultNotes: parsed.defaultNotes || defaults.defaultNotes,
          termsAndConditions: parsed.termsAndConditions || defaults.termsAndConditions,
          bankName: parsed.bankName || defaults.bankName,
          accountName: parsed.accountName || defaults.accountName,
          idrAccountNumber: parsed.idrAccountNumber || defaults.idrAccountNumber,
          usdAccountNumber: parsed.usdAccountNumber || defaults.usdAccountNumber,
        };
      }
    } catch (e) {}
  }
  return defaults;
};

export const formatPrice = (price: number, currency: string = 'USD'): string => {
  if (price === undefined || price === null || isNaN(price)) return '0';
  const cleanCurrency = String(currency).toUpperCase();
  if (cleanCurrency === 'RP' || cleanCurrency === 'IDR') {
    return `Rp ${new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price)}`;
  } else if (cleanCurrency === 'SAR') {
    return `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price)} SAR`;
  } else {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price);
  }
};

export const convertPrice = (
  price: number,
  from: string,
  to: string,
  rates?: { usdToIdr: number; sarToIdr: number; usdToSar: number }
): number => {
  const f = (from || 'USD').toUpperCase();
  const t = (to || 'USD').toUpperCase();
  if (f === t) return price;

  const safeRates = rates || { usdToIdr: 18025, sarToIdr: 4800, usdToSar: 3.75 };
  let usdToIdr = safeRates.usdToIdr || 18025;
  let sarToIdr = safeRates.sarToIdr || 4800;
  let usdToSar = safeRates.usdToSar || 3.75;

  const isRp = (c: string) => c === 'RP' || c === 'IDR';

  if (f === 'USD' && t === 'SAR') return parseFloat((price * usdToSar).toFixed(2));
  if (f === 'USD' && isRp(t)) return parseFloat((price * usdToIdr).toFixed(2));

  if (f === 'SAR' && t === 'USD') return parseFloat((price / usdToSar).toFixed(2));
  if (f === 'SAR' && isRp(t)) return parseFloat((price * sarToIdr).toFixed(2));

  if (isRp(f) && t === 'USD') return parseFloat((price / usdToIdr).toFixed(2));
  if (isRp(f) && t === 'SAR') return parseFloat((price / sarToIdr).toFixed(2));

  return price;
};

export const splitAddress = (fullAddress?: string): { address: string; cityCountry: string } => {
  if (!fullAddress) {
    return { address: 'N/A', cityCountry: 'N/A' };
  }
  const parts = fullAddress.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return { address: 'N/A', cityCountry: 'N/A' };
  }
  if (parts.length === 1) {
    return { address: parts[0], cityCountry: 'N/A' };
  }
  if (parts.length === 2) {
    return { address: parts[0], cityCountry: parts[1] };
  }
  if (parts.length === 3) {
    return { address: parts[0], cityCountry: `${parts[1]}, ${parts[2]}` };
  }
  
  // If 4 or more parts, keep the last 3 parts in cityCountry and the rest in address
  const cityCountryParts = parts.slice(-3);
  const addressParts = parts.slice(0, -3);
  return {
    address: addressParts.join(', '),
    cityCountry: cityCountryParts.join(', ')
  };
};

export const getInvoiceDetails = (invoice: Invoice): InvoiceDetail => {
  const safeInvoice = (invoice || {}) as Invoice;
  const items = safeInvoice.items || [];
  const currency = safeInvoice.currency || 'USD';
  const formattedItems = items.map(item => ({
    description: item?.description || '',
    qty: item?.qty || 0,
    price: formatPrice(item?.price || 0, currency),
    total: formatPrice((item?.qty || 0) * (item?.price || 0), currency),
  }));

  const calculatedSubtotal = items.reduce((acc, item) => acc + ((item?.qty || 0) * (item?.price || 0)), 0);
  const subtotalFormatted = formatPrice(calculatedSubtotal, currency);

  // Try to find client details from localStorage
  const savedCompStr = localStorage.getItem('finance_companies');
  let localStorageComp = null;
  if (savedCompStr && safeInvoice.company) {
    try {
      const comps = JSON.parse(savedCompStr);
      localStorageComp = comps.find((c: any) => c.name.toLowerCase() === safeInvoice.company.toLowerCase() || c.code.toLowerCase() === safeInvoice.companyCode.toLowerCase());
    } catch (e) { }
  }

  // Try to find creator details from localStorage team members
  const savedTeamStr = localStorage.getItem('finance_team_members');
  let localStorageCreator = null;
  if (savedTeamStr && safeInvoice.createdBy) {
    try {
      const members = JSON.parse(savedTeamStr);
      const cleanName = (name?: string) => (name || '').toLowerCase().replace(/^(mr\.|mrs\.|ms\.)\s+/i, '').trim();
      localStorageCreator = members.find((m: any) => cleanName(m.name) === cleanName(safeInvoice.createdBy));
    } catch (e) { }
  }

  const companySettings = getLocalCompanySettings();

  const cleanAgentName = (agentName?: string) => {
    if (!agentName) return undefined;
    const lower = agentName.toLowerCase();
    if (lower.includes('hasoob')) return 'Hasoob Technology';
    if (lower.includes('odst')) return 'ODST Travel & Tourizm';
    return agentName;
  };

  const fallbackAddress = safeInvoice.custom_address ? splitAddress(safeInvoice.custom_address) : { address: 'N/A', cityCountry: 'N/A' };
  const billToSplit = localStorageComp ? splitAddress(localStorageComp.address) : fallbackAddress;
  const billTo = localStorageComp ? {
    company: localStorageComp.name,
    tax: localStorageComp.taxNumber,
    address: billToSplit.address,
    cityCountry: billToSplit.cityCountry,
    agent: cleanAgentName(safeInvoice.agent || localStorageComp.agent),
  } : {
    company: safeInvoice.custom_company_name || safeInvoice.company || 'N/A',
    tax: safeInvoice.custom_tax_number || 'N/A',
    address: billToSplit.address,
    cityCountry: billToSplit.cityCountry,
    agent: cleanAgentName(safeInvoice.custom_agent || safeInvoice.agent),
  };

  return {
    dueDate: (() => {
      if (safeInvoice.dueDate) {
        if (safeInvoice.dueDate.includes('-')) {
          const parts = safeInvoice.dueDate.split('-');
          if (parts.length === 3) {
            return `${parts[1]}/${parts[2]}/${parts[0]}`;
          }
        }
        return safeInvoice.dueDate;
      }
      return 'N/A';
    })(),
    billFrom: localStorageCreator ? {
      name: localStorageCreator.name,
      id: localStorageCreator.employeeId || '260111',
      entity: companySettings.companyName || 'ODST Group',
      phone: companySettings.phone,
      email: localStorageCreator.email || 'info@odst.id',
      tax: companySettings.taxNumber,
    } : {
      name: safeInvoice.createdBy || 'Emad Moustafa',
      id: '260111',
      entity: companySettings.companyName || 'ODST Group',
      phone: companySettings.phone,
      email: 'info@odst.id',
      tax: companySettings.taxNumber,
    },
    billTo,
    items: formattedItems,
    subtotal: subtotalFormatted,
    tax: formatPrice(calculatedSubtotal * ((safeInvoice.taxRate || 0) / 100), currency),
    total: formatPrice(calculatedSubtotal * (1 + ((safeInvoice.taxRate || 0) / 100)), currency),
    totalAmount: calculatedSubtotal * (1 + ((safeInvoice.taxRate || 0) / 100)),
    usdToIdrRate: safeInvoice.usdToIdrRate || 18025,
    sarToIdrRate: safeInvoice.sarToIdrRate || 4800,
    taxRate: safeInvoice.taxRate || 0,
    currency
  };
};

export const parseExchangeRate = (val: any, isIdr: boolean = true): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let str = String(val).trim();
  if (!str || str === 'null' || str === 'undefined') return 0;

  // Remove currency symbols, letters, and spaces (e.g. "$", "SAR", "USD", "Rp", "IDR")
  str = str.replace(/[^0-9.,-]/g, '').trim();
  if (!str) return 0;

  // If it contains both dot and comma
  if (str.includes('.') && str.includes(',')) {
    const lastDot = str.lastIndexOf('.');
    const lastComma = str.lastIndexOf(',');
    if (lastComma > lastDot) {
      // Indonesian/European format: 17.692,50
      str = str.replace(/\./g, '').replace(/,/g, '.');
    } else {
      // English format: 17,692.50
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Only has comma: e.g. 3,76 or 17,692
    const parts = str.split(',');
    if (parts[parts.length - 1].length === 3 && isIdr) {
      // Thousands separator: 17,692
      str = str.replace(/,/g, '');
    } else {
      // Decimal separator: 3,76
      str = str.replace(/,/g, '.');
    }
  } else if (str.includes('.')) {
    // Only has dot: e.g. 3.76 or 17.692
    const parts = str.split('.');
    if (parts[parts.length - 1].length === 3 && isIdr) {
      // Thousands separator: 17.692
      str = str.replace(/\./g, '');
    }
  }

  return parseFloat(str) || 0;
};

export const calculateConvertedTotals = (
  amount: number,
  currency: string,
  usdToIdr: number,
  sarToIdr: number,
  usdToSar?: number
) => {
  const normCurr = (currency || 'USD').toUpperCase();
  const isRp = normCurr === 'RP' || normCurr === 'IDR';

  const parsedAmount = typeof amount === 'number' ? amount : (parseFloat(String(amount || '')) || 0);
  if (!parsedAmount || isNaN(parsedAmount)) {
    return { usdVal: 0, sarVal: 0, idrVal: 0, usdTotal: '0', sarTotal: '0', idrTotal: '0' };
  }
  const parsedUsdToIdr = typeof usdToIdr === 'number' ? usdToIdr : (parseFloat(String(usdToIdr || '')) || 18025);
  const parsedSarToIdr = typeof sarToIdr === 'number' ? sarToIdr : (parseFloat(String(sarToIdr || '')) || 4800);
  const parsedUsdToSar = typeof usdToSar === 'number' ? usdToSar : (parseFloat(String(usdToSar || '')) || (parsedUsdToIdr / parsedSarToIdr) || 3.75);

  let usdVal = 0;
  let sarVal = 0;
  let idrVal = 0;

  if (normCurr === 'USD') {
    usdVal = parsedAmount;
    idrVal = parsedAmount * parsedUsdToIdr;
    sarVal = parsedAmount * parsedUsdToSar;
  } else if (normCurr === 'SAR') {
    sarVal = parsedAmount;
    usdVal = parsedAmount / parsedUsdToSar;
    idrVal = parsedAmount * parsedSarToIdr;
  } else if (isRp) {
    idrVal = parsedAmount;
    usdVal = parsedAmount / parsedUsdToIdr;
    sarVal = parsedAmount / parsedSarToIdr;
  }

  return {
    usdVal,
    sarVal,
    idrVal,
    idrTotal: `Rp ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(idrVal)}`,
    sarTotal: `SAR ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(sarVal)}`,
    usdTotal: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(usdVal)
  };
};

export const getExchangeRatesToShow = (
  currency: string,
  usdToIdr?: any,
  sarToIdr?: any,
  usdToSar?: any
) => {
  const normCurr = (currency || 'USD').toUpperCase();
  const isRp = normCurr === 'RP' || normCurr === 'IDR';

  // Parse inputs safely
  const parsedUsdToIdr = typeof usdToIdr === 'number' ? usdToIdr : (parseFloat(String(usdToIdr || '')) || 18025);
  const parsedSarToIdr = typeof sarToIdr === 'number' ? sarToIdr : (parseFloat(String(sarToIdr || '')) || 4800);
  const parsedUsdToSar = typeof usdToSar === 'number' ? usdToSar : (parseFloat(String(usdToSar || '')) || (parsedUsdToIdr / parsedSarToIdr) || 3.75);

  const formatRate = (num: number) => {
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
  };

  if (normCurr === 'SAR') {
    return [
      { text: `1 USD = ${formatRate(parsedUsdToSar)} SAR`, label: 'USD / SAR' },
      { text: `1 SAR = ${formatRate(parsedSarToIdr)} IDR`, label: 'SAR / IDR' }
    ];
  } else if (isRp) {
    return [
      { text: `1 USD = ${formatRate(parsedUsdToIdr)} IDR`, label: 'USD / IDR' },
      { text: `1 SAR = ${formatRate(parsedSarToIdr)} IDR`, label: 'SAR / IDR' }
    ];
  } else {
    // USD
    return [
      { text: `1 USD = ${formatRate(parsedUsdToIdr)} IDR`, label: 'USD / IDR' },
      { text: `1 USD = ${formatRate(parsedUsdToSar)} SAR`, label: 'USD / SAR' }
    ];
  }
};

export const convertToISODate = (dateStr: string): string => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return dateStr;
};

// Client Defaults removed, relying entirely on settings database entries.

const compareDates = (dateAStr: string, dateBStr: string): boolean => {
  if (!dateAStr || !dateBStr) return false;
  
  const parseYMD = (str: string) => {
    const matchYMD = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (matchYMD) {
      return {
        year: parseInt(matchYMD[1], 10),
        month: parseInt(matchYMD[2], 10) - 1,
        day: parseInt(matchYMD[3], 10)
      };
    }
    
    const d = new Date(str);
    if (isNaN(d.getTime())) return null;
    
    if (str.includes('-') && !str.includes('T') && !str.includes(' ')) {
      return {
        year: d.getUTCFullYear(),
        month: d.getUTCMonth(),
        day: d.getUTCDate()
      };
    }
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDate()
    };
  };

  const a = parseYMD(dateAStr);
  const b = parseYMD(dateBStr);
  
  if (!a || !b) return false;
  return a.year === b.year && a.month === b.month && a.day === b.day;
};

const Invoices: React.FC = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const companySettings = getLocalCompanySettings();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // New States for filters, loading, editing, selecting, cancelling
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterCompany, setFilterCompany] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [editInvoiceId, setEditInvoiceId] = useState<string | null>(null);
  const [globalTaxRate, setGlobalTaxRate] = useState<number>(0);

  // Advance Payment & Payment History States
  const [formHasAdvancePayment, setFormHasAdvancePayment] = useState(false);
  const [formAdvancePayment, setFormAdvancePayment] = useState('');
  const [paymentHistoryModal, setPaymentHistoryModal] = useState<{ isOpen: boolean; invoice: Invoice | null }>({ isOpen: false, invoice: null });
  const [paymentHistoryList, setPaymentHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [addPayAmount, setAddPayAmount] = useState('');
  const [addPayCurrency, setAddPayCurrency] = useState('SAR');
  const [addPayDate, setAddPayDate] = useState('');
  const [addPayNote, setAddPayNote] = useState('');
  const [addPayProof, setAddPayProof] = useState('');
  const [addPayProofName, setAddPayProofName] = useState('');
  const [saveOverpaymentCredit, setSaveOverpaymentCredit] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const openPaymentHistoryModal = async (inv: Invoice) => {
    setPaymentHistoryModal({ isOpen: true, invoice: inv });
    setLoadingHistory(true);
    try {
      const history = await getInvoicePayments(inv.invoiceNo);
      setPaymentHistoryList(history || []);
    } catch (err) {
      console.error('Failed to load payment history:', err);
      setPaymentHistoryList([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

  const handleOpenAddPayment = () => {
    setEditingPaymentId(null);
    setAddPayAmount('');
    setAddPayCurrency(paymentHistoryModal.invoice?.currency || 'SAR');
    setAddPayDate(new Date().toISOString().split('T')[0]);
    setAddPayNote('');
    setAddPayProof('');
    setAddPayProofName('');
    setSaveOverpaymentCredit(false);
    setIsAddPaymentModalOpen(true);
  };

  const handleOpenEditPayment = (pay: any) => {
    setEditingPaymentId(pay.id);
    setAddPayAmount(String(pay.amount || ''));
    setAddPayCurrency(pay.currency || paymentHistoryModal.invoice?.currency || 'SAR');
    setAddPayDate(pay.paymentDate ? pay.paymentDate.split('T')[0] : new Date().toISOString().split('T')[0]);
    setAddPayNote(pay.note || '');
    setAddPayProof(pay.proofUrl || '');
    setAddPayProofName(pay.proofUrl ? 'Existing_Proof_Attachment' : '');
    setSaveOverpaymentCredit(false);
    setIsAddPaymentModalOpen(true);
  };

  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  const confirmDeletePayment = async () => {
    if (!paymentHistoryModal.invoice || !deletingPaymentId) return;

    setIsSubmittingPayment(true);
    try {
      await deleteInvoicePayment(deletingPaymentId);
      triggerAlert('Success', 'Payment deleted successfully!', 'success');
      setDeletingPaymentId(null);
      const history = await getInvoicePayments(paymentHistoryModal.invoice.invoiceNo);
      setPaymentHistoryList(history || []);
      await fetchInvoices(true);
    } catch (err: any) {
      console.error('Failed to delete payment:', err);
      triggerAlert('Error', 'Failed to delete payment record.', 'info');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleAddPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentHistoryModal.invoice || !addPayAmount || !addPayDate) return;
    const numAmt = parseFloat(addPayAmount);
    if (isNaN(numAmt) || numAmt <= 0) return;

    setIsSubmittingPayment(true);
    try {
      if (editingPaymentId) {
        await updateInvoicePayment(editingPaymentId, {
          amount: numAmt,
          currency: addPayCurrency,
          paymentDate: addPayDate,
          note: addPayNote,
          proofUrl: addPayProof || undefined
        });
        triggerAlert('Success', 'Payment updated successfully!', 'success');
      } else {
        await addInvoicePayment(paymentHistoryModal.invoice.invoiceNo, {
          amount: numAmt,
          currency: addPayCurrency,
          paymentDate: addPayDate,
          note: addPayNote,
          proofUrl: addPayProof || undefined,
          saveOverpaymentCredit,
          companyCode: paymentHistoryModal.invoice.companyCode
        });
        triggerAlert('Success', 'Payment recorded successfully!', 'success');
      }

      setIsAddPaymentModalOpen(false);
      setEditingPaymentId(null);
      
      // Refresh history and invoices list
      const history = await getInvoicePayments(paymentHistoryModal.invoice.invoiceNo);
      setPaymentHistoryList(history || []);
      await fetchInvoices(true);
    } catch (err: any) {
      console.error('Failed to record/update payment:', err);
      triggerAlert('Error', err.response?.data?.message || 'Failed to record payment.', 'info');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // File Upload State & Reference for Payment Proof
  const [uploadingInvoiceNo, setUploadingInvoiceNo] = useState<string | null>(null);
  const [viewingProofBase64, setViewingProofBase64] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleTriggerUploadProof = (inv: Invoice) => {
    setUploadingInvoiceNo(inv.invoiceNo);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          const MAX_WIDTH = 1280;
          const MAX_HEIGHT = 1280;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedBase64);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !uploadingInvoiceNo) return;
    const file = e.target.files[0];
    const isPDF = file.type === 'application/pdf';
    
    try {
      setIsUploadingProof(true);
      let base64Data = '';
      if (isPDF) {
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
        });
      } else {
        base64Data = await compressImage(file);
      }
      
      await uploadPaymentProof(uploadingInvoiceNo, base64Data);
      setIsUploadingProof(false);
      
      setConfirmModal({
        isOpen: true,
        title: 'Upload Successful',
        message: `The payment proof transfer photo for Confirmation ${uploadingInvoiceNo} has been uploaded successfully.`,
        type: 'success',
        showCancel: false,
        confirmText: 'Done',
        onConfirm: () => {}
      });

      // Update state locally
      setInvoices(prev => prev.map(inv => inv.invoiceNo === uploadingInvoiceNo ? { ...inv, paymentAttachment: base64Data } : inv));
    } catch (err: any) {
      setIsUploadingProof(false);
      console.error('Failed to upload proof:', err);
      setConfirmModal({
        isOpen: true,
        title: 'Upload Failed',
        message: err.response?.data?.message || 'The file could not be uploaded. It might exceed size constraints.',
        type: 'danger',
        showCancel: false,
        confirmText: 'Dismiss',
        onConfirm: () => {}
      });
    } finally {
      setUploadingInvoiceNo(null);
    }
  };

  const handleViewPaymentProof = (inv: Invoice) => {
    if (inv.paymentAttachment) {
      setViewingProofBase64(inv.paymentAttachment);
    }
  };

  const fetchInvoices = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const fetched = await getInvoices();
      if (fetched) {
        setInvoices(fetched);
      }
      
      const compList = await getCompanies();
      if (compList) {
        localStorage.setItem('finance_companies', JSON.stringify(compList));
      }

      const teamList = await getTeamMembers();
      if (teamList) {
        localStorage.setItem('finance_team_members', JSON.stringify(teamList));
      }

      const companySettings = await getCompanySetting();
      if (companySettings) {
        localStorage.setItem('finance_company_settings', JSON.stringify(companySettings));
      }
    } catch (err) {
      console.error('Failed to fetch invoices, companies, team members, or company settings from API:', err);
      if (!isSilent) setError('Failed to fetch invoices. Please check backend service connections.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices(false);

    // Auto-refresh data dari database MySQL secara silent setiap 10 detik tanpa memicu loading flicker
    const interval = setInterval(() => {
      fetchInvoices(true);
    }, 10000);

    // Refresh saat tab diklik / kembali aktif secara silent
    const handleFocus = () => {
      fetchInvoices(true);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    const editNo = localStorage.getItem('edit_invoice_no');
    if (editNo && invoices.length > 0) {
      const found = invoices.find(inv => inv.invoiceNo === editNo);
      if (found) {
        localStorage.removeItem('edit_invoice_no');
        handleEditInvoiceClick(found);
      }
    }
  }, [invoices]);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Approved':
      case '3/3 Approved':
      case '4/4 Approved':
        return 'bg-[#ecfdf5] text-[#10b981]';
      case 'Pending':
      case 'Pending Review':
      case '0/3 Pending':
      case '1/3 Approved':
      case '2/3 Approved':
      case '0/4 Pending':
      case '1/4 Approved':
      case '2/4 Approved':
      case '3/4 Approved':
        return 'bg-[#fff7ed] text-[#f97316]';
      case 'Rejected':
      case 'Cancelled':
        return 'bg-[#fef2f2] text-[#ef4444]';
      case 'Overdue':
      case 'OVERDUE':
        return 'bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa]';
      case 'Archived':
        return 'bg-[#f1f5f9] text-[#475569]';
      case 'Paid':
      case 'Paid and closed':
        return 'bg-[#dbeafe] text-[#1e40af]';
      default:
        return 'bg-[#f1f5f9] text-[#475569]';
    }
  };

  // Helper untuk mendeteksi apakah invoice dibatalkan otomatis karena melewati due date
  const isInvoiceOverdue = (inv: any) => {
    if (inv.status !== 'Cancelled') return false;
    const reason = (inv.rejectionReason || '').toLowerCase();
    if (reason.includes('auto-cancelled') || reason.includes('unpaid past due date') || reason.includes('overdue')) {
      return true;
    }
    if (inv.dueDate) {
      const dueTime = new Date(inv.dueDate).getTime();
      const todayTime = new Date(new Date().toISOString().split('T')[0]).getTime();
      if (dueTime < todayTime) return true;
    }
    return false;
  };

  // Form States & Selection
  const [selectedClientKey, setSelectedClientKey] = useState<string>('Select client company...');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);
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

  const isCustomClient = selectedClientKey === 'Others';

  // Employee/Sender Fields (Bill From)
  const [formEmpName, setFormEmpName] = useState('');
  const [formCompNumber, setFormCompNumber] = useState('');
  const [formEmpId, setFormEmpId] = useState('');
  const [formCompEmail, setFormCompEmail] = useState('');
  const [formEntity, setFormEntity] = useState('');
  const [formCompTax, setFormCompTax] = useState('0000-0000-0000');

  // Itemized Charges
  const [formItems, setFormItems] = useState<{ description: string; qty: number; price: number; isService?: boolean }[]>([]);

  // Dynamically set Bill From fields from the logged-in user and company settings
  useEffect(() => {
    if (user) {
      setFormEmpName(user.name || '');
      setFormEmpId(user.employeeId || '');
      setFormCompNumber(companySettings.phone || user.phone || '');
      setFormCompEmail(user.email || '');
      setFormEntity(companySettings.companyName || 'ODST Group');
      setFormCompTax(companySettings.taxNumber || '0000-0000-0000');
    }
  }, [user, isModalOpen, companySettings]);

  // Reset validation error state when modal opens
  useEffect(() => {
    if (isModalOpen) {
      setShowValidation(false);
      setFormError('');
    }
  }, [isModalOpen]);

  // Dynamically set client selection when availableCompanies loads
  useEffect(() => {
    // If we are editing an invoice or "Others" is selected, do NOT reset client selection
    if (editInvoiceId || selectedClientKey === 'Others') return;

    if (availableCompanies.length > 0) {
      const keys = availableCompanies.map(c => `${c.name} - ${c.code}`);
      if (!selectedClientKey || selectedClientKey === 'Select client company...' || !keys.includes(selectedClientKey)) {
        handleClientChange(availableCompanies[0]);
      }
    } else {
      setSelectedClientKey('Select client company...');
      setFormInvoiceNo('');
      setFormRef('');
      setFormSerial('');
      setFormItems([]);
    }
  }, [availableCompanies, editInvoiceId]);

  const handleOpenCreateModal = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit', year: 'numeric' };
    setFormInvoiceDate(today.toLocaleDateString('en-US', options));
    setEditInvoiceId(null);
    setFormItems([]);
    setFormCurrency('USD');
    setFormError('');
    setCustomCompanyName('');
    setCustomCompanyEmail('');
    setCustomCompanyAgent('');
    setCustomCompanyAddress('');
    setCustomCompanyCityCountry('');
    setCustomCompanyTaxNumber('');
    setIsModalOpen(true);
    if (availableCompanies.length > 0) {
      handleClientChange(availableCompanies[0]);
    } else {
      setSelectedClientKey('Select client company...');
      setFormInvoiceNo('');
      setFormRef('');
      setFormSerial('');
    }
  };

  const [formError, setFormError] = useState('');
  const [showValidation, setShowValidation] = useState(false);
  const [successModalStep, setSuccessModalStep] = useState<0 | 1 | 2>(0);
  const [justCreatedInvoice, setJustCreatedInvoice] = useState<Invoice | null>(null);
  const [activeFocusIndex, setActiveFocusIndex] = useState<{ index: number; field: 'price' | 'qty' } | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'success' | 'info';
    showCancel: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    onConfirm: () => { },
    type: 'warning',
    showCancel: true,
  });

  const triggerConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    type: 'danger' | 'warning' = 'warning',
    confirmText = 'Confirm',
    cancelText = 'Cancel'
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm,
      type,
      showCancel: true,
    });
  };

  const triggerAlert = (title: string, message: string, type: 'success' | 'info' = 'success') => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText: 'OK',
      cancelText: '',
      onConfirm: () => { },
      type,
      showCancel: false,
    });
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

  // Load services and rates from settings API
  const [availableServices, setAvailableServices] = useState<{ name: string; price: number; currency?: string }[]>([]);
  const [configuredRates, setConfiguredRates] = useState<{ usdToIdr: number; sarToIdr: number; usdToSar: number }>({ usdToIdr: 18025, sarToIdr: 4800, usdToSar: 3.75 });
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const rates = await getExchangeRates();
        if (rates) {
          setConfiguredRates({
            usdToIdr: parseExchangeRate(rates.usdToIdr, true) || 18025,
            sarToIdr: parseExchangeRate(rates.sarToIdr, true) || 4800,
            usdToSar: parseExchangeRate(rates.usdToSar, true) || 3.75
          });
        }
      } catch (err) {
        console.error('Failed to load exchange rates from API:', err);
      }

      try {
        const svcs = await getServices();
        if (svcs) {
          const formatted = svcs
            .filter((s: any) => s.status === 'Active')
            .map((s: any) => ({
              name: s.name,
              price: parseFloat(s.price) || 0,
              currency: s.currency || 'USD'
            }));
          setAvailableServices(formatted);
        }
      } catch (err) {
        console.error('Failed to load services from API:', err);
      }

      try {
        const taxSetting = await getTaxSetting();
        if (taxSetting) {
          setGlobalTaxRate(parseFloat(taxSetting.taxPercentage) || 0);
        }
      } catch (err) {
        console.error('Failed to load tax settings from API:', err);
      }
    };
    fetchSettings();

    const fetchCompaniesList = async () => {
      try {
        const list = await getCompanies();
        if (list) {
          setAvailableCompanies(list);
        }
      } catch (err) {
        console.error('Failed to load companies from API:', err);
      }
    };
    fetchCompaniesList();
  }, [isModalOpen]);

  const generateInvoiceNumber = (compCode: string, dateStr: string, currentInvoices: Invoice[]) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const mmdd = `${mm}${dd}`;

    // Find all invoices that start with e.g. "AIT-0821-"
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

  const handleClientChange = (comp: { name: string; code: string; phone?: string; address?: string; taxNumber?: string; agent?: string }) => {
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

    const generatedNo = generateInvoiceNumber(comp.code, dateToUse, invoices);
    setFormInvoiceNo(generatedNo);

    const randomRefSuffix = Math.floor(100 + Math.random() * 900);
    const randomSerialSuffix = Math.floor(100000 + Math.random() * 900000);

    const dateObj = new Date(dateToUse);
    const rMm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const rDd = String(dateObj.getDate()).padStart(2, '0');
    const mmdd = `${rMm}${rDd}`;

    setFormRef(`REF-${mmdd}-${randomRefSuffix}`);
    setFormSerial(`SR-${randomSerialSuffix}`);
    setFormItems([]);
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

    const generatedNo = generateInvoiceNumber('OTH', dateToUse, invoices);
    setFormInvoiceNo(generatedNo);

    const randomRefSuffix = Math.floor(100 + Math.random() * 900);
    const randomSerialSuffix = Math.floor(100000 + Math.random() * 900000);

    const dateObj = new Date(dateToUse);
    const rMm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const rDd = String(dateObj.getDate()).padStart(2, '0');
    const mmdd = `${rMm}${rDd}`;

    setFormRef(`REF-${mmdd}-${randomRefSuffix}`);
    setFormSerial(`SR-${randomSerialSuffix}`);
    setFormItems([]);
  };

  const handleDateChange = (newDate: string) => {
    setFormDate(newDate);
    const compCode = selectedClientKey === 'Others' ? 'OTH' : (selectedClientKey.split(' - ')[1] || 'GEN');
    const generatedNo = generateInvoiceNumber(compCode, newDate, invoices);
    setFormInvoiceNo(generatedNo);

    // Also update REF # based on the new date
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

  const itemsPerPage = 10;

  // Filtered & Paginated Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (!inv) return false;
      // 1. Search Query
      const q = searchQuery.toLowerCase();
      const matchesSearch = (
        (inv.invoiceNo || '').toLowerCase().includes(q) ||
        (inv.company || '').toLowerCase().includes(q) ||
        (inv.companyCode || '').toLowerCase().includes(q) ||
        (inv.referenceNo || '').toLowerCase().includes(q) ||
        (inv.serialNo || '').toLowerCase().includes(q)
      );

      // 2. Company Filter
      const matchesCompany = !filterCompany || inv.company === filterCompany || inv.companyCode === filterCompany;

      // 3. Status Filter
      let matchesStatus = true;
      if (filterStatus) {
        const invStatus = inv.status || '';
        if (filterStatus === 'Pending') {
          matchesStatus = invStatus.includes('Pending') || invStatus.includes('Approved') || invStatus === 'Pending Review';
        } else if (filterStatus === 'Overdue' || filterStatus === 'Cancelled due to overdue') {
          matchesStatus = isInvoiceOverdue(inv) || invStatus === 'Overdue' || invStatus === 'Cancelled due to overdue';
        } else if (filterStatus === 'Cancelled') {
          matchesStatus = invStatus === 'Cancelled' && !isInvoiceOverdue(inv);
        } else {
          matchesStatus = invStatus === filterStatus;
        }
      }

      // 4. Date Filter
      let matchesDate = true;
      if (filterDate) {
        matchesDate = compareDates(inv.date || '', filterDate);
      }

      return matchesSearch && matchesCompany && matchesStatus && matchesDate;
    });
  }, [invoices, searchQuery, filterCompany, filterStatus, filterDate]);

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);

  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInvoices, currentPage]);

  // Adjust current page if filter shrinks data size
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [filteredInvoices, totalPages, currentPage]);

  // Stats calculation
  const approvedCount = invoices.filter(inv => inv && (inv.status === 'Approved' || inv.status === '3/3 Approved' || inv.status === '4/4 Approved' || inv.status === 'Paid' || inv.status === 'Paid and closed')).length;
  const pendingCount = invoices.filter(inv => inv && inv.status && (
    inv.status === 'Pending' || 
    inv.status === 'Pending Review' || 
    inv.status === '0/3 Pending' || 
    inv.status === '1/3 Approved' || 
    inv.status === '2/3 Approved' || 
    inv.status === '0/4 Pending' || 
    inv.status === '1/4 Approved' || 
    inv.status === '2/4 Approved' || 
    inv.status === '3/4 Approved'
  )).length;
  const overdueInvoicesList = invoices.filter(inv => inv && (inv.status === 'Overdue' || inv.status === 'Cancelled due to overdue' || isInvoiceOverdue(inv) || inv.status === 'Rejected'));
  const overdueCount = overdueInvoicesList.length;

  const totalOverdueAmountUSD = overdueInvoicesList.reduce((sum, inv) => {
    const rawAmt = parseExchangeRate(inv.amount, false);
    const curr = inv.currency || (String(inv.amount || '').includes('Rp') ? 'IDR' : String(inv.amount || '').includes('SAR') ? 'SAR' : 'USD');
    const converted = calculateConvertedTotals(rawAmt, curr, configuredRates.usdToIdr, configuredRates.sarToIdr, configuredRates.usdToSar);
    return sum + converted.usdVal;
  }, 0);

  const formattedOverdueBalance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(totalOverdueAmountUSD);

  const dynamicApproved = approvedCount;
  const dynamicPending = pendingCount;
  const dynamicOverdue = overdueCount;
  const dynamicTotal = invoices.length;
  const successRate = dynamicTotal > 0
    ? ((dynamicApproved / dynamicTotal) * 100).toFixed(1)
    : '0.0';

  const handleGenerateInvoice = (e: React.FormEvent) => {
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

    // Format Date for Invoice Date (today's date)
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit', year: 'numeric' };
    const todayFormattedDate = today.toLocaleDateString('en-US', options);

    const isCustom = selectedClientKey === 'Others';

    let compName = '';
    let compCode = 'OTH';
    let compAgent = formAgent;

    if (isCustom) {
      if (!customCompanyName.trim()) {
        setFormError(t('invoices.customCompanyNameRequired'));
        return;
      }
      compName = customCompanyName.trim();
      compCode = 'OTH';
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
      date: editInvoiceId ? (formInvoiceDate || todayFormattedDate) : todayFormattedDate,
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
      company_id: isCustom ? null : compCode,
      custom_company_name: isCustom ? compName : null,
      custom_company_email: isCustom ? (customCompanyEmail.trim() || null) : null,
      custom_agent: isCustom ? (compAgent || null) : null,
      custom_address: isCustom ? (combinedCustomAddress || null) : null,
      custom_tax_number: isCustom ? (customCompanyTaxNumber.trim() || null) : null,
    };

    const saveInvoice = async () => {
      try {
        if (editInvoiceId) {
          await updateInvoiceAPI(editInvoiceId, newInvoice);
          triggerAlert('Success', 'Invoice updated successfully and approval workflow reset.', 'success');
          setEditInvoiceId(null);
          setIsModalOpen(false);
          if (availableCompanies.length > 0) {
            handleClientChange(availableCompanies[0]);
          } else {
            setSelectedClientKey('Select client company...');
          }
          setCustomCompanyName('');
          setCustomCompanyEmail('');
          setCustomCompanyAgent('');
          setCustomCompanyAddress('');
          setCustomCompanyCityCountry('');
          setCustomCompanyTaxNumber('');
          setFormError('');
        } else {
          await createInvoiceAPI(newInvoice);
          setJustCreatedInvoice(newInvoice);
          setIsModalOpen(false);
          if (availableCompanies.length > 0) {
            handleClientChange(availableCompanies[0]);
          } else {
            setSelectedClientKey('Select client company...');
          }
          setCustomCompanyName('');
          setCustomCompanyEmail('');
          setCustomCompanyAgent('');
          setCustomCompanyAddress('');
          setCustomCompanyCityCountry('');
          setCustomCompanyTaxNumber('');
          setFormError('');
          setSuccessModalStep(1);
        }
        await fetchInvoices();
      } catch (err: any) {
        console.error('Failed to save or update invoice via API:', err);
        const errMsg = err.response?.data?.message || err.message || 'Failed to save or update invoice';
        setFormError(errMsg);
      }
    };
    saveInvoice();
  };

  const handleEditInvoiceClick = (inv: Invoice) => {
    setEditInvoiceId(inv.invoiceNo);
    const isCustom = inv.companyCode === 'OTH' || Boolean(inv.custom_company_name);
    if (isCustom) {
      setSelectedClientKey('Others');
      setCustomCompanyName(inv.custom_company_name || inv.company || '');
      setCustomCompanyEmail(inv.custom_company_email || '');
      setCustomCompanyAgent(inv.custom_agent || inv.agent || '');
      setCustomCompanyTaxNumber(inv.custom_tax_number || '');
      if (inv.custom_address) {
        const parts = inv.custom_address.split(', ');
        if (parts.length > 1) {
          setCustomCompanyAddress(parts[0]);
          setCustomCompanyCityCountry(parts.slice(1).join(', '));
        } else {
          setCustomCompanyAddress(inv.custom_address);
          setCustomCompanyCityCountry('');
        }
      } else {
        setCustomCompanyAddress('');
        setCustomCompanyCityCountry('');
      }
    } else {
      setSelectedClientKey(`${inv.company} - ${inv.companyCode}`);
      setCustomCompanyName('');
      setCustomCompanyEmail('');
      setCustomCompanyAgent('');
      setCustomCompanyAddress('');
      setCustomCompanyCityCountry('');
      setCustomCompanyTaxNumber('');
    }
    setFormInvoiceNo(inv.invoiceNo);
    setFormRef(inv.referenceNo);
    setFormSerial(inv.serialNo);
    setFormDate(inv.dueDate ? convertToISODate(inv.dueDate) : convertToISODate(inv.date));
    setFormInvoiceDate(inv.date);
    setFormAgent(inv.agent || '');
    setFormCurrency(inv.currency || 'USD');
    if (inv.items) {
      setFormItems(inv.items.map(item => ({
        description: item.description,
        qty: item.qty,
        price: item.price,
        isService: availableServices.some(s => s.name === item.description)
      })));
    } else {
      setFormItems([]);
    }
    setIsModalOpen(true);
  };

  const handleCancelSingleInvoice = (invoiceNo: string) => {
    triggerConfirm(
      'Cancel Invoice',
      `Are you sure you want to cancel invoice ${invoiceNo}?`,
      async () => {
        try {
          await cancelInvoiceAPI(invoiceNo);
          triggerAlert('Success', 'Invoice cancelled successfully.', 'success');
          await fetchInvoices();
        } catch (err) {
          console.error('Failed to cancel invoice:', err);
          triggerAlert('Error', 'Failed to cancel invoice.', 'info');
        }
      },
      'warning',
      'Cancel Invoice',
      'Keep Invoice'
    );
  };

  const handleDeleteSingleInvoice = (invoiceNo: string) => {
    triggerConfirm(
      'Delete Invoice',
      `Are you sure you want to permanently delete invoice ${invoiceNo}? This action cannot be undone.`,
      async () => {
        try {
          await deleteInvoicesAPI([invoiceNo]);
          triggerAlert('Success', 'Invoice deleted successfully.', 'success');
          await fetchInvoices();
        } catch (err) {
          console.error('Failed to delete invoice:', err);
          triggerAlert('Error', 'Failed to delete invoice.', 'info');
        }
      },
      'danger',
      'Delete Invoice',
      'Cancel'
    );
  };

  const handleBulkDelete = () => {
    triggerConfirm(
      'Delete Selected Confirmations',
      `Are you sure you want to permanently delete the ${selectedInvoiceIds.length} selected confirmations? This action cannot be undone.`,
      async () => {
        try {
          await deleteInvoicesAPI(selectedInvoiceIds);
          triggerAlert('Success', 'Selected confirmations deleted successfully.', 'success');
          setSelectedInvoiceIds([]);
          await fetchInvoices();
        } catch (err) {
          console.error('Failed to delete selected confirmations:', err);
          triggerAlert('Error', 'Failed to delete selected confirmations.', 'info');
        }
      },
      'danger',
      'Delete Confirmations',
      'Cancel'
    );
  };

  const handleBulkExport = () => {
    const selectedInvoices = invoices.filter(inv => selectedInvoiceIds.includes(inv.invoiceNo));
    if (selectedInvoices.length === 0) return;

    const headers = ['Confirmation No', 'Company', 'Reference No', 'Amount', 'Date', 'Status'];
    const rows = selectedInvoices.map(inv => [
      inv.invoiceNo,
      inv.company,
      inv.referenceNo,
      inv.amount,
      inv.date,
      inv.status
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `exported_invoices_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerAlert('Success', `Successfully exported ${selectedInvoices.length} invoices as CSV.`, 'success');
  };

  const handleBulkSendForApproval = async () => {
    const selectedDraftInvoices = invoices.filter(
      inv => selectedInvoiceIds.includes(inv.invoiceNo) && inv.status.toLowerCase() === 'draft'
    );

    if (selectedDraftInvoices.length === 0) {
      triggerAlert('Info', 'None of the selected invoices are in Draft status.', 'info');
      return;
    }

    try {
      await Promise.all(selectedDraftInvoices.map(async (inv) => {
        await createRequest({
          invoiceNo: inv.invoiceNo,
          company: inv.company,
          companyCode: inv.companyCode,
          amount: inv.amount,
          requestedBy: user?.name || 'Ahmad Saleh',
          submittedDate: inv.date || new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        });

        await updateInvoiceStatus(inv.invoiceNo, '0/4 Pending');
      }));

      triggerAlert('Success', `Sent ${selectedDraftInvoices.length} invoice(s) for approval.`, 'success');
      setSelectedInvoiceIds([]);
      await fetchInvoices();
    } catch (err) {
      console.error('Failed to send invoices for approval:', err);
      triggerAlert('Error', 'Failed to send selected invoices for approval.', 'info');
    }
  };

  const handleSendRequestFromSuccessModal = async () => {
    if (!justCreatedInvoice) return;
    try {
      await createRequest({
        invoiceNo: justCreatedInvoice.invoiceNo,
        company: justCreatedInvoice.company,
        companyCode: justCreatedInvoice.companyCode,
        amount: justCreatedInvoice.amount,
        requestedBy: user?.name || 'Ahmad Saleh',
        submittedDate: justCreatedInvoice.date || new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      });

      await updateInvoiceStatus(justCreatedInvoice.invoiceNo, '0/4 Pending');
      setSuccessModalStep(2);
      setJustCreatedInvoice(null);
      await fetchInvoices();
    } catch (err) {
      console.error('Failed to send request for approval:', err);
      triggerAlert('Error', 'Failed to send request for approval.', 'info');
    }
  };

  const handleBulkCancel = () => {
    triggerConfirm(
      'Cancel Selected Invoices',
      `Are you sure you want to cancel the ${selectedInvoiceIds.length} selected invoices?`,
      async () => {
        try {
          await Promise.all(selectedInvoiceIds.map(id => cancelInvoiceAPI(id)));
          triggerAlert('Success', 'Selected invoices cancelled successfully.', 'success');
          setSelectedInvoiceIds([]);
          await fetchInvoices();
        } catch (err) {
          console.error('Failed to cancel selected invoices:', err);
          triggerAlert('Error', 'Error cancelling invoices.', 'info');
        }
      },
      'warning',
      'Cancel Invoices',
      'Go Back'
    );
  };



  const selectedCompanyObj = availableCompanies.find(c => {
    const dbKey = `${c.name} - ${c.code}`.replace(/\s+/g, '').toLowerCase();
    const currentKey = selectedClientKey.replace(/\s+/g, '').toLowerCase();
    return dbKey === currentKey || c.name.trim().toLowerCase() === selectedClientKey.split(' - ')[0].trim().toLowerCase();
  });

  return (
    <div className="flex min-h-screen w-full bg-[#f4f6fa] select-none font-inter">
      {/* Sidebar Layout */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header Layout */}
        <Header />

        {/* Content Body */}
        <div className="flex-1 p-8 space-y-8 max-w-[1400px] w-full mx-auto">
          {/* Welcome Banner / Header */}
          <div className="flex justify-between items-center">
            <div className="flex flex-col space-y-1">
              <h1 className="text-[28px] font-bold text-[#0c0d0f] tracking-tight">
                {t('invoices.title')}
              </h1>
              <p className="text-[13px] text-[#64748b] font-medium font-sans">
                {t('invoices.subtitle')}
              </p>
            </div>

            {user?.role !== 'Viewer' && (
              <button
                onClick={handleOpenCreateModal}
                className="flex items-center space-x-2 px-4 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white font-semibold text-[13px] rounded-lg shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>{t('invoices.createConfirmation')}</span>
              </button>
            )}
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title={t('dashboard.totalConfirmations')}
              value={`${dynamicTotal} ${t('common.total')}`}
              subtext={t('dashboard.activeLedgerRecords')}
              badgeText={t('common.all')}
              badgeColorClass="bg-[#e0f2fe] text-[#0284c7]"
              isLoading={loading}
            />
            <StatCard
              title={t('common.statusApproved')}
              value={`${dynamicApproved} ${t('common.statusApproved')}`}
              subtext={t('invoices.clearedSubtext')}
              badgeText={`${successRate}%`}
              badgeColorClass="bg-[#ecfdf5] text-[#10b981]"
              isLoading={loading}
            />
            <StatCard
              title={t('dashboard.pendingApprovals')}
              value={`${dynamicPending} ${t('common.statusPending')}`}
              subtext={t('dashboard.requiresReview')}
              badgeText={t('invoices.awaitingClearance')}
              badgeColorClass="bg-[#fff7ed] text-[#f97316]"
              isLoading={loading}
            />
            <StatCard
              title={t('dashboard.overdueBalance')}
              value={formattedOverdueBalance}
              subtext={`${dynamicOverdue} ${dynamicOverdue !== 1 ? t('dashboard.overdueConfirmations') : t('dashboard.overdueConfirmation')}`}
              badgeText={t('dashboard.actionRequired')}
              badgeColorClass="bg-[#fef2f2] text-[#ef4444]"
              isLoading={loading}
            />
          </div>

          {/* Invoices Table Card */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
            {/* Table Header Section */}
            <div className="px-6 py-6 flex items-center justify-between border-b border-[#e2e8f0]">
              <h3 className="text-[15px] font-bold text-[#0c0d0f] font-sans">
                {t('invoices.recentApprovedConfirmations')}
              </h3>
              {invoices.length > 0 && !loading && (
                <div className="relative w-60 animate-fade-in">
                  <input
                    type="text"
                    placeholder={t('invoices.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border border-[#cbd5e1] rounded-xl text-[12px] font-semibold text-[#1e293b] placeholder-gray-400 focus:outline-none focus:border-[#2563eb] bg-white transition-all font-sans"
                  />
                  <Search className="absolute left-3.5 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              )}
            </div>

            {error ? (
              <NetworkErrorState
                message="We could not load your confirmations. Please check your connection and try again."
                onRetry={fetchInvoices}
              />
            ) : loading ? (
              // Table Body Section with skeleton
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px] font-sans">
                  <thead>
                    <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                      <th className="px-4 py-3 text-center w-12">
                        <input type="checkbox" disabled className="rounded border-gray-300 w-4 h-4" />
                      </th>
                      {['CONFIRMATION #', 'COMPANY', 'COMPANY CODE', 'REFERENCE #', 'SERIAL #', 'AMOUNT', 'DATE', 'STATUS', 'ACTIONS'].map((h) => (
                        <th key={h} className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0]">
                    {Array.from({ length: 5 }).map((_, loadIdx) => (
                      <tr key={`skeleton-${loadIdx}`} className="animate-pulse border-b border-[#e2e8f0]">
                        <td className="px-4 py-4"><div className="w-4 h-4 bg-gray-200 rounded mx-auto"></div></td>
                        <td className="px-6 py-4"><div className="w-20 h-4 bg-gray-200 rounded"></div></td>
                        <td className="px-6 py-4"><div className="w-32 h-4 bg-gray-200 rounded"></div></td>
                        <td className="px-6 py-4"><div className="w-12 h-4 bg-gray-200 rounded"></div></td>
                        <td className="px-6 py-4"><div className="w-24 h-4 bg-gray-200 rounded"></div></td>
                        <td className="px-6 py-4"><div className="w-20 h-4 bg-gray-200 rounded"></div></td>
                        <td className="px-6 py-4"><div className="w-16 h-4 bg-gray-200 rounded"></div></td>
                        <td className="px-6 py-4"><div className="w-20 h-4 bg-gray-200 rounded"></div></td>
                        <td className="px-6 py-4"><div className="w-16 h-4 bg-gray-200 rounded"></div></td>
                        <td className="px-6 py-4"><div className="w-20 h-4 bg-gray-200 rounded"></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : invoices.length === 0 ? (
              // System Empty State (Mockup layout)
              <div className="py-20 flex flex-col items-center justify-center bg-white px-4 animate-fade-in">
                <div className="w-14 h-14 bg-[#f8fafc] border border-[#f1f5f9] text-[#475569] rounded-full flex items-center justify-center mb-5 shadow-sm">
                  <FileText className="w-6 h-6 text-[#94a3b8]" />
                </div>
                <h4 className="text-[16px] font-bold text-[#0c0d0f] text-center mb-1.5 font-sans">
                  No confirmations yet
                </h4>
                <p className="text-[12.5px] text-[#64748b] text-center font-medium font-sans max-w-sm mb-6 leading-relaxed">
                  Generate your first confirmation to get started. Make sure you have added at least one partner company.
                </p>
                {user?.role !== 'Viewer' && (
                  <button
                    onClick={handleOpenCreateModal}
                    className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-[13px] rounded-xl shadow-sm transition-all cursor-pointer font-sans"
                  >
                    Generate Confirmation
                  </button>
                )}
              </div>
            ) : (
              // Standard Table Layout (Filters + Table Data + Pagination)
              <>
                {/* Filters Bar */}
                <div className="px-6 py-4 border-b border-[#e2e8f0] bg-slate-50/50 flex flex-wrap items-center gap-4 animate-fade-in">
                  {/* Search Bar Input */}
                  <div className="relative w-64">
                    <input
                      type="text"
                      placeholder={t('invoices.searchPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-9 pr-3 py-1.5 border border-[#cbd5e1] rounded-lg text-[13px] font-medium text-[#1e293b] placeholder-gray-400 focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] bg-white transition-all font-sans"
                    />
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>

                  {/* Company Filter Dropdown */}
                  <select
                    value={filterCompany}
                    onChange={(e) => {
                      setFilterCompany(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="border border-[#cbd5e1] rounded-lg text-[13px] font-medium text-[#1e293b] px-3 py-1.5 focus:outline-none focus:border-[#f59e0b] bg-white transition-all cursor-pointer"
                  >
                    <option value="">{t('invoices.allCompanies')}</option>
                    {availableCompanies.map((c) => (
                      <option key={c.code} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  {/* Status Filter Dropdown */}
                  <select
                    value={filterStatus}
                    onChange={(e) => {
                      setFilterStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="border border-[#cbd5e1] rounded-lg text-[13px] font-medium text-[#1e293b] px-3 py-1.5 focus:outline-none focus:border-[#f59e0b] bg-white transition-all cursor-pointer"
                  >
                    <option value="">{t('invoices.allStatuses')}</option>
                    <option value="Pending">{t('common.statusPending')}</option>
                    <option value="Approved">{t('common.statusApproved')}</option>
                    <option value="Rejected">{t('common.statusRejected')}</option>
                    <option value="Cancelled">{t('common.statusCancelled')}</option>
                    <option value="Overdue">{t('common.statusOverdue')}</option>
                    <option value="Paid">{t('common.statusPaid')}</option>
                  </select>

                  {/* Date Filter Input */}
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => {
                      setFilterDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    onClick={(e) => {
                      if (typeof e.currentTarget.showPicker === 'function') {
                        try {
                          e.currentTarget.showPicker();
                        } catch (err) {
                          console.warn('showPicker failed:', err);
                        }
                      }
                    }}
                    className="border border-[#cbd5e1] rounded-lg text-[13px] font-medium text-[#1e293b] px-3 py-1.5 focus:outline-none focus:border-[#f59e0b] bg-white transition-all cursor-pointer"
                  />

                  {/* Reset Filters Button */}
                  {(searchQuery || filterCompany || filterStatus || filterDate) && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setFilterCompany('');
                        setFilterStatus('');
                        setFilterDate('');
                        setCurrentPage(1);
                      }}
                      className="text-[12px] font-semibold text-[#f59e0b] hover:text-[#d97706] transition-colors cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>

                {/* Bulk Actions Banner */}
                {selectedInvoiceIds.length > 0 && (
                  <div className="bg-[#f0f9ff] border-b border-[#e0f2fe] px-6 py-3 flex items-center justify-between transition-all animate-fade-in">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={() => setSelectedInvoiceIds([])}
                        className="rounded border-gray-300 text-[#2563eb] focus:ring-[#2563eb] w-4 h-4 cursor-pointer"
                      />
                      <span className="text-[13px] text-[#1d4ed8] font-bold">
                        {selectedInvoiceIds.length} selected
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleBulkExport}
                        className="px-4 py-1.5 bg-white border border-[#2563eb] text-[#2563eb] rounded-lg text-[12px] font-bold hover:bg-blue-50/50 transition-all cursor-pointer shadow-sm font-sans"
                      >
                        Export
                      </button>
                      <button
                        onClick={handleBulkSendForApproval}
                        className="px-4 py-1.5 bg-[#2563eb] text-white rounded-lg text-[12px] font-bold hover:bg-[#1d4ed8] transition-all cursor-pointer shadow-sm font-sans"
                      >
                        Send for Approval
                      </button>
                      <button
                        onClick={handleBulkCancel}
                        className="px-4 py-1.5 bg-white border border-[#ef4444] text-[#ef4444] rounded-lg text-[12px] font-bold hover:bg-red-50/50 transition-all cursor-pointer shadow-sm font-sans"
                      >
                        Void
                      </button>
                      {(user?.role === 'Super Admin' || user?.role === 'Chief Accountant' || user?.role === 'Division Director' || user?.role === 'Madinah Branch Accountant') && (
                        <button
                          onClick={handleBulkDelete}
                          className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-[12px] font-bold hover:bg-red-700 transition-all cursor-pointer shadow-sm font-sans"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}


                {/* Table Body Section */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1000px] font-sans">
                    <thead>
                      <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                        {user?.role !== 'Viewer' && (
                          <th className="px-4 py-3 text-center w-12">
                            <input
                              type="checkbox"
                              checked={paginatedInvoices.length > 0 && paginatedInvoices.every(inv => selectedInvoiceIds.includes(inv.invoiceNo))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const newSelected = [...selectedInvoiceIds];
                                  paginatedInvoices.forEach(inv => {
                                    if (!newSelected.includes(inv.invoiceNo)) newSelected.push(inv.invoiceNo);
                                  });
                                  setSelectedInvoiceIds(newSelected);
                                } else {
                                  setSelectedInvoiceIds(selectedInvoiceIds.filter(id => !paginatedInvoices.map(inv => inv.invoiceNo).includes(id)));
                                }
                              }}
                              className="rounded border-gray-300 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                            />
                          </th>
                        )}
                         <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter">
                          {t('hotelReservations.confNo')}
                        </th>
                        <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter">
                          {t('companies.companyName')}
                        </th>
                        <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter">
                          {t('companies.companyCode')}
                        </th>
                        <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter">
                          {t('dashboard.ref')}
                        </th>
                        <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter">
                          {t('invoices.serialNo')}
                        </th>
                        <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter">
                          {t('common.amount')}
                        </th>
                        <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter">
                          {t('dashboard.confDate')}
                        </th>
                        <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter">
                          {t('dashboard.dueDate')}
                        </th>
                        <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter">
                          {t('common.status')}
                        </th>
                        <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter text-center">
                          {t('common.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0]">
                      {paginatedInvoices.length > 0 ? (
                        paginatedInvoices.map((inv, idx) => (
                          <tr
                            key={idx}
                            onClick={() => setSelectedInvoice(inv)}
                            className={`transition-colors font-medium text-[13px] text-[#0c0d0f] cursor-pointer ${selectedInvoiceIds.includes(inv.invoiceNo)
                                ? "bg-[#f0f9ff] hover:bg-[#e0f2fe]"
                                : "hover:bg-slate-50/50"
                              }`}
                          >
                            {user?.role !== 'Viewer' && (
                              <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedInvoiceIds.includes(inv.invoiceNo)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedInvoiceIds([...selectedInvoiceIds, inv.invoiceNo]);
                                    } else {
                                      setSelectedInvoiceIds(selectedInvoiceIds.filter(id => id !== inv.invoiceNo));
                                    }
                                  }}
                                  className="rounded border-gray-300 text-[#2563eb] focus:ring-[#2563eb] w-4 h-4 cursor-pointer"
                                />
                              </td>
                            )}
                            <td className="px-6 py-3.5 font-bold font-inter text-[#0c0d0f]">
                              {inv.invoiceNo}
                            </td>
                            <td className="px-6 py-3.5 text-[#1e293b]">
                              {inv.company}
                            </td>
                            <td className="px-6 py-3.5 text-[#64748b] font-inter">
                              {inv.companyCode}
                            </td>
                            <td className="px-6 py-3.5 text-[#64748b] font-inter">
                              {inv.referenceNo}
                            </td>
                            <td className="px-6 py-3.5 text-[#64748b] font-inter">
                              {inv.serialNo}
                            </td>
                            <td className="px-6 py-3.5 font-bold font-inter text-[#0c0d0f]">
                              {inv.amount}
                            </td>
                            <td className="px-6 py-3.5 text-[#64748b] font-inter">
                              {inv.date ? formatLocalizedDate(inv.date, i18n.language) : '-'}
                            </td>
                            <td className="px-6 py-3.5 text-[#64748b] font-inter">
                              {(() => {
                                if (inv.dueDate) {
                                  if (inv.dueDate.includes('-')) {
                                    const parts = inv.dueDate.split('-');
                                    if (parts.length === 3) {
                                      const year = parseInt(parts[0]);
                                      const month = parseInt(parts[1]) - 1;
                                      const day = parseInt(parts[2]);
                                      const dObj = new Date(year, month, day);
                                      const localeCode = i18n.language === 'id' ? 'id-ID' : i18n.language === 'ar' ? 'ar-SA' : 'en-US';
                                      return dObj.toLocaleDateString(localeCode, { month: 'short', day: '2-digit', year: 'numeric' });
                                    }
                                  }
                                  return formatLocalizedDate(inv.dueDate, i18n.language);
                                }
                                return 'N/A';
                              })()}
                            </td>
                             <td className="px-6 py-3.5 whitespace-nowrap">
                               {(() => {
                                 const rawAmt = parseFloat(String(inv.amount || '0').replace(/[^0-9.-]/g, '')) || 0;
                                 const advAmt = parseFloat(String(inv.advancePayment || 0));
                                 const remaining = inv.remainingBalance !== undefined && inv.remainingBalance !== null 
                                   ? parseFloat(String(inv.remainingBalance)) 
                                   : Math.max(0, rawAmt - advAmt);
                                 
                                 const isOverdue = inv.dueDate && new Date(inv.dueDate) < new Date(new Date().toISOString().split('T')[0]);

                                 if (inv.status === 'FULLY_PAID' || inv.status === 'Paid' || (remaining <= 0 && rawAmt > 0)) {
                                   return (
                                     <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider inline-flex items-center gap-1.5 font-sans shadow-sm">
                                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                       {t('common.statusPaid')}
                                     </span>
                                   );
                                 }
                                 if (inv.status === 'PARTIAL' || (remaining < rawAmt - advAmt && remaining > 0)) {
                                   return (
                                     <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider inline-flex items-center gap-1.5 font-sans shadow-sm">
                                       <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                       {t('common.statusPartial')}
                                     </span>
                                   );
                                 }
                                 if (advAmt > 0 && remaining > 0) {
                                   return (
                                     <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider inline-flex items-center gap-1.5 font-sans shadow-sm">
                                       <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                       {t('common.statusDeposit')}
                                     </span>
                                   );
                                 }
                                 if (isOverdue && remaining > 0) {
                                   return (
                                     <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 uppercase tracking-wider inline-flex items-center gap-1.5 font-sans shadow-sm">
                                       <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                       {t('common.statusOverdue')}
                                     </span>
                                   );
                                 }
                                 const statusMap: Record<string, string> = {
                                   'Pending': t('common.statusPending'),
                                   'Approved': t('common.statusApproved'),
                                   'Rejected': t('common.statusRejected'),
                                   'Cancelled': t('common.statusCancelled'),
                                   'Tentative': t('common.statusTentative'),
                                   'Confirmed': t('common.statusConfirmed'),
                                 };
                                 return (
                                   <span className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase font-sans ${getStatusBadgeClass(inv.status)} shadow-sm`}>
                                     {statusMap[inv.status] || inv.status}
                                   </span>
                                 );
                               })()}
                             </td>
                             <td className="px-6 py-3.5 text-center flex items-center justify-center space-x-1" onClick={(e) => e.stopPropagation()}>
                               {/* 1. Payment History & Installment Ledger Button */}
                               <button
                                 onClick={() => openPaymentHistoryModal(inv)}
                                 title="Payment History & Installments Ledger"
                                 className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-600 hover:text-amber-700 transition-all cursor-pointer"
                               >
                                 <Receipt className="w-4 h-4" />
                               </button>

                               {/* 2. Payment Proof Upload / View Button (ALWAYS VISIBLE) */}
                               {inv.paymentAttachment ? (
                                 <button
                                   onClick={() => handleViewPaymentProof(inv)}
                                   title="View Payment Proof Transfer Photo / PDF"
                                   className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600 hover:text-emerald-700 transition-all cursor-pointer flex items-center justify-center font-bold relative"
                                 >
                                   <Upload className="w-4 h-4 text-emerald-600" />
                                   <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                                 </button>
                               ) : (
                                 user?.role !== 'Viewer' && (
                                   <button
                                     onClick={() => handleTriggerUploadProof(inv)}
                                     title="Upload Payment Proof Transfer"
                                     className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 hover:text-blue-700 transition-all cursor-pointer"
                                   >
                                     <Upload className="w-4 h-4" />
                                   </button>
                                 )
                               )}

                               {/* 3. Edit Confirmation Button (Pencil) */}
                               {user?.role !== 'Viewer' && (
                                 <button
                                   onClick={() => handleEditInvoiceClick(inv)}
                                   title="Edit Confirmation"
                                   className="p-1.5 hover:bg-slate-100 rounded-lg text-blue-500 hover:text-blue-700 transition-all cursor-pointer"
                                 >
                                   <Edit3 className="w-4 h-4" />
                                 </button>
                               )}

                               {/* 4. Cancel Confirmation Button (Cross in Circle) */}
                               {user?.role !== 'Viewer' && inv.status !== 'Cancelled' && inv.status !== 'Archived' && (
                                 <button
                                   onClick={() => handleCancelSingleInvoice(inv.invoiceNo)}
                                   title="Cancel Confirmation"
                                   className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-all cursor-pointer"
                                 >
                                   <XCircle className="w-4 h-4" />
                                 </button>
                               )}

                               {/* 5. Delete Confirmation Button (Trash) */}
                               {(user?.role === 'Super Admin' || user?.role === 'Chief Accountant' || user?.role === 'Division Director' || user?.role === 'Madinah Branch Accountant') && (
                                 <button
                                   onClick={() => handleDeleteSingleInvoice(inv.invoiceNo)}
                                   title="Delete Confirmation"
                                   className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 hover:text-red-700 transition-all cursor-pointer"
                                 >
                                   <Trash2 className="w-4 h-4" />
                                 </button>
                               )}
                             </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={user?.role === 'Viewer' ? 9 : 10} className="px-6 py-16 text-center text-[#64748b] font-medium">
                            <div className="flex flex-col items-center justify-center space-y-2">
                              <FileText className="w-8 h-8 text-gray-300" />
                              <span className="text-[14px] font-bold text-slate-600">No invoices found</span>
                              <span className="text-[12px] text-slate-400">Try adjusting your filters or search terms.</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Footer */}
                {filteredInvoices.length > 0 && (
                  <div className="px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-t border-[#e2e8f0] font-inter">
                    <span className="text-[12px] text-[#64748b] font-medium">
                      {t('invoices.showing')} {Math.min((currentPage - 1) * itemsPerPage + 1, filteredInvoices.length)} {t('invoices.to')}{' '}
                      {Math.min(currentPage * itemsPerPage, filteredInvoices.length)} {t('invoices.of')}{' '}
                      {filteredInvoices.length} {t('invoices.approvedInvoices')}
                    </span>

                    <div className="flex items-center space-x-1.5 self-end sm:self-auto">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 border border-[#e2e8f0] rounded-md text-[12px] font-semibold text-[#1e293b] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {t('common.previous')}
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => {
                        const pageNum = i + 1;
                        if (
                          pageNum === 1 ||
                          pageNum === totalPages ||
                          Math.abs(pageNum - currentPage) <= 1
                        ) {
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-8 h-8 rounded-md text-[12px] font-bold border transition-all ${currentPage === pageNum
                                ? 'bg-[#f59e0b] border-[#f59e0b] text-white'
                                : 'border-[#e2e8f0] text-[#1e293b] hover:bg-gray-50'
                                }`}
                            >
                              {pageNum}
                            </button>
                          );
                        }
                        if (
                          (pageNum === 2 && currentPage > 3) ||
                          (pageNum === totalPages - 1 && currentPage < totalPages - 2)
                        ) {
                          return (
                            <span key={pageNum} className="px-1.5 text-gray-400 text-[12px]">
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}

                      <button
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 border border-[#e2e8f0] rounded-md text-[12px] font-semibold text-[#1e293b] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {t('common.next')}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Generate Invoice Premium Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0d0f]/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col animate-scale-up font-sans max-h-[90vh]">

            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-[#e2e8f0] flex justify-between items-center bg-white flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#fffbeb] text-[#f59e0b] border border-[#fef3c7] flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-[17px] font-bold text-[#0c0d0f] tracking-tight">
                    {editInvoiceId ? t('invoices.editConfirmation') : t('invoices.generateNewConfirmation')}
                  </h3>
                  {editInvoiceId && (
                    <span className="text-[12px] text-[#64748b] font-medium font-sans">
                      {t('invoices.modifyConfirmationSubtitle')}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
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
            <form onSubmit={handleGenerateInvoice} noValidate className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* Client Selector Dropdown */}
              <div className="space-y-1.5 relative">
                <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-sans">
                  {t('invoices.clientSelection')}
                </label>
                <button
                  type="button"
                  onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                  className={`w-full flex items-center justify-between px-4 py-3 border rounded-xl text-[13px] font-bold text-[#0c0d0f] bg-white hover:bg-gray-50 transition-all text-left cursor-pointer ${showValidation && selectedClientKey === 'Select client company...'
                    ? 'border-[#ef4444] ring-1 ring-[#ef4444]'
                    : 'border-[#e2e8f0]'
                    }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                    <span className={`${selectedClientKey === 'Select client company...' ? 'text-gray-400 font-semibold' : ''}`}>
                      {selectedClientKey === 'Select client company...'
                        ? t('invoices.selectClientCompany')
                        : selectedClientKey === 'Others'
                          ? t('invoices.othersClient')
                          : selectedClientKey}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>
                {showValidation && selectedClientKey === 'Select client company...' && (
                  <span className="block text-[11.5px] text-[#ef4444] font-semibold mt-1 animate-fade-in">
                    {t('invoices.pleaseSelectCompany')}
                  </span>
                )}
                {isClientDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-[#e2e8f0] rounded-xl shadow-xl z-50 py-1.5 divide-y divide-[#f1f5f9] max-h-60 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClientKey('Select client company...');
                        setIsClientDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-gray-400 hover:bg-[#f8fafc] flex items-center space-x-2 cursor-pointer"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                      <span>{t('invoices.selectClientCompany')}</span>
                    </button>
                    {/* Option: Others (Custom Client / One-Off) */}
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
                {/* Invoice Number */}
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-sans">
                    {t('invoices.confirmationNumber')}
                  </label>
                  <input
                    type="text"
                    required
                    value={formInvoiceNo}
                    onChange={(e) => setFormInvoiceNo(e.target.value)}
                    className={`w-full px-3.5 py-2 border rounded-xl text-[13px] font-bold transition-all font-inter bg-[#f8fafc] ${showValidation && !formInvoiceNo
                      ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
                      : 'border-[#e2e8f0] text-[#0c0d0f] focus:border-[#f59e0b] focus:ring-[#f59e0b]'
                      }`}
                  />
                  {showValidation && !formInvoiceNo && (
                    <span className="block text-[11.5px] text-[#ef4444] font-semibold mt-1 animate-fade-in font-sans">
                      {t('invoices.confirmationNumber')} is required
                    </span>
                  )}
                </div>
                {/* Reference Number */}
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-sans">
                    {t('invoices.referenceNumber')}
                  </label>
                  <input
                    type="text"
                    required
                    value={formRef}
                    onChange={(e) => setFormRef(e.target.value)}
                    className={`w-full px-3.5 py-2 border rounded-xl text-[13px] font-semibold transition-all font-inter bg-[#f8fafc] ${showValidation && !formRef
                      ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
                      : 'border-[#e2e8f0] text-[#0c0d0f] focus:border-[#f59e0b] focus:ring-[#f59e0b]'
                      }`}
                  />
                  {showValidation && !formRef && (
                    <span className="block text-[11.5px] text-[#ef4444] font-semibold mt-1 animate-fade-in font-sans">
                      {t('invoices.referenceNumber')} is required
                    </span>
                  )}
                </div>
                {/* Serial Number */}
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-sans">
                    {t('invoices.serialNumber')}
                  </label>
                  <input
                    type="text"
                    required
                    value={formSerial}
                    onChange={(e) => setFormSerial(e.target.value)}
                    className={`w-full px-3.5 py-2 border rounded-xl text-[13px] font-semibold transition-all font-inter bg-[#f8fafc] ${showValidation && !formSerial
                      ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
                      : 'border-[#e2e8f0] text-[#0c0d0f] focus:border-[#f59e0b] focus:ring-[#f59e0b]'
                      }`}
                  />
                  {showValidation && !formSerial && (
                    <span className="block text-[11.5px] text-[#ef4444] font-semibold mt-1 animate-fade-in font-sans">
                      {t('invoices.serialNumber')} is required
                    </span>
                  )}
                </div>
                {/* Due Date */}
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-inter">
                    {t('invoices.dueDate')}
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    onClick={(e) => {
                      if (typeof e.currentTarget.showPicker === 'function') {
                        try {
                          e.currentTarget.showPicker();
                        } catch (err) {
                          console.warn('showPicker failed:', err);
                        }
                      }
                    }}
                    onFocus={(e) => {
                      if (typeof e.currentTarget.showPicker === 'function') {
                        try {
                          e.currentTarget.showPicker();
                        } catch (err) {
                          console.warn('showPicker failed:', err);
                        }
                      }
                    }}
                    className={`w-full px-3.5 py-2 border rounded-xl text-[13px] font-bold transition-all font-inter cursor-pointer ${showValidation && isDueDateInPast()
                      ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
                      : 'border-[#fef3c7] text-[#d97706] bg-[#fffbeb] focus:border-[#f59e0b] focus:ring-[#f59e0b]'
                      }`}
                  />
                  {showValidation && isDueDateInPast() && (
                    <span className="block text-[11.5px] text-[#ef4444] font-semibold mt-1 animate-fade-in font-sans">
                      {t('invoices.dueDateFuture')}
                    </span>
                  )}
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
                    {editInvoiceId ? (
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
                          <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1">
                            {t('settings.name')}
                          </label>
                          <input
                            type="text"
                            required
                            value={formEmpName}
                            onChange={(e) => setFormEmpName(e.target.value)}
                            className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-bold text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-inter"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1">
                            {t('settings.phone')}
                          </label>
                          <input
                            type="text"
                            required
                            value={formCompNumber}
                            onChange={(e) => setFormCompNumber(e.target.value)}
                            className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-inter"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1">
                            {t('settings.employeeId')}
                          </label>
                          <input
                            type="text"
                            required
                            value={formEmpId}
                            onChange={(e) => setFormEmpId(e.target.value)}
                            className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-inter"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1">
                            {t('settings.email')}
                          </label>
                          <input
                            type="email"
                            required
                            value={formCompEmail}
                            onChange={(e) => setFormCompEmail(e.target.value)}
                            className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-inter"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1">
                            {t('invoices.entityCompany')}
                          </label>
                          <input
                            type="text"
                            required
                            value={formEntity}
                            onChange={(e) => setFormEntity(e.target.value)}
                            className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-inter"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1">
                            {t('invoices.companyTaxNumber')}
                          </label>
                          <input
                            type="text"
                            required
                            value={formCompTax}
                            onChange={(e) => setFormCompTax(e.target.value)}
                            className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-inter"
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
                              placeholder="e.g. PT Klien Sekali Pakai"
                              className={`w-full px-3 py-1.5 border rounded-xl text-[13px] font-bold text-[#0c0d0f] bg-white focus:outline-none transition-all font-inter ${
                                showValidation && !customCompanyName.trim()
                                  ? 'border-[#ef4444] ring-1 ring-[#ef4444] bg-[#fef2f2]'
                                  : 'border-[#e2e8f0] focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]'
                              }`}
                            />
                            {showValidation && !customCompanyName.trim() && (
                              <span className="block text-[11px] text-[#ef4444] font-semibold mt-0.5 animate-fade-in font-sans">
                                {t('invoices.customCompanyNameRequired')}
                              </span>
                            )}
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1 font-inter">
                              {t('invoices.agent')}
                            </label>
                            <input
                              type="text"
                              value={customCompanyAgent}
                              onChange={(e) => setCustomCompanyAgent(e.target.value)}
                              placeholder="e.g. Budi Santoso"
                              className="w-full px-3 py-1.5 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-inter"
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
                              placeholder="e.g. client@email.com"
                              className="w-full px-3 py-1.5 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-inter"
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
                              placeholder="e.g. 00.000.000.0-000.000"
                              className="w-full px-3 py-1.5 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-inter"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1 font-inter">
                              {t('invoices.streetAddress')}
                            </label>
                            <input
                              type="text"
                              value={customCompanyAddress}
                              onChange={(e) => setCustomCompanyAddress(e.target.value)}
                              placeholder="e.g. Jl. Sudirman No. 12"
                              className="w-full px-3 py-1.5 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-inter"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1 font-inter">
                              {t('invoices.cityCountry')}
                            </label>
                            <input
                              type="text"
                              value={customCompanyCityCountry}
                              onChange={(e) => setCustomCompanyCityCountry(e.target.value)}
                              placeholder="e.g. Jakarta, Indonesia"
                              className="w-full px-3 py-1.5 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-inter"
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
                        {!editInvoiceId && (
                          <div>
                            <span className="block text-[10px] font-semibold text-[#94a3b8] mb-0.5 font-inter">
                              {t('invoices.companyTaxNumber')}
                            </span>
                            <span className="font-semibold text-[#1e293b]">
                              {selectedCompanyObj?.taxNumber || 'N/A'}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="block text-[10px] font-semibold text-[#94a3b8] mb-0.5 font-inter">
                            {t('invoices.streetAddress')}
                          </span>
                          <span className="font-semibold text-[#1e293b] block">
                            {selectedCompanyObj?.address
                              ? splitAddress(selectedCompanyObj.address).address
                              : 'N/A'}
                          </span>
                        </div>
                        {!editInvoiceId && (
                          <div>
                            <span className="block text-[10px] font-semibold text-[#94a3b8] mb-0.5 font-inter">
                              {t('invoices.cityCountry')}
                            </span>
                            <span className="font-semibold text-[#1e293b]">
                              {selectedCompanyObj?.address
                                ? splitAddress(selectedCompanyObj.address).cityCountry
                                : 'N/A'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-[#e2e8f0] mx-6" />

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
                      className="px-2.5 py-1 border border-[#cbd5e1] rounded-lg text-[12px] font-bold text-[#1e293b] bg-white cursor-pointer focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
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
                              placeholder="e.g. Service description"
                              className={`w-full px-2 py-1.5 border rounded-lg text-[13px] font-medium transition-all focus:outline-none focus:ring-0 ${showValidation && !item.description
                                ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444]'
                                : 'border-transparent bg-transparent hover:bg-gray-100/50 focus:bg-[#f8fafc]'
                                }`}
                            />
                            {showValidation && !item.description && (
                              <span className="block text-[11px] text-[#ef4444] font-semibold mt-0.5 ml-2 animate-fade-in">
                                Description is required
                              </span>
                            )}
                            {showValidation && item.qty < 1 && (
                              <span className="block text-[11px] text-[#ef4444] font-semibold mt-0.5 ml-2 animate-fade-in">
                                Quantity must be at least 1
                              </span>
                            )}
                            {showValidation && item.price <= 0 && (
                              <span className="block text-[11px] text-[#ef4444] font-semibold mt-0.5 ml-2 animate-fade-in">
                                Price must be greater than 0
                              </span>
                            )}
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
                              className={`w-full px-2 py-1.5 border rounded-lg text-[13px] font-medium text-center focus:outline-none focus:ring-0 transition-all ${showValidation && item.qty < 1
                                ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444]'
                                : 'border-transparent bg-transparent hover:bg-gray-100/50 focus:bg-[#f8fafc]'
                                }`}
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
                              className={`w-full px-2.5 py-2 border rounded-lg text-[13px] font-medium text-right focus:outline-none focus:ring-0 transition-all ${
                                item.isService
                                  ? 'bg-gray-50 text-[#94a3b8] cursor-not-allowed border-[#cbd5e1]/40'
                                  : showValidation && item.price <= 0
                                    ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444]'
                                    : 'border-transparent bg-transparent hover:bg-gray-100/50 focus:bg-[#f8fafc]'
                              }`}
                            />
                          </td>
                          <td className="p-2 w-32 text-right font-bold text-[#0c0d0f] font-roboto">
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

                {/* Dropdown Select Service & Summary Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Select Service Dropdown */}
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
                            <span className="font-bold text-[#0c0d0f] font-roboto flex-shrink-0">
                              {service.currency === 'RP' || service.currency === 'IDR' ? (
                                `Rp ${service.price.toLocaleString('id-ID')}`
                              ) : service.currency === 'SAR' ? (
                                `${service.price.toLocaleString('en-US')} SAR`
                              ) : (
                                `$${service.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                              )}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Add Item manually button */}
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
                      <span className="text-[#64748b] font-semibold font-sans">{t('invoices.subtotal')}</span>
                      <span className="font-bold text-[#0c0d0f] font-roboto">
                        {formatPrice(formItems.reduce((acc, item) => acc + (item.qty * item.price), 0), formCurrency)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#64748b] font-semibold font-sans">{t('invoices.taxVat')} ({(editInvoiceId ? (invoices.find(i => i.invoiceNo === editInvoiceId)?.taxRate || 0) : globalTaxRate)}%)</span>
                      <span className="font-bold text-[#0c0d0f] font-roboto">
                        {formatPrice(formItems.reduce((acc, item) => acc + (item.qty * item.price), 0) * ((editInvoiceId ? (invoices.find(i => i.invoiceNo === editInvoiceId)?.taxRate || 0) : globalTaxRate) / 100), formCurrency)}
                      </span>
                    </div>
                    <div className="h-px bg-[#e2e8f0] my-2" />
                    <div className="flex justify-between items-center text-[14px]">
                      <span className="text-[#0c0d0f] font-bold">{t('invoices.totalDue')}</span>
                      <span className="font-extrabold text-[#2563eb] font-roboto text-[16px]">
                        {formatPrice(formItems.reduce((acc, item) => acc + (item.qty * item.price), 0) * (1 + ((editInvoiceId ? (invoices.find(i => i.invoiceNo === editInvoiceId)?.taxRate || 0) : globalTaxRate) / 100)), formCurrency)}
                      </span>
                    </div>

                    {/* Advance Payment (Deposit) Toggle & Input */}
                    <div className="pt-2 space-y-2 border-t border-[#e2e8f0]">
                      <div className="flex justify-between items-center">
                        <span className="text-[12px] font-bold text-[#0c0d0f] font-sans">{t('invoices.hasAdvancePayment')}</span>
                        <div className="flex items-center space-x-3 text-[12px] font-semibold">
                          <label className="flex items-center space-x-1 cursor-pointer">
                            <input
                              type="radio"
                              name="hasAdvance"
                              checked={formHasAdvancePayment}
                              onChange={() => setFormHasAdvancePayment(true)}
                              className="text-[#2563eb] focus:ring-[#2563eb]"
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
                              className="text-[#2563eb] focus:ring-[#2563eb]"
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
                            className="w-full px-3 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-bold text-[#0c0d0f] bg-white focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning Banner (Only in Edit Mode) */}
              {editInvoiceId && (
                <div className="bg-[#fff7ed] border border-[#ffedd5] rounded-xl p-4 flex items-center gap-3 text-[#c2410c] text-[13px] font-semibold font-sans mt-4">
                  <AlertCircle className="w-5 h-5 text-[#f97316] flex-shrink-0" />
                  <span>Editing this invoice will reset its approval status. It will need to be re-approved.</span>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-[#e2e8f0] mx-6" />

              {/* Exchange Rate Card */}
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
                    const normCurr = (formCurrency || 'USD').toUpperCase();
                    const isRp = normCurr === 'RP' || normCurr === 'IDR';
                    const subtotal = formItems.reduce((acc, item) => acc + (item.qty * item.price), 0);
                    const taxRate = editInvoiceId ? (invoices.find(i => i.invoiceNo === editInvoiceId)?.taxRate || 0) : globalTaxRate;
                    const currentTotalAmount = subtotal * (1 + (taxRate / 100));

                    const converted = calculateConvertedTotals(
                      currentTotalAmount,
                      formCurrency,
                      configuredRates.usdToIdr,
                      configuredRates.sarToIdr,
                      configuredRates.usdToSar
                    );
                    return (
                      <div className="flex flex-col space-y-2">
                        {normCurr === 'SAR' && (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-[13px] text-[#64748b] font-semibold font-sans">{t('invoices.totalDue')} (USD)</span>
                              <span className="font-bold text-[#2563eb] text-[15px] font-roboto">
                                {converted.usdTotal}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[13px] text-[#64748b] font-semibold font-sans">{t('invoices.totalDue')} (IDR)</span>
                              <span className="font-bold text-[#2563eb] text-[15px] font-roboto">
                                {converted.idrTotal}
                              </span>
                            </div>
                          </>
                        )}
                        {isRp && (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-[13px] text-[#64748b] font-semibold font-sans">{t('invoices.totalDue')} (USD)</span>
                              <span className="font-bold text-[#2563eb] text-[15px] font-roboto">
                                {converted.usdTotal}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[13px] text-[#64748b] font-semibold font-sans">{t('invoices.totalDue')} (SAR)</span>
                              <span className="font-bold text-[#2563eb] text-[15px] font-roboto">
                                {converted.sarTotal}
                              </span>
                            </div>
                          </>
                        )}
                        {normCurr === 'USD' && (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-[13px] text-[#64748b] font-semibold font-sans">{t('invoices.totalDue')} (SAR)</span>
                              <span className="font-bold text-[#2563eb] text-[15px] font-roboto">
                                {converted.sarTotal}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[13px] text-[#64748b] font-semibold font-sans">{t('invoices.totalDue')} (IDR)</span>
                              <span className="font-bold text-[#2563eb] text-[15px] font-roboto">
                                {converted.idrTotal}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-[#e2e8f0] mx-6" />

              {/* Payment Instructions Section */}
              {(() => {
                const settings = getLocalCompanySettings();
                return (
                  <div className="space-y-3 mt-6">
                    <h4 className="text-[12px] font-bold text-[#0c0d0f] uppercase tracking-wider font-inter">
                      {t('invoices.paymentInstructions')}
                    </h4>
                    <div className="bg-[#f8fafc] p-5 rounded-2xl border border-[#e2e8f0] font-sans">
                      <div className="space-y-3 text-[13px] font-sans">
                        <div className="flex justify-between items-center">
                          <span className="text-[#64748b] font-semibold">{t('invoices.bankName')}:</span>
                          <span className="font-bold text-[#0c0d0f]">{settings.bankName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#64748b] font-semibold">{t('invoices.accountName')}:</span>
                          <span className="font-bold text-[#0c0d0f]">{settings.accountName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#64748b] font-semibold">{t('invoices.idrAccountNumber')}:</span>
                          <span className="font-bold text-[#2563eb] font-inter">{settings.idrAccountNumber}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#64748b] font-semibold">{t('invoices.usdAccountNumber')}:</span>
                          <span className="font-bold text-[#2563eb] font-inter">{settings.usdAccountNumber}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Divider */}
              <div className="border-t border-[#e2e8f0] mx-6" />

              {/* Notes & Terms Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 text-[12px] text-[#64748b] leading-relaxed font-sans">
                <div>
                  <h4 className="text-[11px] font-bold text-[#0c0d0f] uppercase tracking-wider font-inter mb-2">
                    {t('invoices.notes')}
                  </h4>
                  {companySettings.defaultNotes.split('\n').map((note: string, idx: number) => (
                    <p key={idx} className={idx > 0 ? "mt-1" : ""}>
                      {note.startsWith('*') ? note : `* ${note}`}
                    </p>
                  ))}
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-[#0c0d0f] uppercase tracking-wider font-inter mb-2">
                    {t('invoices.termsAndConditions')}
                  </h4>
                  <p className="whitespace-pre-wrap">
                    {companySettings.termsAndConditions}
                  </p>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-[#e2e8f0] mt-6 flex-shrink-0">
                {showValidation && getValidationErrorCount() > 0 ? (
                  <span className="text-[12px] text-[#ef4444] font-bold font-sans animate-fade-in">
                    {t('invoices.validationFailed')}
                  </span>
                ) : (
                  <span className="text-[12px] text-[#94a3b8] font-medium font-sans animate-fade-in">
                    {editInvoiceId ? 'Form status: Editable & complete' : t('invoices.formStatusValid')}
                  </span>
                )}
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-[#cbd5e1] rounded-lg text-[13px] font-semibold text-[#1e293b] hover:bg-gray-50 transition-all font-inter cursor-pointer"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={showValidation && getValidationErrorCount() > 0}
                    className={`px-4 py-2 font-semibold text-[13px] rounded-lg transition-all font-inter cursor-pointer ${showValidation && getValidationErrorCount() > 0
                      ? 'bg-[#cbd5e1] text-[#94a3b8] cursor-not-allowed shadow-none'
                      : 'bg-[#f59e0b] hover:bg-[#d97706] text-white shadow-sm'
                      }`}
                  >
                    {editInvoiceId ? t('invoices.saveAndResubmit') : t('invoices.generateConfirmation')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Details Modal */}
      <InvoiceDetailsModal
        selectedInvoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />

      {/* Printable Invoice detail */}
      {selectedInvoice && (
        <ReservationConfirmationPrint
          invoice={selectedInvoice}
          details={getInvoiceDetails(selectedInvoice)}
        />
      )}
      {/* Invoice Generated Success Modal Step 1 */}
      {successModalStep === 1 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0d0f]/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl max-w-sm w-full p-8 flex flex-col items-center animate-scale-up font-sans">
            <div className="w-14 h-14 bg-[#ecfdf5] text-[#10b981] rounded-full flex items-center justify-center mb-5 border border-[#d1fae5]">
              <Check className="w-6 h-6 stroke-[3px]" />
            </div>
            <h3 className="text-[17px] font-bold text-[#0c0d0f] text-center mb-2.5 font-sans leading-tight">
              Confirmation Generated Successfully
            </h3>
            <p className="text-[13px] text-[#64748b] text-center font-medium font-sans leading-relaxed mb-6">
              Your confirmation has been generated. Would you like to send a request to get approval for payment?
            </p>
            <div className="flex space-x-3 w-full">
              <button
                type="button"
                onClick={() => setSuccessModalStep(0)}
                className="flex-1 py-2.5 border border-[#cbd5e1] rounded-xl text-[13px] font-bold text-[#475569] hover:bg-gray-50 transition-all font-inter text-center"
              >
                No, Thanks
              </button>
              <button
                type="button"
                onClick={handleSendRequestFromSuccessModal}
                className="flex-1 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white text-[13px] font-bold rounded-xl shadow-sm transition-all font-inter text-center animate-pulse-subtle"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Generated Success Modal Step 2 */}
      {successModalStep === 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0d0f]/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl max-w-sm w-full p-8 flex flex-col items-center animate-scale-up font-sans">
            <div className="w-14 h-14 bg-[#ecfdf5] text-[#10b981] rounded-full flex items-center justify-center mb-5 border border-[#d1fae5]">
              <Check className="w-6 h-6 stroke-[3px]" />
            </div>
            <h3 className="text-[17px] font-bold text-[#0c0d0f] text-center mb-2.5 font-sans leading-tight">
              Request Sent Successfully
            </h3>
            <p className="text-[13px] text-[#64748b] text-center font-medium font-sans leading-relaxed mb-6">
              Your approval request has been sent successfully. You will be notified once it is approved.
            </p>
            <button
              type="button"
              onClick={() => setSuccessModalStep(0)}
              className="w-full py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white text-[13px] font-bold rounded-xl shadow-sm transition-all font-inter text-center"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Custom Confirmation / Alert Popup */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0c0d0f]/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl max-w-sm w-full p-6 flex flex-col items-center text-center animate-scale-up font-sans">
            {confirmModal.type === 'danger' && (
              <div className="w-12 h-12 bg-red-50 border border-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
            )}
            {confirmModal.type === 'warning' && (
              <div className="w-12 h-12 bg-[#fff7ed] border border-[#ffedd5] text-[#f97316] rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-5 h-5 text-[#f97316]" />
              </div>
            )}
            {confirmModal.type === 'success' && (
              <div className="w-12 h-12 bg-[#ecfdf5] border border-[#d1fae5] text-[#10b981] rounded-full flex items-center justify-center mb-4">
                <Check className="w-5 h-5 text-[#10b981] stroke-[3px]" />
              </div>
            )}
            {confirmModal.type === 'info' && (
              <div className="w-12 h-12 bg-[#f1f5f9] border border-[#e2e8f0] text-[#64748b] rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-5 h-5 text-[#64748b]" />
              </div>
            )}

            <h3 className="text-[16px] font-bold text-[#0c0d0f] tracking-tight mb-2">
              {confirmModal.title}
            </h3>
            <p className="text-[12.5px] text-[#64748b] font-medium leading-relaxed mb-6 px-1">
              {confirmModal.message}
            </p>

            <div className="flex space-x-3 w-full">
              {confirmModal.showCancel && (
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-2.5 border border-[#cbd5e1] rounded-xl text-[12px] font-bold text-[#475569] hover:bg-gray-50 transition-all font-inter text-center cursor-pointer"
                >
                  {confirmModal.cancelText || 'Cancel'}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  confirmModal.onConfirm();
                }}
                className={`flex-1 py-2.5 text-[12px] font-bold rounded-xl shadow-sm transition-all font-inter text-center cursor-pointer text-white ${confirmModal.type === 'danger'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-[#f59e0b] hover:bg-[#d97706]'
                  }`}
              >
                {confirmModal.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Hidden file input for payment proof */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,application/pdf"
        style={{ display: 'none' }}
      />



      {/* Payment History & Installment Tracking Modal */}
      {paymentHistoryModal.isOpen && paymentHistoryModal.invoice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0c0d0f]/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setPaymentHistoryModal({ isOpen: false, invoice: null })}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col animate-scale-up font-sans max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-[17px] font-bold text-[#0c0d0f]">
                  Payment History & Balance Management
                </h3>
                <p className="text-[12px] text-[#64748b] font-medium">
                  Confirmation #{paymentHistoryModal.invoice.invoiceNo} · {paymentHistoryModal.invoice.company}
                </p>
              </div>
              <button
                onClick={() => setPaymentHistoryModal({ isOpen: false, invoice: null })}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto">
              
              {/* Metric Summary Cards */}
              {(() => {
                const inv = paymentHistoryModal.invoice!;
                const rawAmt = parseFloat(String(inv.amount || '0').replace(/[^0-9.-]/g, '')) || 0;
                const advAmt = parseFloat(String(inv.advancePayment || 0));
                const totalInstallments = paymentHistoryList.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
                const totalPaidSoFar = advAmt + totalInstallments;
                const remaining = Math.max(0, rawAmt - totalPaidSoFar);
                const currency = inv.currency || 'USD';

                const canAddPayment = ['4/4 Approved', 'Approved', 'FULLY_PAID', 'PARTIAL', 'DEPOSIT_PAID'].includes(inv.status);

                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Billed</span>
                        <span className="text-[15px] font-extrabold text-slate-800">{formatPrice(rawAmt, currency)}</span>
                      </div>
                      <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100">
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Total Paid</span>
                        <span className="text-[15px] font-extrabold text-blue-800">{formatPrice(totalPaidSoFar, currency)}</span>
                      </div>
                      <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Remaining Due</span>
                        <span className="text-[15px] font-extrabold text-emerald-800">{formatPrice(remaining, currency)}</span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex justify-between items-center pt-2">
                      <h4 className="text-[13px] font-bold text-slate-800 uppercase tracking-wider">Installments Ledger</h4>
                      {canAddPayment ? (
                        <button
                          onClick={handleOpenAddPayment}
                          className="px-3.5 py-1.5 bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold text-[12px] rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Payment</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
                          🔒 Add payment unlocks after Level 4 Approval
                        </span>
                      )}
                    </div>

                    {/* History Table */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-left text-[12.5px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-2.5">Date</th>
                            <th className="px-4 py-2.5">Amount</th>
                            <th className="px-4 py-2.5">Recorded By</th>
                            <th className="px-4 py-2.5">Proof</th>
                            <th className="px-4 py-2.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {loadingHistory ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-[12px] animate-pulse">
                                Loading payment history...
                              </td>
                            </tr>
                          ) : paymentHistoryList.length > 0 ? (
                            paymentHistoryList.map((pay, pIdx) => (
                              <tr key={pay.id || pIdx} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3 font-semibold text-slate-700">
                                  {pay.paymentDate ? pay.paymentDate.split('T')[0] : 'N/A'}
                                </td>
                                <td className="px-4 py-3 font-bold text-emerald-600">
                                  {formatPrice(pay.amount, pay.currency || currency)}
                                </td>
                                <td className="px-4 py-3 text-slate-600 font-medium">
                                  {pay.createdBy || 'System'}
                                </td>
                                <td className="px-4 py-3">
                                  {pay.proofUrl ? (
                                    <button
                                      onClick={() => setViewingProofBase64(pay.proofUrl)}
                                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-[11px] rounded-lg transition-all flex items-center space-x-1 cursor-pointer"
                                    >
                                      <span>View Proof</span>
                                    </button>
                                  ) : pay.note ? (
                                    <span className="text-slate-500 italic text-[11.5px]" title={pay.note}>
                                      {pay.note}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 font-mono text-[11px]">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {user?.role !== 'Viewer' && (
                                    <div className="flex items-center justify-end space-x-1.5">
                                      <button
                                        onClick={() => handleOpenEditPayment(pay)}
                                        title="Edit Payment"
                                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-bold text-[11.5px] rounded-lg transition-all cursor-pointer"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => setDeletingPaymentId(pay.id)}
                                        title="Delete Payment"
                                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-[11.5px] rounded-lg transition-all cursor-pointer"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-[12px]">
                                No installment payments recorded yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Payment Sub-Modal */}
      {isAddPaymentModalOpen && paymentHistoryModal.invoice && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#0c0d0f]/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setIsAddPaymentModalOpen(false)}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-up font-sans" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-[16px] font-bold text-[#0c0d0f]">{editingPaymentId ? 'Edit Payment Record' : 'Record New Payment'}</h3>
              <button onClick={() => setIsAddPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddPaymentSubmit} className="space-y-4">
              
              {/* Amount & Currency Selector */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Payment Amount</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Enter amount paid..."
                    value={addPayAmount}
                    onChange={(e) => {
                      setAddPayAmount(e.target.value);
                      const inv = paymentHistoryModal.invoice!;
                      const rawAmt = parseFloat(String(inv.amount || '0').replace(/[^0-9.-]/g, '')) || 0;
                      const advAmt = parseFloat(String(inv.advancePayment || 0));
                      const totalInstallments = paymentHistoryList.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
                      const rem = Math.max(0, rawAmt - advAmt - totalInstallments);
                      if (parseFloat(e.target.value) > rem) {
                        setSaveOverpaymentCredit(true);
                      } else {
                        setSaveOverpaymentCredit(false);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-[13px] font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Currency</label>
                  <select
                    value={addPayCurrency}
                    onChange={(e) => setAddPayCurrency(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[13px] font-bold text-slate-800 focus:outline-none focus:border-amber-500 bg-slate-50 cursor-pointer"
                  >
                    <option value="SAR">SAR</option>
                    <option value="USD">USD</option>
                    <option value="IDR">RP (IDR)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Payment Date</label>
                <input
                  type="date"
                  required
                  value={addPayDate}
                  onChange={(e) => setAddPayDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-[13px] font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Upload Proof Field */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Upload Payment Proof (Transfer Receipt)</label>
                <div className="flex items-center space-x-2">
                  <label className="flex-1 px-3.5 py-2.5 border border-dashed border-slate-300 hover:border-amber-500 rounded-xl bg-slate-50 hover:bg-amber-50/30 text-slate-600 font-medium text-[12.5px] cursor-pointer flex items-center justify-between transition-all">
                    <span className="truncate">{addPayProofName ? `📄 ${addPayProofName}` : 'Attach proof file (Image/PDF)...'}</span>
                    <Upload className="w-4 h-4 text-slate-400" />
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAddPayProofName(file.name);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setAddPayProof(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  {addPayProof && (
                    <button
                      type="button"
                      onClick={() => { setAddPayProof(''); setAddPayProofName(''); }}
                      className="px-2.5 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl font-bold text-[11px] transition-all cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Payment Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Bank transfer, receipt reference..."
                  value={addPayNote}
                  onChange={(e) => setAddPayNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-[13px] font-medium text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Overpayment Credit Prompt */}
              {(() => {
                const inv = paymentHistoryModal.invoice!;
                const rawAmt = parseFloat(String(inv.amount || '0').replace(/[^0-9.-]/g, '')) || 0;
                const advAmt = parseFloat(String(inv.advancePayment || 0));
                const totalInstallments = paymentHistoryList.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
                const rem = Math.max(0, rawAmt - advAmt - totalInstallments);
                const numAdd = parseFloat(addPayAmount || '0');

                if (numAdd > rem && rem > 0) {
                  const overAmt = numAdd - rem;
                  return (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2">
                      <span className="text-[12px] font-bold text-amber-800 block">
                        Overpayment Detected (+{formatPrice(overAmt, inv.currency || 'USD')})
                      </span>
                      <label className="flex items-center space-x-2 text-[12px] font-semibold text-amber-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveOverpaymentCredit}
                          onChange={(e) => setSaveOverpaymentCredit(e.target.checked)}
                          className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                        />
                        <span>Save excess as credit balance for {inv.company}?</span>
                      </label>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddPaymentModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-[12px] font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="flex-1 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white text-[12px] font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingPayment ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Uploading Proof Spinner Overlay */}
      {isUploadingProof && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#0c0d0f]/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-sm w-full p-8 flex flex-col items-center animate-scale-up font-sans">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
            <h3 className="text-[16px] font-bold text-[#0c0d0f] tracking-tight mb-2">
              Uploading Payment Proof
            </h3>
            <p className="text-[12.5px] text-[#64748b] font-medium text-center leading-relaxed">
              Converting image and uploading to server. Please wait...
            </p>
          </div>
        </div>
      )}

      {/* Delete Payment Confirmation Modal Popup */}
      {deletingPaymentId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0c0d0f]/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setDeletingPaymentId(null)}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 animate-scale-up text-center font-sans space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="text-base font-bold text-slate-800">Delete Payment Record?</h3>
              <p className="text-[12.5px] text-slate-500 mt-2 leading-relaxed">
                Are you sure you want to delete this payment record? Remaining balance will be automatically recalculated.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPaymentId(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[12px] rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeletePayment}
                disabled={isSubmittingPayment}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[12px] rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isSubmittingPayment ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Payment Proof Viewer Modal - Placed at DOM root with z-index 99999 to guarantee rendering on top of all modals */}
      {viewingProofBase64 && (
        <div
          className="fixed inset-0 bg-[#0c0d0f]/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          style={{ zIndex: 99999 }}
          onClick={() => setViewingProofBase64(null)}
        >
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-[#0c0d0f] font-sans">Payment Transfer Photo / PDF</h3>
              <button
                onClick={() => setViewingProofBase64(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[70vh] flex items-center justify-center bg-slate-50 w-full">
              {viewingProofBase64.startsWith('data:application/pdf') ? (
                <iframe
                  src={viewingProofBase64}
                  title="Payment Proof PDF"
                  className="w-full h-[60vh] border border-slate-200 rounded-lg shadow-sm"
                />
              ) : (
                <img
                  src={viewingProofBase64}
                  alt="Payment proof"
                  className="max-w-full h-auto rounded-lg shadow-sm border border-slate-200"
                />
              )}
            </div>
            <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-between items-center">
              {viewingProofBase64.startsWith('data:application/pdf') ? (
                <a
                  href={viewingProofBase64}
                  download="payment-proof.pdf"
                  className="px-4 py-2 bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold rounded-xl text-[12px] cursor-pointer transition-all shadow-sm font-sans"
                >
                  Download PDF
                </a>
              ) : (
                <a
                  href={viewingProofBase64}
                  download="payment-proof.jpg"
                  className="px-4 py-2 bg-[#007aff] hover:bg-[#006ee0] text-white font-bold rounded-xl text-[12px] cursor-pointer transition-all shadow-sm font-sans"
                >
                  Download Image
                </a>
              )}
              <button
                onClick={() => setViewingProofBase64(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-[12px] cursor-pointer transition-all font-sans"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
