import React, { useState, useMemo, useRef, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import {
  Bed,
  Search,
  Plus,
  ChevronDown,
  X
} from 'lucide-react';
import { getCompanySetting, getExchangeRates, getTaxSetting } from '../../services/settingService';
import NewReservationModal from '../../components/ui/NewReservationModal';
import ReservationDetailsModal from '../../components/ui/ReservationDetailsModal';
import AlertModal from '../../components/ui/AlertModal';
import { useAuth } from '../../context/AuthContext';
import {
  getHotelReservations,
  createHotelReservation,
  approveHotelReservation,
  updateHotelReservationStatus,
  deleteHotelReservation
} from '../../services/hotelReservationService';
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
  status: 'Confirmed' | 'Tentative' | 'Cancelled' | 'Paid and closed';
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

export const CLIENT_COMPANIES: ClientCompany[] = [
  {
    id: 'c-1',
    displayName: 'Arte Tours - AIT',
    companyName: 'PT. Arie Tour',
    taxNo: '0000-0000-0000',
    address: 'Menara Kencana, FI 18, JL. Sudirman No. 45',
    cityCountry: 'Jakarta, Indonesia 10210',
    code: 'AIT'
  },
  {
    id: 'c-2',
    displayName: 'DST Travel - DST',
    companyName: 'DST Travel & Tourizm',
    taxNo: '2222-3333-4444',
    address: 'Ibrahim Al Khalil Road, Ash Shubaikah',
    cityCountry: 'Makkah, Saudi Arabia 24231',
    code: 'DST'
  },
  {
    id: 'c-3',
    displayName: 'Hajj & Umrah Indah - HUI',
    companyName: 'PT. Hajj & Umrah Indah',
    taxNo: '1111-2222-3333',
    address: 'Wisma Mulia Lt. 12, Jl. Gatot Subroto',
    cityCountry: 'Jakarta, Indonesia 12710',
    code: 'HUI'
  }
];

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

// Format ke mata uang USD / SAR / IDR
export const formatCurrency = (val: number, currency: 'USD' | 'SAR' | 'IDR') => {
  if (currency === 'USD') {
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (currency === 'SAR') {
    return `${val.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR`;
  }
  return `Rp ${val.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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



const HotelReservations: React.FC = () => {
  const { user } = useAuth();
  // State data utama
  const [bookings, setBookings] = useState<Booking[]>([]);

  // State navigasi tab
  const [activeTab, setActiveTab] = useState<'Reservations' | 'Requests'>('Reservations');

  // State untuk pencarian & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [requestStatusFilter, setRequestStatusFilter] = useState<'All' | 'Pending' | 'Confirmed' | 'Rejected'>('Pending');

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

  // State Alert Modal Custom
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success' as 'success' | 'error' | 'info'
  });
  const [viewingProof, setViewingProof] = useState<string | null>(null);

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
          triggerAlert('Berhasil', 'Bukti pembayaran hotel berhasil diunggah!', 'success');
        }
      } catch (err) {
        console.error('Error uploading payment file:', err);
        triggerAlert('Gagal', 'Gagal mengunggah bukti pembayaran.', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  // State Company Settings dari backend
  const [companySettings, setCompanySettings] = useState({
    companyName: 'PT.ODST AIRLINES IND',
    phone: '+62 8111 1203 330',
    taxNumber: '0000-0000-0001',
    bankName: 'Danamon',
    accountName: 'PT ODST Airlines Indo',
    idrAccountNumber: '102-8829-011',
    usdAccountNumber: '102-8829-022'
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
            phone: data.phone || '+62 8111 1203 330',
            taxNumber: data.taxNumber || '0000-0000-0001',
            bankName: data.bankName || 'Danamon',
            accountName: data.accountName || 'PT ODST Airlines Indo',
            idrAccountNumber: data.idrAccountNumber || '102-8829-011',
            usdAccountNumber: data.usdAccountNumber || '102-8829-022'
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
        const bookingsData = await getHotelReservations();
        if (bookingsData) {
          setBookings(bookingsData);
        }
      } catch (error) {
        console.error('Error fetching hotel bookings:', error);
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

  // Format tanggal ke format visual (e.g. Oct 12, 2024) untuk list table
  const formatDateVisual = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  };

  // Handler aksi Approve oleh Mr. Karim Gharba
  const handleApproveKarim = async (id: string, confirmationNoVal?: string) => {
    const now = new Date();
    const approvedTime = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) + 
                         ' at ' + 
                         now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    try {
      const updated = await approveHotelReservation(id, {
        confirmationNo: confirmationNoVal || `CNF-${now.getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
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
      triggerAlert('Gagal', 'Gagal menyetujui reservasi.', 'error');
    }
  };

  // Handler hapus pemesanan
  const handleDeleteBooking = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus pemesanan ini secara permanen?')) {
      try {
        await deleteHotelReservation(id);
        setBookings(prev => prev.filter(b => b.id !== id));
        setIsDetailOpen(false);
        setSelectedBooking(null);
        triggerAlert('Berhasil', 'Reservasi berhasil dihapus.', 'success');
      } catch (err) {
        console.error('Error deleting hotel reservation:', err);
        triggerAlert('Gagal', 'Gagal menghapus reservasi.', 'error');
      }
    }
  };

  // Statistik sesuai dengan database
  const stats = useMemo(() => {
    const activeBookings = bookings.filter(b => b.status !== 'Cancelled');
    const totalReservations = activeBookings.length;
    const confirmedCount = bookings.filter(b => b.status === 'Confirmed' || b.status === 'Paid and closed').length;
    const tentativeCount = bookings.filter(b => b.status === 'Tentative').length;
    const cancelledCount = bookings.filter(b => b.status === 'Cancelled').length;

    return {
      totalReservations,
      confirmed: confirmedCount,
      tentative: tentativeCount,
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
      return bookings.filter(b => b.type === 'Tentative' || b.status === 'Confirmed' || b.status === 'Cancelled');
    }
    // Tab Requests -> Filter berdasarkan requestStatusFilter
    return bookings.filter(b => {
      if (b.type !== 'Confirmation') return false;
      
      if (requestStatusFilter === 'Pending') {
        return !b.approvedByKarim && b.status !== 'Cancelled';
      }
      if (requestStatusFilter === 'Confirmed') {
        return b.approvedByKarim === true;
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

      const matchesStatus = activeTab === 'Requests' || statusFilter === 'All' || b.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tabFilteredBookings, searchQuery, statusFilter, activeTab]);

  // Ekspor CSV
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'REF #,HOTEL NAME,GUEST NAME,CHECK-IN,CHECK-OUT,ROOM TYPE,STATUS,TOTAL PRICE\n';
    
    finalFilteredBookings.forEach(b => {
      const mainRoom = b.rooms[0] || { hotelName: '-', checkIn: '-', checkOut: '-', roomType: '-' };
      const row = `${b.reservationNo},${mainRoom.hotelName},${b.guestName},${mainRoom.checkIn},${mainRoom.checkOut},${mainRoom.roomType},${b.status},${calculateBookingTotal(b)}\n`;
      csvContent += row;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reservasi_Hotel_${activeTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                  <span>Hotel Reservation Requests</span>
                  <span>/</span>
                  <span className="text-slate-800">
                    Request REQ-2026-{104 - bookings.findIndex(b => b.id === selectedBooking.id)}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="flex items-center space-x-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors border-none bg-transparent cursor-pointer font-sans"
                >
                  <span>&larr;</span>
                  <span>Back to Listing</span>
                </button>
              </div>

              {/* Title Header */}
              <div className="flex flex-col space-y-1 print:hidden">
                <h1 className="text-[26px] font-extrabold text-[#0c0d0f] tracking-tight">
                  Confirmed Reservation Details
                </h1>
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
                        <h3 className="text-sm font-bold text-slate-800">Reservation Details</h3>
                        <p className="text-[11px] text-slate-400 font-sans">Reservation Number: {selectedBooking.reservationNo}</p>
                      </div>
                    </div>

                    {/* Metadata Readonly Inputs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-sans">Invoice Number</label>
                        <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-lg text-xs font-bold text-slate-800 font-sans">
                          {selectedBooking.reservationNo}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-sans">Reference Number</label>
                        <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-lg text-xs font-bold text-slate-800 font-sans">
                          {selectedBooking.referenceNo}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-sans">Serial Number</label>
                        <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-lg text-xs font-bold text-slate-800 font-sans">
                          {selectedBooking.serialNo}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-sans">Due Date</label>
                        <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-lg text-xs font-bold text-slate-800 font-sans">
                          {formatDateVisual(selectedBooking.dueDate)}
                        </div>
                      </div>
                    </div>

                    {/* BILL FROM / BILL TO ROW */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                      <div>
                        <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">BILL FROM</h4>
                        <div className="space-y-1 text-xs font-sans text-slate-600">
                          <p className="font-bold text-slate-800 text-[13px]">{selectedBooking.employeeName || 'Dimas Alva Rizki'}</p>
                          <p>Employee ID: {selectedBooking.employeeId || 'UMP-111'}</p>
                          <p>Phone: {selectedBooking.employeePhone || '+62 8111 1203 330'}</p>
                          <p>{selectedBooking.employeeEmail || 'alvarizkidimas@gmail.com'}</p>
                          <p>{selectedBooking.employeeEntity || 'PT.ODST AIRLINES IND'}</p>
                          <p className="text-[11px] text-slate-400">Tax No: {selectedBooking.companyTaxNo || '0000-0000-0001'}</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">BILL TO</h4>
                        <div className="space-y-1 text-xs font-sans text-slate-600">
                          <p className="font-bold text-slate-800 text-[13px]">{selectedBooking.companyName}</p>
                          <p className="leading-relaxed">{selectedBooking.clientAddress}</p>
                          <p className="font-bold text-slate-800">{selectedBooking.clientCityCountry}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Accommodations Breakdown Card */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h3 className="text-sm font-bold text-slate-800">Accommodations Breakdown</h3>
                    
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left text-xs font-sans">
                        <thead>
                          <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none border-b border-slate-100">
                            <th className="py-2.5 px-3">Hotel</th>
                            <th className="py-2.5 px-3">Room Type</th>
                            <th className="py-2.5 px-3">Check In</th>
                            <th className="py-2.5 px-3">Check Out</th>
                            <th className="py-2.5 px-2 text-center">Nights</th>
                            <th className="py-2.5 px-2 text-center">Rooms</th>
                            <th className="py-2.5 px-2 text-center">Adult</th>
                            <th className="py-2.5 px-2 text-center">Child</th>
                            <th className="py-2.5 px-3">Meals</th>
                            <th className="py-2.5 px-3 text-right">Rate</th>
                            <th className="py-2.5 px-3 text-right">Meal Rt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[#334155] font-medium">
                          {selectedBooking.rooms.map((room, idx) => (
                            <tr key={idx}>
                              <td className="py-3 px-3 font-bold text-slate-900">{room.hotelName}</td>
                              <td className="py-3 px-3">{room.roomType}</td>
                              <td className="py-3 px-3 font-sans text-slate-500">{formatDateVisual(room.checkIn)}</td>
                              <td className="py-3 px-3 font-sans text-slate-500">{formatDateVisual(room.checkOut)}</td>
                              <td className="py-3 px-2 text-center font-sans">{room.nights}</td>
                              <td className="py-3 px-2 text-center font-sans">{room.roomCount}</td>
                              <td className="py-3 px-2 text-center font-sans">{room.adults}</td>
                              <td className="py-3 px-2 text-center font-sans">{room.children}</td>
                              <td className="py-3 px-3 text-[11px] text-slate-500 uppercase">{room.mealPlan.replace('FAREAST ', '')}</td>
                              <td className="py-3 px-3 text-right font-sans">{formatCurrency(room.pricePerNight, selectedBooking.currency)}</td>
                              <td className="py-3 px-3 text-right font-sans">{formatCurrency(room.mealRate, selectedBooking.currency)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Subtotal & Total aligned right */}
                    <div className="flex flex-col items-end pt-4 border-t border-slate-100 text-xs space-y-1.5 font-sans">
                      <div className="flex justify-between w-48 text-slate-500">
                        <span>Subtotal:</span>
                        <span className="font-bold text-slate-800">{formatCurrency(calculateBookingTotal(selectedBooking), selectedBooking.currency)}</span>
                      </div>
                      <div className="flex justify-between w-48 text-slate-500">
                        <span>Tax / VAT ({taxRate}%):</span>
                        <span className="font-bold text-slate-800">
                          {formatCurrency(calculateBookingTotal(selectedBooking) * (taxRate / 100), selectedBooking.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between w-48 text-[14px] pt-1.5 border-t border-slate-100 font-extrabold text-[#15803d]">
                        <span className="text-slate-800">Total Due:</span>
                        <span>{formatCurrency(calculateBookingTotal(selectedBooking) * (1 + taxRate / 100), selectedBooking.currency)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Exchange rate & Payment instructions */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6 print:break-inside-avoid">
                    
                    {/* Exchange Rate Block */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">EXCHANGE RATE</h4>
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
                          <span className="font-medium text-slate-500">Total Due (IDR)</span>
                          <span className="font-extrabold text-[#2563eb] text-[13px]">
                            Rp {(calculateBookingTotal(selectedBooking) * (1 + taxRate / 100) * (selectedBooking.usdToIdrRate || configuredRates.usdToIdr)).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span className="font-medium text-slate-500">Total Due (SAR)</span>
                          <span className="font-extrabold text-[#2563eb] text-[13px]">
                            SAR {((calculateBookingTotal(selectedBooking) * (1 + taxRate / 100) * (selectedBooking.usdToIdrRate || configuredRates.usdToIdr)) / (selectedBooking.sarToIdrRate || configuredRates.sarToIdr)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Instructions Block */}
                    <div className="space-y-2.5">
                      <h3 className="text-sm font-bold text-slate-800">Payment Instructions</h3>
                      <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/30 space-y-3 text-xs font-sans">
                        <div className="flex items-center">
                          <span className="w-28 text-slate-500 font-bold">Bank Name:</span>
                          <span className="text-slate-800 font-bold">
                            {companySettings.bankName.includes('Bank') ? companySettings.bankName : `${companySettings.bankName} Bank`}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-28 text-slate-500 font-bold">Account Name:</span>
                          <span className="text-slate-800 font-bold">{companySettings.accountName}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-28 text-slate-500 font-bold">USD Account:</span>
                          <span className="text-slate-800 font-bold">{companySettings.usdAccountNumber}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-28 text-slate-500 font-bold">IDR Account:</span>
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
                      <span>Print Invoice</span>
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="flex items-center space-x-2 px-4 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-lg text-xs transition-all cursor-pointer border-none shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      <span>Download PDF</span>
                    </button>
                  </div>

                </div>

                {/* Right Column */}
                <div className="space-y-6 print:hidden">
                  
                  {/* Approval Workflow Status */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Approval Workflow Status</h3>
                    
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
                        <p className="text-[10px] text-slate-500 font-sans">Madinah Accountant</p>
                        {selectedBooking.approvedByKarim ? (
                          <div className="pt-0.5">
                            <span className="inline-block px-2.5 py-0.5 bg-[#dcfce7] text-[#15803d] text-[10px] font-bold rounded">
                              Confirmed: {selectedBooking.approvedAtKarim || 'Oct 12, 2026 at 09:15 AM'}
                            </span>
                          </div>
                        ) : (
                          <p className={`text-[10.5px] font-bold ${selectedBooking.approvedByKarim ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {user?.role === 'Level_3_Approver' || user?.role === 'Madinah Branch Accountant' || user?.name?.toLowerCase().includes('karim')
                              ? 'Awaiting Review (Your Level)' 
                              : 'Awaiting Review'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-1 text-xs">
                      <p className={`font-bold ${selectedBooking.approvedByKarim ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {selectedBooking.approvedByKarim ? '1 of 1 Approvals Complete — Reservation Confirmed' : '0 of 1 Approvals Complete — Reservation Pending'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-sans">
                        Ready for payment processing
                      </p>
                    </div>
                  </div>

                  {/* Confirmed Operations / Upload block if approved */}
                  {selectedBooking.approvedByKarim && (
                    <>
                      {/* Available Operations */}
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Available Operations</h3>
                        <div className="space-y-2.5 pt-1">
                          {selectedBooking.status === 'Paid and closed' ? (
                            <div className="w-full py-2 px-3 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold text-center border border-solid border-emerald-100">
                              ✓ Payment Fully Settled (Closed)
                            </div>
                          ) : (
                            <button
                              onClick={async () => {
                                try {
                                  const updated = await updateHotelReservationStatus(selectedBooking.id, {
                                    status: 'Paid and closed',
                                    isPaid: true
                                  });
                                  if (updated) {
                                    setBookings(prev => prev.map(b => b.id === selectedBooking.id ? updated : b));
                                    setSelectedBooking(updated);
                                    triggerAlert('Berhasil', 'Status pembayaran berhasil diperbarui menjadi Paid and closed!', 'success');
                                  }
                                } catch (err) {
                                  console.error('Error marking as paid:', err);
                                  triggerAlert('Gagal', 'Gagal memperbarui status pembayaran.', 'error');
                                }
                              }}
                              className="w-full py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold rounded-lg text-xs transition-all cursor-pointer border-none shadow-sm text-center"
                            >
                              Mark as Paid
                            </button>
                          )}
                          <button className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs transition-all cursor-pointer bg-white text-center">
                            Send Confirmation
                          </button>
                        </div>
                      </div>

                      {/* Upload Payment Invoice */}
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Upload Payment Invoice</h3>
                        {selectedBooking.paymentInvoiceFile ? (
                          <div className="space-y-3">
                            <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-[#d1fae5] flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-[14px]">📄</span>
                                <div className="text-left">
                                  <div className="text-xs font-bold">Bukti Pembayaran Tersimpan</div>
                                  <div className="text-[10px] text-emerald-600 font-sans">Ready to review</div>
                                </div>
                              </div>
                              <button
                                onClick={() => setViewingProof(selectedBooking.paymentInvoiceFile || null)}
                                className="px-3 py-1 bg-white hover:bg-emerald-100 border border-[#a7f3d0] text-emerald-700 font-bold rounded-lg text-[11px] transition-all cursor-pointer"
                              >
                                View Proof
                              </button>
                            </div>
                            
                            {/* Re-upload Option */}
                            <label className="block w-full py-2 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold rounded-lg text-xs text-center transition-all cursor-pointer">
                              Change Payment Proof
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
                            <div className="text-xs font-bold text-slate-700">Drag & drop or click to upload</div>
                            <div className="text-[10px] text-slate-400 font-sans">Supports: PDF, JPG, PNG (max 10MB)</div>
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
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Notes</h3>
                    <textarea
                      placeholder="Add payment notes or special instructions..."
                      className="w-full p-3 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans text-slate-800 h-24 resize-none"
                    />
                    <button className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-lg text-xs transition-all cursor-pointer border-none shadow-sm">
                      Save Note
                    </button>
                  </div>

                  {/* Your Decision Card */}
                  {!selectedBooking.approvedByKarim && selectedBooking.status !== 'Cancelled' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                      <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Your Decision</h3>
                      <p className="text-xs font-sans text-slate-600 leading-relaxed">
                        As the Madinah Accountant, please confirm verification of the Requested Reservation.
                      </p>
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                          onClick={() => {
                            if (user?.role !== 'Level_3_Approver' && user?.role !== 'Madinah Branch Accountant' && !user?.name?.toLowerCase().includes('karim')) {
                              triggerAlert('Akses Ditolak', 'Hanya Mr. Karim Gharba (Madinah Accountant) yang dapat menolak request ini.', 'error');
                              return;
                            }
                                                        if (confirm('Apakah Anda yakin ingin menolak request ini?')) {
                              updateHotelReservationStatus(selectedBooking.id, { status: 'Cancelled' })
                                .then((updated) => {
                                  if (updated) {
                                    setBookings(prev => prev.map(b => b.id === selectedBooking.id ? updated : b));
                                    setSelectedBooking(null);
                                    triggerAlert('Ditolak', 'Request reservasi berhasil ditolak.', 'error');
                                  }
                                })
                                .catch((err) => {
                                  console.error('Error rejecting hotel request:', err);
                                  triggerAlert('Gagal', 'Gagal menolak request.', 'error');
                                });
                            }
                          }}
                          className="py-2.5 border border-red-200 hover:border-red-300 text-red-600 font-bold rounded-lg text-xs transition-all bg-white cursor-pointer border-solid text-center"
                        >
                          Reject Request
                        </button>
                        <button
                          onClick={() => {
                            if (user?.role !== 'Level_3_Approver' && user?.role !== 'Madinah Branch Accountant' && !user?.name?.toLowerCase().includes('karim')) {
                              triggerAlert('Akses Ditolak', 'Hanya Mr. Karim Gharba (Madinah Accountant) yang dapat menyetujui request ini.', 'error');
                              return;
                            }
                            setConfirmationNoInput('');
                            setIsConfirmApprovalOpen(true);
                          }}
                          className="py-2.5 bg-[#10b981] hover:bg-[#059669] text-white font-bold rounded-lg text-xs transition-all cursor-pointer border-none text-center shadow-sm"
                        >
                          Approve
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
                {activeTab === 'Reservations' ? 'Hotel Reservations' : 'Hotel Reservation Requests'}
              </h1>
              <p className="text-[13px] text-[#64748b] font-medium font-sans">
                {activeTab === 'Reservations' 
                  ? 'ODST Corporate Travel & Accommodations Management' 
                  : 'Review and approve pending hotel reservation requests from corporate travel'}
              </p>
            </div>

            {/* Actions Button */}
            {activeTab === 'Reservations' ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(prev => !prev)}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg text-[13px] font-bold transition-all shadow-sm cursor-pointer border-none"
                >
                  <Plus className="w-4 h-4 font-bold" />
                  <span>New Reservation</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-40 animate-fade-in text-[13px]">
                    <button
                      onClick={() => openNewReservationForm('Tentative')}
                      className="w-full text-left px-4 py-2.5 text-[#0f172a] hover:bg-slate-50 transition-colors font-medium border-none bg-transparent cursor-pointer"
                    >
                      Tentative
                    </button>
                    <button
                      onClick={() => openNewReservationForm('Confirmation')}
                      className="w-full text-left px-4 py-2.5 text-[#0f172a] hover:bg-slate-50 transition-colors font-medium border-t border-slate-100 border-x-none border-b-none bg-transparent cursor-pointer"
                    >
                      Confirmation
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
                <span>New Request</span>
              </button>
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
              <span>Reservations</span>
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
              <span>Requests</span>
              {activeTab === 'Requests' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563eb] rounded-full" />
              )}
            </button>
          </div>

          {/* Metrics summary OR Inline Requests Filters */}
          {activeTab === 'Reservations' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 print:hidden">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-[120px]">
                <div className="flex justify-between items-start">
                  <span className="text-[12px] font-bold text-[#64748b] uppercase tracking-wider">Total Reservations</span>
                  <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">+8.2%</span>
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl font-extrabold text-[#0f172a]">{stats.totalReservations.toLocaleString()}</h3>
                  <p className="text-[11.5px] text-[#64748b] font-medium mt-1">Total booked YTD</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-[120px]">
                <div className="flex justify-between items-start">
                  <span className="text-[12px] font-bold text-[#64748b] uppercase tracking-wider">Confirmed</span>
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Active</span>
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl font-extrabold text-[#0f172a]">{stats.confirmed.toLocaleString()} Bookings</h3>
                  <p className="text-[11.5px] text-[#64748b] font-medium mt-1">Secured and finalized</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-[120px]">
                <div className="flex justify-between items-start">
                  <span className="text-[12px] font-bold text-[#64748b] uppercase tracking-wider">Tentative</span>
                  <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Follow-up</span>
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl font-extrabold text-[#0f172a]">{stats.tentative.toLocaleString()} Bookings</h3>
                  <p className="text-[11.5px] text-[#64748b] font-medium mt-1">Pending client approval</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-[120px]">
                <div className="flex justify-between items-start">
                  <span className="text-[12px] font-bold text-[#64748b] uppercase tracking-wider">Cancelled</span>
                  <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">-3.1%</span>
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl font-extrabold text-[#0f172a]">{stats.cancelled.toLocaleString()} Bookings</h3>
                  <p className="text-[11.5px] text-[#64748b] font-medium mt-1">Voided or rescheduled</p>
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
                All Requests {requestsCount.all}
              </button>
              <button
                onClick={() => setRequestStatusFilter('Pending')}
                className={`pb-2 transition-all relative border-none bg-transparent cursor-pointer font-bold ${
                  requestStatusFilter === 'Pending' ? 'text-[#2563eb] border-b-2 border-solid border-[#2563eb]' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Pending {requestsCount.pending}
              </button>
              <button
                onClick={() => setRequestStatusFilter('Confirmed')}
                className={`pb-2 transition-all relative border-none bg-transparent cursor-pointer font-bold ${
                  requestStatusFilter === 'Confirmed' ? 'text-[#2563eb] border-b-2 border-solid border-[#2563eb]' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Confirmed {requestsCount.confirmed}
              </button>
              <button
                onClick={() => setRequestStatusFilter('Rejected')}
                className={`pb-2 transition-all relative border-none bg-transparent cursor-pointer font-bold ${
                  requestStatusFilter === 'Rejected' ? 'text-[#2563eb] border-b-2 border-solid border-[#2563eb]' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Rejected {requestsCount.rejected}
              </button>
            </div>
          )}

          {/* Table Listing Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex flex-col space-y-1 self-start sm:self-center">
                <h3 className="text-[15px] font-bold text-slate-800">
                  {activeTab === 'Reservations' ? 'All Reservations Listing' : 'All Reservation Requests Listing'}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={activeTab === 'Reservations' ? "Search guest, hotel, or ref..." : "Search Requests / Hotel"}
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
                    <option value="All">All Statuses</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Tentative">Tentative</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Paid and closed">Paid and closed</option>
                  </select>
                )}

                <button
                  onClick={handleExportCSV}
                  className="flex items-center space-x-1.5 px-3 py-2 border border-slate-200 hover:border-slate-300 text-blue-600 font-bold rounded-lg text-xs transition-all bg-white cursor-pointer border-solid"
                >
                  <span>Export to CSV</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto w-full text-slate-800">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px] select-none">
                    {activeTab === 'Reservations' ? (
                      <>
                        <th className="py-3 px-5">Ref #</th>
                        <th className="py-3 px-4">Hotel Name</th>
                        <th className="py-3 px-4">Guest Name</th>
                        <th className="py-3 px-4">Check-In</th>
                        <th className="py-3 px-4">Check-Out</th>
                        <th className="py-3 px-4">Room Type</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-center">Proof</th>
                        <th className="py-3 px-5 text-right">Total Price</th>
                      </>
                    ) : (
                      <>
                        <th className="py-3 px-5">Request #</th>
                        <th className="py-3 px-4">Reservation #</th>
                        <th className="py-3 px-4">Hotel Name</th>
                        <th className="py-3 px-4">Room Type</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Requested By</th>
                        <th className="py-3 px-4">Submitted</th>
                        <th className="py-3 px-4 text-center">Approval Status</th>
                        <th className="py-3 px-5 text-center">Action</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[#334155] font-medium">
                  {finalFilteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={activeTab === 'Reservations' ? 9 : 9} className="py-16 text-center text-[#64748b]">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Bed className="w-8 h-8 text-slate-300" />
                          <p className="font-semibold text-slate-600 text-sm">No bookings found</p>
                          <p className="text-[11.5px] text-slate-400">There are no records matching your query.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    finalFilteredBookings.map((b, index) => {
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
                            className="hover:bg-slate-50/70 transition-colors cursor-pointer animate-fade-in"
                          >
                            <td className="py-4 px-5 font-bold text-[#0f172a] font-sans tracking-wide">
                              {b.reservationNo}
                            </td>
                            <td className="py-4 px-4 text-slate-900 font-bold font-sans">
                              {firstRoom.hotelName} {b.rooms.length > 1 && `(+${b.rooms.length - 1} Kamar)`}
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
                            <td className="py-4 px-4 text-center">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wide ${
                                b.status === 'Confirmed'
                                  ? 'bg-[#dcfce7] text-[#15803d]'
                                  : b.status === 'Paid and closed'
                                  ? 'bg-[#dbeafe] text-[#1e40af]'
                                  : b.status === 'Tentative'
                                  ? 'bg-[#fef3c7] text-[#d97706]'
                                  : 'bg-rose-50 text-rose-700'
                              }`}>
                                {b.status}
                              </span>
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
                                  View
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-300 italic font-sans">No file</span>
                              )}
                            </td>
                            <td className="py-4 px-5 text-right font-bold text-slate-950">
                              {formatCurrency(totalCost, b.currency)}
                            </td>
                          </tr>
                        );
                      } else {
                        // Tab Requests layout row
                        const approvalStatus = b.status === 'Cancelled' ? 'Rejected' : (b.status === 'Paid and closed' ? 'Paid and closed' : (b.approvedByKarim ? 'Confirmed' : 'Pending'));
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
                              {b.employeeName}
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
                                {approvalStatus}
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
                                <span>View Details</span>
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
              <span>
                {activeTab === 'Reservations' 
                  ? `Showing 1 to 8 of ${stats.totalReservations.toLocaleString()} reservations` 
                  : `Showing 1 to 8 of ${requestStatusFilter === 'Pending' ? requestsCount.pending : requestStatusFilter === 'Confirmed' ? requestsCount.confirmed : requestStatusFilter === 'Rejected' ? requestsCount.rejected : requestsCount.all} requests`}
              </span>
              <div className="flex items-center space-x-1">
                <button className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 font-bold transition-all bg-white text-slate-600 cursor-pointer">Previous</button>
                <button className="px-3 py-1.5 bg-[#2563eb] text-white rounded-lg font-bold transition-all border-none cursor-pointer">1</button>
                <button className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 font-bold transition-all bg-white text-slate-600 cursor-pointer">2</button>
                <button className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 font-bold transition-all bg-white text-slate-600 cursor-pointer">3</button>
                <button className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 font-bold transition-all bg-white text-slate-600 cursor-pointer">Next</button>
              </div>
            </div>
          </div>
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
              triggerAlert('Berhasil', 'Reservasi baru berhasil ditambahkan!', 'success');
            }
          } catch (err) {
            console.error('Error creating hotel reservation:', err);
            triggerAlert('Gagal', 'Gagal menambahkan reservasi baru.', 'error');
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
              <h3 className="text-base font-bold text-slate-800">Confirm Approval</h3>
              <button
                onClick={() => setIsConfirmApprovalOpen(false)}
                className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Please enter the confirmation number to proceed with the approval of this reservation.
            </p>

            <div className="space-y-1.5 pt-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirmation Number</label>
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
                Cancel
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
                Confirm & Approve
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
              <h3 className="text-lg font-bold text-slate-800">Approved Successfully</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                The reservation has been approved and confirmed. A notification has been sent to the requester.
              </p>
            </div>

            {/* Gray breakdown detail box */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-left space-y-2.5 font-sans">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Reservation No.</span>
                <span className="font-bold text-slate-800">{lastApprovedBooking.reservationNo}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Confirmation No.</span>
                <span className="font-bold text-slate-800">{lastConfirmationNo}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Hotel</span>
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
                Back to Listing
              </button>
              <button
                onClick={() => {
                  setIsApprovedSuccessOpen(false);
                }}
                className="flex-1 py-2 bg-[#10b981] hover:bg-[#059669] text-white font-bold rounded-lg text-xs transition-all cursor-pointer border-none shadow-sm"
              >
                Done
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
              <h3 className="text-[16px] font-bold text-[#0c0d0f] font-sans">Payment Transfer Photo / PDF</h3>
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
                  Download PDF
                </a>
              ) : (
                <a
                  href={viewingProof}
                  download={`payment-proof-${selectedBooking?.reservationNo}.jpg`}
                  className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-lg text-[12px] cursor-pointer transition-all shadow-sm font-sans no-underline"
                >
                  Download Image
                </a>
              )}
              <button
                onClick={() => setViewingProof(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-[12px] cursor-pointer transition-all font-sans border-none"
              >
                Close
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
