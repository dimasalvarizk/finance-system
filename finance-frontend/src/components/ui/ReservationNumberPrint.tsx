import React from "react";
import { type Invoice, type InvoiceDetail, calculateConvertedTotals, getExchangeRatesToShow, getLocalCompanySettings } from "../../pages/Invoices";
import odstLogo from "../../assets/odstlogo.png";

interface Props {
  invoice: Invoice;
  details: InvoiceDetail;
}

const formatDateToDMY = (dateStr: string): string => {
  if (!dateStr) return "";
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
            "Thank you for settling the payment. Please keep this invoice copy as your official receipt.",
            "Attach hotel booking confirmation numbers where applicable for ground handling operations."
          ]
      )
    : companySettings.defaultNotes.split('\n').map((note: string) =>
        note.replace(/AIT-2608-011/g, invoice.invoiceNo).replace(/AIT-2608-011/gi, invoice.invoiceNo)
      );

  const termsAndConditions = companySettings.termsAndConditions;
  
  return (
    <div id="reservation-confirmation-print-area" className="hidden print:block w-full bg-white p-6 font-sans text-slate-800">
      <div className="w-full max-w-4xl mx-auto bg-white p-0 shadow-none border-none min-h-[260mm] flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1.5 w-1/2">
                <img
                  src={odstLogo}
                  alt="Logo"
                  className="h-14 w-auto object-contain self-start"
                />
                <div className="mt-2 text-[9px] text-slate-500 leading-[1.5] font-sans max-w-[280px]">
                  {/* Keep the static address from Figma exactly */}
                  Graha Al Badgel
                  <br />
                  Jl. Hajjah Tutty Alawiyah No.7, RT.2/RW.5, Kalibata, Kec.
                  Pancoran, Kota Jakarta Selatan, Daerah Khusus Ibukota
                  Jakarta,Indonesia12740
                </div>
              </div>

              <div className="text-right flex flex-col items-end w-1/2">
                <h1 className="text-[24px] font-extrabold text-[#0f172a] leading-[1.1] font-sans text-right uppercase w-48 mb-2">
                  {isHotel ? (
                    <>HOTEL<br/>RESERVATION</>
                  ) : (
                    <>RESERVATION<br/>CONFIRMATION</>
                  )}
                </h1>
                
                <div className="flex flex-col items-end gap-1 text-[9px] text-slate-400 font-sans mt-1">
                  <div className="flex justify-end gap-2">
                    <span>Reservation No:</span>
                    <span className="text-slate-800 font-bold w-[100px] text-right">{invoice.invoiceNo}</span>
                  </div>
                  
                  {!isHotel ? (
                    <>
                      <div className="flex justify-end gap-2">
                        <span>Reference:</span>
                        <span className="text-slate-600 font-medium w-[100px] text-right">{invoice.referenceNo}</span>
                      </div>
                      <div className="flex justify-end gap-2">
                        <span>Serial:</span>
                        <span className="text-slate-600 font-medium w-[100px] text-right">{invoice.serialNo}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      {isTentative ? (
                        <div className="mt-1 px-3 py-1 text-[9px] font-extrabold text-orange-600 border border-solid border-orange-300 bg-orange-50/60 rounded-xl">
                          TENTATIVE RESERVATION
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-end gap-2">
                            <span>Status:</span>
                            <span className="text-emerald-600 font-bold w-[100px] text-right">CONFIRMED</span>
                          </div>
                          {((invoice as any).confirmationNo || (invoice as any).confirmation_number || (invoice.serialNo && invoice.serialNo.startsWith('CNF'))) && (
                            <div className="flex justify-end gap-2">
                              <span>Confirmation No:</span>
                              <span className="text-slate-800 font-bold w-[100px] text-right">
                                {(invoice as any).confirmationNo || (invoice as any).confirmation_number || invoice.serialNo}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bill From / Bill To */}
          <section className="mt-4 grid grid-cols-2 gap-6">
            <div>
              <h2 className="text-[10px] font-bold tracking-wider text-slate-800 uppercase mb-2 font-sans">
                BILL FROM
              </h2>
              <div className="rounded-xl border border-slate-200 p-4 grid grid-cols-2 gap-y-4 gap-x-4 h-[130px] bg-white">
                <div className="flex flex-col">
                  <p className="text-[8.5px] font-medium text-slate-400 font-sans">
                    Employee Name
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-slate-900 font-bold font-sans">
                    {details.billFrom.name}
                  </p>
                </div>
                <div className="flex flex-col">
                  <p className="text-[8.5px] font-medium text-slate-400 font-sans">
                    Company Number
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-slate-900 font-bold font-sans">
                    {details.billFrom.phone}
                  </p>
                </div>
                <div className="flex flex-col">
                  <p className="text-[8.5px] font-medium text-slate-400 font-sans">
                    Employee ID
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-slate-900 font-bold font-sans">
                    {details.billFrom.id}
                  </p>
                </div>
                <div className="flex flex-col">
                  <p className="text-[8.5px] font-medium text-slate-400 font-sans">
                    Company Email
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-slate-900 font-bold font-sans break-all">
                    {details.billFrom.email}
                  </p>
                </div>
                <div className="flex flex-col">
                  <p className="text-[8.5px] font-medium text-slate-400 font-sans">
                    Entity / Company
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-slate-900 font-bold font-sans">
                    {details.billFrom.entity}
                  </p>
                </div>
                <div className="flex flex-col">
                  <p className="text-[8.5px] font-medium text-slate-400 font-sans">
                    Company Tax Number
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-slate-900 font-bold font-sans">
                    {details.billFrom.tax}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-[10px] font-bold tracking-wider text-slate-800 uppercase mb-2 font-sans">
                BILL TO
              </h2>
              <div className="rounded-xl border border-slate-200 p-4 flex flex-col gap-3 h-[130px] bg-white">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <p className="text-[8.5px] font-medium text-slate-400 font-sans">
                      Company Name
                    </p>
                    <p className="mt-0.5 text-[10.5px] text-slate-900 font-bold font-sans">
                      {details.billTo.company}
                    </p>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-[8.5px] font-medium text-slate-400 font-sans">
                      Company Tax Number
                    </p>
                    <p className="mt-0.5 text-[10.5px] text-slate-900 font-bold font-sans">
                      {details.billTo.tax}
                    </p>
                  </div>
                </div>
                
                {details.billTo.agent && (
                  <div className="flex flex-col mt-1">
                    <p className="text-[8.5px] font-medium text-slate-400 font-sans">
                      Agent Details
                    </p>
                    <p className="mt-0.5 text-[10.5px] text-amber-600 font-bold font-sans">
                      Agent: {details.billTo.agent}
                    </p>
                  </div>
                )}
                
                <div className="flex flex-col mt-1">
                  <p className="text-[8.5px] font-medium text-slate-400 font-sans">
                    Street Address
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-700 font-medium font-sans leading-snug">
                    {details.billTo.address}
                  </p>
                </div>
                <div className="flex flex-col">
                  <p className="text-[8.5px] font-medium text-slate-400 font-sans">
                    City / Country
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-700 font-medium font-sans">
                    {details.billTo.cityCountry}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Itemized Charges */}
          <section className="mt-6 font-sans">
            <h2 className="text-[10px] font-bold tracking-wider text-slate-800 uppercase mb-2 font-sans">
              ITEMIZED CHARGES
            </h2>
            <div className="overflow-hidden border-t border-b border-slate-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-white">
                    <th className="text-left font-bold text-slate-600 text-[8.5px] uppercase tracking-wider py-2.5 px-2 font-sans">
                      Description
                    </th>
                    <th className="text-center font-bold text-slate-600 text-[8.5px] uppercase tracking-wider py-2.5 px-2 font-sans">
                      Qty
                    </th>
                    <th className="text-right font-bold text-slate-600 text-[8.5px] uppercase tracking-wider py-2.5 px-2 font-sans">
                      Unit Price
                    </th>
                    <th className="text-right font-bold text-slate-600 text-[8.5px] uppercase tracking-wider py-2.5 px-2 font-sans">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {details.items.map((item, index) => (
                    <tr key={index} className="border-b border-slate-100 last:border-b-0 bg-white">
                      <td className="py-3 px-2 font-bold text-slate-800 text-[10.5px]">
                        {item.description}
                      </td>
                      <td className="py-3 px-2 text-center text-slate-700 font-sans text-[10px]">
                        {item.qty}
                      </td>
                      <td className="py-3 px-2 text-right text-slate-700 font-sans text-[10.5px]">
                        {formatUnitPrice(item.price)}
                      </td>
                      <td className="py-3 px-2 text-right font-bold text-slate-900 font-sans text-[11px]">
                        {item.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Payment Instructions / Invoice Summary */}
          <section className="mt-6 grid grid-cols-2 gap-6 font-sans">
            <div>
              <h2 className="text-[10px] font-bold tracking-wider text-slate-800 uppercase mb-2 font-sans">
                PAYMENT INSTRUCTIONS
              </h2>
              <div className="rounded-xl border border-slate-200 p-4 space-y-2 bg-white h-[110px]">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-sans">Bank Name:</span>
                  <span className="font-bold text-slate-900 font-sans">{companySettings.bankName}</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-sans">Account Name:</span>
                  <span className="font-bold text-slate-900 font-sans">{companySettings.accountName}</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-sans">IDR Account Number:</span>
                  <span className="font-bold text-[#2563eb] font-sans">{companySettings.idrAccountNumber}</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-sans">USD Account Number:</span>
                  <span className="font-bold text-[#2563eb] font-sans">{companySettings.usdAccountNumber}</span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-[10px] font-bold tracking-wider text-slate-800 uppercase mb-2 font-sans">
                {isHotel ? 'INVOICE SUMMARY' : 'INVOICE SUMMARY'}
              </h2>
              <div className="rounded-xl border border-slate-200 p-4 space-y-2 bg-white h-[110px] flex flex-col justify-center">
                <div className="flex items-center justify-between text-[10.5px]">
                  <span className="text-slate-500 font-sans">Subtotal</span>
                  <span className="font-bold text-slate-900 font-sans">
                    {details.subtotal}
                  </span>
                </div>
                 <div className="flex items-center justify-between text-[10.5px]">
                  <span className="text-slate-500 font-sans">Tax / VAT ({details.taxRate || 0}%)</span>
                  <span className="font-bold text-slate-900 font-sans">
                    {details.tax}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-900 font-sans">Total Due</span>
                  <span className={`text-[14px] font-bold font-sans ${
                    isHotel 
                      ? (isTentative ? 'text-[#f97316]' : 'text-[#2563eb]') 
                      : 'text-[#2563eb]'
                  }`}>
                    {details.total}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Exchange Rate Card */}
          <section className="mt-6 font-sans">
            <h2 className="text-[10px] font-bold tracking-wider text-slate-800 uppercase mb-2 font-sans">
              EXCHANGE RATE
            </h2>
            <div className="rounded-xl border border-slate-200 p-4 space-y-3 font-sans bg-white">
              <div className="flex flex-col space-y-2 text-[10px] text-slate-500 pb-3 border-b border-slate-100">
                {getExchangeRatesToShow(
                  details.currency || 'USD',
                  details.usdToIdrRate || 18025,
                  details.sarToIdrRate || 4800,
                  (details.usdToIdrRate && details.sarToIdrRate) ? (details.usdToIdrRate / details.sarToIdrRate) : 3.75
                ).map((rate, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span>{rate.text}</span>
                    <span className="font-bold text-slate-800">{rate.label}</span>
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
                  <div className="flex flex-col space-y-2">
                    {normCurr === 'SAR' && (
                      <>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500 font-medium font-sans">Total Due (IDR)</span>
                          <span className="font-bold text-[#2563eb] text-[11.5px] font-sans">
                            {converted.idrTotal}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500 font-medium font-sans">Total Due (USD)</span>
                          <span className="font-bold text-[#2563eb] text-[11.5px] font-sans">
                            {converted.usdTotal}
                          </span>
                        </div>
                      </>
                    )}
                    {isRp && (
                      <>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500 font-medium font-sans">Total Due (USD)</span>
                          <span className="font-bold text-[#2563eb] text-[11.5px] font-sans">
                            {converted.usdTotal}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500 font-medium font-sans">Total Due (SAR)</span>
                          <span className="font-bold text-[#2563eb] text-[11.5px] font-sans">
                            {converted.sarTotal}
                          </span>
                        </div>
                      </>
                    )}
                    {normCurr === 'USD' && (
                      <>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500 font-medium font-sans">Total Due (IDR)</span>
                          <span className="font-bold text-[#2563eb] text-[11.5px] font-sans">
                            {converted.idrTotal}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500 font-medium font-sans">Total Due (SAR)</span>
                          <span className="font-bold text-[#2563eb] text-[11.5px] font-sans">
                            {converted.sarTotal}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          </section>

          {/* Notes / Terms & Conditions */}
          <section className="mt-6 grid grid-cols-2 gap-6">
            <div>
              <h2 className="text-[10px] font-bold tracking-wider text-slate-800 uppercase mb-2 font-sans">
                NOTES
              </h2>
              <ul className="space-y-1">
                {notes.map((note: string, idx: number) => (
                  <li key={idx} className="text-[8.5px] text-slate-600 leading-relaxed font-sans font-medium">
                    * {note}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-[10px] font-bold tracking-wider text-slate-800 uppercase mb-2 font-sans">
                TERMS &amp; CONDITIONS
              </h2>
              <p className="text-[8.5px] text-slate-600 leading-relaxed font-sans font-medium">
                {termsAndConditions}
              </p>
            </div>
          </section>

          {/* Signature & Due Date Container */}
          <section className="mt-8 flex justify-between items-end font-sans">
            <div className="ml-[5px] w-[200px]">
              {/* Label */}
              <p className="text-[9.5px] font-bold tracking-wider text-slate-800 font-sans text-left uppercase">
                FINANCIAL CONTROLLER SIGNATURE
              </p>

              {/* Name */}
              <p className="mt-1 text-[9px] text-slate-600 font-sans text-left">
                Emad Moustafa
              </p>

              {/* Line */}
              <div className="mt-12 border-t border-slate-300 w-[180px]" />
            </div>

            {/* Due Date */}
            <div className="text-right font-sans text-[10.5px] pb-1">
              <span className="text-[#94a3b8] font-medium font-sans">Due Date:</span>{" "}
              <span className="font-bold text-slate-900 font-sans ml-1">{details.dueDate}</span>
            </div>
          </section>
        </div>

        <div>
          {/* Footer */}
          <div className="mt-6 pt-3 flex items-center justify-between text-[8.5px] text-slate-400 font-sans font-medium">
            <span>{footerNote}</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationConfirmationPrint;