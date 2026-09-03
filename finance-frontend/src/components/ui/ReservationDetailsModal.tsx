import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Booking } from '../../pages/HotelReservations';
import {
  formatDateDMY,
  formatCurrency,
  calculateNights,
  sanitizeRequestedBy
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
  const { t } = useTranslation();
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
              {t('hotelReservations.reservationDetails')}
            </h3>
            <p className="text-xs text-slate-400 font-semibold font-sans">
              {t('hotelReservations.reservationNumber')}: {selectedBooking.reservationNo}
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
              <h4 className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">{t('hotelReservations.billFrom')}</h4>
              <div className="border border-slate-100 rounded-xl p-5 bg-white space-y-3.5">
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-400 font-bold text-[9px] mb-1">{t('hotelReservations.employeeName')}</label>
                    <input
                      type="text"
                      disabled
                      value={sanitizeRequestedBy(selectedBooking.employeeName)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-500 bg-slate-50 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold text-[9px] mb-1">{t('hotelReservations.companyNumber')}</label>
                    <input
                      type="text"
                      disabled
                      value={selectedBooking.employeePhone || '-'}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-500 bg-slate-50 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold text-[9px] mb-1">{t('hotelReservations.employeeId')}</label>
                    <input
                      type="text"
                      disabled
                      value={selectedBooking.employeeId || '-'}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-500 bg-slate-50 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold text-[9px] mb-1">{t('hotelReservations.companyEmail')}</label>
                    <input
                      type="text"
                      disabled
                      value={selectedBooking.employeeEmail || '-'}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-500 bg-slate-50 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold text-[9px] mb-1">{t('hotelReservations.entityCompany')}</label>
                    <input
                      type="text"
                      disabled
                      value={selectedBooking.employeeEntity || '-'}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-500 bg-slate-50 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold text-[9px] mb-1">{t('hotelReservations.companyTaxNumber')}</label>
                    <input
                      type="text"
                      disabled
                      value={selectedBooking.companyTaxNo || '-'}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-500 bg-slate-50 font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* BILL TO Summary */}
            <div className="space-y-2 text-xs text-slate-800">
              <h4 className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">{t('hotelReservations.billTo')}</h4>
              <div className="border border-slate-100 rounded-xl p-5 bg-white space-y-3.5">
                <div className="space-y-3">
                  <div>
                    <p className="text-[9px] font-medium text-slate-400 uppercase">{t('hotelReservations.clientCompany')}</p>
                    <p className="font-bold text-slate-800 text-[13px] mt-0.5">{selectedBooking.custom_company_name || selectedBooking.companyName}</p>
                  </div>
                  {(selectedBooking.agent || selectedBooking.custom_agent) && (
                    <div>
                      <p className="text-[9px] font-medium text-slate-400 uppercase">{t('invoices.agent') || 'Agent'}</p>
                      <p className="font-bold text-slate-800 mt-0.5">{selectedBooking.agent || selectedBooking.custom_agent}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[9px] font-medium text-slate-400 uppercase">{t('hotelReservations.companyTaxNumber')}</p>
                    <p className="font-bold text-slate-800 mt-0.5">{selectedBooking.clientTaxNo || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-medium text-slate-400 uppercase">{t('hotelReservations.streetAddress')}</p>
                    <p className="font-medium text-slate-700 mt-0.5 leading-relaxed">{selectedBooking.clientAddress || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-medium text-slate-400 uppercase">{t('hotelReservations.cityCountry')}</p>
                    <p className="font-medium text-slate-700 mt-0.5 font-sans">{selectedBooking.clientCityCountry || '-'}</p>
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
                disabled
                value={selectedBooking.reservationNo}
                className="w-full p-2.5 border border-slate-200 rounded-lg font-bold text-slate-500 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">{t('hotelReservations.referenceNumber')}</label>
              <input
                type="text"
                disabled
                value={selectedBooking.referenceNo}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-500 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">{t('hotelReservations.serialNumber')}</label>
              <input
                type="text"
                disabled
                value={selectedBooking.serialNo}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-500 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold text-[9px] mb-1 uppercase tracking-wider">{t('hotelReservations.dueDate')}</label>
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
              <span className="bg-white px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('hotelReservations.preview')}</span>
            </div>
          </div>

          {/* SECTION: HOTEL DETAILS */}
          <div className="space-y-4 select-none mt-6">
            <h4 className="text-xs font-black text-slate-800 tracking-tight uppercase">{t('hotelReservations.hotelDetails').toUpperCase()}</h4>
            
            {/* Table */}
            <div className="border border-slate-200/70 rounded-2xl overflow-hidden bg-white w-full shadow-sm">
              <table className="w-full text-left font-sans border-collapse">
                <thead>
                  <tr className="bg-[#1d2857] text-white" style={{ backgroundColor: '#1d2857', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <th colSpan={12} className="py-2.5 px-3 text-center font-bold text-[12px] tracking-wider select-none bg-[#1d2857] text-white" style={{ backgroundColor: '#1d2857', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                      {t('hotelReservations.hotelDetails')}
                    </th>
                  </tr>
                  <tr className="bg-[#e0e8fe] text-[#1d2857] border-b border-slate-200 font-bold uppercase tracking-wider text-[8.5px] select-none" style={{ backgroundColor: '#e0e8fe', color: '#1d2857', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <th className="py-2 px-2 text-left" style={{ backgroundColor: '#e0e8fe', color: '#1d2857', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{t('hotelReservations.hotel')}</th>
                    <th className="py-2 px-1.5 text-left" style={{ backgroundColor: '#e0e8fe', color: '#1d2857', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{t('hotelReservations.roomType')}</th>
                    <th className="py-2 px-1 text-center whitespace-nowrap" style={{ backgroundColor: '#e0e8fe', color: '#1d2857', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{t('hotelReservations.checkIn')}</th>
                    <th className="py-2 px-1 text-center whitespace-nowrap" style={{ backgroundColor: '#e0e8fe', color: '#1d2857', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{t('hotelReservations.checkOut')}</th>
                    <th className="py-2 px-0.5 text-center whitespace-nowrap" style={{ backgroundColor: '#e0e8fe', color: '#1d2857', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{t('hotelReservations.numNight')}</th>
                    <th className="py-2 px-0.5 text-center whitespace-nowrap" style={{ backgroundColor: '#e0e8fe', color: '#1d2857', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{t('hotelReservations.numRoom')}</th>
                    <th className="py-2 px-0.5 text-center whitespace-nowrap" style={{ backgroundColor: '#e0e8fe', color: '#1d2857', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{t('hotelReservations.adult')}</th>
                    <th className="py-2 px-0.5 text-center whitespace-nowrap" style={{ backgroundColor: '#e0e8fe', color: '#1d2857', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{t('hotelReservations.child')}</th>
                    <th className="py-2 px-1 text-center whitespace-nowrap" style={{ backgroundColor: '#e0e8fe', color: '#1d2857', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{t('hotelReservations.meals')}</th>
                    <th className="py-2 px-1.5 text-right font-sans leading-tight" style={{ backgroundColor: '#e0e8fe', color: '#1d2857', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{t('hotelReservations.dayRate')}</th>
                    <th className="py-2 px-1.5 text-right font-sans leading-tight" style={{ backgroundColor: '#e0e8fe', color: '#1d2857', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{t('hotelReservations.mealsRate')}</th>
                    <th className="py-2 px-2 text-right font-sans whitespace-nowrap" style={{ backgroundColor: '#e0e8fe', color: '#1d2857', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{t('hotelReservations.total')}</th>
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
                        <td className="py-2.5 px-1 text-center font-bold text-slate-900 uppercase whitespace-nowrap">
                          {room.mealPlan ? (room.mealPlan.includes('FB') || room.mealPlan.includes('FULL') ? 'FB' : room.mealPlan.includes('HB') || room.mealPlan.includes('HALF') ? 'HB' : room.mealPlan.includes('BB') || room.mealPlan.includes('BREAKFAST') ? 'BB' : 'RO') : 'RO'}
                        </td>
                        <td className="py-2.5 px-1.5 text-right font-sans font-medium text-slate-800 whitespace-nowrap text-[9.5px]">{formatCurrency(room.pricePerNight, selectedBooking.currency)}</td>
                        <td className="py-2.5 px-1.5 text-right font-sans font-medium text-slate-800 whitespace-nowrap text-[9.5px]">{formatCurrency(room.mealRate, selectedBooking.currency)}</td>
                        <td className="py-2.5 px-2 text-right font-sans font-bold text-slate-900 whitespace-nowrap text-[10.5px]">{formatCurrency(roomTotal, selectedBooking.currency)}</td>
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
              const advPayment = parseFloat(String(selectedBooking.advancePayment || 0));
              const remaining = selectedBooking.remainingBalance !== undefined && selectedBooking.remainingBalance !== null 
                ? parseFloat(String(selectedBooking.remainingBalance))
                : Math.max(0, subtotalAmount - advPayment);

              return (
                <div className="mt-4 flex flex-col space-y-3 font-sans select-none px-2">
                  <div className="flex flex-col items-end space-y-1.5">
                    <div className="flex items-center justify-end space-x-8 text-[13px] text-slate-400 font-medium">
                      <span>{t('hotelReservations.subtotal')}:</span>
                      <span className="font-extrabold text-slate-900 text-sm">{formatCurrency(subtotalAmount, selectedBooking.currency)}</span>
                    </div>
                    {advPayment > 0 && (
                      <div className="flex items-center justify-end space-x-8 text-[13px] text-amber-700 font-medium">
                        <span>{t('hotelReservations.advancePayment')}:</span>
                        <span className="font-extrabold text-amber-800 text-sm">-{formatCurrency(advPayment, selectedBooking.currency)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-end space-x-8 text-xs text-slate-400 font-medium">
                      <span>{t('hotelReservations.taxVat')} (0%):</span>
                      <span className="font-bold text-slate-900">{formatCurrency(0, selectedBooking.currency)}</span>
                    </div>
                    <div className="flex items-center justify-end space-x-8 text-base pt-2 border-t border-slate-200/80 min-w-[280px] justify-between">
                      <span className="font-extrabold text-slate-900">{t('hotelReservations.remainingBalance')}:</span>
                      <span className="font-black text-emerald-600 text-lg">{formatCurrency(remaining, selectedBooking.currency)}</span>
                    </div>
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
        <div className="px-8 py-5 border-t border-slate-100 flex items-center justify-end bg-slate-50 text-xs">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold rounded-lg transition-all cursor-pointer bg-white"
            >
              {t('common.close')}
            </button>
            <button
              type="button"
              onClick={() => {
                setAlertModal({
                  isOpen: true,
                  title: t('common.success') || 'Success',
                  message: `${t('hotelReservations.sendConfirmation')} ${t('common.success') || 'berhasil dikirim!'}`,
                  type: 'success'
                });
              }}
              className="px-5 py-2 border border-blue-200 text-blue-600 hover:bg-blue-50 font-bold rounded-lg transition-all cursor-pointer bg-white"
            >
              {t('hotelReservations.sendConfirmationRequest')}
            </button>
            <button
              type="button"
              onClick={() => {
                window.print();
              }}
              className="px-6 py-2 bg-[#242e69] hover:bg-[#1a2353] text-white font-bold rounded-lg transition-all shadow-sm cursor-pointer border-none"
            >
              {t('hotelReservations.viewPdf')}
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
