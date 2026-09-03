import PDFDocument from 'pdfkit';

/**
 * Generate a professional PDF document buffer for Invoices and Hotel Reservation Confirmations.
 */
export const generateInvoicePdfBuffer = (invoiceDetails, companySettings = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `${invoiceDetails.documentType || 'Invoice'} - ${invoiceDetails.invoiceNo}`,
          Author: companySettings.companyName || 'ODST Group',
          Subject: 'Official Financial Document'
        }
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const {
        invoiceNo = 'INV-0000',
        company = 'Client Company',
        companyCode = '',
        amount = '0.00',
        referenceNo = '-',
        serialNo = '-',
        dueDate = '',
        date = '',
        items = [],
        taxRate = 0,
        documentType = 'INVOICE / CONFIRMATION'
      } = invoiceDetails;

      const isHotel = documentType.toLowerCase().includes('hotel') || invoiceNo.startsWith('RES-');
      const docHeading = isHotel ? 'HOTEL RESERVATION CONFIRMATION' : 'INVOICE / GENERAL CONFIRMATION';

      // ==========================================
      // 1. TOP HEADER BANNER
      // ==========================================
      doc.rect(0, 0, doc.page.width, 95).fill('#242e69');

      // Accent gold bar
      doc.rect(0, 95, doc.page.width, 5).fill('#f59e0b');

      // Header Brand Text
      doc.fillColor('#ffffff')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('ODST FINANCE PORTAL', 40, 25, { characterSpacing: 1 });

      doc.fillColor('#cbd5e1')
        .fontSize(8.5)
        .font('Helvetica')
        .text('PT. ODST AIRLINES INDO & MANAZIL AL.MUKHTARA GROUP', 40, 45);

      doc.fillColor('#ffffff')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(docHeading, 40, 68);

      // Invoice Number badge on the right
      doc.fillColor('#f59e0b')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(invoiceNo, doc.page.width - 240, 35, { width: 200, align: 'right' });

      doc.fillColor('#94a3b8')
        .fontSize(8.5)
        .font('Helvetica')
        .text(`Generated: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`, doc.page.width - 240, 55, { width: 200, align: 'right' });

      // Move down after header
      doc.y = 120;

      // ==========================================
      // 2. METADATA CARDS GRID
      // ==========================================
      const metaY = doc.y;
      const colW = (doc.page.width - 80) / 4;

      const metaBoxes = [
        { label: 'DOCUMENT DATE', val: date || '-' },
        { label: 'PAYMENT DUE DATE', val: dueDate || '-', highlight: true },
        { label: 'REFERENCE NO', val: referenceNo || '-' },
        { label: 'SERIAL NO', val: serialNo || '-' }
      ];

      metaBoxes.forEach((m, i) => {
        const xPos = 40 + i * colW;
        doc.rect(xPos, metaY, colW - 8, 42).fillAndStroke('#f8fafc', '#e2e8f0');

        doc.fillColor('#64748b')
          .fontSize(7)
          .font('Helvetica-Bold')
          .text(m.label, xPos + 8, metaY + 7);

        doc.fillColor(m.highlight ? '#b45309' : '#0f172a')
          .fontSize(9.5)
          .font('Helvetica-Bold')
          .text(m.val, xPos + 8, metaY + 20, { width: colW - 20, ellipsis: true });
      });

      doc.y = metaY + 55;

      // ==========================================
      // 3. BILL FROM & BILL TO BOXES
      // ==========================================
      const billY = doc.y;
      const halfW = (doc.page.width - 95) / 2;

      // Bill From
      doc.rect(40, billY, halfW, 90).fillAndStroke('#ffffff', '#e2e8f0');
      doc.fillColor('#1e293b')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('ISSUER (BILL FROM)', 50, billY + 8);

      doc.fillColor('#334155')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(companySettings.companyName || 'ODST Group', 50, billY + 22);

      doc.fillColor('#64748b')
        .fontSize(8)
        .font('Helvetica')
        .text('CBC Office (Head Office)\nJakarta, Indonesia\nPhone: ' + (companySettings.phone || '+62 856 9332 3122') + '\nTax No: ' + (companySettings.taxNumber || '0000-0000-0000'), 50, billY + 36, { lineGap: 2 });

      // Bill To
      const rightX = 40 + halfW + 15;
      doc.rect(rightX, billY, halfW, 90).fillAndStroke('#ffffff', '#e2e8f0');
      doc.fillColor('#1e293b')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('CLIENT (BILL TO)', rightX + 10, billY + 8);

      doc.fillColor('#334155')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(company, rightX + 10, billY + 22);

      doc.fillColor('#64748b')
        .fontSize(8)
        .font('Helvetica')
        .text(`Company Code: ${companyCode || 'ACM'}\nOfficial Confirmation Partner\nStatus: Verified Client`, rightX + 10, billY + 36, { lineGap: 3 });

      doc.y = billY + 105;

      // ==========================================
      // 4. ITEMS TABLE
      // ==========================================
      const tableY = doc.y;
      const tableW = doc.page.width - 80;

      // Table Header
      doc.rect(40, tableY, tableW, 22).fill('#242e69');
      doc.fillColor('#ffffff')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('DESCRIPTION / SERVICE ITEM', 50, tableY + 6)
        .text('QTY', 340, tableY + 6, { width: 40, align: 'center' })
        .text('UNIT PRICE', 390, tableY + 6, { width: 75, align: 'right' })
        .text('TOTAL', 475, tableY + 6, { width: 75, align: 'right' });

      let currentItemY = tableY + 22;

      if (items && Array.isArray(items) && items.length > 0) {
        items.forEach((item, idx) => {
          const isEven = idx % 2 === 0;
          const rowBg = isEven ? '#ffffff' : '#f8fafc';
          const qty = Number(item.qty) || 1;
          const price = Number(item.price) || 0;
          const itemTot = (qty * price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const itemPrice = price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

          doc.rect(40, currentItemY, tableW, 22).fillAndStroke(rowBg, '#f1f5f9');

          doc.fillColor('#1e293b')
            .fontSize(8)
            .font('Helvetica')
            .text(item.description || '-', 50, currentItemY + 6, { width: 280, ellipsis: true })
            .text(String(qty), 340, currentItemY + 6, { width: 40, align: 'center' })
            .text(itemPrice, 390, currentItemY + 6, { width: 75, align: 'right' })
            .font('Helvetica-Bold')
            .text(itemTot, 475, currentItemY + 6, { width: 75, align: 'right' });

          currentItemY += 22;
        });
      } else {
        doc.rect(40, currentItemY, tableW, 25).fillAndStroke('#ffffff', '#f1f5f9');
        doc.fillColor('#94a3b8')
          .fontSize(8.5)
          .font('Helvetica')
          .text('Standard service & accommodation charges as detailed in confirmation.', 50, currentItemY + 7);
        currentItemY += 25;
      }

      doc.y = currentItemY + 10;

      // ==========================================
      // 5. TOTAL DUE CARD & PAYMENT INSTRUCTIONS
      // ==========================================
      const bottomY = doc.y;

      // Payment instructions box on left
      doc.rect(40, bottomY, 280, 85).fillAndStroke('#f8fafc', '#e2e8f0');
      doc.fillColor('#0f172a')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('OFFICIAL BANK PAYMENT DETAILS', 50, bottomY + 8);

      doc.fillColor('#64748b')
        .fontSize(7.5)
        .font('Helvetica')
        .text(`Bank Name: ${companySettings.bankName || 'Danamon'}\nAccount Name: ${companySettings.accountName || 'PT ODST Airlines Indo'}\nIDR Account: ${companySettings.idrAccountNumber || '102-8829-011'}\nUSD Account: ${companySettings.usdAccountNumber || '102-8829-022'}`, 50, bottomY + 22, { lineGap: 3 });

      // Total Due box on right
      const totalBoxX = doc.page.width - 40 - 200;
      doc.rect(totalBoxX, bottomY, 200, 85).fillAndStroke('#fffbeb', '#fde68a');

      doc.fillColor('#92400e')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('TOTAL AMOUNT DUE', totalBoxX + 12, bottomY + 12);

      doc.fillColor('#b45309')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(amount, totalBoxX + 12, bottomY + 28, { width: 176, align: 'right' });

      doc.fillColor('#78350f')
        .fontSize(7.5)
        .font('Helvetica')
        .text('Tax Rate: ' + (taxRate ? `${taxRate}% Included` : 'Standard Non-Tax') + '\nStatus: Pending Execution', totalBoxX + 12, bottomY + 54, { width: 176, align: 'right', lineGap: 2 });

      doc.y = bottomY + 98;

      // ==========================================
      // 6. NOTES & TERMS
      // ==========================================
      const notesY = doc.y;
      const notesW = (doc.page.width - 95) / 2;

      doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold').text('NOTES', 40, notesY);
      doc.fillColor('#64748b').fontSize(7).font('Helvetica').text(companySettings.defaultNotes || 'Please ensure Invoice Number is listed as payment reference.', 40, notesY + 11, { width: notesW, lineGap: 2 });

      doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold').text('TERMS & CONDITIONS', 40 + notesW + 15, notesY);
      doc.fillColor('#64748b').fontSize(7).font('Helvetica').text(companySettings.termsAndConditions || 'Payment is due strictly by the specified date.', 40 + notesW + 15, notesY + 11, { width: notesW, lineGap: 2 });

      // ==========================================
      // 7. FOOTER SIGNATURE & SECURITY BAR
      // ==========================================
      const footerY = doc.page.height - 75;

      doc.rect(40, footerY, doc.page.width - 80, 0.5).fill('#cbd5e1');

      doc.fillColor('#475569')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('Authorized by: Mr. Emad Moustafa (Financial Controller)', 40, footerY + 8);

      doc.fillColor('#94a3b8')
        .fontSize(7)
        .font('Helvetica')
        .text('This is a computer-generated official document from the ODST Finance Portal. Valid without physical stamp.', 40, footerY + 22);

      doc.fillColor('#94a3b8')
        .fontSize(7)
        .font('Helvetica')
        .text('© 2026 Manazil Al Mukhtara Group. All rights reserved.', doc.page.width - 240, footerY + 22, { width: 200, align: 'right' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
