import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { Booking } from '../../pages/HotelReservations';
import {
  formatDateDMY,
  formatCurrency,
  calculateNights
} from '../../pages/HotelReservations';
import AlertModal from './AlertModal';

interface ReservationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBooking: Booking | null;
  companySettings: {
    bankName: string;
    accountName: string;
    idrAccountNumber: string;
    usdAccountNumber: string;
  };
  handleApproveKarim: (id: string) => void;
  handleDeleteBooking: (id: string) => void;
}

const ReservationDetailsModal: React.FC<ReservationDetailsModalProps> = ({
  isOpen,
  onClose,
  selectedBooking,
  companySettings
}) => {
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success' as 'success' | 'error' | 'info'
  });

  if (!isOpen || !selectedBooking) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm select-none">
      <div className="bg-white rounded-2xl max-w-6xl w-full shadow-2xl overflow-hidden animate-fade-in border border-slate-100 flex flex-col max-h-[95vh] text-[13px] text-slate-700">
        
        {/* Header Modal */}
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex flex-col space-y-0.5">
            <h3 className="text-lg font-black text-slate-800 font-sans">
              Reservation Details
            </h3>
            <p className="text-xs text-slate-400 font-semibold font-sans">
              Detail Invoice Ref: {selectedBooking.reservationNo}
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
        <div className="p-8 space-y-6 overflow-y-auto flex-1 font-sans text-xs">
          
          {/* SECTION: BILL FROM / BILL TO ROW */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* BILL FROM (Read Only) */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">BILL FROM</h4>
              <div className="border border-slate-100 rounded-xl p-5 bg-white space-y-3.5">
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-400 font-bold text-[9px] mb-1">Employee Name</label>
                    <input
                      type="text"
                      disabled
                      value={selectedBooking.employeeName || 'Dimas Alva Rizki'}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-500 bg-slate-50 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold text-[9px] mb-1">Company Number</label>
                    <input
                      type="text"
                      disabled
                      value={selectedBooking.employeePhone || '+62 8111 1203 330'}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-500 bg-slate-50 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold text-[9px] mb-1">Employee ID</label>
                    <input
                      type="text"
                      disabled
                      value={selectedBooking.employeeId || 'UMP-111'}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-500 bg-slate-50 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold text-[9px] mb-1">Company Email</label>
                    <input
                      type="text"
                      disabled
                      value={selectedBooking.employeeEmail || 'alvarizkidimas@gmail.com'}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-500 bg-slate-50 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold text-[9px] mb-1">Entity / Company</label>
                    <input
                      type="text"
                      disabled
                      value={selectedBooking.employeeEntity || 'PT.ODST AIRLINES IND'}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-500 bg-slate-50 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold text-[9px] mb-1">Company Tax Number</label>
                    <input
                      type="text"
                      disabled
                      value={selectedBooking.companyTaxNo || '0000-0000-0001'}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-500 bg-slate-50 font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* BILL TO Summary */}
            <div className="space-y-2 text-xs text-slate-800">
              <h4 className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">BILL TO</h4>
              <div className="border border-slate-100 rounded-xl p-5 bg-white space-y-3.5">
                <div className="space-y-3">
                  <div>
                    <p className="text-[9px] font-medium text-slate-400 uppercase">Client Company</p>
                    <p className="font-bold text-slate-800 text-[13px] mt-0.5">{selectedBooking.companyName}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-medium text-slate-400 uppercase">Company Tax Number</p>
                    <p className="font-bold text-slate-800 mt-0.5">{selectedBooking.clientTaxNo || '0000-0000-0000'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-medium text-slate-400 uppercase">Street Address</p>
                    <p className="font-medium text-slate-700 mt-0.5 leading-relaxed">{selectedBooking.clientAddress || 'Menara Kencana, FI 18, JL. Sudirman No. 45'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-medium text-slate-400 uppercase">City / Country</p>
                    <p className="font-bold text-slate-800 mt-0.5">{selectedBooking.clientCityCountry || 'Jakarta, Indonesia 10210'}</p>
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
                disabled
                value={selectedBooking.reservationNo}
                className="w-full p-2.5 border border-slate-200 rounded-lg font-bold text-slate-500 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">Reference Number</label>
              <input
                type="text"
                disabled
                value={selectedBooking.referenceNo}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-500 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">Serial Number</label>
              <input
                type="text"
                disabled
                value={selectedBooking.serialNo}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-500 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">Due Date</label>
              <input
                type="text"
                disabled
                value={formatDateDMY(selectedBooking.dueDate)}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-500 bg-slate-50 font-sans font-bold"
              />
            </div>
          </div>

          {/* SECTION: PREVIEW / HOTEL DETAILS */}
          <div className="relative my-8 select-none">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-200 border-solid"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Preview</span>
            </div>
          </div>

          {/* SECTION: ACCOMMODATIONS BREAKDOWN */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4 select-none">
            <h4 className="text-base font-extrabold text-[#0f172a] font-sans">Accommodations Breakdown</h4>
            
            {/* Table */}
            <div className="border border-slate-200/70 rounded-2xl overflow-hidden bg-white w-full">
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead>
                  <tr className="bg-[#f8fafc] text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider text-[9.5px] select-none">
                    <th className="py-3 px-3.5 whitespace-nowrap">HOTEL</th>
                    <th className="py-3 px-2 whitespace-nowrap">ROOM TYPE</th>
                    <th className="py-3 px-2 whitespace-nowrap">CHECK IN</th>
                    <th className="py-3 px-2 whitespace-nowrap">CHECK OUT</th>
                    <th className="py-3 px-1.5 text-center whitespace-nowrap">NIGHTS</th>
                    <th className="py-3 px-1.5 text-center whitespace-nowrap">ROOMS</th>
                    <th className="py-3 px-1.5 text-center whitespace-nowrap">ADULT</th>
                    <th className="py-3 px-1.5 text-center whitespace-nowrap">CHILD</th>
                    <th className="py-3 px-2 whitespace-nowrap">MEALS</th>
                    <th className="py-3 px-2 text-right font-sans whitespace-nowrap">RATE</th>
                    <th className="py-3 px-3 text-right font-sans whitespace-nowrap">MEAL RATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[#334155] font-semibold text-[10.5px]">
                  {selectedBooking.rooms.map((room, idx) => {
                    const nights = room.nights || calculateNights(room.checkIn, room.checkOut);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/40">
                        <td className="py-3.5 px-3.5 font-bold text-slate-900 leading-tight">{room.hotelName}</td>
                        <td className="py-3.5 px-2 text-slate-700 leading-tight">{room.roomType}</td>
                        <td className="py-3.5 px-2 font-sans text-slate-600 text-[10px]">{formatDateDMY(room.checkIn)}</td>
                        <td className="py-3.5 px-2 font-sans text-slate-600 text-[10px]">{formatDateDMY(room.checkOut)}</td>
                        <td className="py-3.5 px-1.5 text-center text-blue-600 font-bold">{nights}</td>
                        <td className="py-3.5 px-1.5 text-center font-semibold">{room.roomCount}</td>
                        <td className="py-3.5 px-1.5 text-center font-semibold">{room.adults}</td>
                        <td className="py-3.5 px-1.5 text-center font-semibold">{room.children}</td>
                        <td className="py-3.5 px-2 text-slate-600 text-[10px] leading-tight">{room.mealPlan}</td>
                        <td className="py-3.5 px-2 text-right font-sans font-bold text-slate-800">{formatCurrency(room.pricePerNight, selectedBooking.currency)}</td>
                        <td className="py-3.5 px-3 text-right font-sans font-bold text-slate-800">{formatCurrency(room.mealRate, selectedBooking.currency)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Subtotal & Total Due summary */}
            {(() => {
              const subtotalAmount = selectedBooking.rooms.reduce((sum, room) => {
                const nights = room.nights || calculateNights(room.checkIn, room.checkOut);
                return sum + ((room.pricePerNight + room.mealRate) * room.roomCount * nights);
              }, 0);
              return (
                <div className="mt-4 flex flex-col items-end space-y-1.5 font-sans select-none px-2">
                  <div className="flex items-center justify-end space-x-8 text-[13px] text-slate-400 font-medium">
                    <span>Subtotal:</span>
                    <span className="font-extrabold text-slate-900 text-sm">{formatCurrency(subtotalAmount, selectedBooking.currency)}</span>
                  </div>
                  <div className="flex items-center justify-end space-x-8 text-xs text-slate-400 font-medium">
                    <span>Tax / VAT (0%):</span>
                    <span className="font-bold text-slate-900">{formatCurrency(0, selectedBooking.currency)}</span>
                  </div>
                  <div className="flex items-center justify-end space-x-8 text-base pt-2 border-t border-slate-200/80 min-w-[240px] justify-between">
                    <span className="font-extrabold text-slate-900">Total Due:</span>
                    <span className="font-black text-emerald-600 text-lg">{formatCurrency(subtotalAmount, selectedBooking.currency)}</span>
                  </div>
                </div>
              );
            })()}
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
        <div className="px-8 py-5 border-t border-slate-100 flex items-center justify-end bg-slate-50 text-xs">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold rounded-lg transition-all cursor-pointer bg-white"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                setAlertModal({
                  isOpen: true,
                  title: 'Success',
                  message: 'Confirmation email sent successfully to guest!',
                  type: 'success'
                });
              }}
              className="px-5 py-2 border border-blue-200 text-blue-600 hover:bg-blue-50 font-bold rounded-lg transition-all cursor-pointer bg-white"
            >
              Send Confirmation Request
            </button>
            <button
              type="button"
              onClick={() => {
                window.print();
              }}
              className="px-6 py-2 bg-[#242e69] hover:bg-[#1a2353] text-white font-bold rounded-lg transition-all shadow-sm cursor-pointer border-none"
            >
              View PDF
            </button>
          </div>
        </div>

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

export default ReservationDetailsModal;
