import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const getBrowserPath = () => {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const paths = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
};

const formatDateDMY = (dateStr) => {
  if (!dateStr) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const cleanAgentName = (agentName) => {
  if (!agentName) return undefined;
  const lower = agentName.toLowerCase();
  if (lower.includes('hasoob')) return 'Hasoob Technology';
  if (lower.includes('odst')) return 'ODST Travel & Tourizm';
  return agentName;
};

const splitAddress = (fullAddress) => {
  if (!fullAddress) return { address: 'N/A', cityCountry: 'N/A' };
  const parts = fullAddress.split(',').map(p => p.trim());
  if (parts.length <= 3) {
    return {
      address: parts[0] || 'N/A',
      cityCountry: parts.slice(1).join(', ') || 'N/A'
    };
  }
  const cityCountryParts = parts.slice(-3);
  const addressParts = parts.slice(0, -3);
  return {
    address: addressParts.join(', '),
    cityCountry: cityCountryParts.join(', ')
  };
};

/**
 * 1. Generate HTML for Invoices / General Confirmation matching ReservationConfirmationPrint.tsx
 */
const generateGeneralConfirmationHtml = (details, companySettings, logoBase64) => {
  const {
    invoiceNo = 'AIT-0831-002',
    company = 'Arie Tour',
    amount = '2,200.00 SAR',
    referenceNo = 'REF-0907-189',
    serialNo = 'SR-486823',
    dueDate = '09/07/2026',
    date = '2026-08-31',
    items = [],
    taxRate = 0,
    currency = 'SAR',
    usdToIdrRate = 18000,
    sarToIdrRate = 4800,
    billFrom,
    billTo
  } = details;

  const formattedDate = formatDateDMY(date) || '31/08/2026';
  const formattedDueDate = formatDateDMY(dueDate) || '07/09/2026';

  const rate = Number(taxRate) || 0;
  let subtotalNum = 0;
  if (items && Array.isArray(items) && items.length > 0) {
    subtotalNum = items.reduce((acc, it) => acc + (Number(it.qty) || 1) * (Number(it.price) || 0), 0);
  } else {
    const rawParsed = parseFloat(String(amount).replace(/[^0-9.]/g, ''));
    subtotalNum = isNaN(rawParsed) ? 2200 : rawParsed;
  }
  const taxNum = subtotalNum * (rate / 100);
  const totalNum = subtotalNum + taxNum;

  const curr = (currency || 'SAR').toUpperCase().includes('SAR') || String(amount).includes('SAR') ? 'SAR' : (currency || 'USD').toUpperCase();
  const subtotalFormatted = `${subtotalNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`;
  const taxFormatted = `${taxNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`;
  const totalFormatted = `${totalNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`;

  // Real-time Exchange Rates & Converted Totals
  const numUsdToIdr = Number(usdToIdrRate) || 18000;
  const numSarToIdr = Number(sarToIdrRate) || 4800;
  const numUsdToSar = numUsdToIdr / numSarToIdr;

  let totalDueIDR = 0;
  let totalDueUSD = 0;
  if (curr === 'SAR') {
    totalDueIDR = totalNum * numSarToIdr;
    totalDueUSD = totalNum / numUsdToSar;
  } else if (curr === 'USD') {
    totalDueUSD = totalNum;
    totalDueIDR = totalNum * numUsdToIdr;
  } else {
    totalDueIDR = totalNum;
    totalDueUSD = totalNum / numUsdToIdr;
  }

  const formattedTotalIDR = `Rp ${Math.round(totalDueIDR).toLocaleString('id-ID')}`;
  const formattedTotalUSD = `$${totalDueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Bill From & Bill To resolution
  const bFrom = billFrom || {
    name: details.employeeName || 'Aufa Rakha',
    id: details.employeeId || '250104',
    entity: companySettings.companyName || 'PT.ODST AIRLINES INDO',
    phone: companySettings.phone || '+62 8111 1203 330',
    email: details.employeeEmail || 'aufa.rakha108@gmail.com',
    tax: companySettings.taxNumber || '0000-0000-0001'
  };

  const rawAddress = details.clientAddress || details.address || 'Jl. Chairil Anwar Blok B12, Ruko Kalimas, Margahayu, Kec. Bekasi Timur", Bekasi, 17113, Indonesia';
  const splitAddr = splitAddress(rawAddress);

  const bTo = billTo || {
    company: company || details.companyName || 'Arie Tour',
    tax: details.clientTaxNo || details.taxNumber || '02.271.015.6-.407.000',
    agent: cleanAgentName(details.clientAgent || details.agent || 'ODST Travel and Tourism - 2114'),
    address: splitAddr.address,
    cityCountry: splitAddr.cityCountry
  };

  let itemsHtml = '';
  if (items && Array.isArray(items) && items.length > 0) {
    items.forEach((it) => {
      const q = Number(it.qty) || 1;
      const p = Number(it.price) || 0;
      const tot = (q * p).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const up = p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      itemsHtml += `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 11px 14px; font-weight: 700; color: #1e293b; font-size: 9.5px;">${it.description || '-'}</td>
          <td style="padding: 11px 14px; text-align: center; color: #334155; font-size: 9px;">${q}</td>
          <td style="padding: 11px 14px; text-align: right; color: #334155; font-size: 9.5px;">${up} ${curr}</td>
          <td style="padding: 11px 14px; text-align: right; font-weight: 700; color: #0f172a; font-size: 10px;">${tot} ${curr}</td>
        </tr>
      `;
    });
  } else {
    itemsHtml = `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 11px 14px; font-weight: 700; color: #1e293b; font-size: 9.5px;">Service Item</td>
        <td style="padding: 11px 14px; text-align: center; color: #334155; font-size: 9px;">1</td>
        <td style="padding: 11px 14px; text-align: right; color: #334155; font-size: 9.5px;">${totalFormatted}</td>
        <td style="padding: 11px 14px; text-align: right; font-weight: 700; color: #0f172a; font-size: 10px;">${totalFormatted}</td>
      </tr>
    `;
  }

  const defaultNotesList = [
    `* Please ensure the Invoice Number (e.g. ${invoiceNo}) is listed as the payment description reference.`,
    `* Attach hotel booking confirmation numbers where applicable for ground handling operations.`
  ];

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>${invoiceNo} - Reservation Confirmation</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      @page {
        size: A4 portrait;
        margin: 0;
      }
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background-color: #ffffff;
        color: #1e293b;
        margin: 0;
        padding: 0;
        -webkit-font-smoothing: antialiased;
      }
      .page-container {
        width: 210mm;
        height: 297mm;
        padding: 12mm 14mm;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-sizing: border-box;
        background-color: #ffffff;
      }
      .header-section {
        padding-bottom: 14px;
        border-bottom: 1px solid rgba(226, 232, 240, 0.8);
      }
      .header-flex {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }
      .logo-box {
        width: 50%;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .logo-img {
        height: 56px;
        width: auto;
        object-fit: contain;
        align-self: flex-start;
      }
      .address-text {
        margin-top: 6px;
        font-size: 8.5px;
        color: #94a3b8;
        line-height: 1.45;
        max-width: 270px;
      }
      .title-box {
        width: 50%;
        text-align: right;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }
      .main-title {
        font-size: 26px;
        font-weight: 900;
        color: #0f172a;
        line-height: 1.05;
        text-transform: uppercase;
        letter-spacing: -0.5px;
        margin-bottom: 6px;
      }
      .meta-grid {
        display: grid;
        grid-template-columns: auto auto;
        column-gap: 8px;
        row-gap: 2px;
        font-size: 8.5px;
        justify-content: end;
      }
      .meta-lbl {
        color: #94a3b8;
        font-weight: 500;
        text-align: right;
      }
      .meta-val {
        color: #0f172a;
        font-weight: 700;
        text-align: right;
      }
      .bill-section {
        margin-top: 10px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }
      .sec-heading {
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.5px;
        color: #334155;
        text-transform: uppercase;
        margin-bottom: 6px;
      }
      .bill-card {
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        padding: 12px;
        background-color: rgba(248, 250, 252, 0.8);
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px 12px;
      }
      .bill-f-lbl {
        font-size: 8px;
        font-weight: 500;
        color: #94a3b8;
      }
      .bill-f-val {
        font-size: 9.5px;
        font-weight: 700;
        color: #0f172a;
      }
      .table-container {
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        overflow: hidden;
        background-color: #ffffff;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th {
        background-color: rgba(248, 250, 252, 0.8);
        border-bottom: 1px solid #e2e8f0;
        font-size: 8px;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 10px 14px;
      }
      .pay-summary-section {
        margin-top: 16px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }
      .pay-card {
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        padding: 12px 14px;
        background-color: rgba(248, 250, 252, 0.8);
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .pay-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 9px;
      }
      .pay-row-lbl {
        color: #94a3b8;
      }
      .pay-row-val {
        font-weight: 700;
        color: #0f172a;
      }
      .exchange-card {
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        padding: 12px 14px;
        background-color: rgba(248, 250, 252, 0.8);
        display: flex;
        flex-direction: column;
        gap: 7px;
      }
      .notes-section {
        margin-top: 16px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }
      .notes-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .notes-item {
        font-size: 8px;
        color: #64748b;
        font-weight: 500;
        line-height: 1.45;
      }
      .sig-section {
        display: flex;
        flex-direction: column;
        width: 250px;
        padding-top: 12px;
      }
      .footer-bar {
        margin-top: 10px;
        padding-top: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 8px;
        color: #94a3b8;
        font-weight: 500;
        border-top: 1px solid #f1f5f9;
      }
    </style>
  </head>
  <body>
    <div class="page-container">
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <!-- 1. Header -->
        <div class="header-section">
          <div class="header-flex">
            <div class="logo-box">
              ${logoBase64 ? `<img src="${logoBase64}" class="logo-img" alt="ODST Logo" />` : `<h2 style="font-weight:900; font-size:22px;">ODST</h2>`}
              <div class="address-text">
                Graha Al Badgel<br>
                Jl. Hajjah Tutty Alawiyah No.7, RT.2/RW.5, Kalibata, Kec.<br>
                Pancoran, Kota Jakarta Selatan, Daerah Khusus Ibukota<br>
                Jakarta, Indonesia 12740
              </div>
            </div>
            
            <div class="title-box">
              <h1 class="main-title">
                RESERVATION<br>CONFIRMATION
              </h1>
              <div class="meta-grid">
                <span class="meta-lbl">Reservation No:</span>
                <span class="meta-val">${invoiceNo}</span>
                <span class="meta-lbl">Reference:</span>
                <span style="color:#475569; font-weight:500; text-align:right;">${referenceNo}</span>
                <span class="meta-lbl">Serial:</span>
                <span style="color:#475569; font-weight:500; text-align:right;">${serialNo}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Bill From / Bill To -->
        <div class="bill-section">
          <div>
            <div class="sec-heading">BILL FROM</div>
            <div class="bill-card">
              <div>
                <p class="bill-f-lbl">Employee Name</p>
                <p class="bill-f-val">${bFrom.name || 'Aufa Rakha'}</p>
              </div>
              <div>
                <p class="bill-f-lbl">Company Number</p>
                <p class="bill-f-val">${bFrom.phone || '+62 8111 1203 330'}</p>
              </div>
              <div>
                <p class="bill-f-lbl">Employee ID</p>
                <p class="bill-f-val">${bFrom.id || '250104'}</p>
              </div>
              <div>
                <p class="bill-f-lbl">Company Email</p>
                <p class="bill-f-val" style="word-break:break-all;">${bFrom.email || 'aufa.rakha108@gmail.com'}</p>
              </div>
              <div>
                <p class="bill-f-lbl">Entity / Company</p>
                <p class="bill-f-val">${bFrom.entity || 'PT.ODST AIRLINES INDO'}</p>
              </div>
              <div>
                <p class="bill-f-lbl">Company Tax Number</p>
                <p class="bill-f-val">${bFrom.tax || '0000-0000-0001'}</p>
              </div>
            </div>
          </div>

          <div>
            <div class="sec-heading">BILL TO</div>
            <div class="bill-card">
              <div>
                <p class="bill-f-lbl">Company Name</p>
                <p class="bill-f-val">${bTo.company || 'Arie Tour'}</p>
              </div>
              <div>
                <p class="bill-f-lbl">Company Tax Number</p>
                <p class="bill-f-val">${bTo.tax || '02.271.015.6-.407.000'}</p>
              </div>
              ${bTo.agent ? `
              <div style="grid-column: span 2;">
                <p class="bill-f-lbl">Agent Details</p>
                <p style="font-size:9.5px; font-weight:700; color:#d97706;">Agent: ${bTo.agent.replace(/^Agent:\s*/i, '')}</p>
              </div>
              ` : ''}
              <div style="grid-column: span 2;">
                <p class="bill-f-lbl">Street Address</p>
                <p style="font-size:9px; color:#334155; font-weight:500; line-height:1.2;">${bTo.address || 'Jl. Chairil Anwar Blok B12, Ruko Kalimas, Margahayu, Kec. Bekasi Timur"'}</p>
              </div>
              <div style="grid-column: span 2;">
                <p class="bill-f-lbl">City / Country</p>
                <p style="font-size:9px; color:#334155; font-weight:500;">${bTo.cityCountry || 'Bekasi, 17113, Indonesia'}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Itemized Charges Table -->
        <div>
          <div class="sec-heading">ITEMIZED CHARGES</div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th style="text-align: left;">DESCRIPTION</th>
                  <th style="text-align: center; width: 56px;">QTY</th>
                  <th style="text-align: right; width: 110px;">UNIT PRICE</th>
                  <th style="text-align: right; width: 110px;">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>
        </div>

        <!-- 4. Payment Instructions & Invoice Summary -->
        <div class="pay-summary-section">
          <div>
            <div class="sec-heading">PAYMENT INSTRUCTIONS</div>
            <div class="pay-card">
              <div class="pay-row">
                <span class="pay-row-lbl">Bank Name:</span>
                <span class="pay-row-val">${companySettings.bankName || 'Danamon'}</span>
              </div>
              <div class="pay-row">
                <span class="pay-row-lbl">Account Name:</span>
                <span class="pay-row-val">${companySettings.accountName || 'PT ODST Airlines Indo'}</span>
              </div>
              <div class="pay-row">
                <span class="pay-row-lbl">IDR Account Number:</span>
                <span style="font-weight:700; color:#2563eb; font-size:9px;">${companySettings.idrAccountNumber || '003711895213'}</span>
              </div>
              <div class="pay-row">
                <span class="pay-row-lbl">USD Account Number:</span>
                <span style="font-weight:700; color:#2563eb; font-size:9px;">${companySettings.usdAccountNumber || '003711895643'}</span>
              </div>
            </div>
          </div>

          <div>
            <div class="sec-heading">INVOICE SUMMARY</div>
            <div class="pay-card">
              <div class="pay-row">
                <span class="pay-row-lbl" style="font-size: 9.5px;">Subtotal</span>
                <span class="pay-row-val" style="font-size: 9.5px;">${subtotalFormatted}</span>
              </div>
              <div class="pay-row">
                <span class="pay-row-lbl" style="font-size: 9.5px;">Tax / VAT (${rate}%)</span>
                <span class="pay-row-val" style="font-size: 9.5px;">${taxFormatted}</span>
              </div>
              <div style="border-top: 1px solid #e2e8f0; margin-top: 4px; padding-top: 6px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 10px; font-weight: 700; color: #0f172a;">Total Due</span>
                <span style="font-size: 12.5px; font-weight: 800; color: #2563eb;">${totalFormatted}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 5. Exchange Rate -->
        <div>
          <div class="sec-heading">EXCHANGE RATE</div>
          <div class="exchange-card">
            <div style="display: flex; justify-content: space-between; font-size: 9px; color: #64748b; padding-bottom: 5px; border-bottom: 1px solid #e2e8f0;">
              <div>1 USD = ${(numUsdToSar).toFixed(2)} SAR</div>
              <div style="font-weight: 700; color: #334155;">USD / SAR</div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 9px; color: #64748b; padding-bottom: 5px; border-bottom: 1px solid #e2e8f0;">
              <div>1 SAR = ${numSarToIdr.toLocaleString('id-ID')} IDR</div>
              <div style="font-weight: 700; color: #334155;">SAR / IDR</div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 9px;">
              <span style="color: #64748b; font-weight: 500;">Total Due (IDR)</span>
              <span style="font-weight: 700; color: #2563eb; font-size: 10.5px;">${formattedTotalIDR}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 9px;">
              <span style="color: #64748b; font-weight: 500;">Total Due (USD)</span>
              <span style="font-weight: 700; color: #2563eb; font-size: 10.5px;">${formattedTotalUSD}</span>
            </div>
          </div>
        </div>

        <!-- 6. Notes / Terms & Conditions -->
        <div class="notes-section">
          <div>
            <div class="sec-heading">NOTES</div>
            <ul class="notes-list">
              <li class="notes-item">${defaultNotesList[0]}</li>
              <li class="notes-item">${defaultNotesList[1]}</li>
            </ul>
          </div>
          <div>
            <div class="sec-heading">TERMS &amp; CONDITIONS</div>
            <p style="font-size: 8px; color: #64748b; font-weight: 500; line-height: 1.4;">
              ${companySettings.termsAndConditions || 'Payment is due strictly by the specified date on the ledger. For billing inquiries, contact ODST Admin Team. Thank you for your continued partnership.'}
            </p>
          </div>
        </div>
      </div>

      <!-- 7. Signature & Footer -->
      <div>
        <div class="sig-section">
          <p style="font-size: 9.5px; font-weight: 700; letter-spacing: 0.5px; color: #1e293b; text-align: center; text-transform: uppercase;">
            FINANCIAL CONTROLLER SIGNATURE
          </p>
          <p style="margin-top: 2px; font-size: 8.5px; color: #475569; text-align: center;">
            Emad Moustafa
          </p>
          <div style="margin-top: 44px; border-top: 1px solid #cbd5e1; width: 100%;"></div>
          <div style="margin-top: 12px; font-size: 9.5px;">
            <span style="color: #94a3b8; font-weight: 500;">Due Date:</span>
            <span style="font-weight: 700; color: #0f172a; margin-left: 6px;">${formattedDueDate}</span>
          </div>
        </div>

        <div class="footer-bar">
          <span>${formattedDate} · ${bFrom.entity || 'PT.ODST AIRLINES INDO'}</span>
          <span>Page 1 of 1</span>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
};

/**
 * 2. Generate HTML for Hotel Reservations matching HotelReservationPrint.tsx
 */
const generateHotelReservationHtml = (details, companySettings, logoBase64) => {
  const {
    invoiceNo = 'RES-2026-001',
    company = 'Arie Tour',
    amount = '2,200.00 SAR',
    referenceNo = 'REF-HOTEL-01',
    serialNo = 'SN-HOTEL-01',
    dueDate = '09/07/2026',
    date = '2026-08-31',
    items = [],
    rooms = [],
    taxRate = 0,
    currency = 'SAR',
    billFrom,
    billTo
  } = details;

  const formattedDueDate = formatDateDMY(dueDate) || '07/09/2026';
  const formattedDate = formatDateDMY(date) || '31/08/2026';

  const curr = (currency || 'SAR').toUpperCase().includes('SAR') || String(amount).includes('SAR') ? 'SAR' : (currency || 'USD').toUpperCase();
  const rate = Number(taxRate) || 0;

  let subtotalNum = 0;
  if (items && Array.isArray(items) && items.length > 0) {
    subtotalNum = items.reduce((acc, it) => acc + (Number(it.qty) || 1) * (Number(it.price) || 0), 0);
  } else {
    const rawParsed = parseFloat(String(amount).replace(/[^0-9.]/g, ''));
    subtotalNum = isNaN(rawParsed) ? 2200 : rawParsed;
  }
  const taxNum = subtotalNum * (rate / 100);
  const totalNum = subtotalNum + taxNum;

  const subtotalFormatted = `${subtotalNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`;
  const taxFormatted = `${taxNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`;
  const totalFormatted = `${totalNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`;

  const rawAddress = details.clientAddress || details.address || 'Jl. Chairil Anwar Blok B12, Ruko Kalimas, Margahayu, Kec. Bekasi Timur", Bekasi, 17113, Indonesia';
  const splitAddr = splitAddress(rawAddress);

  const bTo = billTo || {
    company: company || details.companyName || 'Arie Tour',
    tax: details.clientTaxNo || details.taxNumber || '02.271.015.6-.407.000',
    agent: cleanAgentName(details.clientAgent || details.agent || 'ODST Travel and Tourism - 2114'),
    address: splitAddr.address,
    cityCountry: splitAddr.cityCountry
  };

  let hotelRowsHtml = '';
  const roomList = (rooms && rooms.length > 0) ? rooms : (items && items.length > 0 ? items : []);

  if (roomList.length > 0) {
    roomList.forEach((r) => {
      const q = Number(r.roomCount || r.qty) || 1;
      const n = Number(r.nights) || 1;
      const dayRate = Number(r.pricePerNight || r.price) || 0;
      const mealsRate = Number(r.mealRate) || 0;
      const rowTotal = Number(r.totalPrice) || ((dayRate + mealsRate) * q * n);

      hotelRowsHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 7px 6px; font-weight: 600; color: #0f172a; text-transform: uppercase;">${r.hotelName || r.description || 'Pullman Zamzam Makkah'}</td>
          <td style="padding: 7px 4px; color: #1e293b; text-transform: uppercase;">${r.roomType || 'Executive Suite'}</td>
          <td style="padding: 7px 4px; color: #1e293b; white-space: nowrap;">${formatDateDMY(r.checkIn) || '-'}</td>
          <td style="padding: 7px 4px; color: #1e293b; white-space: nowrap;">${formatDateDMY(r.checkOut) || '-'}</td>
          <td style="padding: 7px 4px; text-align: center; font-weight: 600; color: #0f172a;">${n}</td>
          <td style="padding: 7px 4px; text-align: center; font-weight: 600; color: #0f172a;">${q}</td>
          <td style="padding: 7px 4px; text-align: center; font-weight: 600; color: #0f172a;">${r.adults || 2}</td>
          <td style="padding: 7px 4px; text-align: center; font-weight: 600; color: #0f172a;">${r.children || 0}</td>
          <td style="padding: 7px 4px; text-align: center; font-weight: 600; color: #0f172a; text-transform: uppercase;">${r.mealPlan || 'RO'}</td>
          <td style="padding: 7px 6px; text-align: right; font-weight: 500; color: #1e293b;">${dayRate.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${curr}</td>
          <td style="padding: 7px 6px; text-align: right; font-weight: 500; color: #1e293b;">${mealsRate.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${curr}</td>
          <td style="padding: 7px 8px; text-align: right; font-weight: 700; color: #0f172a;">${rowTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${curr}</td>
        </tr>
      `;
    });
  } else {
    hotelRowsHtml = `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 7px 6px; font-weight: 600; color: #0f172a; text-transform: uppercase;">Pullman Zamzam Makkah</td>
        <td style="padding: 7px 4px; color: #1e293b; text-transform: uppercase;">Executive Suite</td>
        <td style="padding: 7px 4px; color: #1e293b; white-space: nowrap;">10/09/2026</td>
        <td style="padding: 7px 4px; color: #1e293b; white-space: nowrap;">15/09/2026</td>
        <td style="padding: 7px 4px; text-align: center; font-weight: 600; color: #0f172a;">5</td>
        <td style="padding: 7px 4px; text-align: center; font-weight: 600; color: #0f172a;">1</td>
        <td style="padding: 7px 4px; text-align: center; font-weight: 600; color: #0f172a;">2</td>
        <td style="padding: 7px 4px; text-align: center; font-weight: 600; color: #0f172a;">0</td>
        <td style="padding: 7px 4px; text-align: center; font-weight: 600; color: #0f172a; text-transform: uppercase;">FB</td>
        <td style="padding: 7px 6px; text-align: right; font-weight: 500; color: #1e293b;">2,200.00 SAR</td>
        <td style="padding: 7px 6px; text-align: right; font-weight: 500; color: #1e293b;">0.00 SAR</td>
        <td style="padding: 7px 8px; text-align: right; font-weight: 700; color: #0f172a;">2,200.00 SAR</td>
      </tr>
    `;
  }

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>${invoiceNo} - Hotel Reservation</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      @page {
        size: A4 portrait;
        margin: 0;
      }
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background-color: #ffffff;
        color: #1e293b;
        margin: 0;
        padding: 0;
        -webkit-font-smoothing: antialiased;
      }
      .page-container {
        width: 210mm;
        height: 297mm;
        padding: 12mm 14mm;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-sizing: border-box;
        background-color: #ffffff;
      }
    </style>
  </head>
  <body>
    <div class="page-container">
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <!-- Header -->
        <div style="padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            ${logoBase64 ? `<img src="${logoBase64}" style="height: 48px; width: auto; object-fit: contain;" alt="Logo" />` : `<h2 style="font-weight: 900;">ODST</h2>`}
            <div style="margin-top: 5px; font-size: 9px; color: #94a3b8; line-height: 1.4;">
              Gedung Graha Al Badgel, Jl. Hajjah Tutty Alawiyah No.7, RT.2/RW.5<br>
              Kalibata, Kec. Pancoran, Kota Jakarta Selatan, DKI Jakarta<br>
              12740, Indonesia
            </div>
          </div>
          <div style="text-align: right;">
            <h1 style="font-size: 20px; font-weight: 800; color: #1e293b; tracking-wide: 0.5px;">HOTEL RESERVATION</h1>
            <p style="font-size: 10px; color: #94a3b8; margin-top: 3px;">
              Reservation No: <span style="color: #1e293b; font-weight: 700;">${invoiceNo}</span>
            </p>
            <div style="margin-top: 6px;">
              <span style="display: inline-block; padding: 3px 10px; font-size: 9px; font-weight: 800; color: #059669; border: 1px solid #34d399; background-color: #ecfdf5; border-radius: 12px;">
                CONFIRMED
              </span>
            </div>
          </div>
        </div>

        <!-- Metadata & Bill To -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div style="background-color: rgba(248, 250, 252, 0.7); border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px;">
            <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px;">RESERVATION DETAILS</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 10px;">
              <div>
                <p style="color: #94a3b8; font-size: 9px;">Reference Number</p>
                <p style="font-weight: 700; color: #1e293b; font-size: 11px;">${referenceNo}</p>
              </div>
              <div>
                <p style="color: #94a3b8; font-size: 9px;">Serial Number</p>
                <p style="font-weight: 700; color: #1e293b; font-size: 11px;">${serialNo}</p>
              </div>
              <div>
                <p style="color: #94a3b8; font-size: 9px;">Due Date</p>
                <p style="font-weight: 700; color: #1e293b; font-size: 11px;">${formattedDueDate}</p>
              </div>
              <div>
                <p style="color: #94a3b8; font-size: 9px;">Status</p>
                <p style="font-weight: 700; color: #1e293b; font-size: 11px; text-transform: uppercase;">CONFIRMED</p>
              </div>
            </div>
          </div>

          <div style="background-color: rgba(248, 250, 252, 0.7); border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px;">
            <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px;">BILL TO</div>
            <div style="font-size: 10px; line-height: 1.45;">
              <p style="color: #94a3b8; font-size: 9px;">Company Name</p>
              <p style="font-weight: 700; color: #1e293b; font-size: 11px;">${bTo.company || 'Arie Tour'}</p>
              <p style="color: #94a3b8; font-size: 9px; margin-top: 4px;">Street Address &amp; City</p>
              <p style="font-weight: 600; color: #334155; font-size: 10px;">${bTo.address || 'Jl. Chairil Anwar Blok B12, Ruko Kalimas'}, ${bTo.cityCountry || 'Bekasi, 17113, Indonesia'}</p>
            </div>
          </div>
        </div>

        <!-- Hotel Details Table -->
        <div style="border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse; font-size: 8px;">
            <thead>
              <tr style="background-color: #1d2857; color: #ffffff;">
                <th colspan="12" style="padding: 8px 12px; text-align: center; font-weight: 700; font-size: 11px; background-color: #1d2857; color: #ffffff;">
                  Hotel Details
                </th>
              </tr>
              <tr style="background-color: #e0e8fe; color: #1d2857; font-weight: 700; text-transform: uppercase; font-size: 8px; border-bottom: 1px solid #cbd5e1;">
                <th style="padding: 7px 6px; text-align: left; background-color: #e0e8fe; color: #1d2857;">Hotel</th>
                <th style="padding: 7px 4px; text-align: left; background-color: #e0e8fe; color: #1d2857;">Room Type</th>
                <th style="padding: 7px 4px; background-color: #e0e8fe; color: #1d2857;">Check-In</th>
                <th style="padding: 7px 4px; background-color: #e0e8fe; color: #1d2857;">Check-Out</th>
                <th style="padding: 7px 4px; text-align: center; background-color: #e0e8fe; color: #1d2857;">#Night</th>
                <th style="padding: 7px 4px; text-align: center; background-color: #e0e8fe; color: #1d2857;">#Room</th>
                <th style="padding: 7px 4px; text-align: center; background-color: #e0e8fe; color: #1d2857;">Adult</th>
                <th style="padding: 7px 4px; text-align: center; background-color: #e0e8fe; color: #1d2857;">Child</th>
                <th style="padding: 7px 4px; text-align: center; background-color: #e0e8fe; color: #1d2857;">Meals</th>
                <th style="padding: 7px 6px; text-align: right; background-color: #e0e8fe; color: #1d2857;">DayRate</th>
                <th style="padding: 7px 6px; text-align: right; background-color: #e0e8fe; color: #1d2857;">Meals Rate</th>
                <th style="padding: 7px 8px; text-align: right; background-color: #e0e8fe; color: #1d2857;">Total</th>
              </tr>
            </thead>
            <tbody style="background-color: #ffffff;">
              ${hotelRowsHtml}
            </tbody>
          </table>
        </div>

        <!-- Payment & Invoice Summary -->
        <div style="display: grid; grid-template-columns: 7fr 5fr; gap: 18px;">
          <div style="background-color: rgba(239, 246, 255, 0.3); border: 1px solid #dbeafe; border-radius: 12px; padding: 12px; font-size: 10px;">
            <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">PAYMENT INSTRUCTIONS</div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding: 3px 0;">
              <span style="color: #64748b;">Bank Name:</span>
              <span style="font-weight: 700; color: #1e293b;">${companySettings.bankName || 'Danamon'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding: 3px 0;">
              <span style="color: #64748b;">Account Name:</span>
              <span style="font-weight: 700; color: #1e293b;">${companySettings.accountName || 'PT ODST Airlines Indo'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding: 3px 0;">
              <span style="color: #64748b;">IDR Account Number:</span>
              <span style="font-weight: 700; color: #2563eb;">${companySettings.idrAccountNumber || '003711895213'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 3px 0;">
              <span style="color: #64748b;">USD Account Number:</span>
              <span style="font-weight: 700; color: #2563eb;">${companySettings.usdAccountNumber || '003711895643'}</span>
            </div>
          </div>

          <div style="background-color: rgba(248, 250, 252, 0.7); border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; font-size: 11px;">
            <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">INVOICE SUMMARY</div>
            <div style="display: flex; justify-content: space-between; color: #64748b; padding: 2px 0;">
              <span>Subtotal</span>
              <span style="font-weight: 600;">${subtotalFormatted}</span>
            </div>
            <div style="display: flex; justify-content: space-between; color: #64748b; padding: 2px 0;">
              <span>Tax / VAT (${rate}%)</span>
              <span style="font-weight: 600;">${taxFormatted}</span>
            </div>
            <div style="border-top: 1px solid #e2e8f0; margin-top: 6px; padding-top: 6px; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 700; color: #1e293b;">Total Due</span>
              <span style="font-weight: 800; color: #ea580c; font-size: 13px;">${totalFormatted}</span>
            </div>
          </div>
        </div>

        <!-- Exchange Rate -->
        <div style="background-color: rgba(248, 250, 252, 0.7); border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 14px; font-size: 10px;">
          <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">EXCHANGE RATE</div>
          <div style="display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">
            <span>1 USD = 18,000 IDR</span>
            <span style="font-weight: 700; color: #334155;">USD / IDR</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">
            <span>1 SAR = 4,800 IDR</span>
            <span style="font-weight: 700; color: #334155;">SAR / IDR</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 3px 0;">
            <span style="color: #64748b; font-weight: 500;">Total Due (IDR)</span>
            <span style="font-weight: 700; color: #2563eb; font-size: 11px;">Rp 10,560,000</span>
          </div>
        </div>

        <!-- Notes / Terms -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px;">
          <div>
            <div style="font-size: 9px; font-weight: 800; color: #334155; text-transform: uppercase; margin-bottom: 4px;">NOTES</div>
            <ul style="list-style: none; padding: 0; margin: 0; font-size: 9px; color: #64748b; line-height: 1.4;">
              <li>* This reservation has been confirmed. No further action required.</li>
              <li>* Thank you for settling the payment. Please keep this invoice copy as your official receipt.</li>
            </ul>
          </div>
          <div>
            <div style="font-size: 9px; font-weight: 800; color: #334155; text-transform: uppercase; margin-bottom: 4px;">TERMS &amp; CONDITIONS</div>
            <p style="font-size: 9px; color: #64748b; line-height: 1.4;">
              ${companySettings.termsAndConditions || 'Payment is due strictly by the specified date on the ledger. For billing inquiries, contact ODST Admin Team. Thank you for your continued partnership.'}
            </p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding-top: 8px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; font-size: 8px; color: #94a3b8; font-weight: 500;">
        <span>${formattedDate} · PT.ODST AIRLINES INDO</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  </body>
  </html>
  `;
};

/**
 * Generate pixel-perfect A4 PDF buffer using Chrome headless
 */
export const generateInvoicePdfBuffer = async (invoiceDetails, companySettings = {}) => {
  const browserPath = getBrowserPath();
  if (!browserPath) {
    throw new Error('Chrome or Edge browser executable not found on host machine.');
  }

  const logoPath = path.join(process.cwd(), 'assets', 'odstlogo.png');
  let logoBase64 = '';
  if (fs.existsSync(logoPath)) {
    logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
  }

  const isHotel = (invoiceDetails.documentType && invoiceDetails.documentType.toLowerCase().includes('hotel')) || (invoiceDetails.invoiceNo && (invoiceDetails.invoiceNo.startsWith('RES-') || invoiceDetails.invoiceNo.startsWith('HR-') || invoiceDetails.invoiceNo.startsWith('HM-')));

  const html = isHotel
    ? generateHotelReservationHtml(invoiceDetails, companySettings, logoBase64)
    : generateGeneralConfirmationHtml(invoiceDetails, companySettings, logoBase64);

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=medium'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '0mm',
        bottom: '0mm',
        left: '0mm',
        right: '0mm'
      }
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
};
