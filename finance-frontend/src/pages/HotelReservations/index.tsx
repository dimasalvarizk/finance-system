import React, { useState, useMemo, useRef, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import {
  Bed,
  Search,
  Plus,
  ChevronDown,
  X,
  FileText
} from 'lucide-react';
import { getCompanySetting, getExchangeRates, getTaxSetting } from '../../services/settingService';
import NewReservationModal from '../../components/ui/NewReservationModal';
import ReservationDetailsModal from '../../components/ui/ReservationDetailsModal';
import AlertModal from '../../components/ui/AlertModal';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { formatLocalizedDate } from '../../i18n';
import {
  getHotelReservations,
  createHotelReservation,
  approveHotelReservation,
  updateHotelReservationStatus,
  deleteHotelReservation,
  sendHotelReservationEmail
} from '../../services/hotelReservationService';
import { getCompanies } from '../../services/invoiceService';
import HotelReservationPrint from '../../components/ui/HotelReservationPrint';

// Sub-interface untuk detail tipe kamar di dalam reservasi
export interface BookingRoom {
  hotelName: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  roomCount: number;
  adults: number;
  children: number;
  mealPlan: string;
  pricePerNight: number; // DayRate
  mealRate: number;      // Meals Rate
}

// Interface utama data reservasi
export interface Booking {
  id: string;
  reservationNo: string;
  guestName: string;
  guestPhone?: string;
  // Invoice Metadata
  referenceNo: string;
  serialNo: string;
  dueDate: string;
  // Bill To (Client) details
  companyName: string; // Client Company
  clientTaxNo?: string;
  clientAddress?: string;
  clientCityCountry?: string;
  // Bill From details
  employeeName: string;
  employeeId: string;
  employeePhone: string;
  employeeEmail: string;
  employeeEntity: string;
  companyTaxNo?: string;
  // Rooms List
  rooms: BookingRoom[];
  currency: 'USD' | 'SAR' | 'IDR';
  taxRate: number;
  status: 'Confirmed' | 'Tentative' | 'Cancelled' | 'Paid and closed' | 'Pending';
  isPaid?: boolean;
  notes?: string;
  // Approval
  approvedByKarim?: boolean;
  approvedAtKarim?: string;
  confirmationNo?: string;
  type: 'Tentative' | 'Confirmation';
  paymentInvoiceFile?: string;
  usdToIdrRate?: number;
  sarToIdrRate?: number;
  advancePayment?: number;
  remainingBalance?: number;
  agent?: string;
  company_id?: string | null;
  custom_company_name?: string | null;
  custom_company_email?: string | null;
  custom_agent?: string | null;
  custom_address?: string | null;
  custom_tax_number?: string | null;
  custom_city_country?: string | null;
  isCustomClient?: boolean;
}

// Client Company Directory untuk dropdown Bill To
export interface ClientCompany {
  id: string;
  displayName: string;
  companyName: string;
  taxNo: string;
  address: string;
  cityCountry: string;
  code: string;
}

export const CLIENT_COMPANIES: ClientCompany[] = [];

// Helper to get room price from catalog
export const getRoomPrice = (hotel: string, roomType: string): number => {
  const normHotel = hotel.toLowerCase();
  const normType = roomType.toLowerCase();

  if (normHotel.includes('safwat')) {
    if (normType.includes('triple')) return 225.0;
    if (normType.includes('quad')) return 225.0;
    if (normType.includes('double')) return 180.0;
    return 120.0;
  }
  if (normHotel.includes('hyatt')) return 362.3;
  if (normHotel.includes('sheraton')) return 139.1;
  if (normHotel.includes('ritz')) return 426.1;
  if (normHotel.includes('marriott')) return 284.5;
  return 150.0;
};

// Format ke mata uang dengan kode mata uang (contoh: 180.00 SAR, 225.00 USD)
export const formatCurrency = (val: number, currency: 'USD' | 'SAR' | 'IDR') => {
  const numStr = val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (currency === 'USD') {
    return `${numStr} USD`;
  }
  if (currency === 'SAR') {
    return `${numStr} SAR`;
  }
  return `${numStr} IDR`;
};

// Format tanggal ke format visual (e.g. 05/09/2026)
export const formatDateDMY = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
};

export const formatMealPlan = (plan: string): string => {
  if (!plan) return 'RO';
  const p = plan.toUpperCase();
  if (p.includes('FULL BOARD') || p.includes('FB')) return 'FB';
  if (p.includes('HALF BOARD') || p.includes('HB')) return 'HB';
  if (p.includes('BREAKFAST') || p.includes('BB')) return 'BB';
  if (p.includes('ROOM ONLY') || p.includes('RO')) return 'RO';
  return plan;
};

// Hitung jumlah malam stay
export const calculateNights = (inDate: string, outDate: string): number => {
  if (!inDate || !outDate) return 1;
  const d1 = new Date(inDate);
  const d2 = new Date(outDate);
  const diff = d2.getTime() - d1.getTime();
  return diff <= 0 ? 1 : Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// Hitung total harga satu kamar
export const calculateRoomTotal = (r: BookingRoom) => {
  const base = r.pricePerNight * r.nights * r.roomCount;
  const meals = r.mealRate * r.adults * r.nights;
  return base + meals;
};

// Hitung total keseluruhan booking
export const calculateBookingTotal = (b: Booking) => {
  let subtotal = 0;
  b.rooms.forEach(r => {
    subtotal += calculateRoomTotal(r);
  });
  return subtotal;
};

// Cek apakah booking melewati due date / berstatus OVERDUE
export const isBookingOverdue = (booking: Booking): boolean => {
  if (booking.isPaid || booking.status === 'Paid and closed') return false;

  const notes = (booking.notes || '').toLowerCase();
  if (notes.includes('auto-cancelled') || notes.includes('unpaid past due date') || notes.includes('overdue')) {
    return true;
  }

  if (booking.dueDate) {
    const dueStr = booking.dueDate.split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];
    if (dueStr < todayStr) return true;
  }
  return false;
};

// Tim resmi Manage Team (dst_users)
export const OFFICIAL_TEAM_NAMES = [
  'Ahmed Warshan',
  'Ali Warshan',
  'Aufa Rakha',
  'Dimas Alva Rizki',
  'Emad Moustafa',
  'Husain Al Attas',
  'Khalid Idriss',
  'Mr. Hesham Mokhtar',
  'Mr. Karim Gharba',
  'Mr. Raed AlBadrani'
];

export const sanitizeRequestedBy = (empName?: string): string => {
  if (!empName || empName.trim() === '') return 'Dimas Alva Rizki';
  const name = empName.trim();
  
  const foundInTeam = OFFICIAL_TEAM_NAMES.find(t => t.toLowerCase() === name.toLowerCase() || name.toLowerCase().includes(t.toLowerCase()));
  if (foundInTeam) return foundInTeam;

  if (name.includes('Ahmad S') || name.includes('Ahmed')) return 'Ahmed Warshan';
  if (name.includes('Sarah') || name.includes('Ali')) return 'Ali Warshan';
  if (name.includes('Tony') || name.includes('Hesham')) return 'Mr. Hesham Mokhtar';
  if (name.includes('John') || name.includes('Khalid')) return 'Khalid Idriss';
  if (name.includes('Golam') || name.includes('Aufa')) return 'Aufa Rakha';
  if (name.includes('Ellen') || name.includes('Raed')) return 'Mr. Raed AlBadrani';
  if (name.includes('Norman') || name.includes('Husain')) return 'Husain Al Attas';
  if (name.includes('Rian') || name.includes('Dimas')) return 'Dimas Alva Rizki';

  return 'Dimas Alva Rizki';
};



const HotelReservations: React.FC = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  // State data utama
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // State navigasi tab
  const [activeTab, setActiveTab] = useState<'Reservations' | 'Requests'>('Reservations');

  // State untuk pencarian & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [requestStatusFilter, setRequestStatusFilter] = useState<'All' | 'Pending' | 'Confirmed' | 'Rejected'>('Pending');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // State Dropdown "+ New Reservation"
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // State Modal Pemesanan Baru
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formType, setFormType] = useState<'Tentative' | 'Confirmation'>('Tentative');

  // State Modal Detail
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // State Approval Workflow Modals
  const [isConfirmApprovalOpen, setIsConfirmApprovalOpen] = useState(false);
  const [confirmationNoInput, setConfirmationNoInput] = useState('');
  const [isApprovedSuccessOpen, setIsApprovedSuccessOpen] = useState(false);
  const [lastConfirmationNo, setLastConfirmationNo] = useState('');
  const [lastApprovedBooking, setLastApprovedBooking] = useState<Booking | null>(null);

  // State Send Confirmation Email Modal
  const [showSendConfirmationModal, setShowSendConfirmationModal] = useState(false);
  const [clientEmailInput, setClientEmailInput] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sendEmailError, setSendEmailError] = useState('');

  const handleOpenSendConfirmation = () => {
    if (!selectedBooking) return;
    const defaultEmail = selectedBooking.employeeEmail || `billing@${(selectedBooking.companyName || 'client').toLowerCase().replace(/\s+/g, '')}.com`;
    setClientEmailInput(defaultEmail);
    setSendEmailError('');
    setShowSendConfirmationModal(true);
  };

  const handleSendConfirmationEmail = async () => {
    if (!selectedBooking || !clientEmailInput) return;
    setIsSendingEmail(true);
    setSendEmailError('');
    try {
      await sendHotelReservationEmail(selectedBooking.id, clientEmailInput);
      setShowSendConfirmationModal(false);
      triggerAlert(
        t('common.success') || 'Success',
        `${t('hotelReservations.sendConfirmation')} ${t('common.success') || 'berhasil dikirim ke'} ${clientEmailInput}`,
        'success'
      );
    } catch (err: any) {
      console.error('Failed to send confirmation email:', err);
      setSendEmailError(err.response?.data?.message || 'Failed to send confirmation email. Please check configuration.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // State pencarian, filter & seleksi multi-row
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);

  // Reset seleksi saat filter/tab berubah
  useEffect(() => {
    setSelectedBookingIds([]);
  }, [searchQuery, statusFilter, requestStatusFilter, currentPage, activeTab]);

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedBookingIds.length === 0) return;

    if (user?.role === 'Viewer') {
      triggerAlert('Access Denied', 'Viewer role cannot delete reservations.', 'error');
      return;
    }

    if (window.confirm(`Are you sure you want to permanently delete the ${selectedBookingIds.length} selected reservation(s)? This action cannot be undone.`)) {
      try {
        await Promise.all(selectedBookingIds.map(id => deleteHotelReservation(id)));
        setBookings(prev => prev.filter(b => !selectedBookingIds.includes(b.id)));
        setSelectedBookingIds([]);
        triggerAlert('Success', `Successfully deleted ${selectedBookingIds.length} reservation(s).`, 'success');
      } catch (err) {
        console.error('Failed to delete selected reservations:', err);
        triggerAlert('Error', 'Failed to delete selected reservations.', 'error');
      }
    }
  };

  // Bulk Export CSV
  const handleBulkExportCSV = () => {
    const selectedBookings = bookings.filter(b => selectedBookingIds.includes(b.id));
    if (selectedBookings.length === 0) return;

    const rows = selectedBookings.map(b => {
      const firstRoom = b.rooms[0] || { hotelName: '', checkIn: '', checkOut: '', roomType: '' };
      const totalCost = calculateBookingTotal(b);
      return [
        b.reservationNo,
        `"${(firstRoom.hotelName || '').replace(/"/g, '""')}"`,
        `"${(b.guestName || '').replace(/"/g, '""')}"`,
        firstRoom.checkIn,
        firstRoom.checkOut,
        `"${(firstRoom.roomType || '').replace(/"/g, '""')}"`,
        b.dueDate || '',
        b.status,
        totalCost,
        b.currency
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      ['Reservation No,Hotel Name,Guest Name,Check In,Check Out,Room Type,Due Date,Status,Total Cost,Currency']
        .concat(rows.map(e => e.join(',')))
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hotel_reservations_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerAlert('Success', `Exported ${selectedBookings.length} selected reservation(s) to CSV.`, 'success');
  };

  // State Alert Modal Custom
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success' as 'success' | 'error' | 'info'
  });
  const [viewingProof, setViewingProof] = useState<string | null>(null);
  const [uploadErrorHighlight, setUploadErrorHighlight] = useState(false);
  const uploadSectionRef = useRef<HTMLDivElement>(null);

  const triggerAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setAlertModal({
      isOpen: true,
      title,
      message,
      type
    });
  };

  const handleUploadPaymentFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBooking) return;

    if (file.size > 10 * 1024 * 1024) {
      triggerAlert('File Terlalu Besar', 'Maksimal ukuran file adalah 10MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      try {
        const updated = await updateHotelReservationStatus(selectedBooking.id, {
          paymentInvoiceFile: base64Data
        });
        if (updated) {
          setBookings(prev => prev.map(b => b.id === selectedBooking.id ? updated : b));
          setSelectedBooking(updated);
          setUploadErrorHighlight(false);
          triggerAlert('Success', 'Hotel payment proof uploaded successfully!', 'success');
        }
      } catch (err) {
        console.error('Error uploading payment file:', err);
        triggerAlert('Failed', 'Failed to upload payment proof.', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  // State Company Settings dari backend
  const [companySettings, setCompanySettings] = useState({
    companyName: 'PT.ODST AIRLINES IND',
    phone: '',
    taxNumber: '',
    bankName: '',
    accountName: '',
    idrAccountNumber: '',
    usdAccountNumber: ''
  });

  // State Exchange Rates dari backend
  const [configuredRates, setConfiguredRates] = useState({
    usdToIdr: 18025,
    sarToIdr: 5999,
    usdToSar: 3.75
  });

  // State Tax Rate dari backend
  const [taxRate, setTaxRate] = useState<number>(0);

  // Fetch company settings & exchange rates dari backend
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await getCompanySetting();
        if (data) {
          setCompanySettings({
            companyName: data.companyName || 'PT.ODST AIRLINES IND',
            phone: data.phone || '',
            taxNumber: data.taxNumber || '',
            bankName: data.bankName || '',
            accountName: data.accountName || '',
            idrAccountNumber: data.idrAccountNumber || '',
            usdAccountNumber: data.usdAccountNumber || ''
          });
        }
      } catch (error) {
        console.error('Error fetching company settings:', error);
      }

      try {
        const rates = await getExchangeRates();
        if (rates) {
          const parseRate = (val: any, fallback: number) => {
            if (val === undefined || val === null || val === '') return fallback;
            const num = Number(val);
            return isNaN(num) ? fallback : num;
          };
          setConfiguredRates({
            usdToIdr: parseRate(rates.usdToIdr, 18025),
            sarToIdr: parseRate(rates.sarToIdr, 5999),
            usdToSar: parseRate(rates.usdToSar, 3.75)
          });
        }
      } catch (error) {
        console.error('Error fetching exchange rates:', error);
      }

      try {
        const taxSetting = await getTaxSetting();
        if (taxSetting) {
          setTaxRate(parseFloat(taxSetting.taxPercentage) || 0);
        }
      } catch (error) {
        console.error('Error fetching tax settings:', error);
      }

      try {
        const compList = await getCompanies();
        if (compList) {
          localStorage.setItem('finance_companies', JSON.stringify(compList));
        }
      } catch (error) {
        console.error('Error fetching companies in HotelReservations:', error);
      }

      try {
        const bookingsData = await getHotelReservations();
        if (bookingsData) {
          setBookings(bookingsData);
        }
      } catch (error) {
        console.error('Error fetching hotel bookings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  // Helper untuk membuka form reservasi baru
  const openNewReservationForm = (type: 'Tentative' | 'Confirmation') => {
    setFormType(type);
    setIsFormOpen(true);
    setIsDropdownOpen(false);
  };

  // Format tanggal ke format visual untuk list table
  const formatDateVisual = (dateStr: string) => {
    if (!dateStr) return '';
    return formatLocalizedDate(dateStr, i18n.language);
  };

  // Handler aksi Approve oleh Mr. Karim Gharba
  const handleApproveKarim = async (id: string, confirmationNoVal?: string) => {
    const now = new Date();
    const approvedTime = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) + 
                         ' at ' + 
                         now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const targetBooking = bookings.find(b => b.id === id);
    let compCode = 'RCN';
    if (targetBooking?.reservationNo) {
      const parts = targetBooking.reservationNo.split('-');
      if (parts.length > 0 && parts[0]) compCode = (parts[0] === 'OTH' ? 'RCN' : parts[0]);
    }
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const mmdd = `${mm}${dd}`;
    const randSuffix = String(Math.floor(100 + Math.random() * 900));
    const generatedConfNo = `CNF-${compCode}-${mmdd}-${randSuffix}`;

    try {
      const updated = await approveHotelReservation(id, {
        confirmationNo: confirmationNoVal || generatedConfNo,
        approvedAtKarim: approvedTime
      });

      if (updated) {
        setBookings(prev => prev.map(b => b.id === id ? updated : b));
        setLastApprovedBooking(updated);
        setLastConfirmationNo(updated.confirmationNo || '');
        setIsApprovedSuccessOpen(true);

        // Update status detail saat ini
        if (selectedBooking && selectedBooking.id === id) {
          setSelectedBooking(updated);
        }
      }
    } catch (err) {
      console.error('Error approving hotel reservation:', err);
      triggerAlert('Failed', 'Failed to approve reservation.', 'error');
    }
  };

  // Handler hapus pemesanan
  const handleDeleteBooking = async (id: string) => {
    if (confirm('Are you sure you want to delete this reservation permanently?')) {
      try {
        await deleteHotelReservation(id);
        setBookings(prev => prev.filter(b => b.id !== id));
        setIsDetailOpen(false);
        setSelectedBooking(null);
        triggerAlert('Success', 'Reservation deleted successfully.', 'success');
      } catch (err) {
        console.error('Error deleting hotel reservation:', err);
        triggerAlert('Failed', 'Failed to delete reservation.', 'error');
      }
    }
  };

  // Statistik sesuai dengan database
  const stats = useMemo(() => {
    const reservationBookings = bookings.filter(b => !(b.type === 'Confirmation' && !b.approvedByKarim && b.status === 'Pending'));
    const totalReservations = reservationBookings.length;
    const confirmedCount = reservationBookings.filter(b => b.status === 'Confirmed' || b.status === 'Paid and closed' || b.isPaid).length;
    const tentativeCount = reservationBookings.filter(b => b.status === 'Tentative' && !isBookingOverdue(b)).length;
    const overdueCount = reservationBookings.filter(b => isBookingOverdue(b)).length;
    const cancelledCount = reservationBookings.filter(b => b.status === 'Cancelled' && !isBookingOverdue(b)).length;

    return {
      totalReservations,
      confirmed: confirmedCount,
      tentative: tentativeCount,
      overdue: overdueCount,
      cancelled: cancelledCount
    };
  }, [bookings]);

  // Statistik untuk tab Requests
  const requestsCount = useMemo(() => {
    const confirmationBookings = bookings.filter(b => b.type === 'Confirmation');
    const pendingCount = confirmationBookings.filter(b => !b.approvedByKarim && b.status !== 'Cancelled').length;
    const confirmedCount = confirmationBookings.filter(b => b.approvedByKarim === true).length;
    const rejectedCount = confirmationBookings.filter(b => b.status === 'Cancelled').length;
    
    return {
      all: pendingCount + confirmedCount + rejectedCount,
      pending: pendingCount,
      confirmed: confirmedCount,
      rejected: rejectedCount
    };
  }, [bookings]);

  // Penyaringan data berdasarkan tab aktif
  const tabFilteredBookings = useMemo(() => {
    if (activeTab === 'Reservations') {
      // Tab Reservations: Tampilkan Confirmed, Tentative, Paid, Paid and closed, Overdue, Cancelled
      // Sembunyikan request yang masih Pending yang belum di-approve
      return bookings.filter(b => {
        if (b.type === 'Confirmation' && !b.approvedByKarim && b.status === 'Pending') {
          return false;
        }
        return true;
      });
    }
    // Tab Requests -> Filter berdasarkan requestStatusFilter (Tampilkan SEMUA request tanpa terkecuali)
    return bookings.filter(b => {
      if (b.type !== 'Confirmation') return false;
      
      if (requestStatusFilter === 'Pending') {
        return !b.approvedByKarim && b.status !== 'Cancelled' && b.status !== 'Paid and closed';
      }
      if (requestStatusFilter === 'Confirmed') {
        return b.approvedByKarim === true || b.status === 'Confirmed' || b.status === 'Paid and closed';
      }
      if (requestStatusFilter === 'Rejected') {
        return b.status === 'Cancelled';
      }
      return true; // 'All'
    });
  }, [bookings, activeTab, requestStatusFilter]);

  // Filter pencarian & status dropdown
  const finalFilteredBookings = useMemo(() => {
    return tabFilteredBookings.filter(b => {
      const matchesSearch = b.reservationNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            b.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            b.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (b.rooms[0]?.hotelName || '').toLowerCase().includes(searchQuery.toLowerCase());

      let matchesStatus = true;
      if (activeTab === 'Reservations') {
        if (statusFilter === 'Overdue') {
          matchesStatus = isBookingOverdue(b);
        } else if (statusFilter === 'Cancelled') {
          matchesStatus = b.status === 'Cancelled' && !isBookingOverdue(b);
        } else if (statusFilter === 'Tentative') {
          matchesStatus = b.status === 'Tentative' && !isBookingOverdue(b);
        } else if (statusFilter === 'Paid and closed' || statusFilter === 'Paid') {
          matchesStatus = b.status === 'Paid and closed' || b.isPaid === true;
        } else if (statusFilter !== 'All') {
          matchesStatus = b.status === statusFilter;
        }
      }

      return matchesSearch && matchesStatus;
    });
  }, [tabFilteredBookings, searchQuery, statusFilter, activeTab]);

  // Reset halaman saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, requestStatusFilter, activeTab]);

  const totalPages = Math.max(1, Math.ceil(finalFilteredBookings.length / itemsPerPage));

  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return finalFilteredBookings.slice(startIndex, startIndex + itemsPerPage);
  }, [finalFilteredBookings, currentPage, itemsPerPage]);

  // Ekspor CSV
  const handleExportCSV = () => {
    if (finalFilteredBookings.length === 0) {
      triggerAlert('Notice', 'No reservations available to export.', 'info');
      return;
    }

    const headers = [
      'Reservation #',
      'Reference #',
      'Hotel Name',
      'Guest Name',
      'Company / Agency',
      'Check-In',
      'Check-Out',
      'Room Type',
      'Due Date',
      'Status',
      'Currency',
      'Total Price'
    ];

    const escapeCell = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const rows = finalFilteredBookings.map(b => {
      const mainRoom = b.rooms[0] || { hotelName: '-', checkIn: '-', checkOut: '-', roomType: '-' };
      const isOverdue = isBookingOverdue(b);
      const statusLabel = isOverdue ? 'OVERDUE' : b.status;
      const totalCost = calculateBookingTotal(b);

      return [
        escapeCell(b.reservationNo),
        escapeCell(b.referenceNo),
        escapeCell(mainRoom.hotelName),
        escapeCell(b.guestName),
        escapeCell(b.companyName),
        escapeCell(mainRoom.checkIn),
        escapeCell(mainRoom.checkOut),
        escapeCell(mainRoom.roomType),
        escapeCell(b.dueDate || '-'),
        escapeCell(statusLabel),
        escapeCell(b.currency),
        escapeCell(totalCost)
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `hotel_reservations_${activeTab.toLowerCase()}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    triggerAlert('Success', `Successfully exported ${finalFilteredBookings.length} reservations as CSV.`, 'success');
  };

  return (
    <div className="flex min-h-screen w-full bg-[#f8fafc] select-none font-sans antialiased text-[#0f172a]">
      {/* Sidebar Layout */}
      <Sidebar />

      {/* Main Content Dashboard */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />

        {/* Content Body */}
        <div className="flex-1 p-8 space-y-6 max-w-[1400px] w-full mx-auto print:p-0 print:max-w-none">
          {selectedBooking && activeTab === 'Requests' ? (
            /* DETAILED VIEW INTERFACE */
            <div className="space-y-6 animate-fade-in print:space-y-4">
              {/* Breadcrumbs and Back link */}
              <div className="flex justify-between items-center print:hidden">
                <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-400 font-sans tracking-wide uppercase">
                  <span>{t('hotelReservations.hotelReservationRequests')}</span>
                  <span>/</span>
                  <span className="text-slate-800">
                    {t('hotelReservations.request')} REQ-2026-{104 - bookings.findIndex(b => b.id === selectedBooking.id)}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="flex items-center space-x-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors border-none bg-transparent cursor-pointer font-sans"
                >
                  <span>&larr;</span>
                  <span>{t('hotelReservations.backToListing')}</span>
                </button>
              </div>

              {/* Title Header */}
              <div className="flex flex-col space-y-1 print:hidden">
                <div className="flex items-center space-x-3">
                  <h1 className="text-[26px] font-extrabold text-[#0c0d0f] tracking-tight">
                    {selectedBooking.status === 'Confirmed' ? t('hotelReservations.confirmedReservationDetails') : t('hotelReservations.reservationDetails')}
                  </h1>
                  {(() => {
                    const isOverdue = isBookingOverdue(selectedBooking);
                    if (isOverdue) {
                      return (
                        <span className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa]">
                          {t('common.statusOverdue').toUpperCase()}
                        </span>
                      );
                    }
                    return (
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide ${
                          selectedBooking.status === 'Confirmed'
                            ? 'bg-[#dcfce7] text-[#15803d]'
                            : selectedBooking.status === 'Paid and closed'
                            ? 'bg-[#dbeafe] text-[#1e40af]'
                            : selectedBooking.status === 'Tentative'
                            ? 'bg-[#fef3c7] text-[#d97706]'
                            : 'bg-rose-50 text-rose-700'
                        }`}>
                          {(selectedBooking.status === 'Paid and closed' || selectedBooking.isPaid)
                            ? t('common.statusPaid').toUpperCase()
                            : selectedBooking.status === 'Confirmed'
                            ? t('common.statusConfirmed').toUpperCase()
                            : selectedBooking.status === 'Tentative'
                            ? t('common.statusTentative').toUpperCase()
                            : selectedBooking.status === 'Cancelled'
                            ? t('common.statusCancelled').toUpperCase()
                            : String(selectedBooking.status).toUpperCase()}
                        </span>
                        {selectedBooking.confirmationNo && (
                          <span className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                            {selectedBooking.confirmationNo}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Main Grid: Left Column (lg:col-span-2) and Right Column (lg:col-span-1) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6 print:w-full">
                  
                  {/* Reservation Details Card */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">{t('hotelReservations.reservationDetails')}</h3>
                        <p className="text-[11px] text-slate-400 font-sans">{t('hotelReservations.reservationNumber')}: {selectedBooking.reservationNo}</p>
                      </div>
                    </div>

                    {/* Metadata Readonly Inputs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-sans">{t('hotelReservations.invoiceNumber')}</label>
                        <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-lg text-xs font-bold text-slate-800 font-sans">
                          {selectedBooking.reservationNo}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-sans">{t('hotelReservations.referenceNumber')}</label>
                        <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-lg text-xs font-bold text-slate-800 font-sans">
                          {selectedBooking.referenceNo}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-sans">{t('hotelReservations.serialNumber')}</label>
                        <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-lg text-xs font-bold text-slate-800 font-sans">
                          {selectedBooking.serialNo}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-sans">{t('hotelReservations.dueDate')}</label>
                        <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-lg text-xs font-bold text-slate-800 font-sans">
                          {formatDateVisual(selectedBooking.dueDate)}
                        </div>
                      </div>
                    </div>

                    {/* BILL FROM / BILL TO ROW */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                      <div>
                        <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">{t('hotelReservations.billFrom')}</h4>
                        <div className="space-y-1 text-xs font-sans text-slate-600">
                          <p className="font-bold text-slate-800 text-[13px]">{selectedBooking.employeeName || 'Dimas Alva Rizki'}</p>
                          <p>{t('hotelReservations.employeeId')}: {selectedBooking.employeeId || 'UMP-111'}</p>
                          <p>{t('invoices.phone')}: {selectedBooking.employeePhone || '+62 8111 1203 330'}</p>
                          <p>{selectedBooking.employeeEmail || 'alvarizkidimas@gmail.com'}</p>
                          <p>{selectedBooking.employeeEntity || 'PT.ODST AIRLINES IND'}</p>
                          <p className="text-[11px] text-slate-400">{t('hotelReservations.companyTaxNumber')}: {selectedBooking.companyTaxNo || '0000-0000-0001'}</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">{t('hotelReservations.billTo')}</h4>
                        <div className="space-y-1 text-xs font-sans text-slate-600">
                          <p className="font-bold text-slate-800 text-[13px]">{selectedBooking.companyName}</p>
                          <p className="leading-relaxed">{selectedBooking.clientAddress}</p>
                          <p className="font-bold text-slate-800">{selectedBooking.clientCityCountry}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Accommodations Breakdown Card */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4 select-none">
                    <h4 className="text-base font-extrabold text-[#0f172a] font-sans">{t('hotelReservations.accommodationsBreakdown')}</h4>
                    
                    <div className="border border-slate-200/70 rounded-2xl overflow-hidden bg-white w-full shadow-sm">
                      <table className="w-full text-left font-sans border-collapse">
                        <thead>
                          <tr className="bg-[#1d2857] text-white" style={{ backgroundColor: '#1d2857', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                            <th colSpan={12} className="py-2.5 px-3 text-center font-bold text-[12px] tracking-wider select-none bg-[#1d2857] text-white" style={{ backgroundColor: '#1d2857', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                              {t('hotelReservations.hotelDetails')}
                            </th>
                          </tr>
                          <tr className="bg-[#e0e8fe] text-[#1d2857] border-b border-slate-200 font-bold uppercase tracking-wider text-[8.5px] select-none" style={{ backgroundColor: '#e0e8fe', color: '#1d2857', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                            <th className="py-2 px-2 text-left">{t('hotelReservations.hotel')}</th>
                            <th className="py-2 px-1.5 text-left">{t('hotelReservations.roomType')}</th>
                            <th className="py-2 px-1 text-center whitespace-nowrap">{t('hotelReservations.checkIn')}</th>
                            <th className="py-2 px-1 text-center whitespace-nowrap">{t('hotelReservations.checkOut')}</th>
                            <th className="py-2 px-0.5 text-center whitespace-nowrap">{t('hotelReservations.numNight')}</th>
                            <th className="py-2 px-0.5 text-center whitespace-nowrap">{t('hotelReservations.numRoom')}</th>
                            <th className="py-2 px-0.5 text-center whitespace-nowrap">{t('hotelReservations.adult')}</th>
                            <th className="py-2 px-0.5 text-center whitespace-nowrap">{t('hotelReservations.child')}</th>
                            <th className="py-2 px-1 text-center whitespace-nowrap">{t('hotelReservations.meals')}</th>
                            <th className="py-2 px-1.5 text-right font-sans leading-tight">{t('hotelReservations.dayRate')}</th>
                            <th className="py-2 px-1.5 text-right font-sans leading-tight">{t('hotelReservations.mealsRate')}</th>
                            <th className="py-2 px-2 text-right font-sans whitespace-nowrap">{t('hotelReservations.total')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[#334155] font-semibold text-[10px]">
                          {selectedBooking.rooms.map((room, idx) => {
                            const nights = room.nights || calculateNights(room.checkIn, room.checkOut);
                            const roomTotal = (room.pricePerNight + room.mealRate) * room.roomCount * nights;
                            return (
                              <tr key={idx} className="hover:bg-slate-50/40">
                                <td className="py-2.5 px-2 text-left font-bold text-slate-900 uppercase text-[11px] leading-tight break-words">{room.hotelName}</td>
                                <td className="py-2.5 px-1.5 text-left font-semibold text-slate-800 uppercase text-[10px] leading-tight break-words">{room.roomType}</td>
                                <td className="py-2.5 px-1 text-center font-sans text-slate-700 text-[9.5px] whitespace-nowrap">{formatDateDMY(room.checkIn)}</td>
                                <td className="py-2.5 px-1 text-center font-sans text-slate-700 text-[9.5px] whitespace-nowrap">{formatDateDMY(room.checkOut)}</td>
                                <td className="py-2.5 px-0.5 text-center font-bold text-slate-900 whitespace-nowrap">{nights}</td>
                                <td className="py-2.5 px-0.5 text-center font-bold text-slate-900 whitespace-nowrap">{room.roomCount}</td>
                                <td className="py-2.5 px-0.5 text-center font-bold text-slate-900 whitespace-nowrap">{room.adults}</td>
                                <td className="py-2.5 px-0.5 text-center font-bold text-slate-900 whitespace-nowrap">{room.children}</td>
                                <td className="py-2.5 px-1 text-center font-bold text-slate-900 uppercase whitespace-nowrap">{formatMealPlan(room.mealPlan)}</td>
                                <td className="py-2.5 px-1.5 text-right font-sans font-medium text-slate-800 whitespace-nowrap text-[9.5px]">{formatCurrency(room.pricePerNight, selectedBooking.currency)}</td>
                                <td className="py-2.5 px-1.5 text-right font-sans font-medium text-slate-800 whitespace-nowrap text-[9.5px]">{formatCurrency(room.mealRate, selectedBooking.currency)}</td>
                                <td className="py-2.5 px-2 text-right font-sans font-bold text-slate-900 whitespace-nowrap text-[10.5px]">{formatCurrency(roomTotal, selectedBooking.currency)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Subtotal & Total aligned right */}
                    <div className="mt-4 flex flex-col items-end space-y-1.5 font-sans select-none px-2">
                      <div className="flex items-center justify-end space-x-8 text-[13px] text-slate-400 font-medium">
                        <span>{t('hotelReservations.subtotal')}:</span>
                        <span className="font-extrabold text-slate-900 text-sm">{formatCurrency(calculateBookingTotal(selectedBooking), selectedBooking.currency)}</span>
                      </div>
                      <div className="flex items-center justify-end space-x-8 text-[13px] text-slate-400 font-medium">
                        <span>{t('hotelReservations.taxVat')} ({selectedBooking.taxRate || 0}%):</span>
                        <span className="font-bold text-slate-700 text-sm">{formatCurrency(0, selectedBooking.currency)}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-100 w-64 flex justify-between items-center text-slate-800 font-extrabold text-base">
                        <span className="text-slate-800">{t('hotelReservations.totalDue')}:</span>
                        <span className="text-[#10b981] font-black text-lg tracking-tight">{formatCurrency(calculateBookingTotal(selectedBooking), selectedBooking.currency)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Exchange rate & Payment instructions */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6 print:break-inside-avoid">
                    
                    {/* Exchange Rate Block */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{t('hotelReservations.exchangeRate')}</h4>
                      <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2 text-xs font-sans text-slate-600">
                        <div className="flex justify-between items-center py-0.5">
                          <span>1 USD = {(selectedBooking.usdToIdrRate || configuredRates.usdToIdr).toLocaleString('id-ID')} IDR</span>
                          <span className="font-semibold text-slate-400">USD / IDR</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span>1 SAR = {(selectedBooking.sarToIdrRate || configuredRates.sarToIdr).toLocaleString('id-ID')} IDR</span>
                          <span className="font-semibold text-slate-400">SAR / IDR</span>
                        </div>
                        <div className="border-t border-slate-200/60 my-2"></div>
                        <div className="flex justify-between items-center py-0.5">
                          <span className="font-medium text-slate-500">{t('hotelReservations.totalDueIdr')}</span>
                          <span className="font-extrabold text-[#2563eb] text-[13px]">
                            Rp {(calculateBookingTotal(selectedBooking) * (1 + taxRate / 100) * (selectedBooking.usdToIdrRate || configuredRates.usdToIdr)).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span className="font-medium text-slate-500">{t('hotelReservations.totalDueSar')}</span>
                          <span className="font-extrabold text-[#2563eb] text-[13px]">
                            SAR {((calculateBookingTotal(selectedBooking) * (1 + taxRate / 100) * (selectedBooking.usdToIdrRate || configuredRates.usdToIdr)) / (selectedBooking.sarToIdrRate || configuredRates.sarToIdr)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Instructions Block */}
                    <div className="space-y-2.5">
                      <h3 className="text-sm font-bold text-slate-800">{t('hotelReservations.paymentInstructions')}</h3>
                      <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/30 space-y-3 text-xs font-sans">
                        <div className="flex items-center">
                          <span className="w-28 text-slate-500 font-bold">{t('hotelReservations.bankName')}:</span>
                          <span className="text-slate-800 font-bold">
                            {companySettings.bankName.includes('Bank') ? companySettings.bankName : `${companySettings.bankName} Bank`}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-28 text-slate-500 font-bold">{t('hotelReservations.accountName')}:</span>
                          <span className="text-slate-800 font-bold">{companySettings.accountName}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-28 text-slate-500 font-bold">{t('hotelReservations.usdAccount')}:</span>
                          <span className="text-slate-800 font-bold">{companySettings.usdAccountNumber}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-28 text-slate-500 font-bold">{t('hotelReservations.idrAccount')}:</span>
                          <span className="text-slate-800 font-bold">{companySettings.idrAccountNumber}</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Print and Download Actions */}
                  <div className="flex items-center space-x-3 print:hidden">
                    <button
                      onClick={() => window.print()}
                      className="flex items-center space-x-2 px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs transition-all bg-white cursor-pointer border-solid"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                      <span>{t('hotelReservations.printInvoice')}</span>
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="flex items-center space-x-2 px-4 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-lg text-xs transition-all cursor-pointer border-none shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      <span>{t('hotelReservations.downloadPdf')}</span>
                    </button>
                  </div>

                </div>

                {/* Right Column */}
                <div className="space-y-6 print:hidden">
                  
                  {/* Approval Workflow Status */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">{t('hotelReservations.approvalWorkflowStatus')}</h3>
                    
                    <div className="flex items-start space-x-3 pt-2">
                      {selectedBooking.approvedByKarim ? (
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-full">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
                          </svg>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-amber-50 text-amber-600 rounded-full animate-pulse">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                          </svg>
                        </div>
                      )}
                      
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-800">Mr. Karim Gharba</p>
                        <p className="text-[10px] text-slate-500 font-sans">{t('hotelReservations.madinahAccountant')}</p>
                        {selectedBooking.approvedByKarim ? (
                          <div className="pt-0.5">
                            <span className="inline-block px-2.5 py-0.5 bg-[#dcfce7] text-[#15803d] text-[10px] font-bold rounded">
                              {t('hotelReservations.confirmedAt')}: {selectedBooking.approvedAtKarim || 'Oct 12, 2026 at 09:15 AM'}
                            </span>
                          </div>
                        ) : (
                          <p className={`text-[10.5px] font-bold ${selectedBooking.approvedByKarim ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {user?.role === 'Level_3_Approver' || user?.role === 'Madinah Branch Accountant' || user?.name?.toLowerCase().includes('karim')
                              ? t('hotelReservations.awaitingReviewYourLevel') 
                              : t('hotelReservations.awaitingReview')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-1 text-xs">
                      <p className={`font-bold ${selectedBooking.approvedByKarim ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {selectedBooking.approvedByKarim ? t('hotelReservations.approvalsComplete') : t('hotelReservations.approvalsPending')}
                      </p>
                      <p className="text-[10px] text-slate-400 font-sans">
                        {t('hotelReservations.readyForPayment')}
                      </p>
                    </div>
                  </div>

                  {/* Confirmed Operations / Upload block if approved */}
                  {selectedBooking.approvedByKarim && (
                    <>
                      {/* Available Operations */}
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">{t('hotelReservations.availableOperations')}</h3>
                        <div className="space-y-2.5 pt-1">
                          {selectedBooking.status === 'Paid and closed' ? (
                            <div className="w-full py-2 px-3 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold text-center border border-solid border-emerald-100">
                              {t('hotelReservations.paymentSettled')}
                            </div>
                          ) : (
                            <button
                              onClick={async () => {
                                if (!selectedBooking.paymentInvoiceFile) {
                                  setUploadErrorHighlight(true);
                                  triggerAlert(
                                    'Payment Proof Required',
                                    'Please upload the payment invoice / proof of payment document first before marking as Paid.',
                                    'error'
                                  );
                                  uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                                  return;
                                }
                                setUploadErrorHighlight(false);
                                try {
                                  const updated = await updateHotelReservationStatus(selectedBooking.id, {
                                    status: 'Paid and closed',
                                    isPaid: true
                                  });
                                  if (updated) {
                                    setBookings(prev => prev.map(b => b.id === selectedBooking.id ? updated : b));
                                    setSelectedBooking(updated);
                                    triggerAlert('Success', 'Payment status updated to Paid and closed successfully!', 'success');
                                  }
                                } catch (err) {
                                  console.error('Error marking as paid:', err);
                                  triggerAlert('Failed', 'Failed to update payment status.', 'error');
                                }
                              }}
                              className="w-full py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold rounded-lg text-xs transition-all cursor-pointer border-none shadow-sm text-center"
                            >
                              {t('hotelReservations.markAsPaid')}
                            </button>
                          )}
                          <button
                            onClick={handleOpenSendConfirmation}
                            className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs transition-all cursor-pointer bg-white text-center flex items-center justify-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            <span>{t('hotelReservations.sendConfirmation')}</span>
                          </button>
                        </div>
                      </div>

                      {/* Upload Payment Invoice */}
                      <div
                        ref={uploadSectionRef}
                        className={`bg-white rounded-xl border shadow-sm p-6 space-y-4 transition-all ${
                          uploadErrorHighlight && !selectedBooking.paymentInvoiceFile
                            ? 'border-2 border-rose-500 bg-rose-50/30 ring-4 ring-rose-100 animate-pulse'
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">{t('hotelReservations.uploadPaymentInvoice')}</h3>
                          {uploadErrorHighlight && !selectedBooking.paymentInvoiceFile && (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded">
                              {t('hotelReservations.paymentProofRequired')}
                            </span>
                          )}
                        </div>
                        {selectedBooking.paymentInvoiceFile ? (
                          <div className="space-y-3">
                            <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-[#d1fae5] flex items-center justify-between">
                              <div className="text-left">
                                <div className="text-xs font-bold">{t('hotelReservations.paymentProofUploaded')}</div>
                                <div className="text-[10px] text-emerald-600 font-sans">{t('hotelReservations.readyToReview')}</div>
                              </div>
                              <button
                                onClick={() => setViewingProof(selectedBooking.paymentInvoiceFile || null)}
                                className="px-3 py-1 bg-white hover:bg-emerald-100 border border-[#a7f3d0] text-emerald-700 font-bold rounded-lg text-[11px] transition-all cursor-pointer"
                              >
                                {t('hotelReservations.viewProof')}
                              </button>
                            </div>
                            
                            {/* Re-upload Option */}
                            <label className="block w-full py-2 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold rounded-lg text-xs text-center transition-all cursor-pointer">
                              {t('hotelReservations.changePaymentProof')}
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={handleUploadPaymentFile}
                                className="hidden"
                              />
                            </label>
                          </div>
                        ) : (
                          <label className="block border border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-50 rounded-xl p-5 flex flex-col items-center justify-center space-y-2 text-center cursor-pointer transition-all">
                            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-full">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                            </div>
                            <div className="text-xs font-bold text-slate-700">{t('hotelReservations.dragDropUpload')}</div>
                            <div className="text-[10px] text-slate-400 font-sans">{t('hotelReservations.uploadSupports')}</div>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={handleUploadPaymentFile}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </>
                  )}

                  {/* Notes Card */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">{t('hotelReservations.notes')}</h3>
                    <textarea
                      placeholder={t('hotelReservations.notesPlaceholder')}
                      className="w-full p-3 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans text-slate-800 h-24 resize-none"
                    />
                    <button className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-lg text-xs transition-all cursor-pointer border-none shadow-sm">
                      {t('hotelReservations.saveNote')}
                    </button>
                  </div>

                  {/* Your Decision Card */}
                  {!selectedBooking.approvedByKarim && selectedBooking.status !== 'Cancelled' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                      <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">{t('hotelReservations.yourDecision')}</h3>
                      <p className="text-xs font-sans text-slate-600 leading-relaxed">
                        {t('hotelReservations.decisionDesc')}
                      </p>
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                          onClick={() => {
                            if (user?.role !== 'Level_3_Approver' && user?.role !== 'Madinah Branch Accountant' && !user?.name?.toLowerCase().includes('karim')) {
                              triggerAlert('Access Denied', 'Only Mr. Karim Gharba (Madinah Accountant) can reject this request.', 'error');
                              return;
                            }
                            if (confirm('Are you sure you want to reject this request?')) {
                              updateHotelReservationStatus(selectedBooking.id, { status: 'Cancelled' })
                                .then((updated) => {
                                  if (updated) {
                                    setBookings(prev => prev.map(b => b.id === selectedBooking.id ? updated : b));
                                    setSelectedBooking(null);
                                    triggerAlert('Rejected', 'Hotel reservation request has been rejected.', 'error');
                                  }
                                })
                                .catch((err) => {
                                  console.error('Error rejecting hotel request:', err);
                                  triggerAlert('Failed', 'Failed to reject request.', 'error');
                                });
                            }
                          }}
                          className="py-2.5 border border-red-200 hover:border-red-300 text-red-600 font-bold rounded-lg text-xs transition-all bg-white cursor-pointer border-solid text-center"
                        >
                          {t('hotelReservations.rejectRequest')}
                        </button>
                        <button
                          onClick={() => {
                            if (user?.role !== 'Level_3_Approver' && user?.role !== 'Madinah Branch Accountant' && !user?.name?.toLowerCase().includes('karim')) {
                              triggerAlert('Access Denied', 'Only Mr. Karim Gharba (Madinah Accountant) can approve this request.', 'error');
                              return;
                            }
                            setConfirmationNoInput('');
                            setIsConfirmApprovalOpen(true);
                          }}
                          className="py-2.5 bg-[#10b981] hover:bg-[#059669] text-white font-bold rounded-lg text-xs transition-all cursor-pointer border-none text-center shadow-sm"
                        >
                          {t('hotelReservations.approve')}
                        </button>
                      </div>
                    </div>
                  )}

                </div>

              </div>

            </div>
          ) : (
            /* ORIGINAL TABLE LISTING VIEW */
            <div className="space-y-6">
          
          {/* Header Title & Actions */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
            <div className="flex flex-col space-y-1">
              <h1 className="text-[28px] font-extrabold text-[#0c0d0f] tracking-tight">
                {activeTab === 'Reservations' ? t('hotelReservations.title') : t('hotelReservations.tabRequests')}
              </h1>
              <p className="text-[13px] text-[#64748b] font-medium font-sans">
                {t('hotelReservations.subtitle')}
              </p>
            </div>

            {/* Actions Button */}
            {user?.role !== 'Viewer' && (
              activeTab === 'Reservations' ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(prev => !prev)}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg text-[13px] font-bold transition-all shadow-sm cursor-pointer border-none"
                  >
                    <Plus className="w-4 h-4 font-bold" />
                    <span>{t('hotelReservations.newReservation')}</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-40 animate-fade-in text-[13px]">
                      <button
                        onClick={() => openNewReservationForm('Tentative')}
                        className="w-full text-left px-4 py-2.5 text-[#0f172a] hover:bg-slate-50 transition-colors font-medium border-none bg-transparent cursor-pointer"
                      >
                        {t('common.statusTentative')}
                      </button>
                      <button
                        onClick={() => openNewReservationForm('Confirmation')}
                        className="w-full text-left px-4 py-2.5 text-[#0f172a] hover:bg-slate-50 transition-colors font-medium border-t border-slate-100 border-x-none border-b-none bg-transparent cursor-pointer"
                      >
                        {t('common.statusConfirmed')}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => openNewReservationForm('Confirmation')}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg text-[13px] font-bold transition-all shadow-sm cursor-pointer border-none"
                >
                  <Plus className="w-4 h-4 font-bold" />
                  <span>{t('hotelReservations.newReservation')}</span>
                </button>
              )
            )}
          </div>

          {/* Tab Menu */}
          <div className="flex border-b border-slate-200 gap-x-8 print:hidden text-[14px] bg-transparent">
            <button
              onClick={() => {
                setActiveTab('Reservations');
                setStatusFilter('All');
              }}
              className={`pb-3 border-none bg-transparent font-bold transition-all relative cursor-pointer ${
                activeTab === 'Reservations' ? 'text-[#2563eb]' : 'text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              <span>{t('hotelReservations.tabReservations')}</span>
              {activeTab === 'Reservations' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563eb] rounded-full" />
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('Requests');
                setStatusFilter('All');
              }}
              className={`pb-3 border-none bg-transparent font-bold transition-all relative cursor-pointer ${
                activeTab === 'Requests' ? 'text-[#2563eb]' : 'text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              <span>{t('hotelReservations.tabRequests')}</span>
              {activeTab === 'Requests' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563eb] rounded-full" />
              )}
            </button>
          </div>

          {/* Skeleton Loading Effect or Actual Content */}
          {loading ? (
            <div className="space-y-6 animate-pulse select-none">
              {/* Top Stat Cards Skeleton */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-[115px] space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                      <div className="h-3 bg-slate-200 rounded-full w-8"></div>
                    </div>
                    <div className="space-y-1">
                      <div className="h-7 bg-slate-200 rounded w-3/4"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Table Card Skeleton */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                  <div className="h-5 bg-slate-200 rounded w-48"></div>
                  <div className="flex space-x-3">
                    <div className="h-9 bg-slate-200 rounded w-64"></div>
                    <div className="h-9 bg-slate-200 rounded w-28"></div>
                    <div className="h-9 bg-slate-200 rounded w-28"></div>
                  </div>
                </div>
                <div className="space-y-3">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="h-12 bg-slate-100/80 rounded-lg w-full flex items-center justify-between px-5">
                      <div className="h-4 bg-slate-200 rounded w-24"></div>
                      <div className="h-4 bg-slate-200 rounded w-36"></div>
                      <div className="h-4 bg-slate-200 rounded w-28"></div>
                      <div className="h-4 bg-slate-200 rounded w-20"></div>
                      <div className="h-4 bg-slate-200 rounded w-20"></div>
                      <div className="h-4 bg-slate-200 rounded w-16"></div>
                      <div className="h-4 bg-slate-200 rounded w-24"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Metrics summary OR Inline Requests Filters */}
              {activeTab === 'Reservations' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 print:hidden">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-[115px]">
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">{t('hotelReservations.title')}</span>
                  <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{t('common.all')}</span>
                </div>
                <div className="mt-1">
                  <h3 className="text-2xl font-extrabold text-[#0f172a]">{stats.totalReservations.toLocaleString()}</h3>
                  <p className="text-[11px] text-[#64748b] font-medium mt-0.5">{t('hotelReservations.totalBooked')}</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-[115px]">
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">{t('common.statusConfirmed')}</span>
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{t('common.active')}</span>
                </div>
                <div className="mt-1">
                  <h3 className="text-2xl font-extrabold text-[#0f172a]">{stats.confirmed.toLocaleString()}</h3>
                  <p className="text-[11px] text-[#64748b] font-medium mt-0.5">{t('common.finalized')}</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-[115px]">
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">{t('common.statusTentative')}</span>
                  <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{t('common.statusPending')}</span>
                </div>
                <div className="mt-1">
                  <h3 className="text-2xl font-extrabold text-[#0f172a]">{stats.tentative.toLocaleString()}</h3>
                  <p className="text-[11px] text-[#64748b] font-medium mt-0.5">{t('common.inProgress')}</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-[115px]">
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-bold text-[#c2410c] uppercase tracking-wider">{t('common.statusOverdue')}</span>
                  <span className="bg-orange-50 text-[#c2410c] text-[10px] font-bold px-2 py-0.5 rounded-full">{t('common.pastDue')}</span>
                </div>
                <div className="mt-1">
                  <h3 className="text-2xl font-extrabold text-[#c2410c]">{stats.overdue.toLocaleString()}</h3>
                  <p className="text-[11px] text-[#64748b] font-medium mt-0.5">{t('hotelReservations.expiredPayment')}</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-[115px]">
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">{t('common.statusCancelled')}</span>
                  <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{t('common.voided')}</span>
                </div>
                <div className="mt-1">
                  <h3 className="text-2xl font-extrabold text-[#0f172a]">{stats.cancelled.toLocaleString()}</h3>
                  <p className="text-[11px] text-[#64748b] font-medium mt-0.5">{t('hotelReservations.manuallyCancelled')}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-x-6 text-[13px] font-bold tracking-wide border-b border-slate-200 pb-2 print:hidden select-none">
              <button
                onClick={() => setRequestStatusFilter('All')}
                className={`pb-2 transition-all relative border-none bg-transparent cursor-pointer font-bold ${
                  requestStatusFilter === 'All' ? 'text-[#2563eb] border-b-2 border-solid border-[#2563eb]' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t('hotelReservations.allRequests')} {requestsCount.all}
              </button>
              <button
                onClick={() => setRequestStatusFilter('Pending')}
                className={`pb-2 transition-all relative border-none bg-transparent cursor-pointer font-bold ${
                  requestStatusFilter === 'Pending' ? 'text-[#2563eb] border-b-2 border-solid border-[#2563eb]' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t('hotelReservations.pendingRequests')} {requestsCount.pending}
              </button>
              <button
                onClick={() => setRequestStatusFilter('Confirmed')}
                className={`pb-2 transition-all relative border-none bg-transparent cursor-pointer font-bold ${
                  requestStatusFilter === 'Confirmed' ? 'text-[#2563eb] border-b-2 border-solid border-[#2563eb]' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t('hotelReservations.confirmedRequests')} {requestsCount.confirmed}
              </button>
              <button
                onClick={() => setRequestStatusFilter('Rejected')}
                className={`pb-2 transition-all relative border-none bg-transparent cursor-pointer font-bold ${
                  requestStatusFilter === 'Rejected' ? 'text-[#2563eb] border-b-2 border-solid border-[#2563eb]' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t('hotelReservations.rejectedRequests')} {requestsCount.rejected}
              </button>
            </div>
          )}

          {/* Table Listing Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex flex-col space-y-1 self-start sm:self-center">
                <h3 className="text-[15px] font-bold text-slate-800">
                  {activeTab === 'Reservations' ? t('hotelReservations.allReservations') : t('requests.allRequestsListing')}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={activeTab === 'Reservations' ? t('hotelReservations.searchPlaceholder') : t('requests.searchPlaceholder')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans text-slate-800"
                  />
                </div>

                {activeTab === 'Reservations' && (
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium text-slate-700"
                  >
                    <option value="All">{t('invoices.allStatuses')}</option>
                    <option value="Confirmed">{t('common.statusConfirmed')}</option>
                    <option value="Tentative">{t('common.statusTentative')}</option>
                    <option value="Paid">{t('common.statusPaid')}</option>
                    <option value="Overdue">{t('common.statusOverdue')}</option>
                    <option value="Cancelled">{t('common.statusCancelled')}</option>
                  </select>
                )}

                <button
                  onClick={handleExportCSV}
                  className="flex items-center space-x-1.5 px-3 py-2 border border-slate-200 hover:border-slate-300 text-blue-600 font-bold rounded-lg text-xs transition-all bg-white cursor-pointer border-solid"
                >
                  <span>{t('invoices.exportCsv')}</span>
                </button>
              </div>
            </div>

            {/* Bulk Actions Banner */}
            {selectedBookingIds.length > 0 && (
              <div className="bg-[#f0f9ff] border-b border-[#e0f2fe] px-6 py-3 flex items-center justify-between transition-all animate-fade-in">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => setSelectedBookingIds([])}
                    className="rounded border-gray-300 text-[#2563eb] focus:ring-[#2563eb] w-4 h-4 cursor-pointer"
                  />
                  <span className="text-[13px] text-[#1d4ed8] font-bold">
                    {selectedBookingIds.length} {t('common.selected')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBulkExportCSV}
                    className="px-4 py-1.5 bg-white border border-[#2563eb] text-[#2563eb] rounded-lg text-[12px] font-bold hover:bg-blue-50/50 transition-all cursor-pointer shadow-sm font-sans"
                  >
                    {t('common.exportSelected')}
                  </button>
                  {user?.role !== 'Viewer' && (
                    <button
                      onClick={handleBulkDelete}
                      className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-[12px] font-bold hover:bg-red-700 transition-all cursor-pointer shadow-sm font-sans"
                    >
                      {t('common.deleteSelected')}
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="overflow-x-auto w-full text-slate-800">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px] select-none">
                    {activeTab === 'Reservations' ? (
                      <>
                        <th className="py-3 px-4 text-center w-10 select-none">
                          <input
                            type="checkbox"
                            checked={
                              paginatedBookings.length > 0 &&
                              paginatedBookings.every(b => selectedBookingIds.includes(b.id))
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                const newSelected = [...selectedBookingIds];
                                paginatedBookings.forEach(b => {
                                  if (!newSelected.includes(b.id)) newSelected.push(b.id);
                                });
                                setSelectedBookingIds(newSelected);
                              } else {
                                const pageIds = paginatedBookings.map(b => b.id);
                                setSelectedBookingIds(selectedBookingIds.filter(id => !pageIds.includes(id)));
                              }
                            }}
                            className="rounded border-gray-300 text-[#2563eb] focus:ring-[#2563eb] w-4 h-4 cursor-pointer"
                          />
                        </th>
                        <th className="py-3 px-5">{t('dashboard.ref')}</th>
                        <th className="py-3 px-4">{t('hotelReservations.hotel')}</th>
                        <th className="py-3 px-4">{t('hotelReservations.guestName')}</th>
                        <th className="py-3 px-4">{t('hotelReservations.checkIn')}</th>
                        <th className="py-3 px-4">{t('hotelReservations.checkOut')}</th>
                        <th className="py-3 px-4">{t('hotelReservations.rooms')}</th>
                        <th className="py-3 px-4">{t('dashboard.dueDate')}</th>
                        <th className="py-3 px-4 text-center">{t('common.status')}</th>
                        <th className="py-3 px-4 text-center">{t('invoices.paymentProof')}</th>
                        <th className="py-3 px-5 text-right">{t('common.total')}</th>
                      </>
                    ) : (
                      <>
                        <th className="py-3 px-5">{t('hotelReservations.reqNo')}</th>
                        <th className="py-3 px-4">{t('hotelReservations.resNo')}</th>
                        <th className="py-3 px-4">{t('hotelReservations.hotel')}</th>
                        <th className="py-3 px-4">{t('hotelReservations.rooms')}</th>
                        <th className="py-3 px-4">{t('hotelReservations.amount')}</th>
                        <th className="py-3 px-4">{t('requests.submittedBy')}</th>
                        <th className="py-3 px-4">{t('requests.submissionDate')}</th>
                        <th className="py-3 px-4 text-center">{t('common.status')}</th>
                        <th className="py-3 px-5 text-center">{t('common.actions')}</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[#334155] font-medium">
                  {finalFilteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={activeTab === 'Reservations' ? 11 : 9} className="py-16 text-center text-[#64748b]">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Bed className="w-8 h-8 text-slate-300" />
                          <p className="font-semibold text-slate-600 text-sm">{t('hotelReservations.noBookingsFound')}</p>
                          <p className="text-[11.5px] text-slate-400">{t('hotelReservations.noBookingsFoundDesc')}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedBookings.map((b, index) => {
                      const totalCost = calculateBookingTotal(b);
                      const firstRoom = b.rooms[0] || { hotelName: '-', checkIn: '', checkOut: '', roomType: '-' };
                      
                      if (activeTab === 'Reservations') {
                        return (
                          <tr
                            key={b.id}
                            onClick={() => {
                              setSelectedBooking(b);
                              setIsDetailOpen(true);
                            }}
                            className={`transition-colors cursor-pointer animate-fade-in ${
                              selectedBookingIds.includes(b.id)
                                ? "bg-[#f0f9ff] hover:bg-[#e0f2fe]"
                                : "hover:bg-slate-50/70"
                            }`}
                          >
                            <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedBookingIds.includes(b.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedBookingIds([...selectedBookingIds, b.id]);
                                  } else {
                                    setSelectedBookingIds(selectedBookingIds.filter(id => id !== b.id));
                                  }
                                }}
                                className="rounded border-gray-300 text-[#2563eb] focus:ring-[#2563eb] w-4 h-4 cursor-pointer"
                              />
                            </td>
                            <td className="py-4 px-5 font-bold text-[#0f172a] font-sans tracking-wide">
                              {b.reservationNo}
                            </td>
                            <td className="py-4 px-4 text-slate-900 font-bold font-sans">
                              {firstRoom.hotelName} {b.rooms.length > 1 && `(+${b.rooms.length - 1} ${t('hotelReservations.rooms')})`}
                            </td>
                            <td className="py-4 px-4 text-slate-500 font-medium">
                              {b.guestName}
                            </td>
                            <td className="py-4 px-4 text-slate-600 font-sans">
                              {formatDateVisual(firstRoom.checkIn)}
                            </td>
                            <td className="py-4 px-4 text-slate-600 font-sans">
                              {formatDateVisual(firstRoom.checkOut)}
                            </td>
                            <td className="py-4 px-4 text-slate-600">
                              {firstRoom.roomType}
                            </td>
                            <td className="py-4 px-4 text-slate-600 font-sans">
                              {b.dueDate ? formatDateVisual(b.dueDate) : '-'}
                            </td>
                            <td className="py-4 px-4 text-center">
                              {(() => {
                                const isOverdue = isBookingOverdue(b);
                                if (isOverdue) {
                                  return (
                                    <span className="inline-flex px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wide bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa]">
                                      {t('common.statusOverdue').toUpperCase()}
                                    </span>
                                  );
                                }
                                return (
                                  <span className={`inline-flex px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wide ${
                                    (b.status === 'Paid and closed' || b.isPaid)
                                      ? 'bg-[#dbeafe] text-[#1e40af]'
                                      : b.status === 'Confirmed'
                                      ? 'bg-[#dcfce7] text-[#15803d]'
                                      : b.status === 'Tentative'
                                      ? 'bg-[#fef3c7] text-[#d97706]'
                                      : 'bg-rose-50 text-rose-700'
                                  }`}>
                                    {(b.status === 'Paid and closed' || b.isPaid)
                                      ? t('common.statusPaid').toUpperCase()
                                      : b.status === 'Confirmed'
                                      ? t('common.statusConfirmed').toUpperCase()
                                      : b.status === 'Tentative'
                                      ? t('common.statusTentative').toUpperCase()
                                      : (b.status as string) === 'Overdue'
                                      ? t('common.statusOverdue').toUpperCase()
                                      : String(b.status).toUpperCase()}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="py-4 px-4 text-center">
                              {b.paymentInvoiceFile ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingProof(b.paymentInvoiceFile || null);
                                  }}
                                  className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#ecfdf5] hover:bg-[#d1fae5] border border-[#a7f3d0] text-[#065f46] font-bold text-[10px] cursor-pointer transition-all shadow-sm font-sans"
                                >
                                  {t('common.view')}
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-300 italic font-sans">{t('common.noFile')}</span>
                              )}
                            </td>
                            <td className="py-4 px-5 text-right font-bold text-slate-950">
                              {formatCurrency(totalCost, b.currency)}
                            </td>
                          </tr>
                        );
                      } else {
                        // Tab Requests layout row
                        const approvalStatus = b.status === 'Cancelled' 
                          ? 'Rejected' 
                          : (b.status === 'Paid and closed' || b.isPaid 
                            ? 'Paid and closed' 
                            : (b.approvedByKarim ? 'Confirmed' : 'Pending'));
                        return (
                          <tr
                            key={b.id}
                            onClick={() => {
                              setSelectedBooking(b);
                            }}
                            className="hover:bg-slate-50/70 transition-colors cursor-pointer animate-fade-in"
                          >
                            <td className="py-4 px-5 font-bold text-[#0f172a] font-sans">
                              {`REQ-2026-${104 - index}`}
                            </td>
                            <td className="py-4 px-4 text-slate-600 font-sans tracking-wide">
                              {b.reservationNo}
                            </td>
                            <td className="py-4 px-4 text-slate-900 font-bold font-sans">
                              {firstRoom.hotelName}
                            </td>
                            <td className="py-4 px-4 text-slate-600">
                              {firstRoom.roomType}
                            </td>
                            <td className="py-4 px-4 font-bold text-slate-950">
                              {formatCurrency(totalCost, b.currency)}
                            </td>
                            <td className="py-4 px-4 text-slate-500 font-medium">
                              {sanitizeRequestedBy(b.employeeName)}
                            </td>
                            <td className="py-4 px-4 text-slate-600 font-sans">
                              {formatDateVisual(b.dueDate)}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wide ${
                                approvalStatus === 'Confirmed'
                                  ? 'bg-[#dcfce7] text-[#15803d]'
                                  : approvalStatus === 'Paid and closed'
                                  ? 'bg-[#dbeafe] text-[#1e40af]'
                                  : approvalStatus === 'Pending'
                                  ? 'bg-[#fef3c7] text-[#d97706]'
                                  : 'bg-rose-50 text-rose-700'
                              }`}>
                                {approvalStatus === 'Paid and closed'
                                  ? t('common.statusPaid')
                                  : approvalStatus === 'Confirmed'
                                  ? t('common.statusConfirmed')
                                  : approvalStatus === 'Pending'
                                  ? t('common.statusPending')
                                  : t('common.statusRejected')}
                              </span>
                            </td>
                            <td className="py-4 px-5 text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedBooking(b);
                                }}
                                className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-bold border-none bg-transparent cursor-pointer font-sans text-xs"
                              >
                                <span>{t('common.viewDetails')}</span>
                                <span className="text-[12px] font-sans">&rarr;</span>
                              </button>
                            </td>
                          </tr>
                        );
                      }
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs font-sans text-slate-500 bg-white select-none">
              <span className="text-xs text-slate-500 font-medium">
                {finalFilteredBookings.length > 0
                  ? `${t('hotelReservations.showing')} ${(currentPage - 1) * itemsPerPage + 1} ${t('invoices.to')} ${Math.min(currentPage * itemsPerPage, finalFilteredBookings.length)} ${t('invoices.of')} ${finalFilteredBookings.length.toLocaleString()} ${activeTab === 'Reservations' ? t('hotelReservations.reservations') : t('requests.totalRequests')}`
                  : `${t('hotelReservations.showing')} 0 ${t('invoices.to')} 0 ${t('invoices.of')} 0`}
              </span>
              {totalPages > 1 && (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 font-bold transition-all bg-white text-slate-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t('common.previous')}
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        currentPage === page
                          ? 'bg-[#2563eb] text-white border-none'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 font-bold transition-all bg-white text-slate-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t('common.next')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )}
</div>
      </main>

      {/* MODAL 1: PEMBUATAN RESERVASI BARU */}
      <NewReservationModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        formType={formType}
        bookings={bookings}
        companySettings={companySettings}
        configuredRates={configuredRates}
        onSave={async (newBooking) => {
          try {
            const saved = await createHotelReservation(newBooking);
            if (saved) {
              setBookings(prev => [saved, ...prev]);
              setIsFormOpen(false);
              triggerAlert('Success', 'New reservation added successfully!', 'success');
            }
          } catch (err) {
            console.error('Error creating hotel reservation:', err);
            triggerAlert('Failed', 'Failed to create new reservation.', 'error');
          }
        }}
      />

      {/* MODAL 2: DETAIL RESERVASI */}
      <ReservationDetailsModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        selectedBooking={selectedBooking}
        companySettings={companySettings}
        handleApproveKarim={handleApproveKarim}
        handleDeleteBooking={handleDeleteBooking}
      />

      {/* MODAL 4: CONFIRM APPROVAL (Mr. Karim) */}
      {isConfirmApprovalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-fade-in border border-slate-100 p-6 space-y-4 font-sans text-[#0f172a]">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">{t('hotelReservations.confirmApproval')}</h3>
              <button
                onClick={() => setIsConfirmApprovalOpen(false)}
                className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              {t('hotelReservations.confirmApprovalDesc')}
            </p>

            <div className="space-y-1.5 pt-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('hotelReservations.reservationNumber')}</label>
              <input
                type="text"
                placeholder="e.g. CNF-2024-001"
                value={confirmationNoInput}
                onChange={(e) => setConfirmationNoInput(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans text-slate-800"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <button
                onClick={() => setIsConfirmApprovalOpen(false)}
                className="px-5 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold rounded-lg text-xs transition-all cursor-pointer bg-white"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  if (!confirmationNoInput.trim()) {
                    alert('Please enter a confirmation number.');
                    return;
                  }
                  setIsConfirmApprovalOpen(false);
                  handleApproveKarim(selectedBooking.id, confirmationNoInput.trim());
                }}
                className="px-5 py-2 bg-[#10b981] hover:bg-[#059669] text-white font-bold rounded-lg text-xs transition-all cursor-pointer border-none shadow-sm"
              >
                {t('hotelReservations.confirmAndApprove')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: APPROVED SUCCESSFULLY */}
      {isApprovedSuccessOpen && lastApprovedBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden animate-fade-in border border-slate-100 p-6 space-y-6 text-center font-sans text-[#0f172a]">
            
            {/* Green Check circle */}
            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-[#ecfdf5] text-[#10b981]">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-800">{t('hotelReservations.approvedSuccessfully')}</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                {t('hotelReservations.approvedSuccessfullyDesc')}
              </p>
            </div>

            {/* Gray breakdown detail box */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-left space-y-2.5 font-sans">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">{t('hotelReservations.resNo')}</span>
                <span className="font-bold text-slate-800">{lastApprovedBooking.reservationNo}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">{t('invoices.confirmationNumber')}</span>
                <span className="font-bold text-slate-800">{lastConfirmationNo}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">{t('hotelReservations.hotel')}</span>
                <span className="font-bold text-slate-800">
                  {lastApprovedBooking.rooms[0]?.hotelName || 'Safwat Al Madinah'}
                </span>
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => {
                  setIsApprovedSuccessOpen(false);
                  setSelectedBooking(null);
                }}
                className="flex-1 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold rounded-lg text-xs transition-all cursor-pointer bg-white"
              >
                {t('hotelReservations.backToListing')}
              </button>
              <button
                onClick={() => {
                  setIsApprovedSuccessOpen(false);
                }}
                className="flex-1 py-2 bg-[#10b981] hover:bg-[#059669] text-white font-bold rounded-lg text-xs transition-all cursor-pointer border-none shadow-sm"
              >
                {t('common.done')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Hidden Print Area for Hotel Reservation Invoice */}
      {selectedBooking && (
        <HotelReservationPrint
          booking={selectedBooking}
          rates={configuredRates}
          taxRate={taxRate}
        />
      )}

      {/* MODAL 6: VIEW PAYMENT PROOF */}
      {viewingProof && (
        <div
          className="fixed inset-0 bg-[#0c0d0f]/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fade-in"
          onClick={() => setViewingProof(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-[#0c0d0f] font-sans">{t('hotelReservations.paymentTransferPhotoPdf')}</h3>
              <button
                onClick={() => setViewingProof(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer border-none bg-transparent"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[70vh] flex items-center justify-center bg-slate-50 w-full">
              {viewingProof.startsWith('data:application/pdf') ? (
                <iframe
                  src={viewingProof}
                  title="Payment Proof PDF"
                  className="w-full h-[60vh] border border-slate-200 rounded-lg shadow-sm"
                />
              ) : (
                <img
                  src={viewingProof}
                  alt="Payment proof"
                  className="max-w-full h-auto rounded-lg shadow-sm border border-slate-200"
                />
              )}
            </div>
            <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-between items-center">
              {viewingProof.startsWith('data:application/pdf') ? (
                <a
                  href={viewingProof}
                  download={`payment-proof-${selectedBooking?.reservationNo}.pdf`}
                  className="px-4 py-2 bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold rounded-lg text-[12px] cursor-pointer transition-all shadow-sm font-sans no-underline"
                >
                  {t('hotelReservations.downloadPdf')}
                </a>
              ) : (
                <a
                  href={viewingProof}
                  download={`payment-proof-${selectedBooking?.reservationNo}.jpg`}
                  className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-lg text-[12px] cursor-pointer transition-all shadow-sm font-sans no-underline"
                >
                  {t('hotelReservations.downloadImage')}
                </a>
              )}
              <button
                onClick={() => setViewingProof(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-[12px] cursor-pointer transition-all font-sans border-none"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Confirmation Email Modal */}
      {showSendConfirmationModal && (
        <div className="fixed inset-0 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 bg-[#0c0d0f]/40 animate-fade-in select-none">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-[#e2e8f0]">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="text-[16px] font-bold text-[#0c0d0f] font-sans flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#f59e0b]" />
                <span>{t('requests.sendConfirmationToClient') || 'Kirim Konfirmasi ke Klien'}</span>
              </h3>
              <button
                onClick={() => setShowSendConfirmationModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold border-none bg-transparent cursor-pointer p-1"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 font-sans">
              <p className="text-[13px] text-slate-500 leading-relaxed">
                {t('requests.sendConfirmationDesc') || 'Tindakan ini akan secara otomatis membuat dokumen konfirmasi yang berdesain rapi dan mengirimkannya langsung ke email penagihan pelanggan.'}
              </p>
              
              <div className="space-y-1">
                <label className="text-[12px] font-semibold text-slate-500">{t('requests.recipientEmailAddress') || 'Alamat Email Penerima'}</label>
                <input
                  type="email"
                  placeholder="billing@client.com"
                  value={clientEmailInput}
                  onChange={(e) => setClientEmailInput(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-3 text-[13px] focus:outline-none focus:border-amber-500 font-sans text-slate-800"
                />
              </div>

              {sendEmailError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-[12px] rounded-xl font-medium">
                  {sendEmailError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSendConfirmationModal(false)}
                disabled={isSendingEmail}
                className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[13px] font-bold hover:bg-slate-200 transition-all cursor-pointer disabled:opacity-50 border-none"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSendConfirmationEmail}
                disabled={isSendingEmail || !clientEmailInput}
                className="px-5 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-xl text-[13px] font-bold transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-60 border-none"
              >
                {isSendingEmail ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t('requests.sending') || 'Mengirim...'}</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>{t('requests.sendEmail') || 'Kirim Email'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ALERT MODAL KUSTOM */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
};

export default HotelReservations;
