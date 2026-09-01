import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { Booking, BookingRoom } from '../../pages/HotelReservations';
import {
  CLIENT_COMPANIES,
  calculateNights,
  formatDateDMY,
  getRoomPrice
} from '../../pages/HotelReservations';
import AlertModal from './AlertModal';
import { getRoomTypes, getMealTypes } from '../../services/settingService';
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
  const { user } = useAuth();
  const previewSectionRef = useRef<HTMLDivElement>(null);

  // Employee/Sender Fields (Bill From)
  const [formEmpName, setFormEmpName] = useState('Dimas Alva Rizki');
  const [formCompNumber, setFormCompNumber] = useState('+62 8111 1203 330');
  const [formEmpId, setFormEmpId] = useState('UMP-111');
  const [formCompEmail, setFormCompEmail] = useState('alvarizkidimas@gmail.com');
  const [formEntity, setFormEntity] = useState('PT.ODST AIRLINES IND');
  const [formCompTax, setFormCompTax] = useState('0000-0000-0001');

  // Dynamically set Bill From fields from the logged-in user and company settings
  useEffect(() => {
    if (user) {
      setFormEmpName(user.name || 'Dimas Alva Rizki');
      setFormEmpId(user.employeeId || 'UMP-111');
      setFormCompNumber(companySettings?.phone || user.phone || '+62 8111 1203 330');
      setFormCompEmail(user.email || 'alvarizkidimas@gmail.com');
      setFormEntity(companySettings?.companyName || 'PT.ODST AIRLINES IND');
      setFormCompTax(companySettings?.taxNumber || '0000-0000-0001');
    }
  }, [user, isOpen, companySettings]);

  // States
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success' as 'success' | 'error' | 'info'
  });
  const [selectedClientId, setSelectedClientId] = useState('c-1');
  const [invoiceMeta, setInvoiceMeta] = useState({
    invoiceNo: '',
    referenceNo: '',
    serialNo: '',
    dueDate: '2026-09-09'
  });
  const taxRate = 0;

  const [currentRoom, setCurrentRoom] = useState({
    hotelName: 'SAFWAT AL MADINAH',
    roomType: 'TRIPLE',
    checkIn: '2026-09-05',
    checkOut: '2026-09-10',
    roomCount: 3,
    adults: 9,
    children: 0,
    mealPlan: 'FAREAST FULL BOARD',
    pricePerNight: 225.00,
    mealRate: 40.00
  });

  const [dbRoomTypes, setDbRoomTypes] = useState<{ id: string; name: string; status: string }[]>([]);
  const [dbMealTypes, setDbMealTypes] = useState<{ id: string; name: string; status: string }[]>([]);

  const [formAddedRooms, setFormAddedRooms] = useState<BookingRoom[]>([]);
  const [formCurrency, setFormCurrency] = useState<'USD' | 'SAR' | 'IDR'>('USD');

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
    if (isOpen) {
      const client = CLIENT_COMPANIES.find(c => c.id === selectedClientId) || CLIENT_COMPANIES[0];
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
  }, [selectedClientId, invoiceMeta.dueDate, isOpen, bookings]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormAddedRooms([]);
      setSelectedClientId('c-1');
      setCurrentRoom({
        hotelName: 'SAFWAT AL MADINAH',
        roomType: 'TRIPLE',
        checkIn: '',
        checkOut: '',
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

    // Reset upper info (Reservation Details input fields)
    setCurrentRoom({
      hotelName: 'SAFWAT AL MADINAH',
      roomType: 'TRIPLE',
      checkIn: '',
      checkOut: '',
      roomCount: 1,
      adults: 1,
      children: 0,
      mealPlan: 'FAREAST FULL BOARD',
      pricePerNight: 100,
      mealRate: 0
    });

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
    
    const client = CLIENT_COMPANIES.find(c => c.id === selectedClientId) || CLIENT_COMPANIES[0];

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
      sarToIdrRate: configuredRates.sarToIdr
    };

    onSave(newBooking);
  };

  if (!isOpen) return null;

  const client = CLIENT_COMPANIES.find(c => c.id === selectedClientId) || CLIENT_COMPANIES[0];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm select-none">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden animate-fade-in border border-slate-100 flex flex-col max-h-[95vh] text-[13px] text-slate-700">
        
        {/* Header Modal */}
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex flex-col space-y-0.5">
            <h3 className="text-lg font-black text-slate-800 font-sans">
              Create New Hotel Reservation
            </h3>
            <p className="text-xs text-slate-400 font-semibold font-sans">
              Stay Type: <span className="text-blue-600 font-bold uppercase">{formType} Reservation</span>
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
              <label className="block text-slate-400 font-bold text-[9px] uppercase tracking-wider">BILL TO (CLIENT)</label>
              <select
                value={selectedClientId}
                onChange={e => setSelectedClientId(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 bg-white cursor-pointer font-bold"
              >
                {CLIENT_COMPANIES.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.displayName}
                  </option>
                ))}
              </select>
              <p className="text-[11.5px] text-slate-400 font-medium">
                {client.address}, {client.cityCountry}
              </p>
            </div>

            {/* SECTION: BILL FROM / BILL TO ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* BILL FROM */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">BILL FROM</h4>
                <div className="border border-slate-100 rounded-xl p-5 bg-white space-y-3.5">
                  <div className="grid grid-cols-2 gap-3.5 text-[13px] font-sans">
                    <div>
                      <label className="block text-slate-400 font-bold text-[9px] mb-1">
                        Employee Name
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
                        Company Number
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
                        Employee ID
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
                        Company Email
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
                        Entity / Company
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
                        Company Tax Number
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
                <h4 className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">BILL TO</h4>
                <div className="border border-slate-100 rounded-xl p-5 bg-white space-y-3.5">
                  <div className="space-y-3">
                    <div>
                      <p className="text-[9px] font-medium text-slate-400 uppercase">Client Company</p>
                      <p className="font-bold text-slate-800 text-[13px] mt-0.5">{client.companyName}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-medium text-slate-400 uppercase">Company Tax Number</p>
                      <p className="font-bold text-slate-800 mt-0.5">{client.taxNo}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-medium text-slate-400 uppercase">Street Address</p>
                      <p className="font-medium text-slate-700 mt-0.5 leading-relaxed">{client.address}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-medium text-slate-400 uppercase">City / Country</p>
                      <p className="font-bold text-slate-800 mt-0.5">{client.cityCountry}</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>



            {/* SECTION: METADATA INPUTS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">Invoice Number</label>
                <input
                  type="text"
                  required
                  value={invoiceMeta.invoiceNo}
                  onChange={e => setInvoiceMeta(prev => ({ ...prev, invoiceNo: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 rounded-lg font-bold text-slate-800 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">Reference Number</label>
                <input
                  type="text"
                  required
                  value={invoiceMeta.referenceNo}
                  onChange={e => setInvoiceMeta(prev => ({ ...prev, referenceNo: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">Serial Number</label>
                <input
                  type="text"
                  required
                  value={invoiceMeta.serialNo}
                  onChange={e => setInvoiceMeta(prev => ({ ...prev, serialNo: e.target.value }))}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">Due Date</label>
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
              <h4 className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">RESERVATION DETAILS</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">Hotel Name</label>
                  <select
                    value={currentRoom.hotelName}
                    onChange={e => setCurrentRoom(prev => ({ ...prev, hotelName: e.target.value }))}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 bg-white cursor-pointer"
                  >
                    <option value="SAFWAT AL MADINAH">SAFWAT AL MADINAH</option>
                    <option value="Grand Hyatt Jakarta">Grand Hyatt Jakarta</option>
                    <option value="Sheraton Surabaya">Sheraton Surabaya</option>
                    <option value="The Ritz-Carlton Mega Kuningan">The Ritz-Carlton Mega Kuningan</option>
                    <option value="JW Marriott Medan">JW Marriott Medan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">Room Type</label>
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
                  <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">Check-In Date</label>
                  <input
                    type="date"
                    required
                    value={currentRoom.checkIn}
                    onChange={e => setCurrentRoom(prev => ({ ...prev, checkIn: e.target.value }))}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 bg-white font-sans font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">Check-Out Date</label>
                  <input
                    type="date"
                    required
                    value={currentRoom.checkOut}
                    onChange={e => setCurrentRoom(prev => ({ ...prev, checkOut: e.target.value }))}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 bg-white font-sans font-bold"
                  />
                </div>
              </div>

              {/* Counts */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">#Nights (Duration)</label>
                  <input
                    type="text"
                    disabled
                    value={calculateNights(currentRoom.checkIn, currentRoom.checkOut)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-500 bg-slate-50 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">#Rooms</label>
                  <input
                    type="number"
                    min={1}
                    value={currentRoom.roomCount}
                    onChange={e => setCurrentRoom(prev => ({ ...prev, roomCount: Math.max(1, Number(e.target.value)) }))}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">Adults Count</label>
                  <input
                    type="number"
                    min={1}
                    value={currentRoom.adults}
                    onChange={e => setCurrentRoom(prev => ({ ...prev, adults: Math.max(1, Number(e.target.value)) }))}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">Children Count</label>
                  <input
                    type="number"
                    min={0}
                    value={currentRoom.children}
                    onChange={e => setCurrentRoom(prev => ({ ...prev, children: Math.max(0, Number(e.target.value)) }))}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 bg-white"
                  />
                </div>
              </div>

              {/* Meals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">Meal Plan</label>
                  <select
                    value={currentRoom.mealPlan}
                    onChange={e => setCurrentRoom(prev => ({ ...prev, mealPlan: e.target.value }))}
                    className="w-full p-3 border border-slate-200 rounded-lg text-slate-800 bg-white cursor-pointer"
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
                  <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">Meal Rate</label>
                  <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                    <select
                      value={formCurrency}
                      onChange={e => setFormCurrency(e.target.value as any)}
                      className="border-none bg-transparent py-3 pl-3 pr-8 focus:outline-none cursor-pointer font-bold text-slate-700"
                    >
                      <option value="USD">USD</option>
                      <option value="SAR">SAR</option>
                      <option value="IDR">IDR</option>
                    </select>
                    <div className="w-[1px] h-6 bg-slate-200" />
                    <input
                      type="number"
                      min={0}
                      value={currentRoom.mealRate}
                      onChange={e => setCurrentRoom(prev => ({ ...prev, mealRate: Math.max(0, Number(e.target.value)) }))}
                      className="flex-1 border-none py-3 px-3 focus:outline-none text-slate-800 font-bold text-[13px]"
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
                <span>Add Room</span>
              </button>
            </div>

            {/* SECTION: PREVIEW & CURRENCY SELECT */}
            <div ref={previewSectionRef} className="relative my-8 select-none">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-200 border-solid"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Preview</span>
              </div>
            </div>

            <div className="flex justify-between items-center mb-4 select-none">
              <h4 className="text-[13px] font-black text-slate-800 tracking-tight uppercase">HOTEL DETAILS</h4>
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
            <div className="border border-slate-200 border-solid rounded-xl overflow-x-auto shadow-sm bg-white">
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead>
                  <tr className="bg-[#1e293b] text-white">
                    <th colSpan={12} className="py-2.5 px-4 text-center font-bold text-[12px] uppercase tracking-wider select-none bg-[#1e293b] text-white">
                      Hotel Details
                    </th>
                  </tr>
                  <tr className="bg-[#f8fafc] text-slate-500 border-b border-slate-200 border-solid font-bold uppercase tracking-wider text-[10px] select-none">
                    <th className="py-3 px-4 min-w-[150px] whitespace-nowrap">Hotel</th>
                    <th className="py-3 px-3 min-w-[120px] whitespace-nowrap">Room Type</th>
                    <th className="py-3 px-3 min-w-[100px] whitespace-nowrap">Check-In</th>
                    <th className="py-3 px-3 min-w-[100px] whitespace-nowrap">Check-Out</th>
                    <th className="py-3 px-2 text-center min-w-[65px] whitespace-nowrap">#Night</th>
                    <th className="py-3 px-2 text-center min-w-[65px] whitespace-nowrap">#Room</th>
                    <th className="py-3 px-2 text-center min-w-[60px] whitespace-nowrap">Adult</th>
                    <th className="py-3 px-2 text-center min-w-[60px] whitespace-nowrap">Child</th>
                    <th className="py-3 px-3 min-w-[140px] whitespace-nowrap">Meals</th>
                    <th className="py-3 px-3 text-right min-w-[95px] whitespace-nowrap">DayRate</th>
                    <th className="py-3 px-4 text-right min-w-[95px] whitespace-nowrap">Meals Rate</th>
                    <th className="py-3 px-4 text-center min-w-[70px] whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[#334155] font-semibold text-[11.5px]">
                  {formAddedRooms.length === 0 ? (
                    <tr className="hover:bg-slate-50/20">
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">{currentRoom.hotelName}</td>
                      <td className="py-3.5 px-3 text-slate-700 whitespace-nowrap">{currentRoom.roomType}</td>
                      <td className="py-3.5 px-3 font-sans text-slate-600 whitespace-nowrap">{currentRoom.checkIn ? formatDateDMY(currentRoom.checkIn) : '-'}</td>
                      <td className="py-3.5 px-3 font-sans text-slate-600 whitespace-nowrap">{currentRoom.checkOut ? formatDateDMY(currentRoom.checkOut) : '-'}</td>
                      <td className="py-3.5 px-2 text-center text-blue-600 font-bold whitespace-nowrap">{calculateNights(currentRoom.checkIn, currentRoom.checkOut)}</td>
                      <td className="py-3.5 px-2 text-center font-semibold whitespace-nowrap">{currentRoom.roomCount}</td>
                      <td className="py-3.5 px-2 text-center font-semibold whitespace-nowrap">{currentRoom.adults}</td>
                      <td className="py-3.5 px-2 text-center font-semibold whitespace-nowrap">{currentRoom.children}</td>
                      <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">{currentRoom.mealPlan}</td>
                      <td className="py-3.5 px-3 text-right font-sans font-bold text-slate-800 whitespace-nowrap">{getRoomPrice(currentRoom.hotelName, currentRoom.roomType).toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-right font-sans font-bold text-slate-800 whitespace-nowrap">{currentRoom.mealRate.toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex px-2 py-0.5 text-[9px] font-bold text-slate-400 bg-slate-100 rounded">Draft</span>
                      </td>
                    </tr>
                  ) : (
                    formAddedRooms.map((room, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/40">
                        <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">{room.hotelName}</td>
                        <td className="py-3.5 px-3 text-slate-700 whitespace-nowrap">{room.roomType}</td>
                        <td className="py-3.5 px-3 font-sans text-slate-600 whitespace-nowrap">{formatDateDMY(room.checkIn)}</td>
                        <td className="py-3.5 px-3 font-sans text-slate-600 whitespace-nowrap">{formatDateDMY(room.checkOut)}</td>
                        <td className="py-3.5 px-2 text-center text-blue-600 font-bold whitespace-nowrap">{room.nights}</td>
                        <td className="py-3.5 px-2 text-center font-semibold whitespace-nowrap">{room.roomCount}</td>
                        <td className="py-3.5 px-2 text-center font-semibold whitespace-nowrap">{room.adults}</td>
                        <td className="py-3.5 px-2 text-center font-semibold whitespace-nowrap">{room.children}</td>
                        <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">{room.mealPlan}</td>
                        <td className="py-3.5 px-3 text-right font-sans font-bold text-slate-800 whitespace-nowrap">{room.pricePerNight.toFixed(2)}</td>
                        <td className="py-3.5 px-4 text-right font-sans font-bold text-slate-800 whitespace-nowrap">{room.mealRate.toFixed(2)}</td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleDeleteRoom(idx)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded transition-colors border-none bg-transparent cursor-pointer"
                            title="Delete room"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>



            {/* SECTION: PAYMENT INSTRUCTIONS Rekening DST */}
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <h4 className="text-[13px] font-extrabold text-[#0f172a] uppercase tracking-wider">PAYMENT INSTRUCTIONS</h4>
              
              <div className="bg-[#f8fafc] p-6 border border-slate-200/80 rounded-xl space-y-3.5 text-[13px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Bank Name:</span>
                  <span className="font-bold text-slate-800">{companySettings.bankName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Account Name:</span>
                  <span className="font-bold text-slate-800">{companySettings.accountName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">IDR Account Number:</span>
                  <span className="font-bold text-blue-600 font-sans">{companySettings.idrAccountNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">USD Account Number:</span>
                  <span className="font-bold text-blue-600 font-sans">{companySettings.usdAccountNumber}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Footer Modal */}
          <div className="px-8 py-5 border-t border-slate-100 flex items-center justify-between bg-slate-50">
            <span className="text-[11.5px] text-slate-400 font-medium">* Draft auto-saved on system</span>
            
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg transition-all cursor-pointer bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#242e69] hover:bg-[#1a2353] text-white font-bold rounded-lg transition-all shadow-sm hover:shadow cursor-pointer border-none"
              >
                {formType === 'Confirmation' ? 'Send Confirmation Request' : 'Create Tentative Reservation'}
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
