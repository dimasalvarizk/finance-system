import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { getPool } from '../config/db.js';
import { generateInvoicePdfBuffer } from './pdfGenerator.js';

let transporter = null;
const ETHEREAL_CACHE_PATH = path.join('/tmp', 'ethereal_account.json');

const getTransporter = async () => {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }
    });
  } else {
    let account = null;

    if (fs.existsSync(ETHEREAL_CACHE_PATH)) {
      try {
        account = JSON.parse(fs.readFileSync(ETHEREAL_CACHE_PATH, 'utf-8'));
        console.log(`Loaded cached Ethereal SMTP account: ${account.user}`);
      } catch (err) {
        console.error('Failed to read cached Ethereal account, generating a new one...');
      }
    }

    if (!account) {
      console.log('Generating new Ethereal SMTP test account for notifications...');
      account = await nodemailer.createTestAccount();
      try {
        fs.writeFileSync(ETHEREAL_CACHE_PATH, JSON.stringify(account, null, 2), 'utf-8');
        console.log(`Saved Ethereal SMTP account cache to ${ETHEREAL_CACHE_PATH}`);
      } catch (err) {
        console.error('Failed to save Ethereal account cache:', err.message);
      }
    }

    transporter = nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: {
        user: account.user,
        pass: account.pass
      }
    });

    console.log(`--------------------------------------------------`);
    console.log(`📬 Ethereal Inbox Dashboard:`);
    console.log(`   Link: https://ethereal.email/login`);
    console.log(`   User: ${account.user}`);
    console.log(`   Pass: ${account.pass}`);
    console.log(`--------------------------------------------------`);
  }
  return transporter;
};

const getUiType = (title) => {
  const t = title.toLowerCase();
  if (t.includes('approved') || t.includes('completed') || t.includes('received') || t.includes('payout')) {
    return 'completed';
  }
  if (t.includes('rejected') || t.includes('overdue') || t.includes('warning') || t.includes('alert')) {
    return 'warning';
  }
  return 'request';
};

export const sendNotificationEmail = async (toEmail, toName, title, message) => {
  try {
    const transporter = await getTransporter();

    const uiType = getUiType(title);

    const mailOptions = {
      from: '"Finance System" <noreply@finance-system.com>',
      to: `"${toName}" <${toEmail}>`,
      subject: `[Notification] ${title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
          <style>
            body {
              font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background-color: #f8fafc;
              margin: 0;
              padding: 0;
              -webkit-font-smoothing: antialiased;
            }
            .wrapper {
              width: 100%;
              background-color: #f8fafc;
              padding: 30px 15px;
              box-sizing: border-box;
            }
            .container {
              max-width: 580px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03), 0 8px 24px rgba(0, 0, 0, 0.03);
              border: 1px solid #e2e8f0;
            }
            .header {
              background: linear-gradient(135deg, #242e69 0%, #171d43 100%);
              padding: 30px 40px;
              text-align: left;
              border-bottom: 4px solid #f59e0b;
            }
            .header-logo {
              color: #ffffff;
              font-size: 18px;
              font-weight: 800;
              letter-spacing: 1px;
              margin: 0;
              text-transform: uppercase;
            }
            .header-logo span {
              color: #f59e0b;
            }
            .content {
              padding: 35px 40px;
            }
            .greeting {
              font-size: 15px;
              font-weight: 700;
              color: #0f172a;
              margin-top: 0;
              margin-bottom: 18px;
            }
            .alert-box {
              border-left: 4px solid #2563eb;
              border-radius: 8px;
              padding: 16px 20px;
              margin-bottom: 25px;
            }
            .alert-box.completed {
              background-color: #ecfdf5;
              border-left-color: #10b981;
            }
            .alert-box.warning {
              background-color: #fffbeb;
              border-left-color: #f59e0b;
            }
            .alert-box.request {
              background-color: #f0f7ff;
              border-left-color: #2563eb;
            }
            .alert-message {
              font-size: 13.5px;
              color: #334155;
              line-height: 1.6;
              margin: 0;
            }
            .action-container {
              text-align: center;
              margin-top: 15px;
              margin-bottom: 5px;
            }
            .action-button {
              display: inline-block;
              background-color: #f59e0b;
              color: #ffffff !important;
              text-decoration: none;
              font-size: 12.5px;
              font-weight: 700;
              padding: 12px 26px;
              border-radius: 10px;
              text-align: center;
              box-shadow: 0 4px 6px -1px rgba(245, 158, 11, 0.15);
            }
            .footer {
              background-color: #f8fafc;
              padding: 25px 40px;
              text-align: center;
              border-top: 1px solid #f1f5f9;
            }
            .footer-text {
              font-size: 11px;
              color: #64748b;
              line-height: 1.6;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header">
                <h1 class="header-logo">ODST <span>Finance Portal</span></h1>
              </div>
              <div class="content">
                <p class="greeting">Hello ${toName},</p>
                
                <div class="alert-box ${uiType}">
                  <p class="alert-message">
                    <strong>${title}</strong><br>
                    ${message}
                  </p>
                </div>
                
                <div class="action-container" style="text-align: center; margin-top: 25px; margin-bottom: 5px;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="action-button" style="display: inline-block; background-color: #007aff; color: #ffffff !important; text-decoration: none; font-size: 13.5px; font-weight: 700; padding: 12px 28px; border-radius: 10px; text-align: center;">Open Finance Portal</a>
                </div>
              </div>
              <div class="footer">
                <p class="footer-text">
                  This is an automated notification from the ODST Finance Portal.<br>
                  © 2026 Manazil Al Mukhtara Group. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email notification sent to ${toEmail}: ${info.messageId}`);
    
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`✉️ Email Preview URL: ${previewUrl}`);
    }
    return true;
  } catch (err) {
    console.error('Failed to send email notification:', err.message);
    return false;
  }
};

export const sendResetPasswordEmail = async (toEmail, toName, resetUrl) => {
  try {
    const transporter = await getTransporter();

    const mailOptions = {
      from: '"Finance System" <noreply@finance-system.com>',
      to: `"${toName}" <${toEmail}>`,
      subject: `[Finance Portal] Reset Password Request`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Reset Password</title>
          <style>
            body {
              font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background-color: #f8fafc;
              margin: 0;
              padding: 0;
            }
            .wrapper {
              width: 100%;
              background-color: #f8fafc;
              padding: 30px 15px;
              box-sizing: border-box;
            }
            .container {
              max-width: 580px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03), 0 8px 24px rgba(0, 0, 0, 0.03);
              border: 1px solid #e2e8f0;
            }
            .header {
              background: linear-gradient(135deg, #242e69 0%, #171d43 100%);
              padding: 30px 40px;
              text-align: left;
              border-bottom: 4px solid #007aff;
            }
            .header-logo {
              color: #ffffff;
              font-size: 18px;
              font-weight: 800;
              margin: 0;
              text-transform: uppercase;
            }
            .header-logo span {
              color: #007aff;
            }
            .content {
              padding: 35px 40px;
            }
            .greeting {
              font-size: 15px;
              font-weight: 700;
              color: #0f172a;
              margin-top: 0;
              margin-bottom: 18px;
            }
            .instruction {
              font-size: 13.5px;
              color: #334155;
              line-height: 1.6;
              margin-bottom: 25px;
            }
            .action-container {
              text-align: center;
              margin-top: 25px;
              margin-bottom: 5px;
            }
            .action-button {
              display: inline-block;
              background-color: #007aff;
              color: #ffffff !important;
              text-decoration: none;
              font-size: 12.5px;
              font-weight: 700;
              padding: 12px 26px;
              border-radius: 10px;
              text-align: center;
            }
            .footer {
              background-color: #f8fafc;
              padding: 25px 40px;
              text-align: center;
              border-top: 1px solid #f1f5f9;
            }
            .footer-text {
              font-size: 11px;
              color: #64748b;
              line-height: 1.6;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header">
                <h1 class="header-logo">ODST <span>Finance Portal</span></h1>
              </div>
              <div class="content" style="padding: 35px 40px;">
                <p class="greeting" style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 18px;">Hello ${toName},</p>
                <p class="instruction" style="font-size: 13.5px; color: #334155; line-height: 1.6; margin-bottom: 25px;">
                  We received a request to reset your password for the ODST Finance Portal.<br>
                  Please click the button below to reset your password. This link will expire in 30 minutes.
                </p>
                <div class="action-container" style="text-align: center; margin-top: 25px; margin-bottom: 5px;">
                  <a href="${resetUrl}" class="action-button" style="display: inline-block; background-color: #007aff; color: #ffffff !important; text-decoration: none; font-size: 13.5px; font-weight: 700; padding: 12px 28px; border-radius: 10px; text-align: center;">Reset Password</a>
                </div>
                <p style="margin-top: 25px; font-size: 12px; color: #64748b; text-align: center; line-height: 1.5; word-break: break-all;">
                  If the button above does not work, copy and paste this link into your browser:<br>
                  <a href="${resetUrl}" style="color: #007aff; text-decoration: underline;">${resetUrl}</a>
                </p>
              </div>
              <div class="footer">
                <p class="footer-text">
                  This is an automated notification from the ODST Finance Portal.<br>
                  © 2026 Manazil Al Mukhtara Group. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${toEmail}: ${info.messageId}`);
    
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`✉️ Password Reset Email Preview URL: ${previewUrl}`);
    }
    return true;
  } catch (err) {
    console.error('Failed to send password reset email:', err.message);
    return false;
  }
};

export const sendClientInvoiceEmail = async (toEmail, invoiceDetails) => {
  let companySettings = {
    companyName: 'ODST Group',
    phone: '+62 856 9332 3122',
    taxNumber: '0000-0000-0000',
    defaultNotes: "Please ensure the Invoice Number (e.g. AIT-2608-011) is listed as the payment description reference.\nAttach hotel booking confirmation numbers where applicable for ground handling operations.",
    termsAndConditions: "Payment is due strictly by the specified date on the ledger. For billing inquiries, contact ODST Admin Team. Thank you for your continued partnership.",
    bankName: 'Danamon',
    accountName: 'PT ODST Airlines Indo',
    idrAccountNumber: '102-8829-011',
    usdAccountNumber: '102-8829-022'
  };
  try {
    const pool = getPool();
    const [settingsRows] = await pool.query('SELECT companyName, phone, taxNumber, defaultNotes, termsAndConditions, bankName, accountName, idrAccountNumber, usdAccountNumber FROM dst_company_settings WHERE id = ?', ['current']);
    if (settingsRows.length > 0) {
      companySettings = {
        companyName: settingsRows[0].companyName || companySettings.companyName,
        phone: settingsRows[0].phone || companySettings.phone,
        taxNumber: settingsRows[0].taxNumber || companySettings.taxNumber,
        defaultNotes: settingsRows[0].defaultNotes || companySettings.defaultNotes,
        termsAndConditions: settingsRows[0].termsAndConditions || companySettings.termsAndConditions,
        bankName: settingsRows[0].bankName || companySettings.bankName,
        accountName: settingsRows[0].accountName || companySettings.accountName,
        idrAccountNumber: settingsRows[0].idrAccountNumber || companySettings.idrAccountNumber,
        usdAccountNumber: settingsRows[0].usdAccountNumber || companySettings.usdAccountNumber
      };
    }
  } catch (err) {
    console.error('Failed to load company settings for invoice email:', err.message);
  }

  const htmlNotes = companySettings.defaultNotes.replace(/\n/g, '<br>');
  const htmlTerms = companySettings.termsAndConditions.replace(/\n/g, '<br>');

  try {
    const transporter = await getTransporter();

    const { 
      invoiceNo, 
      company, 
      companyCode, 
      amount = '2,200.00 SAR', 
      referenceNo, 
      serialNo, 
      dueDate, 
      date, 
      items, 
      taxRate, 
      currency = 'SAR', 
      documentType 
    } = invoiceDetails;

    const curr = (currency || 'SAR').toUpperCase().includes('SAR') || String(amount).includes('SAR') ? 'SAR' : (currency || 'USD').toUpperCase();
    const isHotel = (documentType && documentType.toLowerCase().includes('hotel')) || (invoiceNo && invoiceNo.startsWith('RES-'));
    const docTitle = isHotel ? 'HOTEL RESERVATION CONFIRMATION' : `INVOICE ${invoiceNo}`;
    const subjectPrefix = isHotel ? 'Hotel Reservation Confirmation' : 'Invoice / Confirmation';
    const rate = Number(taxRate) || 0;

    let subtotalNum = 0;
    if (items && Array.isArray(items)) {
      subtotalNum = items.reduce((acc, item) => acc + (Number(item.qty) || 0) * (Number(item.price) || 0), 0);
    }
    const taxNum = subtotalNum * (rate / 100);
    const subtotalFormatted = `${subtotalNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`;
    const taxFormatted = `${taxNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`;

    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const dateObj = new Date(dateStr);
      if (isNaN(dateObj.getTime())) return dateStr;
      return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formattedDate = formatDate(date);
    const formattedDueDate = formatDate(dueDate);
    
    let itemsHtml = '';
    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const qtyNum = Number(item.qty) || 1;
        const priceNum = Number(item.price) || 0;
        const itemTotal = `${(qtyNum * priceNum).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`;
        const itemPrice = `${priceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`;
        itemsHtml += `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px 10px; font-size: 13px; color: #1e293b; font-weight: 600; text-align: left;">${item.description}</td>
            <td style="padding: 12px 10px; font-size: 13px; color: #334155; text-align: center;">${item.qty}</td>
            <td style="padding: 12px 10px; font-size: 13px; color: #334155; text-align: right; font-family: monospace;">${itemPrice}</td>
            <td style="padding: 12px 10px; font-size: 13px; color: #0f172a; text-align: right; font-weight: bold; font-family: monospace;">${itemTotal}</td>
          </tr>
        `;
      }
    } else {
      itemsHtml = `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 12px 10px; font-size: 13px; color: #1e293b; font-weight: 600; text-align: left;">Service Item</td>
          <td style="padding: 12px 10px; font-size: 13px; color: #334155; text-align: center;">1</td>
          <td style="padding: 12px 10px; font-size: 13px; color: #334155; text-align: right; font-family: monospace;">${amount}</td>
          <td style="padding: 12px 10px; font-size: 13px; color: #0f172a; text-align: right; font-weight: bold; font-family: monospace;">${amount}</td>
        </tr>
      `;
    }

    // Generate Official PDF Buffer
    let pdfBuffer = null;
    try {
      pdfBuffer = await generateInvoicePdfBuffer(invoiceDetails, companySettings);
    } catch (pdfErr) {
      console.error('Failed to generate PDF attachment buffer:', pdfErr.message);
    }

    const safeFilename = (invoiceNo || 'document').replace(/[^a-zA-Z0-9-_]/g, '_');
    const attachments = [];
    if (pdfBuffer) {
      attachments.push({
        filename: `${isHotel ? 'Reservation' : 'Invoice'}_${safeFilename}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      });
    }

    const resolvedTaxNo = invoiceDetails.clientTaxNo || invoiceDetails.taxNumber || '02.271.015.6-407.000';
    const resolvedAgent = invoiceDetails.clientAgent || (invoiceDetails.agent ? `Agent: ${invoiceDetails.agent}` : 'Agent: ODST Travel & Tourism');
    const displayAgent = resolvedAgent.startsWith('Agent:') ? resolvedAgent : `Agent: ${resolvedAgent}`;
    const resolvedAddress = invoiceDetails.clientAddress || 'Jl. Chairil Anwar Blok B12, Ruko Kalimas 1, Margahayu, Kec. Bekasi Timur, Bekasi, 17113';

    const mailOptions = {
      from: process.env.SMTP_USER ? `"ODST Group Finance" <${process.env.SMTP_USER}>` : '"ODST Group Finance" <billing@odst.id>',
      to: toEmail,
      subject: `${subjectPrefix} ${invoiceNo} from ODST Group`,
      attachments: attachments,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${docTitle}</title>
          <style>
            body {
              font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background-color: #f8fafc;
              margin: 0;
              padding: 0;
            }
            .wrapper {
              width: 100%;
              background-color: #f8fafc;
              padding: 30px 15px;
              box-sizing: border-box;
            }
            .container {
              max-width: 650px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
              border: 1px solid #e2e8f0;
            }
            .header {
              background: linear-gradient(135deg, #242e69 0%, #171d43 100%);
              padding: 30px 40px;
              border-bottom: 4px solid #f59e0b;
              color: #ffffff;
            }
            .header-logo {
              font-size: 20px;
              font-weight: 800;
              letter-spacing: 1px;
              margin: 0;
              text-transform: uppercase;
            }
            .header-logo span {
              color: #f59e0b;
            }
            .invoice-title {
              font-size: 22px;
              font-weight: 700;
              margin-top: 15px;
              margin-bottom: 0;
              letter-spacing: 0.5px;
            }
            .content {
              padding: 35px 40px;
            }
            .meta-grid {
              width: 100%;
              margin-bottom: 25px;
              border-collapse: collapse;
            }
            .meta-label {
              font-size: 11px;
              color: #94a3b8;
              text-transform: uppercase;
              font-weight: 700;
              letter-spacing: 0.5px;
              padding-bottom: 4px;
            }
            .meta-value {
              font-size: 13.5px;
              color: #0f172a;
              font-weight: bold;
              padding-bottom: 12px;
            }
            .bill-section {
              width: 100%;
              margin-bottom: 30px;
              border-collapse: collapse;
            }
            .bill-box {
              width: 50%;
              vertical-align: top;
              padding-right: 20px;
            }
            .bill-title {
              font-size: 12px;
              font-weight: bold;
              color: #64748b;
              text-transform: uppercase;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 6px;
              margin-bottom: 10px;
            }
            .bill-details {
              font-size: 13px;
              color: #334155;
              line-height: 1.5;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 25px;
            }
            .items-header th {
              background-color: #f8fafc;
              border-bottom: 2px solid #e2e8f0;
              padding: 12px 10px;
              font-size: 11px;
              text-transform: uppercase;
              font-weight: 700;
              color: #64748b;
              letter-spacing: 0.5px;
            }
            .total-box {
              float: right;
              width: 260px;
              text-align: right;
              margin-bottom: 25px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 4px 0;
            }
            .total-label {
              font-size: 13px;
              color: #64748b;
              font-weight: 600;
              display: inline-block;
              width: 120px;
            }
            .total-value {
              font-size: 14.5px;
              color: #0f172a;
              font-weight: 700;
              display: inline-block;
              text-align: right;
              width: 120px;
              font-family: monospace;
            }
            .total-due-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 12px;
              background-color: #fffbeb;
              border: 1px dashed #fde68a;
              border-radius: 8px;
              margin-top: 6px;
            }
            .total-due-label {
              font-size: 14px;
              color: #b45309;
              font-weight: 800;
              display: inline-block;
              width: 110px;
            }
            .total-due-value {
              font-size: 16px;
              color: #b45309;
              font-weight: 800;
              display: inline-block;
              text-align: right;
              width: 110px;
              font-family: monospace;
            }
            .footer {
              background-color: #f8fafc;
              padding: 25px 40px;
              text-align: center;
              border-top: 1px solid #f1f5f9;
              clear: both;
            }
            .footer-text {
              font-size: 11px;
              color: #64748b;
              line-height: 1.6;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header">
                <h1 class="header-logo">ODST <span>Finance Portal</span></h1>
                <h2 class="invoice-title">${docTitle}</h2>
              </div>
              <div class="content">
                <table class="meta-grid">
                  <tr>
                    <td class="meta-label">Document Date</td>
                    <td class="meta-label">Due Date</td>
                    <td class="meta-label">Reference No</td>
                    <td class="meta-label">Serial No</td>
                  </tr>
                  <tr>
                    <td class="meta-value">${formattedDate}</td>
                    <td class="meta-value" style="color: #b45309;">${formattedDueDate}</td>
                    <td class="meta-value">${referenceNo}</td>
                    <td class="meta-value">${serialNo}</td>
                  </tr>
                </table>

                <table class="bill-section">
                  <tr>
                    <td class="bill-box">
                      <div class="bill-title">BILL FROM</div>
                      <div class="bill-details">
                        <strong>${companySettings.companyName || 'PT ODST AIRLINES INDO'}</strong><br>
                        Employee: Aulia Azzha (ID: 250104)<br>
                        Phone: ${companySettings.phone || '+62 811 1202 338'}<br>
                        Tax Number: ${companySettings.taxNumber || '0000-0000-0001'}<br>
                        Email: mcfc.nabilah@gmail.com
                      </div>
                    </td>
                    <td class="bill-box">
                      <div class="bill-title">BILL TO</div>
                      <div class="bill-details">
                        <strong>${company}</strong><br>
                        <span style="color: #d97706; font-weight: bold;">${displayAgent}</span><br>
                        Tax Number: ${resolvedTaxNo}<br>
                        Address: ${resolvedAddress}<br>
                        Recipient Email: ${toEmail}
                      </div>
                    </td>
                  </tr>
                </table>

                <table class="items-table">
                  <thead>
                    <tr class="items-header">
                      <th style="text-align: left; width: 50%;">Description</th>
                      <th style="text-align: center; width: 10%;">Qty</th>
                      <th style="text-align: right; width: 20%;">Unit Price</th>
                      <th style="text-align: right; width: 20%;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                </table>

                <div class="total-box">
                  ${rate > 0 ? `
                  <div class="total-row">
                    <span class="total-label">Subtotal</span>
                    <span class="total-value">${subtotalFormatted}</span>
                  </div>
                  <div class="total-row">
                    <span class="total-label">Tax (${rate}%)</span>
                    <span class="total-value">${taxFormatted}</span>
                  </div>
                  ` : ''}
                  <div class="total-due-row">
                    <span class="total-due-label">Total Due</span>
                    <span class="total-due-value">${amount}</span>
                  </div>
                </div>
                <div style="clear: both; height: 25px;"></div>

                <!-- DOWNLOAD PDF ATTACHMENT CARD -->
                <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 25px 0;">
                  <div style="font-size: 13.5px; font-weight: 800; color: #0f172a; margin-bottom: 5px; font-family: sans-serif;">
                    OFFICIAL PDF DOCUMENT ATTACHED
                  </div>
                  <div style="font-size: 12px; color: #64748b; margin-bottom: 14px; font-family: sans-serif; line-height: 1.5;">
                    The official signed PDF version (<strong>${isHotel ? 'Reservation' : 'Invoice'}_${safeFilename}.pdf</strong>) is attached directly to this email. You can download and save it directly from your email attachments.
                  </div>
                  <div style="display: inline-block; background-color: #242e69; color: #ffffff !important; font-size: 12px; font-weight: 700; padding: 10px 22px; border-radius: 8px; font-family: sans-serif; text-transform: uppercase; letter-spacing: 0.5px;">
                    Attachment: ${isHotel ? 'Reservation' : 'Invoice'}_${safeFilename}.pdf
                  </div>
                </div>

                <!-- Payment Instructions -->
                <div style="margin-bottom: 25px;">
                  <div style="font-size: 11px; font-weight: bold; color: #0f172a; text-transform: uppercase; margin-bottom: 8px; font-family: sans-serif;">Payment Instructions</div>
                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px 20px; font-family: sans-serif; font-size: 13px; color: #334155;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr style="height: 28px;">
                        <td style="font-weight: 600; color: #64748b;">Bank Name:</td>
                        <td style="text-align: right; font-weight: bold; color: #0f172a;">${companySettings.bankName}</td>
                      </tr>
                      <tr style="height: 28px;">
                        <td style="font-weight: 600; color: #64748b;">Account Name:</td>
                        <td style="text-align: right; font-weight: bold; color: #0f172a;">${companySettings.accountName}</td>
                      </tr>
                      <tr style="height: 28px;">
                        <td style="font-weight: 600; color: #64748b;">IDR Account Number:</td>
                        <td style="text-align: right; font-weight: bold; color: #2563eb; font-family: monospace;">${companySettings.idrAccountNumber}</td>
                      </tr>
                      <tr style="height: 28px;">
                        <td style="font-weight: 600; color: #64748b;">USD Account Number:</td>
                        <td style="text-align: right; font-weight: bold; color: #2563eb; font-family: monospace;">${companySettings.usdAccountNumber}</td>
                      </tr>
                    </table>
                  </div>
                </div>

                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: sans-serif;">
                  <tr>
                    <td style="width: 50%; vertical-align: top; padding-right: 20px;">
                      <div style="font-size: 11px; font-weight: bold; color: #0f172a; text-transform: uppercase; margin-bottom: 8px;">Notes</div>
                      <div style="font-size: 12px; color: #64748b; line-height: 1.5;">${htmlNotes}</div>
                    </td>
                    <td style="width: 50%; vertical-align: top;">
                      <div style="font-size: 11px; font-weight: bold; color: #0f172a; text-transform: uppercase; margin-bottom: 8px;">Terms & Conditions</div>
                      <div style="font-size: 12px; color: #64748b; line-height: 1.5;">${htmlTerms}</div>
                    </td>
                  </tr>
                </table>

                <div style="clear: both; height: 10px;"></div>
              </div>
              <div class="footer">
                <p class="footer-text">
                  Thank you for your business. For any billing inquiries, please contact the ODST Admin Team.<br>
                  Authorized by Mr. Emad Moustafa (Financial Controller)<br>
                  © 2026 Manazil Al Mukhtara Group. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Invoice email sent to client ${toEmail}: ${info.messageId}`);
    
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`✉️ Client Invoice Email Preview URL: ${previewUrl}`);
    }
    return true;
  } catch (err) {
    console.error('Failed to send client invoice email:', err.message);
    return false;
  }
};
