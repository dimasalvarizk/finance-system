import React from 'react';
import type { Booking } from '../../pages/HotelReservations';
import odstLogo from '../../assets/odstlogo.png';

interface Props {
  booking: Booking;
  rates: {
    usdToIdr: number;
    sarToIdr: number;
    usdToSar: number;
  };
  taxRate: number;
}

const formatDateToDMY = (dateStr: string): string => {
  if (!dateStr) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
};

const formatCurrency = (val: number, currency: string) => {
  if (currency === 'IDR') {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 })
      .format(val)
      .replace('Rp', 'Rp ');
  }
  if (currency === 'SAR') {
    return 'SAR ' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  }
  return '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
};

const HotelReservationPrint: React.FC<Props> = ({ booking, rates, taxRate }) => {
  const isTentative = booking.status === 'Tentative';
  
  // Calculate Subtotal & Totals
  let subtotal = 0;
  booking.rooms.forEach(r => {
    const roomSub = r.roomCount * r.nights * (r.pricePerNight + r.mealRate);
    subtotal += roomSub;
  });

  const taxAmount = (subtotal * taxRate) / 100;
  const totalDue = subtotal + taxAmount;

  // Convert to IDR & SAR
  const usdToIdr = booking.usdToIdrRate || rates.usdToIdr || 18025;
  const sarToIdr = booking.sarToIdrRate || rates.sarToIdr || 4800;

  let totalDueIDR = 0;
  let totalDueSAR = 0;

  if (booking.currency === 'USD') {
    totalDueIDR = totalDue * usdToIdr;
    totalDueSAR = totalDueIDR / sarToIdr;
  } else if (booking.currency === 'SAR') {
    totalDueSAR = totalDue;
    totalDueIDR = totalDue * sarToIdr;
  } else {
    // IDR
    totalDueIDR = totalDue;
    totalDueSAR = totalDueIDR / sarToIdr;
  }

  const currentDate = new Date().toLocaleDateString('en-GB');

  return (
    <div id="hotel-reservation-print-area" className="hidden print:block w-full bg-white p-4 font-sans text-slate-800">
      {/* Print Stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #hotel-reservation-print-area, #hotel-reservation-print-area * {
            visibility: visible;
          }
          #hotel-reservation-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
            background: white;
          }
          @page {
            size: A4;
            margin: 12mm 15mm 12mm 15mm;
          }
        }
      `}</style>

      <div className="w-full max-w-3xl mx-auto bg-white p-0 shadow-none border-none min-h-[250mm] flex flex-col justify-between text-xs leading-normal">
        <div>
          {/* Header */}
          <div className="pb-3 border-b border-slate-200">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1.5">
                <img
                  src={odstLogo}
                  alt="Logo"
                  className="h-11 w-auto object-contain self-start"
                />
                <div className="mt-1 text-[9px] text-slate-400 leading-relaxed font-sans">
                  CBC Tower G, Jl. Cengkareng Business City Jl. Kp. Rw. Bokor
                  <br />
                  Pocal, RT.006/RW.007, Benda, Kec. Benda, Kota Tangerang, Banten
                  <br />
                  15125
                </div>
              </div>

              <div className="text-right">
                <h1 className="text-lg font-extrabold text-slate-800 tracking-wide font-sans">
                  HOTEL RESERVATION
                </h1>
                <p className="text-[10px] text-slate-400 mt-1 font-sans">
                  Reservation No:{" "}
                  <span className="text-slate-800 font-bold font-sans ml-1">
                    {booking.reservationNo}
                  </span>
                </p>
                <div className="flex items-center justify-end gap-1.5 mt-1 select-none">
                  {isTentative ? (
                    <span className="px-2.5 py-0.5 text-[8px] font-bold text-orange-600 border border-solid border-orange-200 bg-orange-50 rounded">
                      TENTATIVE RESERVATION
                    </span>
                  ) : (
                    <>
                      <span className="px-2.5 py-0.5 text-[8px] font-bold text-emerald-600 border border-solid border-emerald-200 bg-emerald-50 rounded">
                        CONFIRMED
                      </span>
                      {booking.confirmationNo && (
                        <span className="px-2.5 py-0.5 text-[8px] font-bold text-slate-500 border border-solid border-slate-200 bg-slate-50 rounded">
                          {booking.confirmationNo}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bill From / To */}
          <div className="mt-4 grid grid-cols-2 gap-6">
            {/* Bill From */}
            <div className="bg-slate-50/50 border border-solid border-slate-100 rounded-xl p-4 space-y-2">
              <h2 className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                BILL FROM
              </h2>
              <div className="grid grid-cols-2 gap-2 text-[10px] leading-relaxed">
                <div>
                  <p className="text-slate-400 font-medium">Employee Name</p>
                  <p className="font-bold text-slate-800 text-[11px]">{booking.employeeName}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Company Number</p>
                  <p className="font-bold text-slate-800 text-[11px]">{booking.employeePhone}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Employee ID</p>
                  <p className="font-bold text-slate-800 text-[11px]">{booking.employeeId}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Company Email</p>
                  <p className="font-bold text-slate-800 text-[11px]">{booking.employeeEmail}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400 font-medium">Entity / Company</p>
                  <p className="font-bold text-slate-800 text-[11px]">{booking.employeeEntity}</p>
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div className="bg-slate-50/50 border border-solid border-slate-100 rounded-xl p-4 space-y-2">
              <h2 className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                BILL TO
              </h2>
              <div className="grid grid-cols-2 gap-2 text-[10px] leading-relaxed">
                <div className="col-span-2">
                  <p className="text-slate-400 font-medium">Company Name</p>
                  <p className="font-bold text-slate-800 text-[11px]">{booking.companyName}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400 font-medium">Street Address</p>
                  <p className="font-bold text-slate-800 text-[11px]">{booking.clientAddress}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">City / Country</p>
                  <p className="font-bold text-slate-800 text-[11px]">{booking.clientCityCountry}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Contact Reference</p>
                  <p className="font-bold text-slate-800 text-[11px]">{booking.clientTaxNo}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Hotel Details Table */}
          <div className="mt-4">
            <h2 className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase mb-2">
              HOTEL DETAILS
            </h2>
            <div className="border border-solid border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-[9px] font-sans">
                <thead>
                  <tr className="bg-[#1e293b] text-white font-bold text-[9px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Hotel</th>
                    <th className="py-2.5 px-2">Room Type</th>
                    <th className="py-2.5 px-2">Check-In</th>
                    <th className="py-2.5 px-2">Check-Out</th>
                    <th className="py-2.5 px-1 text-center">#Night</th>
                    <th className="py-2.5 px-1 text-center">#Room</th>
                    <th className="py-2.5 px-1 text-center">Adult</th>
                    <th className="py-2.5 px-1 text-center">Child</th>
                    <th className="py-2.5 px-2">Meals</th>
                    <th className="py-2.5 px-2 text-right">DayRate</th>
                    <th className="py-2.5 px-3 text-right">Meals Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                  {booking.rooms.map((room, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-semibold text-slate-800 uppercase">{room.hotelName}</td>
                      <td className="py-2 px-2 uppercase">{room.roomType}</td>
                      <td className="py-2 px-2">{formatDateToDMY(room.checkIn)}</td>
                      <td className="py-2 px-2">{formatDateToDMY(room.checkOut)}</td>
                      <td className="py-2 px-1 text-center">{room.nights}</td>
                      <td className="py-2 px-1 text-center">{room.roomCount}</td>
                      <td className="py-2 px-1 text-center">{room.adults}</td>
                      <td className="py-2 px-1 text-center">{room.children}</td>
                      <td className="py-2 px-2 uppercase">{room.mealPlan}</td>
                      <td className="py-2 px-2 text-right font-medium">
                        {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(room.pricePerNight)}
                      </td>
                      <td className="py-2 px-3 text-right font-medium">
                        {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(room.mealRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment & Invoice Summary */}
          <div className="mt-4 grid grid-cols-12 gap-6">
            {/* Payment Instructions */}
            <div className="col-span-7 bg-blue-50/20 border border-solid border-blue-100/50 rounded-xl p-4 space-y-2">
              <h2 className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                PAYMENT INSTRUCTIONS
              </h2>
              <div className="space-y-1.5 text-[10px] font-sans">
                <div className="flex justify-between border-b border-dashed border-slate-100 pb-1">
                  <span className="text-slate-500">Bank Name:</span>
                  <span className="font-bold text-slate-800">Danamon</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-100 pb-1">
                  <span className="text-slate-500">Account Name:</span>
                  <span className="font-bold text-slate-800">PT ODST Airlines Indo</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-100 pb-1">
                  <span className="text-slate-500">IDR Account Number:</span>
                  <span className="font-bold text-blue-600 font-mono">102-8829-011</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">USD Account Number:</span>
                  <span className="font-bold text-blue-600 font-mono">102-8829-022</span>
                </div>
              </div>
            </div>

            {/* Invoice Summary */}
            <div className="col-span-5 bg-slate-50/50 border border-solid border-slate-100 rounded-xl p-4 space-y-2.5">
              <h2 className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                INVOICE SUMMARY
              </h2>
              <div className="space-y-2 text-[11px] font-sans">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold">{formatCurrency(subtotal, booking.currency)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Tax / VAT ({taxRate}%)</span>
                  <span className="font-semibold">{formatCurrency(taxAmount, booking.currency)}</span>
                </div>
                <div className="border-t border-solid border-slate-200 my-1.5" />
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800">Total Due</span>
                  <span className="font-extrabold text-orange-600 text-sm">
                    {formatCurrency(totalDue, booking.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Exchange Rate */}
          <div className="mt-4">
            <h2 className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase mb-2">
              EXCHANGE RATE
            </h2>
            <div className="bg-slate-50/50 border border-solid border-slate-100 rounded-xl p-4 space-y-2 text-[10px] font-sans">
              <div className="flex justify-between border-b border-solid border-slate-100 pb-1.5 text-slate-600">
                <span>1 USD = {new Intl.NumberFormat('id-ID').format(usdToIdr)} IDR</span>
                <span className="font-bold text-slate-700">USD / IDR</span>
              </div>
              <div className="flex justify-between border-b border-solid border-slate-100 pb-1.5 text-slate-600">
                <span>1 SAR = {new Intl.NumberFormat('id-ID').format(sarToIdr)} IDR</span>
                <span className="font-bold text-slate-700">SAR / IDR</span>
              </div>
              <div className="flex justify-between border-b border-solid border-slate-100 pb-1.5 items-center">
                <span className="text-slate-500">Total Due (IDR)</span>
                <span className="font-bold text-blue-600 text-[11px]">{formatCurrency(totalDueIDR, 'IDR')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Total Due (SAR)</span>
                <span className="font-bold text-blue-600 text-[11px]">{formatCurrency(totalDueSAR, 'SAR')}</span>
              </div>
            </div>
          </div>

          {/* Notes / Terms */}
          <div className="mt-4 grid grid-cols-2 gap-6">
            <div>
              <h2 className="text-[10px] font-extrabold tracking-wider text-slate-700 uppercase mb-2">
                NOTES
              </h2>
              <ul className="space-y-1 text-[9px] text-slate-500 font-sans leading-relaxed">
                {isTentative ? (
                  <>
                    <li>* This is a tentative reservation. Confirmation required within 48 hours.</li>
                    <li>* Please ensure the Invoice Number (e.g. {booking.reservationNo}) is listed as the payment description reference.</li>
                  </>
                ) : (
                  <>
                    <li>* This reservation has been confirmed. No further action required.</li>
                    <li>* Thank you for settling the payment. Please keep this invoice copy as your official receipt.</li>
                  </>
                )}
              </ul>
            </div>
            <div>
              <h2 className="text-[10px] font-extrabold tracking-wider text-slate-700 uppercase mb-2">
                TERMS &amp; CONDITIONS
              </h2>
              <p className="text-[9px] text-slate-500 font-sans leading-relaxed">
                Payment is due strictly by the specified date on the ledger. For billing inquiries, contact ODST Admin Team. Thank you for your continued partnership.
              </p>
            </div>
          </div>
        </div>

        {/* Due Date & Bottom Footer */}
        <div className="mt-8">
          {isTentative && (
            <div className="text-left text-[11px] font-sans font-bold text-slate-700 pb-2 border-b border-solid border-slate-100">
              <span className="text-slate-400 font-normal">Due Date:</span> {formatDateToDMY(booking.dueDate)}
            </div>
          )}
          <div className="pt-2 flex items-center justify-between text-[8px] text-slate-400 font-sans font-medium uppercase tracking-wider">
            <span>{currentDate}, ODST Group</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelReservationPrint;
