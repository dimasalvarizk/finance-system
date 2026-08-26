


import React, { useState, useMemo, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import StatCard from '../../components/ui/StatCard';
import { Search, Plus, X, AlertCircle, FileText, ChevronDown, Check, Edit3, XCircle, Trash2, Upload } from 'lucide-react';
import InvoiceDetailsModal from '../../components/ui/InvoiceDetailsModal';
import ReservationConfirmationPrint from '../../components/ui/ReservationNumberPrint';
import { getInvoices, createInvoice as createInvoiceAPI, getCompanies, updateInvoice as updateInvoiceAPI, cancelInvoice as cancelInvoiceAPI, updateInvoiceStatus, deleteInvoices as deleteInvoicesAPI, uploadPaymentProof } from '../../services/invoiceService';
import { createRequest } from '../../services/requestService';
import { getExchangeRates, getServices, getTeamMembers, getTaxSetting, getCompanySetting } from '../../services/settingService';
import { useAuth } from '../../context/AuthContext';
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
  items?: {
    description: string;
    qty: number;
    price: number;
  }[];
  createdBy?: string;
  branch?: string;
  taxRate?: number;
  paymentAttachment?: string;
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
  usdToIdrRate?: number;
  sarToIdrRate?: number;
  taxRate?: number;
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

export const getInvoiceDetails = (invoice: Invoice): InvoiceDetail => {
  const items = invoice.items || [];
  const formattedItems = items.map(item => ({
    description: item.description,
    qty: item.qty,
    price: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(item.price),
    total: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(item.qty * item.price),
  }));

  const calculatedSubtotal = items.reduce((acc, item) => acc + (item.qty * item.price), 0);
  const subtotalFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(calculatedSubtotal);

  // Try to find client details from localStorage
  const savedCompStr = localStorage.getItem('finance_companies');
  let localStorageComp = null;
  if (savedCompStr) {
    try {
      const comps = JSON.parse(savedCompStr);
      localStorageComp = comps.find((c: any) => c.name.toLowerCase() === invoice.company.toLowerCase() || c.code.toLowerCase() === invoice.companyCode.toLowerCase());
    } catch (e) { }
  }

  // Try to find creator details from localStorage team members
  const savedTeamStr = localStorage.getItem('finance_team_members');
  let localStorageCreator = null;
  if (savedTeamStr && invoice.createdBy) {
    try {
      const members = JSON.parse(savedTeamStr);
      const cleanName = (name?: string) => (name || '').toLowerCase().replace(/^(mr\.|mrs\.|ms\.)\s+/i, '').trim();
      localStorageCreator = members.find((m: any) => cleanName(m.name) === cleanName(invoice.createdBy));
    } catch (e) { }
  }

  const companySettings = getLocalCompanySettings();

  const billTo = localStorageComp ? {
    company: localStorageComp.name,
    tax: localStorageComp.taxNumber,
    address: localStorageComp.address.split(',')[0] || localStorageComp.address,
    cityCountry: localStorageComp.address.split(',').slice(1).join(',').trim() || localStorageComp.address,
    agent: localStorageComp.agent,
  } : {
    company: invoice.company,
    tax: 'N/A',
    address: 'N/A',
    cityCountry: 'N/A',
    agent: undefined,
  };

  return {
    dueDate: (() => {
      if (invoice.dueDate) {
        if (invoice.dueDate.includes('-')) {
          const parts = invoice.dueDate.split('-');
          if (parts.length === 3) {
            return `${parts[1]}/${parts[2]}/${parts[0]}`;
          }
        }
        return invoice.dueDate;
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
      name: invoice.createdBy || 'Emad Moustafa',
      id: '260111',
      entity: companySettings.companyName || 'ODST Group',
      phone: companySettings.phone,
      email: 'info@odst.id',
      tax: companySettings.taxNumber,
    },
    billTo,
    items: formattedItems,
    subtotal: subtotalFormatted,
    tax: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(calculatedSubtotal * ((invoice.taxRate || 0) / 100)),
    total: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(calculatedSubtotal * (1 + ((invoice.taxRate || 0) / 100))),
    usdToIdrRate: invoice.usdToIdrRate || 16250,
    sarToIdrRate: invoice.sarToIdrRate || 4333,
    taxRate: invoice.taxRate || 0
  };
};

export const parseExchangeRate = (val: any, isIdr: boolean = true): number => {
  let str = String(val).trim();
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

export const calculateConvertedTotals = (usdAmount: number, usdToIdr: number, sarToIdr: number) => {
  const idr = usdAmount * usdToIdr;
  const sar = idr / sarToIdr;

  return {
    idrTotal: `Rp ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(idr)}`,
    sarTotal: `SAR ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(sar)}`
  };
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

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetched = await getInvoices();
      console.log('DEBUG: fetched invoices from API:', fetched);
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
      setError('Failed to fetch invoices. Please check backend service connections.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
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
      case 'Archived':
      case 'Paid':
        return 'bg-[#f1f5f9] text-[#475569]';
      default:
        return 'bg-[#f1f5f9] text-[#475569]';
    }
  };

  // Form States & Selection
  const [selectedClientKey, setSelectedClientKey] = useState<string>('Select client company...');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);
  const [formInvoiceNo, setFormInvoiceNo] = useState('');
  const [formRef, setFormRef] = useState('');
  const [formSerial, setFormSerial] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formInvoiceDate, setFormInvoiceDate] = useState('');

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
    // If we are editing an invoice, do NOT reset client selection to default Arie Tours
    if (editInvoiceId) return;

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
    setFormError('');
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
    if (selectedClientKey === 'Select client company...') count += 1;
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
  const [configuredRates, setConfiguredRates] = useState<{ usdToIdr: number; sarToIdr: number; usdToSar: number }>({ usdToIdr: 16250, sarToIdr: 4333, usdToSar: 3.75 });
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const rates = await getExchangeRates();
        if (rates) {
          setConfiguredRates({
            usdToIdr: parseExchangeRate(rates.usdToIdr, true) || 16250,
            sarToIdr: parseExchangeRate(rates.sarToIdr, true) || 4333,
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

  const handleClientChange = (comp: { name: string; code: string; phone?: string; address?: string; taxNumber?: string }) => {
    const key = `${comp.name} - ${comp.code}`;
    setSelectedClientKey(key);
    setIsClientDropdownOpen(false);

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

  const handleDateChange = (newDate: string) => {
    setFormDate(newDate);
    const compCode = selectedClientKey.split(' - ')[1] || 'GEN';
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
      // 1. Search Query
      const q = searchQuery.toLowerCase();
      const matchesSearch = (
        inv.invoiceNo.toLowerCase().includes(q) ||
        inv.company.toLowerCase().includes(q) ||
        inv.companyCode.toLowerCase().includes(q) ||
        inv.referenceNo.toLowerCase().includes(q) ||
        inv.serialNo.toLowerCase().includes(q)
      );

      // 2. Company Filter
      const matchesCompany = !filterCompany || inv.company === filterCompany || inv.companyCode === filterCompany;

      // 3. Status Filter
      let matchesStatus = true;
      if (filterStatus) {
        if (filterStatus === 'Pending') {
          matchesStatus = inv.status.includes('Pending') || inv.status.includes('Approved') || inv.status === 'Pending Review';
        } else {
          matchesStatus = inv.status === filterStatus;
        }
      }

      // 4. Date Filter
      let matchesDate = true;
      if (filterDate) {
        matchesDate = compareDates(inv.date, filterDate);
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
  const approvedCount = invoices.filter(inv => inv.status === 'Approved' || inv.status === '3/3 Approved' || inv.status === '4/4 Approved' || inv.status === 'Paid').length;
  const pendingCount = invoices.filter(inv => inv.status.includes('Pending') || inv.status.includes('Approved') || inv.status === 'Pending Review').length;
  const rejectedCount = invoices.filter(inv => inv.status === 'Rejected').length;

  const dynamicApproved = approvedCount;
  const dynamicPending = pendingCount;
  const dynamicOverdue = rejectedCount;
  const dynamicTotal = invoices.length;
  const successRate = (dynamicApproved + dynamicPending) > 0
    ? ((dynamicApproved / (dynamicApproved + dynamicPending)) * 100).toFixed(1)
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
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(calculatedTotal);

    // Format Date for Invoice Date (today's date)
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit', year: 'numeric' };
    const todayFormattedDate = today.toLocaleDateString('en-US', options);

    const selectedCompany = availableCompanies.find(c => {
      const dbKey = `${c.name} - ${c.code}`.replace(/\s+/g, '').toLowerCase();
      const currentKey = selectedClientKey.replace(/\s+/g, '').toLowerCase();
      return dbKey === currentKey || c.name.trim().toLowerCase() === selectedClientKey.split(' - ')[0].trim().toLowerCase();
    });

    if (!selectedCompany) {
      setFormError('Please select a valid partner company from the database.');
      return;
    }

    const newInvoice: Invoice = {
      invoiceNo: formInvoiceNo,
      company: selectedCompany.name,
      companyCode: selectedCompany.code,
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
    setSelectedClientKey(`${inv.company} - ${inv.companyCode}`);
    setFormInvoiceNo(inv.invoiceNo);
    setFormRef(inv.referenceNo);
    setFormSerial(inv.serialNo);
    setFormDate(inv.dueDate ? convertToISODate(inv.dueDate) : convertToISODate(inv.date));
    setFormInvoiceDate(inv.date);
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
                Confirmations
              </h1>
              <p className="text-[13px] text-[#64748b] font-medium font-sans">
                ODST Corporate Confirmations & Treasury Ledger
              </p>
            </div>

            <button
              onClick={handleOpenCreateModal}
              className="flex items-center space-x-2 px-4 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white font-semibold text-[13px] rounded-lg shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Confirmation</span>
            </button>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Confirmations"
              value={`${dynamicTotal} Sent`}
              subtext="Aggregated monthly ledger volume"
              badgeText="All Branches"
              badgeColorClass="bg-[#e0f2fe] text-[#0284c7]"
            />
            <StatCard
              title="Approved"
              value={`${dynamicApproved} Confirmations`}
              subtext="Successfully processed & settled"
              badgeText={`${successRate}% success`}
              badgeColorClass="bg-[#ecfdf5] text-[#10b981]"
            />
            <StatCard
              title="Pending Review"
              value={`${dynamicPending} Confirmations`}
              subtext="Pending Finance Director verification"
              badgeText="Awaiting Clearance"
              badgeColorClass="bg-[#fff7ed] text-[#f97316]"
            />
            <StatCard
              title="Overdue Balance"
              value={`${dynamicOverdue} Confirmations`}
              subtext="Outstanding balance past collection limits"
              badgeText="Action Required"
              badgeColorClass="bg-[#fef2f2] text-[#ef4444]"
            />
          </div>

          {/* Invoices Table Card */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
            {/* Table Header Section */}
            <div className="px-6 py-6 flex items-center justify-between border-b border-[#e2e8f0]">
              <h3 className="text-[15px] font-bold text-[#0c0d0f] font-sans">
                Recent Approved Confirmations
              </h3>
              {invoices.length > 0 && !loading && (
                <div className="relative w-60 animate-fade-in">
                  <input
                    type="text"
                    placeholder="Search Client / Conf #"
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
                <button
                  onClick={handleOpenCreateModal}
                  className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-[13px] rounded-xl shadow-sm transition-all cursor-pointer font-sans"
                >
                  Generate Confirmation
                </button>
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
                      placeholder="Search Confirmation / Ref #"
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
                    <option value="">All Companies</option>
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
                    <option value="">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Archived">Archived</option>
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
                         <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter">
                          CONFIRMATION #
                        </th>
                        <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter">
                          COMPANY
                        </th>
                        <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter">
                          COMPANY CODE
                        </th>
                        <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter">
                          REFERENCE #
                        </th>
                        <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter">
                          SERIAL #
                        </th>
                        <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter">
                          AMOUNT
                        </th>
                        <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter">
                          CONFIRMATION DATE
                        </th>
                        <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter">
                          DUE DATE
                        </th>
                        <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter">
                          STATUS
                        </th>
                        <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] tracking-wider font-inter text-center">
                          ACTIONS
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
                              {inv.date}
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
                                      return dObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
                                    }
                                  }
                                  return inv.dueDate;
                                }
                                return 'N/A';
                              })()}
                            </td>
                            <td className="px-6 py-3.5">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase font-sans ${getStatusBadgeClass(inv.status)}`}
                              >
                                {(() => {
                                  console.log('DEBUG: Rendering row', inv.invoiceNo, 'with status:', inv.status);
                                  return inv.status;
                                })()}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-center flex items-center justify-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                              {inv.status === 'Paid' ? (
                                inv.paymentAttachment ? (
                                  <button
                                    onClick={() => handleViewPaymentProof(inv)}
                                    title="View Payment Proof"
                                    className="p-1 hover:bg-green-50 rounded text-green-600 hover:text-green-800 transition-all cursor-pointer flex items-center justify-center font-bold text-[14px]"
                                  >
                                    ✅
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleTriggerUploadProof(inv)}
                                    title="Upload Payment Proof"
                                    className="p-1 hover:bg-blue-50 rounded text-blue-500 hover:text-blue-700 transition-all cursor-pointer"
                                  >
                                    <Upload className="w-4 h-4" />
                                  </button>
                                )
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEditInvoiceClick(inv)}
                                    title="Edit Invoice"
                                    className="p-1 hover:bg-slate-100 rounded text-blue-500 hover:text-blue-700 transition-all cursor-pointer"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  {inv.status !== 'Cancelled' && inv.status !== 'Archived' && (
                                    <button
                                      onClick={() => handleCancelSingleInvoice(inv.invoiceNo)}
                                      title="Cancel Invoice"
                                      className="p-1 hover:bg-red-50 rounded text-red-500 hover:text-red-700 transition-all cursor-pointer"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  )}
                                  {(user?.role === 'Super Admin' || user?.role === 'Chief Accountant' || user?.role === 'Division Director' || user?.role === 'Madinah Branch Accountant') && (
                                    <button
                                      onClick={() => handleDeleteSingleInvoice(inv.invoiceNo)}
                                      title="Delete Invoice"
                                      className="p-1 hover:bg-red-50 rounded text-red-500 hover:text-red-700 transition-all cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={10} className="px-6 py-16 text-center text-[#64748b] font-medium">
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
                      Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredInvoices.length)} to{' '}
                      {Math.min(currentPage * itemsPerPage, filteredInvoices.length)} of{' '}
                      {filteredInvoices.length} approved invoices
                    </span>

                    <div className="flex items-center space-x-1.5 self-end sm:self-auto">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 border border-[#e2e8f0] rounded-md text-[12px] font-semibold text-[#1e293b] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        Previous
                      </button>

                      {Array.from({ length: totalPages }).map((_, i) => {
                        const pageNum = i + 1;
                        // Show only first 3 pages and last page, or pages near current page
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
                        Next
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
                    {editInvoiceId ? 'Edit Confirmation' : 'Generate New Confirmation'}
                  </h3>
                  {editInvoiceId && (
                    <span className="text-[12px] text-[#64748b] font-medium font-sans">
                      Modify confirmation details before resubmission
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#f1f5f9] text-[#64748b] hover:text-[#0c0d0f] flex items-center justify-center hover:bg-gray-200 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Validation Banner */}
            {showValidation && getValidationErrorCount() > 0 && (
              <div className="bg-[#fef2f2] border-b border-[#fecaca] px-6 py-4 flex items-center gap-3 text-[#991b1b] text-[13px] font-semibold font-sans animate-fade-in flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-[#ef4444] flex-shrink-0" />
                <span>{getValidationErrorCount()} errors found. Please fix them before submitting.</span>
                {formError && <span className="sr-only">{formError}</span>}
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleGenerateInvoice} noValidate className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* Client Selector Dropdown */}
              <div className="space-y-1.5 relative">
                <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-sans">
                  Company Name / Client Selection
                </label>
                <button
                  type="button"
                  onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                  className={`w-full flex items-center justify-between px-4 py-3 border rounded-xl text-[13px] font-bold text-[#0c0d0f] bg-white hover:bg-gray-50 transition-all text-left ${showValidation && selectedClientKey === 'Select client company...'
                    ? 'border-[#ef4444] ring-1 ring-[#ef4444]'
                    : 'border-[#e2e8f0]'
                    }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                    <span className={`${selectedClientKey === 'Select client company...' ? 'text-gray-400 font-semibold' : ''}`}>{selectedClientKey}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>
                {showValidation && selectedClientKey === 'Select client company...' && (
                  <span className="block text-[11.5px] text-[#ef4444] font-semibold mt-1 animate-fade-in">
                    Please select a company
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
                      className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-gray-400 hover:bg-[#f8fafc] flex items-center space-x-2"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                      <span>Select client company...</span>
                    </button>
                    {availableCompanies.length > 0 ? (
                      availableCompanies.map((comp) => {
                        const key = `${comp.name} - ${comp.code}`;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleClientChange(comp)}
                            className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-[#1e293b] hover:bg-[#f8fafc] flex items-center space-x-2"
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                            <span>{key}</span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-4 py-3 text-[13px] text-gray-500 text-center font-semibold bg-[#f8fafc]">
                        No companies available. Please add a company in Settings or Companies page first.
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
                    Confirmation Number
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
                      Reference Number is required
                    </span>
                  )}
                </div>
                {/* Reference Number */}
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-sans">
                    Reference Number
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
                      Reference Number is required
                    </span>
                  )}
                </div>
                {/* Serial Number */}
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-sans">
                    Serial Number
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
                      Serial Number is required
                    </span>
                  )}
                </div>
                {/* Due Date */}
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-inter">
                    Due Date
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
                      Due date must be in the future
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
                      BILL FROM
                    </h4>
                    {editInvoiceId ? (
                      <div className="space-y-3.5 text-[13px] font-sans">
                        <div>
                          <span className="block text-[10px] font-semibold text-[#94a3b8] mb-0.5 font-inter">
                            Entity / Company
                          </span>
                          <span className="font-bold text-[14px] text-[#0c0d0f] break-all block">
                            {formEntity || 'ODST Group'}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-semibold text-[#94a3b8] mb-0.5 font-inter">
                            Company Email
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
                            Employee Name
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
                            Company Number
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
                            Employee ID
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
                            Company Email
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
                            Entity / Company
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
                            Company Tax Number
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
                      BILL TO
                    </h4>
                    <div className="space-y-3.5 text-[13px] font-sans">
                      <div>
                        <span className="block text-[10px] font-semibold text-[#94a3b8] mb-0.5 font-inter">
                          Client Company
                        </span>
                        <span className="font-bold text-[14px] text-[#0c0d0f]">
                          {selectedCompanyObj?.name || 'N/A'}
                        </span>
                      </div>
                      {!editInvoiceId && (
                        <div>
                          <span className="block text-[10px] font-semibold text-[#94a3b8] mb-0.5 font-inter">
                            Company Tax Number
                          </span>
                          <span className="font-semibold text-[#1e293b]">
                            {selectedCompanyObj?.taxNumber || 'N/A'}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="block text-[10px] font-semibold text-[#94a3b8] mb-0.5 font-inter">
                          Street Address
                        </span>
                        <span className="font-semibold text-[#1e293b] block">
                          {selectedCompanyObj?.address && selectedCompanyObj.address.includes(',')
                            ? selectedCompanyObj.address.split(',')[0]
                            : (selectedCompanyObj?.address || 'N/A')}
                        </span>
                      </div>
                      {!editInvoiceId && (
                        <div>
                          <span className="block text-[10px] font-semibold text-[#94a3b8] mb-0.5 font-inter">
                            City / Country
                          </span>
                          <span className="font-semibold text-[#1e293b]">
                            {selectedCompanyObj?.address && selectedCompanyObj.address.includes(',')
                              ? selectedCompanyObj.address.split(',').slice(1).join(',').trim()
                              : 'N/A'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-[#e2e8f0] mx-6" />

              {/* Itemized Charges Section */}
              <div className="space-y-3">
                <h4 className="text-[12px] font-bold text-[#0c0d0f] uppercase tracking-wider font-inter">
                  Itemized Charges
                </h4>
                <div className="overflow-x-auto border border-[#e2e8f0] rounded-xl bg-white">
                  <table className="w-full text-left border-collapse text-[13px] font-sans">
                    <thead>
                      <tr className="bg-gray-50 border-b border-[#e2e8f0]">
                        <th className="px-4 py-2.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider font-inter">
                          Description
                        </th>
                        <th className="px-4 py-2.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-center font-inter w-20">
                          Qty
                        </th>
                        <th className="px-4 py-2.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-right font-inter w-32">
                          Unit Price
                        </th>
                        <th className="px-4 py-2.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-right font-inter w-32">
                          Total
                        </th>
                        <th className="px-4 py-2.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-center font-inter w-16">
                          Action
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
                                  : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(item.price) || 0)
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
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.qty * item.price)}
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
                      Select Service
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsServiceDropdownOpen(!isServiceDropdownOpen)}
                      className="w-full flex items-center justify-between px-4 py-2.5 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] bg-white hover:bg-gray-50 transition-all text-left cursor-pointer"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                        <span>Choose configured service...</span>
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
                              let finalPrice = service.price;
                              if (service.currency === 'SAR') {
                                const rate = configuredRates.usdToSar || 3.75;
                                finalPrice = parseFloat((service.price / rate).toFixed(2));
                              } else if (service.currency === 'IDR' || service.currency === 'RP') {
                                const rate = configuredRates.usdToIdr || 16250;
                                finalPrice = parseFloat((service.price / rate).toFixed(2));
                              }

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
                      <span>Add Custom Item</span>
                    </button>
                  </div>

                  {/* Summary Section */}
                  <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 space-y-3 font-sans text-[13px]">
                    <div className="flex justify-between items-center">
                      <span className="text-[#64748b] font-semibold font-sans">Subtotal</span>
                      <span className="font-bold text-[#0c0d0f] font-roboto">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }).format(formItems.reduce((acc, item) => acc + (item.qty * item.price), 0))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#64748b] font-semibold font-sans">Tax / VAT ({(editInvoiceId ? (invoices.find(i => i.invoiceNo === editInvoiceId)?.taxRate || 0) : globalTaxRate)}%)</span>
                      <span className="font-bold text-[#0c0d0f] font-roboto">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }).format(formItems.reduce((acc, item) => acc + (item.qty * item.price), 0) * ((editInvoiceId ? (invoices.find(i => i.invoiceNo === editInvoiceId)?.taxRate || 0) : globalTaxRate) / 100))}
                      </span>
                    </div>
                    <div className="h-px bg-[#e2e8f0] my-2" />
                    <div className="flex justify-between items-center text-[14px]">
                      <span className="text-[#0c0d0f] font-bold">Total Due</span>
                      <span className="font-extrabold text-[#2563eb] font-roboto text-[16px]">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }).format(formItems.reduce((acc, item) => acc + (item.qty * item.price), 0) * (1 + ((editInvoiceId ? (invoices.find(i => i.invoiceNo === editInvoiceId)?.taxRate || 0) : globalTaxRate) / 100)))}
                      </span>
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
                        Exchange Rate
                      </h4>
                      <div className="bg-[#f8fafc] p-5 rounded-2xl border border-[#e2e8f0] font-sans space-y-4">
                        <div className="flex flex-col space-y-2 text-[13px] font-sans text-slate-600 pb-3 border-b border-[#e2e8f0]">
                          <div className="flex justify-between items-center">
                            <span>1 USD = {configuredRates.usdToIdr.toLocaleString('en-US')} IDR</span>
                            <span className="font-bold text-[#475569]">USD / IDR</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>1 SAR = {configuredRates.sarToIdr.toLocaleString('en-US')} IDR</span>
                            <span className="font-bold text-[#475569]">SAR / IDR</span>
                          </div>
                        </div>
                        {(() => {
                          const totalUsd = formItems.reduce((acc, item) => acc + (item.qty * item.price), 0);
                          const converted = calculateConvertedTotals(totalUsd, configuredRates.usdToIdr, configuredRates.sarToIdr);
                          return (
                            <div className="flex flex-col space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[13px] text-[#64748b] font-semibold font-sans">Total Due (IDR)</span>
                                <span className="font-bold text-[#2563eb] text-[15px] font-roboto">
                                  {converted.idrTotal}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[13px] text-[#64748b] font-semibold font-sans">Total Due (SAR)</span>
                                <span className="font-bold text-[#2563eb] text-[15px] font-roboto">
                                  {converted.sarTotal}
                                </span>
                              </div>
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
                          Payment Instructions
                        </h4>
                        <div className="bg-[#f8fafc] p-5 rounded-2xl border border-[#e2e8f0] font-sans">
                          <div className="space-y-3 text-[13px] font-sans">
                            <div className="flex justify-between items-center">
                              <span className="text-[#64748b] font-semibold">Bank Name:</span>
                              <span className="font-bold text-[#0c0d0f]">{settings.bankName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[#64748b] font-semibold">Account Name:</span>
                              <span className="font-bold text-[#0c0d0f]">{settings.accountName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[#64748b] font-semibold">IDR Account Number:</span>
                              <span className="font-bold text-[#2563eb] font-inter">{settings.idrAccountNumber}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[#64748b] font-semibold">USD Account Number:</span>
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
                        Notes
                      </h4>
                      {companySettings.defaultNotes.split('\n').map((note: string, idx: number) => (
                        <p key={idx} className={idx > 0 ? "mt-1" : ""}>
                          {note.startsWith('*') ? note : `* ${note}`}
                        </p>
                      ))}
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-[#0c0d0f] uppercase tracking-wider font-inter mb-2">
                        Terms & Conditions
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
                    Validation failed: Fix errors to proceed
                  </span>
                ) : (
                  <span className="text-[12px] text-[#94a3b8] font-medium font-sans animate-fade-in">
                    {editInvoiceId ? 'Form status: Editable & complete' : 'Form status: Valid & complete'}
                  </span>
                )}
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-[#cbd5e1] rounded-lg text-[13px] font-semibold text-[#1e293b] hover:bg-gray-50 transition-all font-inter"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={showValidation && getValidationErrorCount() > 0}
                    className={`px-4 py-2 font-semibold text-[13px] rounded-lg transition-all font-inter ${showValidation && getValidationErrorCount() > 0
                      ? 'bg-[#cbd5e1] text-[#94a3b8] cursor-not-allowed shadow-none'
                      : 'bg-[#f59e0b] hover:bg-[#d97706] text-white shadow-sm'
                      }`}
                  >
                    {editInvoiceId ? 'Save & Resubmit' : 'Generate Confirmation'}
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

      {/* Payment Proof Viewer Modal */}
      {viewingProofBase64 && (
        <div className="fixed inset-0 bg-[#0c0d0f]/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setViewingProofBase64(null)}>
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
    </div>
  );
};

export default Invoices;
