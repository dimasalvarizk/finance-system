import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

/**
 * Generate a pixel-matched official PDF matching ReservationConfirmationPrint & HotelReservationPrint.
 */
export const generateInvoicePdfBuffer = (invoiceDetails, companySettings = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4', // 595.28 x 841.89
        margins: { top: 34, bottom: 30, left: 34, right: 34 },
        info: {
          Title: `${invoiceDetails.invoiceNo || 'Document'} - Reservation Confirmation`,
          Author: 'PT. ODST AIRLINES INDO',
          Subject: 'Official Financial Confirmation'
        }
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const {
        invoiceNo = 'AIT-0831-002',
        company = 'Asia Tour',
        companyCode = 'ACM',
        amount = '2,200.00 SAR',
        referenceNo = 'REF-0987-189',
        serialNo = 'SN-456523',
        dueDate = '09/07/2026',
        date = '2026-08-31',
        items = [],
        taxRate = 0,
        currency = 'SAR',
        usdToIdrRate = 18025,
        sarToIdrRate = 4800,
        documentType = ''
      } = invoiceDetails;

      const isHotel = (documentType && documentType.toLowerCase().includes('hotel')) || invoiceNo.startsWith('RES-') || invoiceNo.startsWith('HR-') || invoiceNo.startsWith('HM-');

      const pageW = doc.page.width; // 595.28
      const margin = 34;
      const contentW = pageW - margin * 2; // 527.28

      // =========================================================================
      // 1. TOP HEADER (Logo + Address on Left, Title + Meta on Right)
      // =========================================================================
      const headerStartY = 34;
      const logoPath = path.join(process.cwd(), 'assets', 'odstlogo.png');

      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, margin, headerStartY, { width: 105 });
      } else {
        doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text('ODST', margin, headerStartY);
      }

      // Address text under logo
      doc.fillColor('#94a3b8')
        .fontSize(7)
        .font('Helvetica')
        .text('Graha Al Badgel\nJl. Hajjah Tutty Alawiyah No.7, RT.2/RW.5, Kalibata, Kec.\nPancoran, Kota Jakarta Selatan, Daerah Khusus Ibukota\nJakarta, Indonesia 12740', margin, headerStartY + 38, { lineGap: 1.5 });

      // Title on Top Right
      const rightColX = margin + contentW / 2;
      const rightColW = contentW / 2;

      if (isHotel) {
        doc.fillColor('#0f172a')
          .fontSize(18)
          .font('Helvetica-Bold')
          .text('HOTEL\nRESERVATION', rightColX, headerStartY, { width: rightColW, align: 'right', lineGap: 1 });
      } else {
        doc.fillColor('#0f172a')
          .fontSize(18)
          .font('Helvetica-Bold')
          .text('RESERVATION\nCONFIRMATION', rightColX, headerStartY, { width: rightColW, align: 'right', lineGap: 1 });
      }

      // Metadata on Right
      const metaY = headerStartY + 45;
      const metaLabelW = 80;
      const metaValW = 90;
      const metaStartX = pageW - margin - metaLabelW - metaValW;

      doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica').text('Reservation No:', metaStartX, metaY, { width: metaLabelW, align: 'right' });
      doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold').text(invoiceNo, metaStartX + metaLabelW + 5, metaY, { width: metaValW, align: 'right' });

      doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica').text('Reference:', metaStartX, metaY + 11, { width: metaLabelW, align: 'right' });
      doc.fillColor('#475569').fontSize(7.5).font('Helvetica').text(referenceNo || '-', metaStartX + metaLabelW + 5, metaY + 11, { width: metaValW, align: 'right' });

      doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica').text('Serial:', metaStartX, metaY + 22, { width: metaLabelW, align: 'right' });
      doc.fillColor('#475569').fontSize(7.5).font('Helvetica').text(serialNo || '-', metaStartX + metaLabelW + 5, metaY + 22, { width: metaValW, align: 'right' });

      // Header bottom border line
      const headerEndY = 118;
      doc.strokeColor('#e2e8f0').lineWidth(0.75).moveTo(margin, headerEndY).lineTo(pageW - margin, headerEndY).stroke();

      // =========================================================================
      // 2. BILL FROM & BILL TO BOXES
      // =========================================================================
      const boxY = headerEndY + 10;
      const boxW = (contentW - 12) / 2;
      const boxH = 68;

      // Section Headings
      doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold').text('BILL FROM', margin, boxY);
      doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold').text('BILL TO', margin + boxW + 12, boxY);

      const cardY = boxY + 12;

      // Bill From Box Background
      doc.roundedRect(margin, cardY, boxW, boxH, 6).fillAndStroke('#f8fafc', '#e2e8f0');
      // Bill To Box Background
      doc.roundedRect(margin + boxW + 12, cardY, boxW, boxH, 6).fillAndStroke('#f8fafc', '#e2e8f0');

      // Bill From Content (2 Sub-columns)
      const subColW = (boxW - 16) / 2;
      const bFromLeftX = margin + 8;
      const bFromRightX = margin + 8 + subColW;

      // Left column inside Bill From
      doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica').text('Employee Name', bFromLeftX, cardY + 7);
      doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold').text('Aulia Azzha', bFromLeftX, cardY + 15, { width: subColW - 4, ellipsis: true });

      doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica').text('Employee ID', bFromLeftX, cardY + 27);
      doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold').text('250104', bFromLeftX, cardY + 35);

      doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica').text('Entity / Company', bFromLeftX, cardY + 47);
      doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold').text(companySettings.companyName || 'PT.ODST AIRLINES INDO', bFromLeftX, cardY + 55, { width: subColW - 4, ellipsis: true });

      // Right column inside Bill From
      doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica').text('Company Number', bFromRightX, cardY + 7);
      doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold').text(companySettings.phone || '+62 811 1202 338', bFromRightX, cardY + 15, { width: subColW - 4, ellipsis: true });

      doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica').text('Company Email', bFromRightX, cardY + 27);
      doc.fillColor('#0f172a').fontSize(7).font('Helvetica-Bold').text('mcfc.nabilah@gmail.com', bFromRightX, cardY + 35, { width: subColW - 4, ellipsis: true });

      doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica').text('Company Tax Number', bFromRightX, cardY + 47);
      doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold').text(companySettings.taxNumber || '0000-0000-0001', bFromRightX, cardY + 55);

      // Bill To Content
      const bToX = margin + boxW + 20;
      doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica').text('Company Name', bToX, cardY + 7);
      doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold').text(company, bToX, cardY + 15, { width: subColW - 4, ellipsis: true });

      doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica').text('Company Tax Number', bToX + subColW, cardY + 7);
      doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold').text('02.271.015.6-407.000', bToX + subColW, cardY + 15);

      doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica').text('Agent Details', bToX, cardY + 26);
      doc.fillColor('#d97706').fontSize(7).font('Helvetica-Bold').text('Agent: ODST Travel & Tourism', bToX, cardY + 34);

      doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica').text('Street Address', bToX, cardY + 43);
      doc.fillColor('#334155').fontSize(6.5).font('Helvetica').text('Jl. Chairil Anwar Blok B12, Ruko Kalimas 1, Margahayu, Kec. Bekasi Timur', bToX, cardY + 51, { width: boxW - 16, ellipsis: true });

      doc.fillColor('#334155').fontSize(6.5).font('Helvetica').text('Bekasi, 17113, Indonesia', bToX, cardY + 59);

      // =========================================================================
      // 3. ITEMIZED CHARGES TABLE
      // =========================================================================
      const tableStartY = cardY + boxH + 12;

      doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold').text('ITEMIZED CHARGES', margin, tableStartY);

      const tHeaderY = tableStartY + 12;
      const tHeaderH = 18;

      // Table Header Row
      doc.roundedRect(margin, tHeaderY, contentW, tHeaderH, 4).fillAndStroke('#f8fafc', '#e2e8f0');

      doc.fillColor('#64748b')
        .fontSize(6.5)
        .font('Helvetica-Bold')
        .text('DESCRIPTION', margin + 10, tHeaderY + 5)
        .text('QTY', margin + 310, tHeaderY + 5, { width: 35, align: 'center' })
        .text('UNIT PRICE', margin + 355, tHeaderY + 5, { width: 75, align: 'right' })
        .text('TOTAL', margin + 440, tHeaderY + 5, { width: 75, align: 'right' });

      let currentItemY = tHeaderY + tHeaderH;
      const rowH = 20;

      const currencyLabel = currency.toUpperCase().includes('SAR') || amount.includes('SAR') ? 'SAR' : 'SAR';

      if (items && Array.isArray(items) && items.length > 0) {
        items.forEach((it, idx) => {
          const qty = Number(it.qty) || 1;
          const price = Number(it.price) || 0;
          const tot = (qty * price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const uPrice = price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

          // Row background
          doc.rect(margin, currentItemY, contentW, rowH).fillAndStroke('#ffffff', '#f1f5f9');

          doc.fillColor('#1e293b')
            .fontSize(7.5)
            .font('Helvetica-Bold')
            .text(it.description || 'Service Item', margin + 10, currentItemY + 6, { width: 295, ellipsis: true });

          doc.fillColor('#334155')
            .fontSize(7.5)
            .font('Helvetica')
            .text(String(qty), margin + 310, currentItemY + 6, { width: 35, align: 'center' })
            .text(`${uPrice} ${currencyLabel}`, margin + 355, currentItemY + 6, { width: 75, align: 'right' });

          doc.fillColor('#0f172a')
            .fontSize(7.5)
            .font('Helvetica-Bold')
            .text(`${tot} ${currencyLabel}`, margin + 440, currentItemY + 6, { width: 75, align: 'right' });

          currentItemY += rowH;
        });
      } else {
        doc.rect(margin, currentItemY, contentW, rowH).fillAndStroke('#ffffff', '#f1f5f9');
        doc.fillColor('#1e293b').fontSize(7.5).font('Helvetica-Bold').text('Manasik External Agent Activation', margin + 10, currentItemY + 6);
        doc.fillColor('#334155').fontSize(7.5).font('Helvetica').text('1', margin + 310, currentItemY + 6, { width: 35, align: 'center' });
        doc.fillColor('#334155').fontSize(7.5).font('Helvetica').text(`2,000.00 ${currencyLabel}`, margin + 355, currentItemY + 6, { width: 75, align: 'right' });
        doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold').text(`2,000.00 ${currencyLabel}`, margin + 440, currentItemY + 6, { width: 75, align: 'right' });
        currentItemY += rowH;

        doc.rect(margin, currentItemY, contentW, rowH).fillAndStroke('#ffffff', '#f1f5f9');
        doc.fillColor('#1e293b').fontSize(7.5).font('Helvetica-Bold').text('System Activation', margin + 10, currentItemY + 6);
        doc.fillColor('#334155').fontSize(7.5).font('Helvetica').text('1', margin + 310, currentItemY + 6, { width: 35, align: 'center' });
        doc.fillColor('#334155').fontSize(7.5).font('Helvetica').text(`200.00 ${currencyLabel}`, margin + 355, currentItemY + 6, { width: 75, align: 'right' });
        doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold').text(`200.00 ${currencyLabel}`, margin + 440, currentItemY + 6, { width: 75, align: 'right' });
        currentItemY += rowH;
      }

      // =========================================================================
      // 4. PAYMENT INSTRUCTIONS & INVOICE SUMMARY
      // =========================================================================
      const paySumY = currentItemY + 12;
      const payBoxH = 62;

      doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold').text('PAYMENT INSTRUCTIONS', margin, paySumY);
      doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold').text('INVOICE SUMMARY', margin + boxW + 12, paySumY);

      const payCardY = paySumY + 11;

      // Payment Instructions Card
      doc.roundedRect(margin, payCardY, boxW, payBoxH, 6).fillAndStroke('#f8fafc', '#e2e8f0');

      doc.fillColor('#94a3b8').fontSize(7).font('Helvetica').text('Bank Name:', margin + 8, payCardY + 7);
      doc.fillColor('#0f172a').fontSize(7).font('Helvetica-Bold').text(companySettings.bankName || 'Danamon', margin + 8, payCardY + 7, { width: boxW - 16, align: 'right' });

      doc.fillColor('#94a3b8').fontSize(7).font('Helvetica').text('Account Name:', margin + 8, payCardY + 19);
      doc.fillColor('#0f172a').fontSize(7).font('Helvetica-Bold').text(companySettings.accountName || 'PT ODST Airlines Indo', margin + 8, payCardY + 19, { width: boxW - 16, align: 'right' });

      doc.fillColor('#94a3b8').fontSize(7).font('Helvetica').text('IDR Account Number:', margin + 8, payCardY + 31);
      doc.fillColor('#2563eb').fontSize(7.5).font('Helvetica-Bold').text(companySettings.idrAccountNumber || '003711915213', margin + 8, payCardY + 31, { width: boxW - 16, align: 'right' });

      doc.fillColor('#94a3b8').fontSize(7).font('Helvetica').text('USD Account Number:', margin + 8, payCardY + 43);
      doc.fillColor('#2563eb').fontSize(7.5).font('Helvetica-Bold').text(companySettings.usdAccountNumber || '003711915643', margin + 8, payCardY + 43, { width: boxW - 16, align: 'right' });

      // Invoice Summary Card
      const sumCardX = margin + boxW + 12;
      doc.roundedRect(sumCardX, payCardY, boxW, payBoxH, 6).fillAndStroke('#f8fafc', '#e2e8f0');

      const formattedTotalStr = amount.includes('SAR') || amount.includes('$') ? amount : `${amount} SAR`;

      doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica').text('Subtotal', sumCardX + 10, payCardY + 8);
      doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold').text(formattedTotalStr, sumCardX + 10, payCardY + 8, { width: boxW - 20, align: 'right' });

      doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica').text(`Tax / VAT (${taxRate || 0}%)`, sumCardX + 10, payCardY + 22);
      doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold').text(`0.00 ${currencyLabel}`, sumCardX + 10, payCardY + 22, { width: boxW - 20, align: 'right' });

      doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(sumCardX + 10, payCardY + 36).lineTo(sumCardX + boxW - 10, payCardY + 36).stroke();

      doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold').text('Total Due', sumCardX + 10, payCardY + 44);
      doc.fillColor('#2563eb').fontSize(9.5).font('Helvetica-Bold').text(formattedTotalStr, sumCardX + 10, payCardY + 43, { width: boxW - 20, align: 'right' });

      // =========================================================================
      // 5. EXCHANGE RATE SECTION
      // =========================================================================
      const exRateY = payCardY + payBoxH + 10;
      doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold').text('EXCHANGE RATE', margin, exRateY);

      const exCardY = exRateY + 11;
      const exCardH = 48;
      doc.roundedRect(margin, exCardY, contentW, exCardH, 6).fillAndStroke('#f8fafc', '#e2e8f0');

      // Conversion line 1 & 2
      doc.fillColor('#64748b').fontSize(7).font('Helvetica').text('1 USD = 3.75 SAR', margin + 10, exCardY + 6);
      doc.fillColor('#475569').fontSize(7).font('Helvetica-Bold').text('USD / SAR', margin + 10, exCardY + 6, { width: contentW - 20, align: 'right' });

      doc.fillColor('#64748b').fontSize(7).font('Helvetica').text('1 SAR = 4,800 IDR', margin + 10, exCardY + 16);
      doc.fillColor('#475569').fontSize(7).font('Helvetica-Bold').text('SAR / IDR', margin + 10, exCardY + 16, { width: contentW - 20, align: 'right' });

      doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(margin + 10, exCardY + 27).lineTo(margin + contentW - 10, exCardY + 27).stroke();

      // Total Due Converted
      doc.fillColor('#64748b').fontSize(7).font('Helvetica').text('Total Due (IDR)', margin + 10, exCardY + 33);
      doc.fillColor('#2563eb').fontSize(8).font('Helvetica-Bold').text('Rp 10,560,000', margin + 10, exCardY + 33, { width: contentW - 20, align: 'right' });

      // =========================================================================
      // 6. NOTES & TERMS & CONDITIONS
      // =========================================================================
      const notesY = exCardY + exCardH + 10;

      doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold').text('NOTES', margin, notesY);
      doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold').text('TERMS & CONDITIONS', margin + boxW + 12, notesY);

      const notesTextY = notesY + 10;
      doc.fillColor('#64748b')
        .fontSize(6.5)
        .font('Helvetica')
        .text(`* Please ensure the Invoice Number (e.g. ${invoiceNo}) is listed as the payment description reference.\n* Attach hotel booking confirmation numbers where applicable for ground handling operations.`, margin, notesTextY, { width: boxW, lineGap: 2 });

      doc.fillColor('#64748b')
        .fontSize(6.5)
        .font('Helvetica')
        .text('Payment is due strictly by the specified date on the ledger. For billing inquiries, contact ODST Admin Team. Thank you for your continued partnership.', margin + boxW + 12, notesTextY, { width: boxW, lineGap: 2 });

      // =========================================================================
      // 7. FINANCIAL CONTROLLER SIGNATURE & DUE DATE
      // =========================================================================
      const sigY = notesTextY + 35;
      const sigW = 160;
      const sigCenterX = margin + sigW / 2;

      doc.fillColor('#1e293b').fontSize(7.5).font('Helvetica-Bold').text('FINANCIAL CONTROLLER SIGNATURE', margin, sigY, { width: sigW, align: 'center' });
      doc.fillColor('#64748b').fontSize(7).font('Helvetica').text('Emad Moustafa', margin, sigY + 9, { width: sigW, align: 'center' });

      // Signature line
      doc.strokeColor('#cbd5e1').lineWidth(0.75).moveTo(margin, sigY + 32).lineTo(margin + sigW, sigY + 32).stroke();

      // Due Date below signature line
      doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica').text('Due Date:', margin, sigY + 38);
      doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold').text(dueDate || '09/07/2026', margin + 42, sigY + 38);

      // =========================================================================
      // 8. FOOTER
      // =========================================================================
      const footerY = doc.page.height - 35;
      doc.strokeColor('#f1f5f9').lineWidth(0.5).moveTo(margin, footerY - 5).lineTo(pageW - margin, footerY - 5).stroke();

      const formattedPrintDate = date ? new Date(date).toLocaleDateString('en-GB') : '25/08/2026';
      doc.fillColor('#94a3b8')
        .fontSize(6.5)
        .font('Helvetica')
        .text(`${formattedPrintDate} • PT ODST AIRLINES INDO`, margin, footerY)
        .text('Page 1 of 1', margin, footerY, { width: contentW, align: 'right' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
