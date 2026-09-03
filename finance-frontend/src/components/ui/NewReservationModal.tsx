import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Booking, BookingRoom } from '../../pages/HotelReservations';
import {
  CLIENT_COMPANIES,
  calculateNights,
  formatDateDMY,
  formatCurrency,
  getRoomPrice
} from '../../pages/HotelReservations';
import AlertModal from './AlertModal';
import { getRoomTypes, getMealTypes } from '../../services/settingService';
import { getCompanies } from '../../services/invoiceService';
import { useAuth } from '../../context/AuthContext';

interface NewReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  formType: 'Tentative' | 'Confirmation';
  bookings: Booking[];
  companySettings: {
    companyName?: string;
    phone?: string;
    taxNumber?: string;
    bankName: string;
    accountName: string;
    idrAccountNumber: string;
    usdAccountNumber: string;
  };
  configuredRates: {
    usdToIdr: number;
    sarToIdr: number;
    usdToSar: number;
  };
  onSave: (newBooking: Booking) => void;
}

const NewReservationModal: React.FC<NewReservationModalProps> = ({
  isOpen,
  onClose,
  formType,
  bookings,
  companySettings,
  configuredRates,
  onSave
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const previewSectionRef = useRef<HTMLDivElement>(null);

  // Employee/Sender Fields (Bill From)
  const [formEmpName, setFormEmpName] = useState('');
  const [formCompNumber, setFormCompNumber] = useState('');
  const [formEmpId, setFormEmpId] = useState('');
  const [formCompEmail, setFormCompEmail] = useState('');
  const [formEntity, setFormEntity] = useState('');
  const [formCompTax, setFormCompTax] = useState('');

  // Dynamically set Bill From fields from the logged-in user and company settings
  useEffect(() => {
    if (user) {
      setFormEmpName(user.name || '');
      setFormEmpId(user.employeeId || '');
      setFormCompNumber(companySettings?.phone || user.phone || '');
      setFormCompEmail(user.email || '');
      setFormEntity(companySettings?.companyName || 'PT.ODST AIRLINES IND');
      setFormCompTax(companySettings?.taxNumber || '');
    }
  }, [user, isOpen, companySettings]);

  // States
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success' as 'success' | 'error' | 'info'
  });

  const [formHasAdvancePayment, setFormHasAdvancePayment] = useState(false);
  const [formAdvancePayment, setFormAdvancePayment] = useState('');

  // Dynamic Companies database list from dst_companies
  const [dbCompanies, setDbCompanies] = useState<any[]>([]);
  const [selectedCompanyCode, setSelectedCompanyCode] = useState<string>('');

  const [invoiceMeta, setInvoiceMeta] = useState({
    invoiceNo: '',
    referenceNo: '',
    serialNo: '',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const taxRate = 0;

  const [currentRoom, setCurrentRoom] = useState({
    hotelName: '',
    roomType: '',
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    roomCount: 1,
    adults: 1,
    children: 0,
    mealPlan: 'RO',
    pricePerNight: 0,
    mealRate: 0
  });

  const [dbRoomTypes, setDbRoomTypes] = useState<{ id: string; name: string; status: string }[]>([]);
  const [dbMealTypes, setDbMealTypes] = useState<{ id: string; name: string; status: string }[]>([]);

  const [formAddedRooms, setFormAddedRooms] = useState<BookingRoom[]>([]);
  const [formCurrency, setFormCurrency] = useState<'USD' | 'SAR' | 'IDR'>('USD');

  // Load live Companies from dst_companies table in database
  useEffect(() => {
    if (isOpen) {
      getCompanies()
        .then(data => {
          if (data && Array.isArray(data) && data.length > 0) {
            setDbCompanies(data);
            setSelectedCompanyCode(prev => prev || data[0].code || data[0].id || '');
          } else {
            const cached = localStorage.getItem('finance_companies');
            if (cached) {
              try {
                const parsed = JSON.parse(cached);
                if (parsed && parsed.length > 0) {
                  setDbCompanies(parsed);
                  setSelectedCompanyCode(prev => prev || parsed[0].code || parsed[0].id || '');
                  return;
                }
              } catch (e) {}
            }
            setDbCompanies(CLIENT_COMPANIES);
            setSelectedCompanyCode(prev => prev || CLIENT_COMPANIES[0].code);
          }
        })
        .catch(err => {
          console.error('Failed to load companies from database:', err);
          const cached = localStorage.getItem('finance_companies');
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (parsed && parsed.length > 0) {
                setDbCompanies(parsed);
                setSelectedCompanyCode(prev => prev || parsed[0].code || parsed[0].id || '');
                return;
              }
            } catch (e) {}
          }
          setDbCompanies(CLIENT_COMPANIES);
          setSelectedCompanyCode(prev => prev || CLIENT_COMPANIES[0].code);
        });
    }
  }, [isOpen]);

  // Helper untuk mengekstrak City / Country dari data perusahaan tanpa menggunakan nomor telepon
  const resolveCityCountry = (comp: any) => {
    if (!comp) return 'Indonesia';
    if (comp.cityCountry && typeof comp.cityCountry === 'string' && !comp.cityCountry.toLowerCase().startsWith('phone')) {
      return comp.cityCountry;
    }
    const parts = [];
    if (comp.city) parts.push(comp.city);
    if (comp.country) parts.push(comp.country);
    if (parts.length > 0) return parts.join(', ');

    if (comp.address && comp.address.includes(',')) {
      const segments = comp.address.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (segments.length >= 2) {
        const last = segments[segments.length - 1];
        const secondLast = segments[segments.length - 2];
        if (/^\d+$/.test(secondLast) && segments.length >= 3) {
          const thirdLast = segments[segments.length - 3].replace(/^["'\s]+|["'\s]+$/g, '');
          return `${thirdLast}, ${last}`;
        }
        const cleanSecond = secondLast.replace(/^["'\s]+|["'\s]+$/g, '');
        return `${cleanSecond}, ${last}`;
      }
    }
    return 'Indonesia';
  };

  // Compute selected company (client) object dynamically with auto-populated details
  const client = useMemo(() => {
    if (dbCompanies.length === 0) {
      return {
        id: 'c-1',
        code: 'AIT',
        displayName: 'Arie Tours - AIT',
        companyName: 'PT. Arie Tour',
        taxNo: '0000-0000-0000',
        address: 'Menara Kencana, Fl 18, JL. Sudirman No. 45',
        cityCountry: 'Jakarta, Indonesia 10210'
      };
    }
    const found = dbCompanies.find(c => (c.code || c.id) === selectedCompanyCode);
    if (found) {
      const code = found.code || found.id;
      const name = found.name || found.companyName || found.displayName || 'Unknown Company';
      const label = `${name}${code ? ` - ${code}` : ''}`;
      return {
        id: code,
        code,
        displayName: found.displayName || label,
        companyName: name,
        taxNo: found.taxNumber || found.taxNo || '0000-0000-0000',
        address: found.address || 'Address not specified',
        cityCountry: resolveCityCountry(found)
      };
    }
    const first = dbCompanies[0];
    const code = first.code || first.id;
    const name = first.name || first.companyName || first.displayName || 'Unknown Company';
    const label = `${name}${code ? ` - ${code}` : ''}`;
    return {
      id: code,
      code,
      displayName: first.displayName || label,
      companyName: name,
      taxNo: first.taxNumber || first.taxNo || '0000-0000-0000',
      address: first.address || 'Address not specified',
      cityCountry: resolveCityCountry(first)
    };
  }, [dbCompanies, selectedCompanyCode]);

  // Auto-fill price per night based on selected hotel & room type
  useEffect(() => {
    const price = getRoomPrice(currentRoom.hotelName, currentRoom.roomType);
    setCurrentRoom(prev => ({ ...prev, pricePerNight: price }));
  }, [currentRoom.hotelName, currentRoom.roomType]);

  // Helper to generate Invoice Number in backend-style format: compCode-MMDD-seqStr
  const generateReservationInvoiceNumber = (compCode: string, dateStr: string, currentBookings: Booking[]) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const mmdd = `${mm}${dd}`;

    const prefix = `${compCode}-${mmdd}-`;
    const matching = currentBookings.filter(b => b.reservationNo.startsWith(prefix));

    let nextSeq = 1;
    if (matching.length > 0) {
      const seqs = matching.map(b => {
        const parts = b.reservationNo.split('-');
        const lastPart = parts[parts.length - 1];
        return parseInt(lastPart, 10) || 0;
      });
      nextSeq = Math.max(...seqs) + 1;
    }
    const seqStr = String(nextSeq).padStart(3, '0');
    return `${compCode}-${mmdd}-${seqStr}`;
  };

  // Auto-generate invoice metadata (Invoice No, Ref No, Serial No) based on client and due date
  useEffect(() => {
    if (isOpen && client.code) {
      const dateToUse = invoiceMeta.dueDate || new Date().toISOString().split('T')[0];
      
      const generatedNo = generateReservationInvoiceNumber(client.code, dateToUse, bookings);
      
      const dateObj = new Date(dateToUse);
      const rMm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const rDd = String(dateObj.getDate()).padStart(2, '0');
      const mmdd = `${rMm}${rDd}`;
      
      const randomRefSuffix = Math.floor(100 + Math.random() * 900);
      const randomSerialSuffix = Math.floor(100000 + Math.random() * 900000);
      
      setInvoiceMeta(prev => ({
        ...prev,
        invoiceNo: generatedNo,
        referenceNo: `REF-${mmdd}-${randomRefSuffix}`,
        serialNo: `SR-${randomSerialSuffix}`
      }));
    }
  }, [client.code, invoiceMeta.dueDate, isOpen, bookings]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const todayStr = new Date().toISOString().split('T')[0];
      const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      setFormAddedRooms([]);
      setCurrentRoom({
        hotelName: 'SAFWAT AL MADINAH',
        roomType: 'TRIPLE',
        checkIn: todayStr,
        checkOut: tomorrowStr,
        roomCount: 1,
        adults: 1,
        children: 0,
        mealPlan: 'FAREAST FULL BOARD',
        pricePerNight: 225.00,
        mealRate: 40.00
      });

      // Fetch Room Types dari database secara real-time
      getRoomTypes()
        .then(data => {
          if (data) {
            const activeOnly = data.filter((item: any) => item.status === 'Active');
            setDbRoomTypes(activeOnly);
            if (activeOnly.length > 0) {
              setCurrentRoom(prev => ({ ...prev, roomType: activeOnly[0].name }));
            }
          }
        })
        .catch(err => console.error('Failed to load room types in modal:', err));

      // Fetch Meal Types dari database secara real-time
      getMealTypes()
        .then(data => {
          if (data) {
            const activeOnly = data.filter((item: any) => item.status === 'Active');
            setDbMealTypes(activeOnly);
            if (activeOnly.length > 0) {
              setCurrentRoom(prev => ({ ...prev, mealPlan: activeOnly[0].name }));
            }
          }
        })
        .catch(err => console.error('Failed to load meal types in modal:', err));
    }
  }, [isOpen]);

  const handleAddRoomToForm = () => {
    if (!currentRoom.checkIn || !currentRoom.checkOut) {
      setAlertModal({
        isOpen: true,
        title: 'Missing Dates',
        message: 'Please select Check-In and Check-Out dates first.',
        type: 'error'
      });
      return;
    }

    const nights = calculateNights(currentRoom.checkIn, currentRoom.checkOut);
    const roomItem: BookingRoom = {
      hotelName: currentRoom.hotelName,
      roomType: currentRoom.roomType,
      checkIn: currentRoom.checkIn,
      checkOut: currentRoom.checkOut,
      nights,
      roomCount: Number(currentRoom.roomCount),
      adults: Number(currentRoom.adults),
      children: Number(currentRoom.children),
      mealPlan: currentRoom.mealPlan,
      pricePerNight: Number(currentRoom.pricePerNight),
      mealRate: Number(currentRoom.mealRate)
    };

    setFormAddedRooms(prev => [...prev, roomItem]);

    // Reset upper info form inputs so user can add another room cleanly
    setCurrentRoom(prev => ({
      ...prev,
      hotelName: prev.hotelName || 'SAFWAT AL MADINAH',
      roomType: 'TRIPLE',
      roomCount: 1,
      adults: 1,
      children: 0,
      pricePerNight: 100,
      mealRate: 0
    }));

    // Gulirkan layar ke pratinjau kamar secara smooth agar user langsung melihat perubahannya
    setTimeout(() => {
      previewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const handleDeleteRoom = (index: number) => {
    setFormAddedRooms(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Persiapkan list kamar: jika formAddedRooms kosong, masukkan currentRoom sebagai default
    let roomsToSubmit = [...formAddedRooms];
    if (roomsToSubmit.length === 0) {
      const nights = calculateNights(currentRoom.checkIn, currentRoom.checkOut);
      roomsToSubmit.push({
        hotelName: currentRoom.hotelName,
        roomType: currentRoom.roomType,
        checkIn: currentRoom.checkIn || new Date().toISOString().split('T')[0],
        checkOut: currentRoom.checkOut || new Date(Date.now() + 86400000).toISOString().split('T')[0],
        nights,
        roomCount: Number(currentRoom.roomCount),
        adults: Number(currentRoom.adults),
        children: Number(currentRoom.children),
        mealPlan: currentRoom.mealPlan,
        pricePerNight: Number(currentRoom.pricePerNight),
        mealRate: Number(currentRoom.mealRate)
      });
    }

    const parsedAdv = formHasAdvancePayment ? (parseFloat(formAdvancePayment) || 0) : 0;
    const totalAmount = roomsToSubmit.reduce((acc, r) => {
      const nights = ('nights' in r && typeof (r as any).nights === 'number') ? (r as any).nights : calculateNights(r.checkIn, r.checkOut);
      return acc + ((r.pricePerNight + r.mealRate) * r.roomCount * nights);
    }, 0);
    const initialRemaining = Math.max(0, totalAmount - parsedAdv);

    const newBooking: Booking = {
      id: `hr-${Date.now()}`,
      reservationNo: invoiceMeta.invoiceNo,
      guestName: client.displayName,
      guestPhone: '+62 000-0000-000',
      referenceNo: invoiceMeta.referenceNo,
      serialNo: invoiceMeta.serialNo,
      dueDate: invoiceMeta.dueDate,
      companyName: client.companyName,
      clientTaxNo: client.taxNo,
      clientAddress: client.address,
      clientCityCountry: client.cityCountry,
      employeeName: formEmpName || 'Dimas Alva Rizki',
      employeeId: formEmpId || 'UMP-111',
      employeePhone: formCompNumber || '+62 8111 1203 330',
      employeeEmail: formCompEmail || 'alvarizkidimas@gmail.com',
      employeeEntity: formEntity || 'PT.ODST AIRLINES IND',
      companyTaxNo: formCompTax || '0000-0000-0001',
      rooms: roomsToSubmit,
      currency: formCurrency,
      taxRate: Number(taxRate),
      status: 'Tentative', // default
      type: formType,
      usdToIdrRate: configuredRates.usdToIdr,
      sarToIdrRate: configuredRates.sarToIdr,
      advancePayment: parsedAdv,
      remainingBalance: initialRemaining
    };

    onSave(newBooking);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm select-none">
      <div className="bg-white rounded-2xl max-w-6xl w-full shadow-2xl overflow-hidden animate-fade-in border border-slate-100 flex flex-col max-h-[95vh] text-[13px] text-slate-700">
        
        {/* Header Modal */}
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex flex-col space-y-0.5">
            <h3 className="text-lg font-black text-slate-800 font-sans">
              {t('hotelReservations.createNewHotelReservation')}
            </h3>
            <p className="text-xs text-slate-400 font-semibold font-sans">
              {t('hotelReservations.stayType')}: <span className="text-blue-600 font-bold uppercase">{formType === 'Confirmation' ? t('hotelReservations.confirmReservation') : `${t('common.statusTentative')} ${t('hotelReservations.reservation')}`}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-200 rounded-full transition-all border-none bg-transparent cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-8 space-y-6">
            
            {/* BILL TO (CLIENT) SELECT BLOCK */}
            <div className="space-y-1.5">
              <label className="block text-slate-400 font-bold text-[9px] uppercase tracking-wider">
                {t('hotelReservations.billToClient')}
              </label>
              <select
                value={selectedCompanyCode}
                onChange={e => setSelectedCompanyCode(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 bg-white cursor-pointer font-bold"
              >
                {dbCompanies.map(c => {
                  const code = c.code || c.id;
                  const name = c.name || c.companyName || c.displayName;
                  const label = `${name}${code ? ` - ${code}` : ''}`;
                  return (
                    <option key={code} value={code}>
                      {c.displayName || label}
                    </option>
                  );
                })}
              </select>
              <p className="text-[11.5px] text-slate-400 font-medium">
                {client.address}{client.cityCountry ? `, ${client.cityCountry}` : ''}
              </p>
            </div>

            {/* SECTION: BILL FROM / BILL TO ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* BILL FROM */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">{t('hotelReservations.billFrom')}</h4>
                <div className="border border-slate-100 rounded-xl p-5 bg-white space-y-3.5">
                  <div className="grid grid-cols-2 gap-3.5 text-[13px] font-sans">
                    <div>
                      <label className="block text-slate-400 font-bold text-[9px] mb-1">
                        {t('hotelReservations.employeeName')}
                      </label>
                      <input
                        type="text"
                        required
                        value={formEmpName}
                        onChange={(e) => setFormEmpName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[13px] font-bold text-slate-800 bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-inter"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold text-[9px] mb-1">
                        {t('hotelReservations.companyNumber')}
                      </label>
                      <input
                        type="text"
                        required
                        value={formCompNumber}
                        onChange={(e) => setFormCompNumber(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[13px] font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-inter"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold text-[9px] mb-1">
                        {t('hotelReservations.employeeId')}
                      </label>
                      <input
                        type="text"
                        required
                        value={formEmpId}
                        onChange={(e) => setFormEmpId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[13px] font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-inter"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold text-[9px] mb-1">
                        {t('hotelReservations.companyEmail')}
                      </label>
                      <input
                        type="email"
                        required
                        value={formCompEmail}
                        onChange={(e) => setFormCompEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[13px] font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-inter"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold text-[9px] mb-1">
                        {t('hotelReservations.entityCompany')}
                      </label>
                      <input
                        type="text"
                        required
                        value={formEntity}
                        onChange={(e) => setFormEntity(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[13px] font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-inter"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold text-[9px] mb-1">
                        {t('hotelReservations.companyTaxNumber')}
                      </label>
                      <input
                        type="text"
                        required
                        value={formCompTax}
                        onChange={(e) => setFormCompTax(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[13px] font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-inter"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* BILL TO Client Text Box */}
              <div className="space-y-2 text-xs text-slate-800">
                <h4 className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">{t('hotelReservations.billTo')}</h4>
                <div className="border border-slate-100 rounded-xl p-5 bg-white space-y-3.5">
                  <div className="space-y-3">
                    <div>
                      <p className="text-[9px] font-medium text-slate-400 uppercase">{t('hotelReservations.clientCompany')}</p>
                      <p className="font-bold text-slate-800 text-[13px] mt-0.5">{client.companyName}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-medium text-slate-400 uppercase">{t('hotelReservations.companyTaxNumber')}</p>
                      <p className="font-bold text-slate-800 mt-0.5">{client.taxNo}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-medium text-slate-400 uppercase">{t('hotelReservations.streetAddress')}</p>
                      <p className="font-medium text-slate-700 mt-0.5 leading-relaxed">{client.address}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-medium text-slate-400 uppercase">{t('hotelReservations.cityCountry')}</p>
                      <p className="font-bold text-slate-800 mt-0.5">{client.cityCountry}</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* SECTION: METADATA INPUTS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">{t('hotelReservations.invoiceNumber')}</label>
                <input
                  type="text"
                  required
                  value={invoiceMeta.invoiceNo}
                  onChange={e => setInvoiceMeta(prev => ({ ...prev, invoiceNo: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 rounded-lg font-bold text-slate-800 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">{t('hotelReservations.referenceNumber')}</label>
                <input
                  type="text"
                  required
                  value={invoiceMeta.referenceNo}
                  onChange={e => setInvoiceMeta(prev => ({ ...prev, referenceNo: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">{t('hotelReservations.serialNumber')}</label>
                <input
                  type="text"
                  required
                  value={invoiceMeta.serialNo}
                  onChange={e => setInvoiceMeta(prev => ({ ...prev, serialNo: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">{t('hotelReservations.dueDate')}</label>
                <input
                  type="date"
                  required
                  value={invoiceMeta.dueDate}
                  onChange={e => setInvoiceMeta(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 bg-white font-sans font-bold"
                />
              </div>
            </div>

            {/* SECTION: RESERVATION DETAILS */}
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <h4 className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">{t('hotelReservations.reservationDetails').toUpperCase()}</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">{t('hotelReservations.hotelName')}</label>
                  <input
                    type="text"
                    required={formAddedRooms.length === 0}
                    value={currentRoom.hotelName}
                    onChange={e => setCurrentRoom(prev => ({ ...prev, hotelName: e.target.value }))}
                    placeholder="Enter Hotel Name (e.g. SAFWAT AL MADINAH)"
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 bg-white font-bold text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">{t('hotelReservations.roomType')}</label>
                  <select
                    value={currentRoom.roomType}
                    onChange={e => setCurrentRoom(prev => ({ ...prev, roomType: e.target.value }))}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 bg-white cursor-pointer"
                  >
                    {dbRoomTypes.length > 0 ? (
                      dbRoomTypes.map(rt => (
                        <option key={rt.id} value={rt.name}>{rt.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="TRIPLE">TRIPLE</option>
                        <option value="QUAD">QUAD</option>
                        <option value="DOUBLE">DOUBLE</option>
                        <option value="SUITE">SUITE</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Check-In / Check-Out */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">{t('hotelReservations.checkInDate')}</label>
                  <input
                    type="date"
                    required={formAddedRooms.length === 0}
                    value={currentRoom.checkIn}
                    onChange={e => setCurrentRoom(prev => ({ ...prev, checkIn: e.target.value }))}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 bg-white font-sans font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">{t('hotelReservations.checkOutDate')}</label>
                  <input
                    type="date"
                    required={formAddedRooms.length === 0}
                    value={currentRoom.checkOut}
                    onChange={e => setCurrentRoom(prev => ({ ...prev, checkOut: e.target.value }))}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 bg-white font-sans font-bold"
                  />
                </div>
              </div>

              {/* Counts */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">{t('hotelReservations.nightsDuration')}</label>
                  <input
                    type="text"
                    disabled
                    value={calculateNights(currentRoom.checkIn, currentRoom.checkOut)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-500 bg-slate-50 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">{t('hotelReservations.rooms')}</label>
                  <input
                    type="number"
                    min={1}
                    value={currentRoom.roomCount}
                    onChange={e => setCurrentRoom(prev => ({ ...prev, roomCount: Math.max(1, Number(e.target.value)) }))}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">{t('hotelReservations.adultsCount')}</label>
                  <input
                    type="number"
                    min={1}
                    value={currentRoom.adults}
                    onChange={e => setCurrentRoom(prev => ({ ...prev, adults: Math.max(1, Number(e.target.value)) }))}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">{t('hotelReservations.childrenCount')}</label>
                  <input
                    type="number"
                    min={0}
                    value={currentRoom.children}
                    onChange={e => setCurrentRoom(prev => ({ ...prev, children: Math.max(0, Number(e.target.value)) }))}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 bg-white"
                  />
                </div>
              </div>

              {/* Meals & Rates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">{t('hotelReservations.mealPlan')}</label>
                  <select
                    value={currentRoom.mealPlan}
                    onChange={e => setCurrentRoom(prev => ({ ...prev, mealPlan: e.target.value }))}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 bg-white cursor-pointer"
                  >
                    {dbMealTypes.length > 0 ? (
                      dbMealTypes.map(mt => (
                        <option key={mt.id} value={mt.name}>{mt.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="FAREAST FULL BOARD">FAREAST FULL BOARD</option>
                        <option value="HALF BOARD">HALF BOARD</option>
                        <option value="BED & BREAKFAST">BED & BREAKFAST</option>
                        <option value="ROOM ONLY">ROOM ONLY</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">{t('hotelReservations.dayRatePricePerNight')}</label>
                  <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                    <span className="px-3 py-2 text-xs font-bold text-slate-500 bg-slate-50 border-r border-slate-200 select-none">
                      {formCurrency}
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={currentRoom.pricePerNight}
                      onChange={e => setCurrentRoom(prev => ({ ...prev, pricePerNight: Math.max(0, Number(e.target.value)) }))}
                      className="flex-1 border-none py-2 px-3 focus:outline-none text-slate-800 font-bold text-[13px]"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">{t('hotelReservations.mealsRate')}</label>
                  <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                    <span className="px-3 py-2 text-xs font-bold text-slate-500 bg-slate-50 border-r border-slate-200 select-none">
                      {formCurrency}
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={currentRoom.mealRate}
                      onChange={e => setCurrentRoom(prev => ({ ...prev, mealRate: Math.max(0, Number(e.target.value)) }))}
                      className="flex-1 border-none py-2 px-3 focus:outline-none text-slate-800 font-bold text-[13px]"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* Add Room Dashed Button */}
              <button
                type="button"
                onClick={handleAddRoomToForm}
                className="w-48 py-2.5 border-2 border-dashed border-blue-200 hover:border-blue-500 hover:bg-blue-50/50 text-blue-600 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center space-x-1.5 cursor-pointer bg-white"
              >
                <Plus className="w-4 h-4 font-bold" />
                <span>{t('hotelReservations.addRoom')}</span>
              </button>
            </div>

            {/* SECTION: HOTEL DETAILS */}
            <div ref={previewSectionRef} className="space-y-4 select-none mt-6">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-slate-800 tracking-tight uppercase">{t('hotelReservations.hotelDetails').toUpperCase()}</h4>
                <select
                  value={formCurrency}
                  onChange={e => setFormCurrency(e.target.value as any)}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-slate-50 font-bold focus:outline-none cursor-pointer text-slate-700"
                >
                  <option value="USD">USD ($)</option>
                  <option value="SAR">SAR (SR)</option>
                  <option value="IDR">IDR (Rp)</option>
                </select>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200/70 rounded-2xl overflow-hidden bg-white w-full shadow-sm">
                <table className="w-full text-left font-sans border-collapse">
                  <thead>
                    <tr className="bg-[#1d2857] text-white" style={{ backgroundColor: '#1d2857', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                      <th colSpan={13} className="py-2.5 px-3 text-center font-bold text-[12px] tracking-wider select-none bg-[#1d2857] text-white" style={{ backgroundColor: '#1d2857', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
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
                      <th className="py-2 px-1.5 text-center whitespace-nowrap">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[#334155] font-semibold text-[10px]">
                    {formAddedRooms.length === 0 ? (
                      <tr className="hover:bg-slate-50/20">
                        <td className="py-2.5 px-2 text-left font-bold text-slate-900 uppercase text-[11px] leading-tight break-words">{currentRoom.hotelName}</td>
                        <td className="py-2.5 px-1.5 text-left font-semibold text-slate-800 uppercase text-[10px] leading-tight break-words">{currentRoom.roomType}</td>
                        <td className="py-2.5 px-1 text-center font-sans text-slate-700 text-[9.5px] whitespace-nowrap">{currentRoom.checkIn ? formatDateDMY(currentRoom.checkIn) : '-'}</td>
                        <td className="py-2.5 px-1 text-center font-sans text-slate-700 text-[9.5px] whitespace-nowrap">{currentRoom.checkOut ? formatDateDMY(currentRoom.checkOut) : '-'}</td>
                        <td className="py-2.5 px-0.5 text-center font-bold text-slate-900 whitespace-nowrap">{calculateNights(currentRoom.checkIn, currentRoom.checkOut)}</td>
                        <td className="py-2.5 px-0.5 text-center font-bold text-slate-900 whitespace-nowrap">{currentRoom.roomCount}</td>
                        <td className="py-2.5 px-0.5 text-center font-bold text-slate-900 whitespace-nowrap">{currentRoom.adults}</td>
                        <td className="py-2.5 px-0.5 text-center font-bold text-slate-900 whitespace-nowrap">{currentRoom.children}</td>
                        <td className="py-2.5 px-1 text-center font-bold text-slate-900 uppercase whitespace-nowrap">{currentRoom.mealPlan}</td>
                        <td className="py-2.5 px-1.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={currentRoom.pricePerNight}
                              onChange={e => setCurrentRoom(prev => ({ ...prev, pricePerNight: Math.max(0, Number(e.target.value)) }))}
                              className="w-14 px-1 py-0.5 border border-slate-200 rounded text-right font-sans font-bold text-slate-800 focus:ring-1 focus:ring-blue-500 text-[10px] bg-white"
                            />
                            <span className="text-[9px] font-bold text-slate-500">{formCurrency}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-1.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={currentRoom.mealRate}
                              onChange={e => setCurrentRoom(prev => ({ ...prev, mealRate: Math.max(0, Number(e.target.value)) }))}
                              className="w-14 px-1 py-0.5 border border-slate-200 rounded text-right font-sans font-bold text-slate-800 focus:ring-1 focus:ring-blue-500 text-[10px] bg-white"
                            />
                            <span className="text-[9px] font-bold text-slate-500">{formCurrency}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right font-sans font-bold text-slate-900 whitespace-nowrap text-[10.5px]">
                          {formatCurrency((currentRoom.pricePerNight + currentRoom.mealRate) * currentRoom.roomCount * calculateNights(currentRoom.checkIn, currentRoom.checkOut), formCurrency)}
                        </td>
                        <td className="py-2.5 px-1.5 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentRoom(prev => ({
                                ...prev,
                                pricePerNight: 0,
                                mealRate: 0
                              }));
                            }}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded transition-colors border-none bg-transparent cursor-pointer"
                            title="Remove room"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ) : (
                      formAddedRooms.map((room, idx) => {
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
                            <td className="py-2.5 px-1 text-center font-bold text-slate-900 uppercase whitespace-nowrap">{room.mealPlan}</td>
                            <td className="py-2.5 px-1.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end space-x-1">
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={room.pricePerNight}
                                  onChange={e => {
                                    const newPrice = Math.max(0, Number(e.target.value));
                                    setFormAddedRooms(prev => prev.map((r, i) => i === idx ? { ...r, pricePerNight: newPrice } : r));
                                  }}
                                  className="w-14 px-1 py-0.5 border border-slate-200 rounded text-right font-sans font-bold text-slate-800 focus:ring-1 focus:ring-blue-500 text-[10px] bg-white"
                                />
                                <span className="text-[9px] font-bold text-slate-500">{formCurrency}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-1.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end space-x-1">
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={room.mealRate}
                                  onChange={e => {
                                    const newRate = Math.max(0, Number(e.target.value));
                                    setFormAddedRooms(prev => prev.map((r, i) => i === idx ? { ...r, mealRate: newRate } : r));
                                  }}
                                  className="w-14 px-1 py-0.5 border border-slate-200 rounded text-right font-sans font-bold text-slate-800 focus:ring-1 focus:ring-blue-500 text-[10px] bg-white"
                                />
                                <span className="text-[9px] font-bold text-slate-500">{formCurrency}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-right font-sans font-bold text-slate-900 whitespace-nowrap text-[10.5px]">
                              {formatCurrency(roomTotal, formCurrency)}
                            </td>
                            <td className="py-2.5 px-1.5 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleDeleteRoom(idx)}
                                className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded transition-colors border-none bg-transparent cursor-pointer"
                                title="Delete room"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Subtotal & Total Due summary */}
              {(() => {
                const roomsForSummary = formAddedRooms.length > 0 ? formAddedRooms : [currentRoom];
                const subtotalAmount = roomsForSummary.reduce((sum, room) => {
                  const nights = ('nights' in room && typeof (room as any).nights === 'number') ? (room as any).nights : calculateNights(room.checkIn, room.checkOut);
                  return sum + ((room.pricePerNight + room.mealRate) * room.roomCount * nights);
                }, 0);
                return (
                  <div className="mt-4 flex flex-col items-end space-y-1.5 font-sans select-none px-2">
                    <div className="flex items-center justify-end space-x-8 text-[13px] text-slate-400 font-medium">
                      <span>{t('hotelReservations.subtotal')}:</span>
                      <span className="font-extrabold text-slate-900 text-sm">{formatCurrency(subtotalAmount, formCurrency)}</span>
                    </div>
                    <div className="flex items-center justify-end space-x-8 text-xs text-slate-400 font-medium">
                      <span>{t('hotelReservations.taxVat')} (0%):</span>
                      <span className="font-bold text-slate-900">{formatCurrency(0, formCurrency)}</span>
                    </div>
                    <div className="flex items-center justify-end space-x-8 text-base pt-2 border-t border-slate-200/80 min-w-[240px] justify-between">
                      <span className="font-extrabold text-slate-900">{t('hotelReservations.totalDue')}:</span>
                      <span className="font-black text-emerald-600 text-lg">{formatCurrency(subtotalAmount, formCurrency)}</span>
                    </div>

                    {/* Advance Payment (Deposit) Toggle */}
                    <div className="w-full pt-3 mt-2 border-t border-slate-200/80 space-y-2">
                      <div className="flex justify-between items-center text-[12.5px]">
                        <span className="font-bold text-slate-700">{t('hotelReservations.hasAdvancePayment')}</span>
                        <div className="flex items-center space-x-3 font-semibold">
                          <label className="flex items-center space-x-1 cursor-pointer">
                            <input
                              type="radio"
                              name="hotelHasAdvance"
                              checked={formHasAdvancePayment}
                              onChange={() => setFormHasAdvancePayment(true)}
                              className="text-amber-600 focus:ring-amber-500"
                            />
                            <span>{t('common.yes')}</span>
                          </label>
                          <label className="flex items-center space-x-1 cursor-pointer">
                            <input
                              type="radio"
                              name="hotelHasAdvance"
                              checked={!formHasAdvancePayment}
                              onChange={() => {
                                setFormHasAdvancePayment(false);
                                setFormAdvancePayment('');
                              }}
                              className="text-amber-600 focus:ring-amber-500"
                            />
                            <span>{t('common.no')}</span>
                          </label>
                        </div>
                      </div>

                      {formHasAdvancePayment && (
                        <div className="flex justify-between items-center text-[12.5px] pt-1">
                          <span className="font-medium text-slate-500">{t('hotelReservations.advancePaymentAmount')} ({formCurrency}):</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder={t('hotelReservations.advancePaymentPlaceholder')}
                            value={formAdvancePayment}
                            onChange={(e) => setFormAdvancePayment(e.target.value)}
                            className="w-48 px-3 py-1.5 border border-slate-200 rounded-lg text-[13px] font-bold text-slate-900 focus:outline-none focus:border-amber-500 text-right"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* SECTION: PAYMENT INSTRUCTIONS Rekening DST */}
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <h4 className="text-[13px] font-extrabold text-[#0f172a] uppercase tracking-wider">{t('hotelReservations.paymentInstructions').toUpperCase()}</h4>
              
              <div className="bg-[#f8fafc] p-6 border border-slate-200/80 rounded-xl space-y-3.5 text-[13px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">{t('hotelReservations.bankName')}:</span>
                  <span className="font-bold text-slate-800">{companySettings.bankName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">{t('hotelReservations.accountName')}:</span>
                  <span className="font-bold text-slate-800">{companySettings.accountName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">{t('hotelReservations.idrAccount')}:</span>
                  <span className="font-bold text-blue-600 font-sans">{companySettings.idrAccountNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">{t('hotelReservations.usdAccount')}:</span>
                  <span className="font-bold text-blue-600 font-sans">{companySettings.usdAccountNumber}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Footer Modal */}
          <div className="px-8 py-5 border-t border-slate-100 flex items-center justify-end bg-slate-50">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg transition-all cursor-pointer bg-white"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#242e69] hover:bg-[#1a2353] text-white font-bold rounded-lg transition-all shadow-sm hover:shadow cursor-pointer border-none"
              >
                {formType === 'Confirmation' ? t('hotelReservations.sendConfirmationRequest') : t('hotelReservations.createTentativeReservation')}
              </button>
            </div>
          </div>
        </form>

      </div>

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

export default NewReservationModal;
