import React from "react";
import { type Invoice, type InvoiceDetail, calculateConvertedTotals, getExchangeRatesToShow, getLocalCompanySettings } from "../../pages/Invoices";
import odstLogo from "../../assets/odstlogo.png";

interface Props {
  invoice: Invoice;
  details: InvoiceDetail;
}

const formatDateToDMY = (dateStr: string): string => {
  if (!dateStr) return "";
  // If it's already in DD/MM/YYYY, return it
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
};

const formatUnitPrice = (priceStr: string): string => {
  if (!priceStr) return "";
  return priceStr.replace(/\.00$/, "");
};

const ReservationConfirmationPrint: React.FC<Props> = ({ invoice, details }) => {
  const footerNote = `${formatDateToDMY(invoice.date)} · ${details.billFrom.entity}`;

  const companySettings = getLocalCompanySettings();
  const isHotel = invoice.invoiceNo?.startsWith('HR-') || invoice.invoiceNo?.startsWith('HM-') || invoice.invoiceNo?.startsWith('CNF-') || details.items.some(item => item.description.toLowerCase().includes('hotel'));
  const isTentative = invoice.status?.toLowerCase() === 'tentative' || invoice.status?.toLowerCase() === 'draft';

  const notes = isHotel 
    ? (isTentative 
        ? [
            "This is a tentative reservation. Confirmation required within 48 hours.",
            `Please ensure the Invoice Number (e.g. ${invoice.invoiceNo}) is listed as the payment description reference.`
          ]
        : [
            "This reservation has been confirmed. No further action required.",
            "Thank you for settling the payment. Please keep this invoice copy as your official receipt."
          ]
      )
    : companySettings.defaultNotes.split('\n').map((note: string) =>
        note.replace(/AIT-2608-011/g, invoice.invoiceNo).replace(/AIT-2608-011/gi, invoice.invoiceNo)
      );

  const termsAndConditions = companySettings.termsAndConditions;
  return (
    <div id="reservation-confirmation-print-area" className="hidden print:block w-full bg-white p-4 font-sans text-slate-800">
      <div className="w-full max-w-3xl mx-auto bg-white p-0 shadow-none border-none min-h-[235mm] flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="pb-3 border-b border-slate-100">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1.5">
                <img
                  src={odstLogo}
                  alt="Logo"
                  className="h-11 w-auto object-contain self-start"
                />
                {/* Company Address block */}
                <div className="mt-1.5 text-[10px] text-slate-400 leading-relaxed font-sans">
                  CBC Tower G, Jl. Cengkareng Business City Jl. Kp. Rw. Bokor
                  <br />
                  Pocal, RT.006/RW.007, Benda, Kec. Benda, Kota Tangerang, Banten
                  <br />
                  15125
                </div>
              </div>

              <div className="text-right">
                <h1 className="text-xl font-extrabold text-slate-800 tracking-wide font-sans">
                  {isHotel ? 'HOTEL RESERVATION' : 'RESERVATION CONFIRMATION'}
                </h1>
                <p className="text-xs text-slate-400 mt-1 font-sans">
                  Reservation No:{" "}
                  <span className="text-slate-800 font-bold font-sans ml-1">
                    {invoice.invoiceNo}
                  </span>
                </p>
                {isHotel ? (
                  <div className="flex items-center justify-end gap-1.5 mt-1 select-none">
                    {isTentative ? (
                      <span className="px-2 py-0.5 text-[9px] font-bold text-orange-600 border border-orange-200 bg-orange-50 rounded">
                        TENTATIVE RESERVATION
                      </span>
                    ) : (
                      <>
                        <span className="px-2 py-0.5 text-[9px] font-bold text-emerald-600 border border-emerald-200 bg-emerald-50 rounded">
                          CONFIRMED
                        </span>
                        {invoice.serialNo && (
                          <span className="px-2 py-0.5 text-[9px] font-bold text-slate-500 border border-slate-200 bg-slate-50 rounded">
                            {invoice.serialNo}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-400 mt-0.5 font-sans">
                      Reference:{" "}
                      <span className="text-slate-600 font-semibold font-sans ml-1">
                        {invoice.referenceNo}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 font-sans">
                      Serial:{" "}
                      <span className="text-slate-600 font-semibold font-sans ml-1">
                        {invoice.serialNo}
                      </span>
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bill From / Bill To */}
          <section className="mt-3.5 grid grid-cols-2 gap-4">
            <div>
              <h2 className="text-[10px] font-bold tracking-wider text-slate-700 uppercase mb-1.5 font-sans">
                BILL FROM
              </h2>
              <div className="rounded-xl border border-slate-100 p-2.5 grid grid-cols-2 gap-y-2 gap-x-4" style={{ backgroundColor: 'rgba(248, 250, 252, 1)' }}>
                <div>
                  <p className="text-[9px] font-medium text-slate-400 font-sans">
                    Employee Name
                  </p>
                  <p className="mt-0.5 text-xs text-slate-800 font-bold font-sans">
                    {details.billFrom.name}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-medium text-slate-400 font-sans">
                    Company Number
                  </p>
                  <p className="mt-0.5 text-xs text-slate-800 font-bold font-sans">
                    {details.billFrom.phone}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-medium text-slate-400 font-sans">
                    Employee ID
                  </p>
                  <p className="mt-0.5 text-xs text-slate-800 font-medium font-sans">
                    {details.billFrom.id}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-medium text-slate-400 font-sans">
                    Company Email
                  </p>
                  <p className="mt-0.5 text-xs text-slate-800 font-bold font-sans break-all">
                    {details.billFrom.email}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-[9px] font-medium text-slate-400 font-sans">
                    Entity / Company
                  </p>
                  <p className="mt-0.5 text-xs text-slate-800 font-medium font-sans">
                    {details.billFrom.entity}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-[9px] font-medium text-slate-400 font-sans">
                    Company Tax Number
                  </p>
                  <p className="mt-0.5 text-xs text-slate-800 font-medium font-sans">
                    {details.billFrom.tax}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-[10px] font-bold tracking-wider text-slate-700 uppercase mb-1.5 font-sans">
                BILL TO
              </h2>
              <div className="rounded-xl border border-slate-100 p-2.5 grid grid-cols-2 gap-y-2 gap-x-4" style={{ backgroundColor: 'rgba(248, 250, 252, 1)' }}>
                <div>
                  <p className="text-[9px] font-medium text-slate-400 font-sans">
                    Company Name
                  </p>
                  <p className="mt-0.5 text-xs text-slate-800 font-bold font-sans">
                    {details.billTo.company}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-medium text-slate-400 font-sans">
                    Company Tax Number
                  </p>
                  <p className="mt-0.5 text-xs text-slate-800 font-bold font-sans">
                    {details.billTo.tax}
                  </p>
                </div>
                {details.billTo.agent && (
                  <div className="col-span-2">
                    <p className="text-[9px] font-medium text-slate-400 font-sans">
                      Agent Details
                    </p>
                    <p className="mt-0.5 text-xs text-amber-600 font-bold font-sans">
                      Agent: {details.billTo.agent}
                    </p>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-[9px] font-medium text-slate-400 font-sans">
                    Street Address
                  </p>
                  <p className="mt-0.5 text-xs text-slate-800 font-medium font-sans leading-relaxed">
                    {details.billTo.address}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-[9px] font-medium text-slate-400 font-sans">
                    City / Country
                  </p>
                  <p className="mt-0.5 text-xs text-slate-800 font-medium font-sans">
                    {details.billTo.cityCountry}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="border-t border-slate-100 my-3.5" />

          {/* Itemized Charges */}
          <section className="mt-3.5 font-sans">
            <h2 className="text-[10px] font-bold tracking-wider text-slate-900 uppercase mb-1.5 font-sans">
              ITEMIZED CHARGES
            </h2>
            <div className="overflow-hidden border border-slate-100 rounded-xl">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left font-bold text-slate-500 text-[9px] uppercase tracking-wider py-2 px-3.5 font-sans">
                      Description
                    </th>
                    <th className="text-center font-bold text-slate-500 text-[9px] uppercase tracking-wider py-2 px-3.5 font-sans">
                      Qty
                    </th>
                    <th className="text-right font-bold text-slate-500 text-[9px] uppercase tracking-wider py-2 px-3.5 font-sans">
                      Unit Price
                    </th>
                    <th className="text-right font-bold text-slate-500 text-[9px] uppercase tracking-wider py-2 px-3.5 rounded-r-lg font-sans">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {details.items.map((item, index) => (
                    <tr key={index} className="border-b border-slate-100 last:border-b-0">
                      <td className="py-2 px-3.5 font-medium text-slate-800 max-w-md">
                        {item.description}
                      </td>
                      <td className="py-2 px-3.5 text-center text-slate-600 font-sans">
                        {item.qty}
                      </td>
                      <td className="py-2 px-3.5 text-right text-slate-600 font-sans">
                        {formatUnitPrice(item.price)}
                      </td>
                      <td className="py-2 px-3.5 text-right font-bold text-slate-900 font-sans">
                        {item.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="border-t border-slate-100 my-3.5" />

          {/* Payment Instructions / Invoice Summary */}
          <section className="mt-3.5 grid grid-cols-2 gap-4 font-sans">
            <div>
              <h2 className="text-[10px] font-bold tracking-wider text-slate-900 uppercase mb-1.5 font-sans">
                PAYMENT INSTRUCTIONS
              </h2>
              <div className="rounded-xl border border-slate-100 p-3 space-y-1.5" style={{ backgroundColor: 'rgba(248, 250, 252, 1)' }}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-sans">Bank Name:</span>
                  <span className="font-bold text-slate-800 font-sans">{companySettings.bankName}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-sans">Account Name:</span>
                  <span className="font-bold text-slate-800 font-sans">{companySettings.accountName}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-sans">IDR Account Number:</span>
                  <span className="font-bold text-blue-600 font-sans">{companySettings.idrAccountNumber}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-sans">USD Account Number:</span>
                  <span className="font-bold text-blue-600 font-sans">{companySettings.usdAccountNumber}</span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-[10px] font-bold tracking-wider text-slate-700 uppercase mb-1.5 font-sans">
                {isHotel ? 'INVOICE SUMMARY' : 'CONFIRMATION SUMMARY'}
              </h2>
              <div className="rounded-xl border border-slate-100 p-3 space-y-1.5" style={{ backgroundColor: 'rgba(248, 250, 252, 1)' }}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-sans">Subtotal</span>
                  <span className="font-bold text-slate-800 font-sans">
                    {details.subtotal}
                  </span>
                </div>
                 <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-sans">Tax / VAT ({details.taxRate || 0}%)</span>
                  <span className="font-bold text-slate-800 font-sans">
                    {details.tax}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-800 font-sans">Total Due</span>
                  <span className={`text-base font-bold font-sans ${
                    isHotel 
                      ? (isTentative ? 'text-[#f97316]' : 'text-[#10b981]') 
                      : 'text-blue-600'
                  }`}>
                    {details.total}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Exchange Rate Card */}
          <section className="mt-3.5 animate-fade-in">
            <h2 className="text-[10px] font-bold tracking-wider text-slate-900 uppercase mb-1.5 font-sans">
              EXCHANGE RATE
            </h2>
            <div className="rounded-xl border border-slate-100 p-3.5 space-y-3 font-sans" style={{ backgroundColor: 'rgba(248, 250, 252, 1)' }}>
              <div className="flex flex-col space-y-1.5 text-xs text-slate-600 pb-2 border-b border-slate-200">
                {getExchangeRatesToShow(
                  details.currency || 'USD',
                  details.usdToIdrRate || 18025,
                  details.sarToIdrRate || 4800,
                  (details.usdToIdrRate && details.sarToIdrRate) ? (details.usdToIdrRate / details.sarToIdrRate) : 3.75
                ).map((rate, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span>{rate.text}</span>
                    <span className="font-bold text-slate-500">{rate.label}</span>
                  </div>
                ))}
              </div>
              {(() => {
                const amount = details.totalAmount !== undefined ? details.totalAmount : (parseFloat(details.total.replace(/[^0-9.]/g, '')) || 0);
                const converted = calculateConvertedTotals(
                  amount,
                  details.currency || 'USD',
                  details.usdToIdrRate || 18025,
                  details.sarToIdrRate || 4800,
                  (details.usdToIdrRate && details.sarToIdrRate) ? (details.usdToIdrRate / details.sarToIdrRate) : 3.75
                );
                const normCurr = (details.currency || 'USD').toUpperCase();
                const isRp = normCurr === 'RP' || normCurr === 'IDR';
                return (
                  <div className="flex flex-col space-y-1.5">
                    {normCurr === 'SAR' && (
                      <>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-medium font-sans">Total Due (USD)</span>
                          <span className="font-bold text-blue-600 text-sm font-sans">
                            {converted.usdTotal}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-medium font-sans">Total Due (IDR)</span>
                          <span className="font-bold text-blue-600 text-sm font-sans">
                            {converted.idrTotal}
                          </span>
                        </div>
                      </>
                    )}
                    {isRp && (
                      <>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-medium font-sans">Total Due (USD)</span>
                          <span className="font-bold text-blue-600 text-sm font-sans">
                            {converted.usdTotal}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-medium font-sans">Total Due (SAR)</span>
                          <span className="font-bold text-blue-600 text-sm font-sans">
                            {converted.sarTotal}
                          </span>
                        </div>
                      </>
                    )}
                    {normCurr === 'USD' && (
                      <>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-medium font-sans">Total Due (SAR)</span>
                          <span className="font-bold text-blue-600 text-sm font-sans">
                            {converted.sarTotal}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-medium font-sans">Total Due (IDR)</span>
                          <span className="font-bold text-blue-600 text-sm font-sans">
                            {converted.idrTotal}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          </section>

          <div className="border-t border-slate-100 my-3.5" />

          {/* Notes / Terms & Conditions */}
          <section className="mt-3.5 grid grid-cols-2 gap-4">
            <div>
              <h2 className="text-[10px] font-bold tracking-wider text-slate-700 uppercase mb-1.5 font-sans">
                NOTES
              </h2>
              <ul className="space-y-0.5">
                {notes.map((note: string, idx: number) => (
                  <li key={idx} className="text-[9px] text-slate-500 leading-relaxed font-sans">
                    * {note}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-[10px] font-bold tracking-wider text-slate-700 uppercase mb-1.5 font-sans">
                TERMS &amp; CONDITIONS
              </h2>
              <p className="text-[9px] text-slate-500 leading-relaxed font-sans">
                {termsAndConditions}
              </p>
            </div>
          </section>

          <div className="border-t border-slate-100 my-3.5" />

          {/* Signature & Due Date Container */}
          <section className="mt-6 flex justify-between items-end font-sans">
            <div className="ml-[5px] w-[220px]">
              {/* Label */}
              <p className="text-[10px] font-bold tracking-wider text-[#334155] font-sans text-center">
                Financial Controller Signature
              </p>

              {/* Name */}
              <p className="mt-1 text-[9px] text-slate-500 font-sans text-center">
                Emad Moustafa
              </p>

              {/* Line */}
              <div className="mt-14 border-t border-slate-300 w-full" />
            </div>

            {/* Due Date */}
            <div className="text-right font-sans text-[11px] pb-1">
              <span className="text-[#64748b] font-medium font-sans">Due Date:</span>{" "}
              <span className="font-bold text-slate-900 font-sans">{details.dueDate}</span>
            </div>
          </section>
        </div>

        <div>
          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-sans font-medium">
            <span>{footerNote}</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationConfirmationPrint;