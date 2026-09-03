import React from 'react';
import { X, FileText, Printer, Download, Lock, Eye } from 'lucide-react';
import { type Invoice, getInvoiceDetails, calculateConvertedTotals, getExchangeRatesToShow, getLocalCompanySettings } from '../../pages/Invoices';
import { checkDownloadPermission } from '../../services/requestService';
import { uploadPaymentProof } from '../../services/invoiceService';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

interface Props {
  selectedInvoice: Invoice | null;
  onClose: () => void;
}

const InvoiceDetailsModal: React.FC<Props> = ({ selectedInvoice, onClose }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [viewingProof, setViewingProof] = React.useState<string | null>(null);
  const [localPaymentAttachment, setLocalPaymentAttachment] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLocalPaymentAttachment(selectedInvoice?.paymentAttachment || null);
  }, [selectedInvoice]);

  if (!selectedInvoice) return null;

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const max_width = 800;
          let width = img.width;
          let height = img.height;

          if (width > max_width) {
            height = Math.round((height * max_width) / width);
            width = max_width;
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

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const isPDF = file.type === 'application/pdf';
    try {
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
      await uploadPaymentProof(selectedInvoice.invoiceNo, base64Data);
      setLocalPaymentAttachment(base64Data);
      selectedInvoice.paymentAttachment = base64Data;
    } catch (err: any) {
      console.error('Failed to upload proof from modal:', err);
      alert(err.response?.data?.message || 'Failed to upload payment proof.');
    }
  };

  const details = getInvoiceDetails(selectedInvoice);
  const companySettings = getLocalCompanySettings();

  const handlePrintOrDownload = async () => {
    if (isVerifying) return;
    setIsVerifying(true);
    try {
      const res = await checkDownloadPermission(selectedInvoice.invoiceNo);
      if (res && res.allowed) {
        window.print();
      } else {
        setErrorMessage(res.message || 'Access Denied: This confirmation is not fully approved yet.');
      }
    } catch (err: any) {
      console.error('Permission check failed:', err);
      setErrorMessage('Failed to verify print/download permissions. Please check if all backend services are running.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0d0f]/50 backdrop-blur-sm p-4 animate-fade-in font-sans">
      {/* Styles for Invoice Details Print */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }
          html, body, #root {
            height: 100% !important;
            overflow: hidden !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          body * {
            visibility: hidden !important;
          }
          #reservation-confirmation-print-area, #reservation-confirmation-print-area * {
            visibility: visible !important;
          }
          #reservation-confirmation-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            max-width: 210mm !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            padding: 12mm 14mm !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />
      <div id="invoice-details-modal-interactive-area" className="bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col animate-scale-up font-sans">

        {/* Header */}
        <div className="px-6 py-5 border-b border-[#e2e8f0] flex justify-between items-center bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#fffbeb] text-[#f59e0b] border border-[#fef3c7] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-[18px] font-bold text-[#0c0d0f] tracking-tight">
                {t('invoices.confirmationDetails')}
              </h3>
              <span className="text-[12px] text-[#64748b] font-medium mt-0.5">
                {t('invoices.reviewBillingDetails')}
              </span>
            </div>
          </div>
          <button
            id="invoice-details-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div id="invoice-details-modal-scroll-body" className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">

          {/* Details Top Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Invoice Number */}
            <div>
              <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-inter">
                {t('invoices.confirmationNumber')}
              </label>
              <input
                type="text"
                readOnly
                value={selectedInvoice.invoiceNo}
                className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-bold text-[#0c0d0f] focus:outline-none font-inter bg-[#f8fafc]"
              />
            </div>
            {/* Reference Number */}
            <div>
              <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-inter">
                {t('invoices.referenceNumber')}
              </label>
              <input
                type="text"
                readOnly
                value={selectedInvoice.referenceNo}
                className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] focus:outline-none font-inter bg-[#f8fafc]"
              />
            </div>
            {/* Serial Number */}
            <div>
              <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-inter">
                {t('invoices.serialNumber')}
              </label>
              <input
                type="text"
                readOnly
                value={selectedInvoice.serialNo}
                className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] focus:outline-none font-inter bg-[#f8fafc]"
              />
            </div>
            {/* Confirmation Date */}
            <div>
              <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-inter">
                {t('invoices.confirmationDate')}
              </label>
              <input
                type="text"
                readOnly
                value={selectedInvoice.date}
                className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] focus:outline-none font-inter bg-[#f8fafc]"
              />
            </div>
            {/* Due Date */}
            <div>
              <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 font-inter">
                {t('invoices.dueDate')}
              </label>
              <input
                type="text"
                readOnly
                value={details.dueDate}
                className="w-full px-3.5 py-2 border border-[#fef3c7] rounded-xl text-[13px] font-bold text-[#d97706] bg-[#fffbeb] focus:outline-none font-inter"
              />
            </div>
          </div>

          {/* Bill From / Bill To Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bill From */}
            <div className="bg-[#f8fafc] p-6 rounded-2xl border border-[#e2e8f0] space-y-4">
              <h4 className="text-[12px] font-bold text-[#0c0d0f] uppercase tracking-wider font-inter">
                {t('invoices.billFrom')}
              </h4>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-[13px] font-sans">
                <div>
                  <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1">
                    {t('settings.name')}
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={details.billFrom.name}
                    className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-bold text-[#0c0d0f] bg-white focus:outline-none font-inter"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1">
                    {t('settings.phone')}
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={details.billFrom.phone}
                    className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] bg-white focus:outline-none font-inter"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1">
                    {t('settings.employeeId')}
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={details.billFrom.id}
                    className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] bg-white focus:outline-none font-inter"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1">
                    {t('settings.email')}
                  </label>
                  <input
                    type="email"
                    readOnly
                    value={details.billFrom.email}
                    className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] bg-white focus:outline-none font-inter"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1">
                    {t('invoices.entityCompany')}
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={details.billFrom.entity}
                    className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] bg-white focus:outline-none font-inter"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#94a3b8] mb-1">
                    {t('invoices.companyTaxNumber')}
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={details.billFrom.tax}
                    className="w-full px-3.5 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#0c0d0f] bg-white focus:outline-none font-inter"
                  />
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div className="bg-[#f8fafc] p-6 rounded-2xl border border-[#e2e8f0] flex flex-col justify-between">
              <div>
                <h4 className="text-[12px] font-bold text-[#0c0d0f] uppercase tracking-wider font-inter mb-4">
                  {t('invoices.billTo')}
                </h4>
                <div className="space-y-3.5 text-[13px] font-sans">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="block text-[10px] font-semibold text-[#94a3b8] mb-0.5">
                        {t('invoices.clientCompany')}
                      </span>
                      <span className="font-bold text-[14px] text-[#0c0d0f]">
                        {details.billTo.company}
                      </span>
                    </div>
                    {details.billTo.agent && (
                      <div className="text-right">
                        <span className="block text-[10px] font-semibold text-[#94a3b8] mb-0.5">
                          {t('invoices.agent')}
                        </span>
                        <span className="font-semibold text-amber-600 font-bold text-[13px]">
                          {details.billTo.agent}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-[#94a3b8] mb-0.5">
                      {t('invoices.companyTaxNumber')}
                    </span>
                    <span className="font-semibold text-[#1e293b]">
                      {details.billTo.tax}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-[#94a3b8] mb-0.5">
                      {t('invoices.streetAddress')}
                    </span>
                    <span className="font-semibold text-[#1e293b] block">
                      {details.billTo.address}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-[#94a3b8] mb-0.5">
                      {t('invoices.cityCountry')}
                    </span>
                    <span className="font-semibold text-[#1e293b]">
                      {details.billTo.cityCountry}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Itemized Charges Section */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold text-[#0c0d0f] uppercase tracking-wider font-inter">
              {t('invoices.itemizedCharges')}
            </h4>
            <div className="overflow-x-auto border border-[#e2e8f0] rounded-xl">
              <table className="w-full text-left border-collapse text-[13px] font-sans">
                <thead>
                  <tr className="bg-gray-50 border-b border-[#e2e8f0]">
                    <th className="px-4 py-2.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider font-inter">
                      {t('invoices.description')}
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-center font-inter">
                      {t('invoices.qty')}
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-right font-inter">
                      {t('invoices.unitPrice')}
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-right font-inter">
                      {t('common.total')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0] font-medium text-[#1e293b]">
                  {details.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-[#1e293b] font-medium">
                        {item.description}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-800 font-inter">
                        {item.qty}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 font-roboto">
                        {item.price}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#0c0d0f] font-roboto">
                        {item.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Section */}
          <div className="flex justify-end pt-2">
            <div className="w-full max-w-md bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 space-y-3 font-sans text-[13px]">
              <div className="flex justify-between items-center">
                <span className="text-[#64748b] font-semibold font-sans">
                  {t('invoices.subtotal')}
                </span>
                <span className="font-bold text-[#0c0d0f] font-roboto">
                  {details.subtotal}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#64748b] font-semibold font-sans">
                  {t('invoices.taxVat')} ({details.taxRate || 0}%)
                </span>
                <span className="font-bold text-[#0c0d0f] font-roboto">
                  {details.tax}
                </span>
              </div>
              <div className="h-px bg-[#e2e8f0] my-2" />
              <div className="flex justify-between items-center text-[14px]">
                <span className="text-[#0c0d0f] font-bold">{t('invoices.totalDue')}</span>
                <span className="font-extrabold text-[#2563eb] font-roboto text-[16px]">
                  {details.total}
                </span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#e2e8f0] mx-6" />

          {/* Payment Instructions Section */}
          <div className="space-y-3 mt-6">
            <h4 className="text-[12px] font-bold text-[#0c0d0f] uppercase tracking-wider font-inter">
              {t('invoices.paymentInstructions')}
            </h4>
            <div className="bg-[#f8fafc] p-5 rounded-2xl border border-[#e2e8f0] font-sans">
              <div className="space-y-3 text-[13px] font-sans">
                <div className="flex justify-between items-center">
                  <span className="text-[#64748b] font-semibold">{t('invoices.bankName')}:</span>
                  <span className="font-bold text-[#0c0d0f]">{companySettings.bankName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748b] font-semibold">{t('invoices.accountName')}:</span>
                  <span className="font-bold text-[#0c0d0f]">{companySettings.accountName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748b] font-semibold">{t('invoices.idrAccountNumber')}:</span>
                  <span className="font-bold text-[#2563eb] font-inter">{companySettings.idrAccountNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748b] font-semibold">{t('invoices.usdAccountNumber')}:</span>
                  <span className="font-bold text-[#2563eb] font-inter">{companySettings.usdAccountNumber}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#e2e8f0] mx-6" />

          {/* Exchange Rate Card */}
          <div className="space-y-3">
            <h4 className="text-[12px] font-bold text-[#0c0d0f] uppercase tracking-wider font-inter">
              {t('settings.exchangeRates')}
            </h4>
            <div className="bg-[#f8fafc] p-5 rounded-2xl border border-[#e2e8f0] font-sans space-y-4">
              <div className="flex flex-col space-y-2 text-[13px] font-sans text-slate-600 pb-3 border-b border-[#e2e8f0]">
                {getExchangeRatesToShow(
                  details?.currency || 'USD',
                  details?.usdToIdrRate || 18025,
                  details?.sarToIdrRate || 4800,
                  (details?.usdToIdrRate && details?.sarToIdrRate) ? (details?.usdToIdrRate / details?.sarToIdrRate) : 3.75
                ).map((rate, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span>{rate.text}</span>
                    <span className="font-bold text-[#475569]">{rate.label}</span>
                  </div>
                ))}
              </div>
              {(() => {
                const currentCurrency = details?.currency || 'USD';
                const amountVal = details?.totalAmount !== undefined ? details.totalAmount : (parseFloat((details?.total || '').replace(/[^0-9.]/g, '')) || 0);
                const converted = calculateConvertedTotals(
                  amountVal,
                  currentCurrency,
                  details?.usdToIdrRate || 18025,
                  details?.sarToIdrRate || 4800,
                  (details?.usdToIdrRate && details?.sarToIdrRate) ? (details?.usdToIdrRate / details?.sarToIdrRate) : 3.75
                );
                const normCurr = currentCurrency.toUpperCase();
                const isRp = normCurr === 'RP' || normCurr === 'IDR';
                return (
                  <div className="flex flex-col space-y-2">
                    {normCurr === 'SAR' && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-[13px] text-[#64748b] font-semibold font-sans">{t('invoices.totalDue')} (USD)</span>
                          <span className="font-bold text-[#2563eb] text-[15px] font-roboto">
                            {converted.usdTotal}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[13px] text-[#64748b] font-semibold font-sans">{t('invoices.totalDue')} (IDR)</span>
                          <span className="font-bold text-[#2563eb] text-[15px] font-roboto">
                            {converted.idrTotal}
                          </span>
                        </div>
                      </>
                    )}
                    {isRp && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-[13px] text-[#64748b] font-semibold font-sans">{t('invoices.totalDue')} (USD)</span>
                          <span className="font-bold text-[#2563eb] text-[15px] font-roboto">
                            {converted.usdTotal}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[13px] text-[#64748b] font-semibold font-sans">{t('invoices.totalDue')} (SAR)</span>
                          <span className="font-bold text-[#2563eb] text-[15px] font-roboto">
                            {converted.sarTotal}
                          </span>
                        </div>
                      </>
                    )}
                    {normCurr === 'USD' && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-[13px] text-[#64748b] font-semibold font-sans">{t('invoices.totalDue')} (SAR)</span>
                          <span className="font-bold text-[#2563eb] text-[15px] font-roboto">
                            {converted.sarTotal}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[13px] text-[#64748b] font-semibold font-sans">{t('invoices.totalDue')} (IDR)</span>
                          <span className="font-bold text-[#2563eb] text-[15px] font-roboto">
                            {converted.idrTotal}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#e2e8f0] mx-6" />

          {/* Notes & Terms Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 text-[12px] text-[#64748b] leading-relaxed font-sans">
            <div>
              <h4 className="text-[11px] font-bold text-[#0c0d0f] uppercase tracking-wider font-inter mb-2">
                {t('invoices.notes')}
              </h4>
              {companySettings.defaultNotes.split('\n').map((note: string, idx: number) => (
                <p key={idx} className={idx > 0 ? "mt-1" : ""}>
                  {note.startsWith('*') ? note : `* ${note}`}
                </p>
              ))}
            </div>
            <div>
              <h4 className="text-[11px] font-bold text-[#0c0d0f] uppercase tracking-wider font-inter mb-2">
                {t('invoices.termsAndConditions')}
              </h4>
              <p className="whitespace-pre-wrap">
                {companySettings.termsAndConditions}
              </p>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div id="invoice-details-footer-container" className="flex items-center justify-between px-6 py-4 border-t border-[#e2e8f0] bg-gray-50 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-[12px] text-[#94a3b8] font-medium font-sans">
              {t('invoices.systemStatus')}: <span className="font-bold text-[#64748b]">{selectedInvoice.status}</span>
            </span>
            {(selectedInvoice.status === 'Paid' || selectedInvoice.status === 'Awaiting Payment Approval') && (
              localPaymentAttachment ? (
                <button
                  type="button"
                  onClick={() => setViewingProof(localPaymentAttachment)}
                  className="ml-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 font-bold rounded-lg text-[11px] font-sans transition-all cursor-pointer shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{t('invoices.viewPaymentProof')}</span>
                </button>
              ) : (
                user?.role !== 'Viewer' && (
                  <label className="ml-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-[#f59e0b] border border-[#d97706] text-white hover:bg-[#d97706] font-bold rounded-lg text-[11px] font-sans transition-all cursor-pointer shadow-sm">
                    <span>{t('invoices.uploadProof')}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleUploadProof}
                      className="hidden"
                    />
                  </label>
                )
              )
            )}
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handlePrintOrDownload}
              disabled={isVerifying}
              className={`flex items-center space-x-1.5 px-4 py-2 border border-[#cbd5e1] rounded-xl text-[13px] font-semibold text-[#1e293b] hover:bg-gray-100 transition-all font-inter bg-white ${isVerifying ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
            >
              <Printer className="w-4 h-4 text-[#475569]" />
              <span>{isVerifying ? t('invoices.verifying') : t('invoices.print')}</span>
            </button>
            <button
              type="button"
              onClick={handlePrintOrDownload}
              disabled={isVerifying}
              className={`flex items-center space-x-1.5 px-4 py-2 bg-[#f59e0b] hover:bg-[#d97706] text-white font-semibold text-[13px] rounded-xl shadow-sm transition-all font-inter ${isVerifying ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
            >
              <Download className="w-4 h-4" />
              <span>{isVerifying ? t('invoices.verifying') : t('invoices.downloadPdf')}</span>
            </button>
          </div>
        </div>
      </div>
      {errorMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0c0d0f]/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-red-100 shadow-2xl max-w-md w-full p-6 flex flex-col items-center text-center space-y-4 animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 ring-4 ring-red-500/10">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-gray-900 font-sans">
                Access Denied
              </h3>
              <p className="text-[13px] text-gray-500 font-medium leading-relaxed font-sans px-2">
                {errorMessage}
              </p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold text-[13px] rounded-xl transition-all font-inter shadow-sm cursor-pointer"
            >
              Okay
            </button>
          </div>
        </div>
      )}
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
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
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
                  download={`payment-proof-${selectedInvoice.invoiceNo}.pdf`}
                  className="px-4 py-2 bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold rounded-lg text-[12px] cursor-pointer transition-all shadow-sm font-sans"
                >
                  {t('invoices.downloadPdf')}
                </a>
              ) : (
                <a
                  href={viewingProof}
                  download={`payment-proof-${selectedInvoice.invoiceNo}.jpg`}
                  className="px-4 py-2 bg-[#007aff] hover:bg-[#006ee0] text-white font-bold rounded-lg text-[12px] cursor-pointer transition-all shadow-sm font-sans"
                >
                  {t('common.downloadImage')}
                </a>
              )}
              <button
                onClick={() => setViewingProof(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-[12px] cursor-pointer transition-all font-sans"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceDetailsModal;
