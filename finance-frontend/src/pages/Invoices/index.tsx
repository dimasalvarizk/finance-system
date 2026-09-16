import React, { useState, useMemo, useEffect, useRef } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { Plus, ChevronDown, FileText, Receipt, Copy, Check, Download, AlertCircle, Trash2 } from 'lucide-react';
import InvoiceDetailsModal from '../../components/ui/InvoiceDetailsModal';
import ReservationConfirmationPrint from '../../components/ui/ReservationNumberPrint';
import OfficialDepositReceiptModal, { type ReceiptData } from '../../components/ui/OfficialDepositReceiptModal';
import CreateStandaloneReceiptModal from '../../components/ui/CreateStandaloneReceiptModal';

import { type Invoice, type CompanyOption } from './components/types';
import { getLocalCompanySettings, getInvoiceDetails, calculateConvertedTotals, parseExchangeRate, compareDates } from './components/invoiceUtils';
import { InvoicesStats } from './components/InvoicesStats';
import { InvoicesTable } from './components/InvoicesTable';
import { CreateInvoiceModal } from './components/CreateInvoiceModal';
import { PaymentHistoryModal } from './components/PaymentHistoryModal';
import { StandaloneReceiptsListModal } from './components/StandaloneReceiptsListModal';

import {
  getInvoices,
  getCompanies,
  cancelInvoice as cancelInvoiceAPI,
  updateInvoiceStatus,
  deleteInvoices as deleteInvoicesAPI,
  uploadPaymentProof,
  getPaymentReceipt,
  getStandaloneReceipts,
  deleteStandaloneReceipt,
} from '../../services/invoiceService';
import { createRequest } from '../../services/requestService';
import { getExchangeRates, getServices, getTeamMembers, getTaxSetting, getCompanySetting } from '../../services/settingService';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../i18n';
import { amountToEnglishWords } from '../../utils/numberToWordsEnglish';

export {
  type Invoice,
  type InvoiceDetail,
  type CompanyOption,
  type InvoiceItemForm,
} from './components/types';

export {
  getLocalCompanySettings,
  getInvoiceDetails,
  calculateConvertedTotals,
  getExchangeRatesToShow,
  formatPrice,
  convertPrice,
  splitAddress,
  parseExchangeRate,
  convertToISODate,
  compareDates,
} from './components/invoiceUtils';

const Invoices: React.FC = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const companySettings = useMemo(() => getLocalCompanySettings(), []);

  const hasBypassPermission = Boolean(
    user?.role === 'Super Admin' ||
    user?.name?.includes('Dimas') ||
    user?.name?.includes('Ali') ||
    (user?.permissions && (Array.isArray(user.permissions) ? user.permissions.includes('CAN_BYPASS_APPROVAL') : (user.permissions as any).CAN_BYPASS_APPROVAL === true))
  );

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterCompany, setFilterCompany] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [globalTaxRate, setGlobalTaxRate] = useState<number>(0);

  const [availableCompanies, setAvailableCompanies] = useState<CompanyOption[]>([]);
  const [availableServices, setAvailableServices] = useState<{ name: string; price: number; currency?: string }[]>([]);
  const [configuredRates, setConfiguredRates] = useState<{ usdToIdr: number; sarToIdr: number; usdToSar: number }>({
    usdToIdr: 18025,
    sarToIdr: 4800,
    usdToSar: 3.75,
  });

  // Payment History & Ledger Modal State
  const [paymentHistoryModal, setPaymentHistoryModal] = useState<{ isOpen: boolean; invoice: Invoice | null }>({
    isOpen: false,
    invoice: null,
  });

  // Standalone Receipts
  const [isStandaloneModalOpen, setIsStandaloneModalOpen] = useState(false);
  const [isGenerateDropdownOpen, setIsGenerateDropdownOpen] = useState(false);
  const [isStandaloneListOpen, setIsStandaloneListOpen] = useState(false);
  const [standaloneReceiptsList, setStandaloneReceiptsList] = useState<ReceiptData[]>([]);
  const [loadingStandaloneList, setLoadingStandaloneList] = useState(false);
  const [deletingStandaloneId, setDeletingStandaloneId] = useState<string | null>(null);

  // Official Deposit Receipt Modal
  const [receiptModal, setReceiptModal] = useState<{
    isOpen: boolean;
    data: ReceiptData | null;
    loading: boolean;
  }>({
    isOpen: false,
    data: null,
    loading: false,
  });

  // Confirmation / Alert Modal
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
    onConfirm: () => {},
    type: 'warning',
    showCancel: true,
  });

  // Copy Feedback
  const [copiedInvoiceNo, setCopiedInvoiceNo] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState<{ show: boolean; text: string } | null>(null);

  // Success Workflow Modals
  const [successModalStep, setSuccessModalStep] = useState<0 | 1 | 2>(0);
  const [justCreatedInvoice, setJustCreatedInvoice] = useState<Invoice | null>(null);

  // Payment Proof Upload / View
  const [uploadingInvoiceNo, setUploadingInvoiceNo] = useState<string | null>(null);
  const [viewingProofBase64, setViewingProofBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerAlert = (title: string, message: string, type: 'success' | 'info' = 'success') => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText: 'OK',
      cancelText: '',
      onConfirm: () => {},
      type,
      showCancel: false,
    });
  };

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

  const fetchInvoices = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const fetched = await getInvoices();
      if (fetched) setInvoices(fetched);

      const compList = await getCompanies();
      if (compList) {
        setAvailableCompanies(compList);
        localStorage.setItem('finance_companies', JSON.stringify(compList));
      }

      const teamList = await getTeamMembers();
      if (teamList) localStorage.setItem('finance_team_members', JSON.stringify(teamList));

      const companySettingsRes = await getCompanySetting();
      if (companySettingsRes) localStorage.setItem('finance_company_settings', JSON.stringify(companySettingsRes));
    } catch (err) {
      console.error('Failed to fetch invoices, companies, or settings:', err);
      if (!isSilent) setError('Failed to fetch invoices. Please check backend service connections.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const rates = await getExchangeRates();
      if (rates) {
        setConfiguredRates({
          usdToIdr: parseExchangeRate(rates.usdToIdr, true) || 18025,
          sarToIdr: parseExchangeRate(rates.sarToIdr, true) || 4800,
          usdToSar: parseExchangeRate(rates.usdToSar, true) || 3.75,
        });
      }
    } catch (err) {
      console.error('Failed to load exchange rates:', err);
    }

    try {
      const svcs = await getServices();
      if (svcs) {
        const formatted = svcs
          .filter((s: any) => s.status === 'Active')
          .map((s: any) => ({
            name: s.name,
            price: parseFloat(s.price) || 0,
            currency: s.currency || 'USD',
          }));
        setAvailableServices(formatted);
      }
    } catch (err) {
      console.error('Failed to load services:', err);
    }

    try {
      const taxSetting = await getTaxSetting();
      if (taxSetting) {
        setGlobalTaxRate(parseFloat(taxSetting.taxPercentage) || 0);
      }
    } catch (err) {
      console.error('Failed to load tax settings:', err);
    }
  };

  useEffect(() => {
    fetchInvoices(false);
    fetchSettings();

    const interval = setInterval(() => {
      fetchInvoices(true);
    }, 10000);

    const handleFocus = () => fetchInvoices(true);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Handle edit routing from other pages via localStorage
  useEffect(() => {
    const editNo = localStorage.getItem('edit_invoice_no');
    if (editNo && invoices.length > 0) {
      const found = invoices.find(inv => inv.invoiceNo === editNo);
      if (found) {
        localStorage.removeItem('edit_invoice_no');
        setEditInvoice(found);
        setIsModalOpen(true);
      }
    }
  }, [invoices]);

  const handleCopyInvoiceNo = (invoiceNo: string) => {
    if (!invoiceNo) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(invoiceNo);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = invoiceNo;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedInvoiceNo(invoiceNo);
      setCopyToast({ show: true, text: invoiceNo });
      setTimeout(() => setCopiedInvoiceNo(prev => (prev === invoiceNo ? null : prev)), 2000);
      setTimeout(() => setCopyToast(prev => (prev?.text === invoiceNo ? null : prev)), 3000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const isInvoiceOverdue = (inv: any): boolean => {
    if (!inv) return false;
    const status = String(inv.status || '').toLowerCase();
    const notes = String(inv.rejectionReason || inv.notes || '').toLowerCase();

    if (status === 'overdue' || status === 'cancelled due to overdue' || status === 'rejected' || status.includes('overdue')) {
      return true;
    }
    if (status === 'cancelled' && (notes.includes('overdue') || notes.includes('auto-cancelled') || notes.includes('unpaid past due date'))) {
      return true;
    }
    if (inv.dueDate && !status.includes('paid') && status !== 'approved' && status !== 'archived') {
      const dueTime = new Date(inv.dueDate).getTime();
      const todayTime = new Date(new Date().toISOString().split('T')[0]).getTime();
      if (dueTime < todayTime) return true;
    }
    return false;
  };

  const itemsPerPage = 10;

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (!inv) return false;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (inv.invoiceNo || '').toLowerCase().includes(q) ||
        (inv.company || '').toLowerCase().includes(q) ||
        (inv.companyCode || '').toLowerCase().includes(q) ||
        (inv.referenceNo || '').toLowerCase().includes(q) ||
        (inv.serialNo || '').toLowerCase().includes(q);

      const matchesCompany = !filterCompany || inv.company === filterCompany || inv.companyCode === filterCompany;

      let matchesStatus = true;
      if (filterStatus) {
        const invStatus = inv.status || '';
        const rawAmt = parseFloat(String(inv.amount || '0').replace(/[^0-9.-]/g, '')) || 0;
        const advAmt = parseFloat(String(inv.advancePayment || 0));
        const totalInst = parseFloat(String(inv.totalInstallments || 0));
        const totalPaid = inv.totalPaid !== undefined ? parseFloat(String(inv.totalPaid)) : advAmt + totalInst;

        if (filterStatus === 'Pending') {
          matchesStatus =
            (invStatus.includes('Pending') || invStatus === 'Pending Review' || invStatus.includes('1/4') || invStatus.includes('2/4') || invStatus.includes('3/4')) &&
            totalPaid === 0;
        } else if (filterStatus === 'Approved') {
          matchesStatus = (invStatus === 'Approved' || invStatus === '4/4 Approved') && totalPaid < rawAmt;
        } else if (filterStatus === 'Partial' || filterStatus === 'Partial Payment') {
          matchesStatus = totalPaid > 0 && totalPaid < rawAmt;
        } else if (filterStatus === 'Paid') {
          matchesStatus = (totalPaid >= rawAmt && rawAmt > 0) || invStatus === 'Paid' || invStatus === 'FULLY_PAID';
        } else if (filterStatus === 'Overdue' || filterStatus === 'Cancelled due to overdue') {
          matchesStatus = isInvoiceOverdue(inv) || invStatus === 'Overdue' || invStatus === 'Cancelled due to overdue';
        } else if (filterStatus === 'Cancelled') {
          matchesStatus = invStatus === 'Cancelled' && !isInvoiceOverdue(inv);
        } else {
          matchesStatus = invStatus === filterStatus;
        }
      }

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

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [filteredInvoices, totalPages, currentPage]);

  // Statistics calculation
  const approvedCount = invoices.filter(inv => {
    if (!inv || !inv.status) return false;
    const st = String(inv.status).toLowerCase();
    return (
      st === 'approved' ||
      st === '3/3 approved' ||
      st === '4/4 approved' ||
      st === 'paid' ||
      st === 'fully paid' ||
      st === 'fully_paid' ||
      st === 'paid and closed' ||
      st.includes('partial') ||
      st.includes('deposit')
    );
  }).length;

  const pendingCount = invoices.filter(inv => {
    if (!inv || !inv.status) return false;
    const st = String(inv.status).toLowerCase();
    return (
      (st.includes('pending') || st === 'pending review' || st === '0/3 pending' || st === '1/3 approved' || st === '2/3 approved' || st === '0/4 pending' || st === '1/4 approved' || st === '2/4 approved' || st === '3/4 approved') &&
      !st.includes('partial') &&
      !st.includes('deposit')
    );
  }).length;

  const getInvoiceOutstandingInUsd = (inv: any): number => {
    if (!inv) return 0;
    const rawAmt = parseExchangeRate(inv.amount, false);
    const st = String(inv.status || '').toLowerCase();
    if (st === 'fully_paid' || st === 'paid' || st === 'paid and closed' || st === 'approved' || st === 'archived') {
      return 0;
    }
    let remaining = rawAmt;
    if (inv.remainingBalance !== null && inv.remainingBalance !== undefined && inv.remainingBalance !== '') {
      remaining = parseFloat(String(inv.remainingBalance));
    } else if (inv.advancePayment) {
      remaining = Math.max(0, rawAmt - parseFloat(String(inv.advancePayment)));
    }
    if (remaining <= 0) return 0;

    const curr = inv.currency || (String(inv.amount || '').includes('Rp') ? 'IDR' : String(inv.amount || '').includes('SAR') ? 'SAR' : 'USD');
    const defaultUsdToIdr = configuredRates.usdToIdr || 18025;
    const defaultSarToIdr = configuredRates.sarToIdr || 4800;
    const defaultUsdToSar = configuredRates.usdToSar || defaultUsdToIdr / defaultSarToIdr || 3.75;

    const usdToIdr = Number(inv.usdToIdrRate) || defaultUsdToIdr;
    const sarToIdr = Number(inv.sarToIdrRate) || defaultSarToIdr;
    const usdToSar = Number(inv.usdToSarRate) || defaultUsdToSar || (usdToIdr / sarToIdr) || 3.75;

    const converted = calculateConvertedTotals(remaining, curr, usdToIdr, sarToIdr, usdToSar);
    return converted.usdVal;
  };

  const overdueInvoicesList = invoices.filter(inv => isInvoiceOverdue(inv));
  const overdueCount = overdueInvoicesList.length;
  const totalOverdueAmountUSD = overdueInvoicesList.reduce((sum, inv) => sum + getInvoiceOutstandingInUsd(inv), 0);
  const formattedOverdueBalance = formatCurrency(totalOverdueAmountUSD, 'USD', i18n.language, 0);

  const dynamicTotal = invoices.length;
  const successRate = dynamicTotal > 0 ? ((approvedCount / dynamicTotal) * 100).toFixed(1) : '0.0';

  // Receipt Opening
  const handleOpenReceipt = async (pay: any, inv: Invoice, pIndex?: number) => {
    setReceiptModal({ isOpen: true, data: null, loading: true });
    try {
      const res = await getPaymentReceipt(inv.invoiceNo, pay.id);
      if (res && res.data) {
        setReceiptModal({ isOpen: true, data: res.data, loading: false });
        return;
      }
    } catch (err) {
      console.warn('Fallback to client-side receipt construct:', err);
    }

    const rawAmt = parseFloat(String(inv.amount || '0').replace(/[^0-9.-]/g, '')) || 0;
    const baseCurrency = (inv.currency || 'SAR').toUpperCase();
    const advPayment = parseFloat(String(inv.advancePayment || 0));
    const payAmt = parseFloat(pay.amount) || 0;
    const payCurr = (pay.currency || baseCurrency).toUpperCase();
    const seqNumber = pIndex !== undefined ? pIndex + 1 : 1;
    const seqStr = String(seqNumber).padStart(2, '0');
    const receiptNo = `REC-${inv.invoiceNo}-${seqStr}`;

    const clientReceiptData: ReceiptData = {
      receiptNo,
      sequence: seqNumber,
      paymentId: pay.id,
      invoiceNo: inv.invoiceNo,
      referenceNo: inv.referenceNo || '-',
      serialNo: inv.serialNo || '-',
      confirmationDate: inv.date,
      dateOfPayment: pay.paymentDate,
      receivedFrom: {
        company: inv.company || inv.custom_company_name || 'Client',
        companyCode: inv.companyCode || '-',
        address: inv.custom_address || 'Graha Al Badgel, Jakarta / Saudi Arabia',
        taxNumber: inv.custom_tax_number || '-',
        email: inv.custom_company_email || '-',
        agent: inv.agent || '-',
      },
      amountReceived: {
        numeric: payAmt,
        currency: payCurr,
        amountInWords: amountToEnglishWords(payAmt, payCurr),
        exchangeRate: parseFloat(String(pay.exchange_rate || '1.0')) || 1.0,
        baseCurrency: baseCurrency,
      },
      forPaymentOf: `Deposit for Confirmation Ref # ${inv.invoiceNo}`,
      ledgerSummary: {
        totalConfirmationAmount: rawAmt,
        advancePayment: advPayment,
        paymentAmountInThisReceipt: payAmt,
        totalPaidToDate: parseFloat((advPayment + (payCurr !== baseCurrency && (parseFloat(String(pay.exchange_rate)) || 1) > 0 ? payAmt / (parseFloat(String(pay.exchange_rate)) || 1) : payAmt)).toFixed(2)),
        remainingBalance: parseFloat(Math.max(0, rawAmt - (advPayment + (payCurr !== baseCurrency && (parseFloat(String(pay.exchange_rate)) || 1) > 0 ? payAmt / (parseFloat(String(pay.exchange_rate)) || 1) : payAmt))).toFixed(2)),
        currency: baseCurrency,
      },
      paymentDetails: {
        paymentDate: pay.paymentDate,
        note: pay.note || '',
        proofUrl: pay.proofUrl || null,
        createdBy: pay.createdBy || 'Finance System',
        createdAt: pay.createdAt,
      },
      issuedBy: 'Manazil AL.Mukhtara Group / PT. ODST AIRLINES INDO',
      issuedAt: new Date().toISOString(),
    };

    setReceiptModal({ isOpen: true, data: clientReceiptData, loading: false });
  };

  // Standalone list opening
  const handleOpenStandaloneList = async () => {
    setIsGenerateDropdownOpen(false);
    setIsStandaloneListOpen(true);
    setLoadingStandaloneList(true);
    try {
      const list = await getStandaloneReceipts();
      setStandaloneReceiptsList(list || []);
    } catch (err) {
      console.error('Failed to load standalone receipts:', err);
      setStandaloneReceiptsList([]);
    } finally {
      setLoadingStandaloneList(false);
    }
  };

  const handleDeleteStandalone = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this deposit receipt?')) return;
    setDeletingStandaloneId(id);
    try {
      await deleteStandaloneReceipt(id);
      setStandaloneReceiptsList(prev => prev.filter((r: any) => r.id !== id && r.paymentId !== id));
    } catch (err) {
      console.error('Failed to delete receipt:', err);
      alert('Failed to delete receipt.');
    } finally {
      setDeletingStandaloneId(null);
    }
  };

  // Single Action Handlers
  const handleCancelSingleInvoice = (invoiceNo: string) => {
    triggerConfirm(
      'Cancel Confirmation',
      `Are you sure you want to cancel Confirmation ${invoiceNo}?`,
      async () => {
        try {
          await cancelInvoiceAPI(invoiceNo);
          triggerAlert('Success', `Confirmation ${invoiceNo} has been cancelled.`, 'success');
          await fetchInvoices();
        } catch (err) {
          console.error('Failed to cancel confirmation:', err);
          triggerAlert('Error', 'Failed to cancel confirmation.', 'info');
        }
      },
      'warning',
      'Cancel Confirmation',
      'Keep Active'
    );
  };

  const handleDeleteSingleInvoice = (invoiceNo: string) => {
    triggerConfirm(
      'Delete Confirmation',
      `Are you sure you want to permanently delete Confirmation ${invoiceNo}? This action cannot be undone.`,
      async () => {
        try {
          await deleteInvoicesAPI([invoiceNo]);
          triggerAlert('Success', `Confirmation ${invoiceNo} has been permanently deleted.`, 'success');
          await fetchInvoices();
        } catch (err) {
          console.error('Failed to delete confirmation:', err);
          triggerAlert('Error', 'Failed to delete confirmation.', 'info');
        }
      },
      'danger',
      'Delete Confirmation',
      'Cancel'
    );
  };

  // Bulk Handlers
  const handleBulkDelete = () => {
    if (selectedInvoiceIds.length === 0) return;
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
    const rows = selectedInvoices.map(inv => [inv.invoiceNo, inv.company, inv.referenceNo, inv.amount, inv.date, inv.status]);
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
    const selectedDraftInvoices = invoices.filter(inv => selectedInvoiceIds.includes(inv.invoiceNo) && inv.status.toLowerCase() === 'draft');
    if (selectedDraftInvoices.length === 0) {
      triggerAlert('Info', 'None of the selected invoices are in Draft status.', 'info');
      return;
    }

    try {
      await Promise.all(
        selectedDraftInvoices.map(async (inv) => {
          await createRequest({
            invoiceNo: inv.invoiceNo,
            company: inv.company,
            companyCode: inv.companyCode,
            amount: inv.amount,
            requestedBy: user?.name || 'Ahmad Saleh',
            submittedDate: inv.date || new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          });
          await updateInvoiceStatus(inv.invoiceNo, '0/4 Pending');
        })
      );
      triggerAlert('Success', `Sent ${selectedDraftInvoices.length} invoice(s) for approval.`, 'success');
      setSelectedInvoiceIds([]);
      await fetchInvoices();
    } catch (err) {
      console.error('Failed to send invoices for approval:', err);
      triggerAlert('Error', 'Failed to send selected invoices for approval.', 'info');
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

  // Proof Upload Helpers
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
          resolve(canvas.toDataURL('image/jpeg', 0.7));
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
      triggerAlert('Upload Successful', `Payment proof for ${uploadingInvoiceNo} uploaded successfully.`, 'success');
      setInvoices(prev => prev.map(inv => (inv.invoiceNo === uploadingInvoiceNo ? { ...inv, paymentAttachment: base64Data } : inv)));
    } catch (err: any) {
      console.error('Failed to upload proof:', err);
      triggerAlert('Upload Failed', err.response?.data?.message || 'Could not upload file.', 'info');
    } finally {
      setUploadingInvoiceNo(null);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#f4f6fa] select-none font-inter">
      {/* Hidden File Input for Proof Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,application/pdf"
        className="hidden"
      />

      {/* Sidebar Layout */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        <div className="flex-1 p-8 space-y-8 max-w-[1400px] w-full mx-auto">
          {/* Welcome Banner / Action Bar */}
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
              <div className="relative inline-flex rounded-lg shadow-sm">
                <button
                  onClick={() => {
                    setEditInvoice(null);
                    setIsModalOpen(true);
                  }}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white font-semibold text-[13px] rounded-l-lg transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('invoices.createConfirmation')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsGenerateDropdownOpen(!isGenerateDropdownOpen)}
                  className="px-2.5 py-2.5 bg-[#d97706] hover:bg-[#b45309] text-white rounded-r-lg border-l border-amber-600/50 transition-all cursor-pointer flex items-center justify-center"
                  title="More Options"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>

                {isGenerateDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 animate-scale-up font-sans">
                    <button
                      type="button"
                      onClick={() => {
                        setIsGenerateDropdownOpen(false);
                        setEditInvoice(null);
                        setIsModalOpen(true);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-start space-x-3 transition-all cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[13px] font-bold text-slate-800">Generate Confirmation</div>
                        <div className="text-[11px] text-slate-500">Standard invoice with approval</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsGenerateDropdownOpen(false);
                        setIsStandaloneModalOpen(true);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-amber-50/50 flex items-start space-x-3 transition-all cursor-pointer"
                    >
                      <Receipt className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[13px] font-bold text-emerald-700">Generate Deposit Receipt</div>
                        <div className="text-[11px] text-slate-500">Direct receipt with dual bank details</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenStandaloneList}
                      className="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center space-x-3 transition-all text-slate-600 cursor-pointer"
                    >
                      <Copy className="w-4 h-4 text-slate-500 shrink-0" />
                      <div className="text-[12px] font-semibold text-slate-700">View Standalone Receipts List</div>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Metric Stats Cards */}
          <InvoicesStats
            dynamicTotal={dynamicTotal}
            dynamicApproved={approvedCount}
            dynamicPending={pendingCount}
            dynamicOverdue={overdueCount}
            formattedOverdueBalance={formattedOverdueBalance}
            successRate={successRate}
            loading={loading}
          />

          {/* Main Invoices Table */}
          <InvoicesTable
            invoices={invoices}
            paginatedInvoices={paginatedInvoices}
            filteredInvoices={filteredInvoices}
            loading={loading}
            error={error}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterCompany={filterCompany}
            setFilterCompany={setFilterCompany}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterDate={filterDate}
            setFilterDate={setFilterDate}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            availableCompanies={availableCompanies}
            selectedInvoiceIds={selectedInvoiceIds}
            setSelectedInvoiceIds={setSelectedInvoiceIds}
            copiedInvoiceNo={copiedInvoiceNo}
            handleCopyInvoiceNo={handleCopyInvoiceNo}
            onSelectInvoice={(inv) => setSelectedInvoice(inv)}
            onOpenCreateModal={() => {
              setEditInvoice(null);
              setIsModalOpen(true);
            }}
            onOpenPaymentHistory={(inv) => setPaymentHistoryModal({ isOpen: true, invoice: inv })}
            onViewProof={(inv) => inv.paymentAttachment && setViewingProofBase64(inv.paymentAttachment)}
            onTriggerUploadProof={handleTriggerUploadProof}
            onEditInvoice={(inv) => {
              setEditInvoice(inv);
              setIsModalOpen(true);
            }}
            onCancelInvoice={handleCancelSingleInvoice}
            onDeleteInvoice={handleDeleteSingleInvoice}
            onBulkExport={handleBulkExport}
            onBulkSendForApproval={handleBulkSendForApproval}
            onBulkCancel={handleBulkCancel}
            onBulkDelete={handleBulkDelete}
            onRetryFetch={() => fetchInvoices(false)}
            userRole={user?.role}
            i18nLanguage={i18n.language}
          />
        </div>
      </main>

      {/* Create / Edit Confirmation Modal */}
      <CreateInvoiceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditInvoice(null);
        }}
        editInvoice={editInvoice}
        existingInvoices={invoices}
        availableCompanies={availableCompanies}
        availableServices={availableServices}
        configuredRates={configuredRates}
        globalTaxRate={globalTaxRate}
        user={user}
        companySettings={companySettings}
        onSuccess={(savedInvoice, isEdit) => {
          if (isEdit) {
            fetchInvoices();
          } else {
            setJustCreatedInvoice(savedInvoice);
            setSuccessModalStep(1);
            fetchInvoices();
          }
        }}
        triggerAlert={triggerAlert}
      />

      {/* Payment History & Installment Ledger Modal */}
      <PaymentHistoryModal
        isOpen={paymentHistoryModal.isOpen}
        invoice={paymentHistoryModal.invoice}
        onClose={() => setPaymentHistoryModal({ isOpen: false, invoice: null })}
        configuredRates={configuredRates}
        onRefreshInvoices={() => fetchInvoices(true)}
        onOpenReceipt={handleOpenReceipt}
        triggerAlert={triggerAlert}
        userRole={user?.role}
      />

      {/* Standalone Direct Deposit Receipt Creation Modal */}
      <CreateStandaloneReceiptModal
        isOpen={isStandaloneModalOpen}
        onClose={() => setIsStandaloneModalOpen(false)}
        availableCompanies={availableCompanies}
        configuredRates={configuredRates}
        onReceiptGenerated={(receipt: ReceiptData) => {
          setReceiptModal({ isOpen: true, data: receipt, loading: false });
        }}
      />

      {/* Standalone Receipts List Modal */}
      <StandaloneReceiptsListModal
        isOpen={isStandaloneListOpen}
        onClose={() => setIsStandaloneListOpen(false)}
        standaloneReceiptsList={standaloneReceiptsList}
        loading={loadingStandaloneList}
        deletingId={deletingStandaloneId}
        onDeleteReceipt={handleDeleteStandalone}
        onOpenGenerateModal={() => {
          setIsStandaloneListOpen(false);
          setIsStandaloneModalOpen(true);
        }}
        canDelete={['Super Admin', 'Chief Accountant', 'Division Director', 'Madinah Branch Accountant'].includes(user?.role || '')}
        onViewReceipt={(receipt: ReceiptData) => setReceiptModal({ isOpen: true, data: receipt, loading: false })}
      />

      {/* Official Deposit Receipt Modal & Print Area */}
      <OfficialDepositReceiptModal
        isOpen={receiptModal.isOpen}
        onClose={() => setReceiptModal({ isOpen: false, data: null, loading: false })}
        receiptData={receiptModal.data}
        loading={receiptModal.loading}
      />

      {/* Invoice Details Modal */}
      <InvoiceDetailsModal
        selectedInvoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />

      {/* Printable Reservation Confirmation */}
      {selectedInvoice && (
        <ReservationConfirmationPrint
          invoice={selectedInvoice}
          details={getInvoiceDetails(selectedInvoice)}
        />
      )}

      {/* Payment Proof Lightbox Modal */}
      {viewingProofBase64 && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 animate-fade-in"
          onClick={() => setViewingProofBase64(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <span className="text-[14px] font-bold">Transfer Proof Document</span>
              <button
                type="button"
                onClick={() => setViewingProofBase64(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-70px)] flex items-center justify-center bg-slate-100">
              {viewingProofBase64.startsWith('data:application/pdf') ? (
                <iframe src={viewingProofBase64} title="Proof PDF" className="w-full h-[70vh] rounded-lg border border-slate-200" />
              ) : (
                <img src={viewingProofBase64} alt="Proof" className="max-w-full max-h-[75vh] object-contain rounded-lg" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Generated Success Modal Step 1 */}
      {successModalStep === 1 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0d0f]/60 p-4">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl max-w-sm w-full p-8 flex flex-col items-center animate-scale-up font-sans">
            {hasBypassPermission ? (
              <>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-3 border border-emerald-200">
                  <Check className="w-6 h-6 stroke-[3px]" />
                </div>
                <h3 className="text-[17px] font-bold text-[#0c0d0f] text-center mb-1 leading-tight">
                  {t('invoices.confirmationAutoApproved')}
                </h3>
                <p className="text-[12.5px] text-[#64748b] text-center font-medium leading-relaxed mb-6">
                  {t('invoices.bypassApprovedDesc')}
                </p>
                <div className="flex space-x-3 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setSuccessModalStep(0);
                      setJustCreatedInvoice(null);
                    }}
                    className="flex-1 py-2.5 border border-[#cbd5e1] rounded-xl text-[13px] font-bold text-[#475569] hover:bg-gray-50 transition-all text-center cursor-pointer"
                  >
                    {t('common.done')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (justCreatedInvoice) {
                        setSelectedInvoice({ ...justCreatedInvoice, status: 'Approved' });
                      }
                      setSuccessModalStep(0);
                    }}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-bold rounded-xl shadow-sm transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{t('invoices.viewPdf')}</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-14 h-14 bg-[#ecfdf5] text-[#10b981] rounded-full flex items-center justify-center mb-5 border border-[#d1fae5]">
                  <Check className="w-6 h-6 stroke-[3px]" />
                </div>
                <h3 className="text-[17px] font-bold text-[#0c0d0f] text-center mb-2.5 leading-tight">
                  {t('invoices.confirmationGeneratedSuccess')}
                </h3>
                <p className="text-[13px] text-[#64748b] text-center font-medium leading-relaxed mb-6">
                  {t('invoices.confirmationGeneratedDesc')}
                </p>
                <div className="flex space-x-3 w-full">
                  <button
                    type="button"
                    onClick={() => setSuccessModalStep(0)}
                    className="flex-1 py-2.5 border border-[#cbd5e1] rounded-xl text-[13px] font-bold text-[#475569] hover:bg-gray-50 transition-all text-center cursor-pointer"
                  >
                    {t('invoices.noThanks')}
                  </button>
                  <button
                    type="button"
                    onClick={handleSendRequestFromSuccessModal}
                    className="flex-1 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white text-[13px] font-bold rounded-xl shadow-sm transition-all text-center cursor-pointer"
                  >
                    {t('invoices.sendRequest')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Request Sent Success Modal Step 2 */}
      {successModalStep === 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0d0f]/60 p-4">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl max-w-sm w-full p-8 flex flex-col items-center animate-scale-up font-sans">
            <div className="w-14 h-14 bg-[#ecfdf5] text-[#10b981] rounded-full flex items-center justify-center mb-5 border border-[#d1fae5]">
              <Check className="w-6 h-6 stroke-[3px]" />
            </div>
            <h3 className="text-[17px] font-bold text-[#0c0d0f] text-center mb-2.5 leading-tight">
              {t('invoices.requestSentSuccess')}
            </h3>
            <p className="text-[13px] text-[#64748b] text-center font-medium leading-relaxed mb-6">
              {t('invoices.requestSentDesc')}
            </p>
            <button
              type="button"
              onClick={() => setSuccessModalStep(0)}
              className="w-full py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white text-[13px] font-bold rounded-xl shadow-sm transition-all text-center cursor-pointer"
            >
              {t('common.done')}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation & Alert Popup */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0c0d0f]/60 p-4">
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
                  className="flex-1 py-2.5 border border-[#cbd5e1] rounded-xl text-[12px] font-bold text-[#475569] hover:bg-gray-50 transition-all text-center cursor-pointer"
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
                className={`flex-1 py-2.5 text-white text-[12px] font-bold rounded-xl shadow-sm transition-all text-center cursor-pointer ${
                  confirmModal.type === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-[#f59e0b] hover:bg-[#d97706]'
                }`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Copy Feedback Toast */}
      {copyToast && (
        <div className="fixed bottom-6 right-6 z-[160] flex items-center space-x-3 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/60 animate-fade-in font-sans">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
          <div>
            <div className="text-[13px] font-bold text-white flex items-center space-x-1.5">
              <span>{t('common.copied') || 'Copied!'}</span>
            </div>
            <div className="text-[11px] text-slate-300 font-mono">
              {copyToast.text}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
