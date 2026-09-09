
import { getAllInvoicesDB, createInvoiceDB, updateInvoiceStatusDB, deleteInvoicesDB, cancelInvoiceDB, updateInvoiceDB, getInvoiceByIdDB, savePaymentProofDB, addPaymentHistoryDB, getPaymentHistoryDB, updatePaymentHistoryDB, deletePaymentHistoryDB, insertAuditLogDB, getAuditLogsDB } from '../models/invoiceModel.js';
import { getPool } from '../config/db.js';

const getAuthBaseUrl = (req) => {
  const isVercel = process.env.VERCEL === '1';
  if (isVercel && req) {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    return `${protocol}://${host}`;
  }
  return process.env.AUTH_SERVICE_URL || 'http://localhost:5001';
};

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Public (or Protected)
export const getInvoices = async (req, res, next) => {
  try {
    // Filter by createdBy name if user is an Accountant (Internal only, Accountant only sees own invoices)
    const createdByFilter = (req.user && req.user.role === 'Accountant') ? req.user.name : null;
    const invoices = await getAllInvoicesDB(createdByFilter);
    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new invoice
// @route   POST /api/invoices
// @desc    Create a new invoice
// @route   POST /api/invoices
// @access  Public (or Protected)
export const createInvoice = async (req, res, next) => {
  const { 
    invoiceNo, company, companyCode, referenceNo, serialNo, amount, date, status, 
    usdToIdrRate, sarToIdrRate, dueDate, items, taxRate, currency, advancePayment,
    company_id, custom_company_name, custom_company_email, custom_agent, custom_address, custom_tax_number,
    group_number, groupNumber, nationality
  } = req.body;

  try {
    const finalCompanyName = custom_company_name || company;
    if (!invoiceNo || !finalCompanyName || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide invoiceNo, company, and amount'
      });
    }

    const rawAmt = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^0-9.-]/g, '')) || 0;
    const advAmt = parseFloat(advancePayment || 0);
    const initialRemaining = Math.max(0, rawAmt - advAmt);

    // Check if user has CAN_BYPASS_APPROVAL permission
    let hasBypassApproval = false;
    if (req.user && req.user.permissions) {
      try {
        const p = typeof req.user.permissions === 'string' ? JSON.parse(req.user.permissions) : req.user.permissions;
        if (p.CAN_BYPASS_APPROVAL === true || (Array.isArray(p) && p.includes('CAN_BYPASS_APPROVAL'))) {
          hasBypassApproval = true;
        }
      } catch (e) {
        if (typeof req.user.permissions === 'string' && req.user.permissions.includes('CAN_BYPASS_APPROVAL')) {
          hasBypassApproval = true;
        }
      }
    }
    if (req.user && (req.user.role === 'Super Admin' || req.user.name?.includes('Dimas') || req.user.name?.includes('Ali') || req.user.name?.includes('Khalid'))) {
      // If role or user has privilege
      if (req.user.role === 'Super Admin' || req.user.name?.includes('Dimas') || req.user.name?.includes('Ali')) {
        hasBypassApproval = true;
      }
    }

    const initialStatus = hasBypassApproval ? 'Approved' : (status || 'Pending');

    const newInvoiceData = {
      id: `inv_${Date.now()}`,
      invoiceNo,
      company: finalCompanyName,
      companyCode: companyCode || (custom_company_name ? 'RCN' : 'GEN'),
      referenceNo: referenceNo || `REF-${Date.now()}`,
      serialNo: serialNo || `SR-${Date.now()}`,
      amount,
      date,
      status: initialStatus,
      usdToIdrRate,
      sarToIdrRate,
      dueDate,
      items: items || [],
      taxRate: taxRate ? parseFloat(taxRate) : 0.00,
      branch: req.user ? req.user.branch : null,
      createdBy: req.user ? req.user.name : null,
      currency: currency || 'USD',
      advancePayment: advAmt,
      remainingBalance: initialRemaining,
      company_id: company_id || null,
      custom_company_name: custom_company_name || null,
      custom_company_email: custom_company_email || null,
      custom_agent: custom_agent || null,
      custom_address: custom_address || null,
      custom_tax_number: custom_tax_number || null,
      group_number: group_number || groupNumber || null,
      nationality: nationality || null
    };

    await createInvoiceDB(newInvoiceData);

    // If bypass approval, write audit trail and skip approval notification to Level 1
    if (hasBypassApproval) {
      try {
        const pool = getPool();
        const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const performerId = req.user ? req.user.id : 'usr_system';
        const performerName = req.user ? req.user.name : 'System';
        const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

        await pool.query(
          `INSERT INTO dst_audit_logs (id, action, performed_by, performed_by_name, target_user, details, ip_address)
           VALUES (?, 'CREATE_CONFIRMATION_BYPASS', ?, ?, ?, ?, ?)`,
          [
            logId,
            performerId,
            performerName,
            finalCompanyName,
            JSON.stringify({
              message: `Confirmation ${invoiceNo} generated directly as Approved (CAN_BYPASS_APPROVAL)`,
              invoiceNo,
              amount,
              currency: currency || 'USD',
              company: finalCompanyName,
              creator: performerName
            }),
            ip
          ]
        );
      } catch (auditErr) {
        console.error('Failed to log bypass confirmation creation:', auditErr.message);
      }
    } else {
      // Trigger notification internally to auth-service for normal flow
      try {
        const cleanAmount = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^0-9.-]/g, ''));
        const amountDisplay = isNaN(cleanAmount) ? String(amount) : cleanAmount.toLocaleString('en-US');

        fetch(`${getAuthBaseUrl(req)}/api/auth/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'directors',
            type: 'newInvoiceSubmitted',
            title: 'New invoice approval request',
            message: `New invoice ${invoiceNo} ($${amountDisplay}) submitted by ${req.user ? req.user.name : 'Accountant'}.`
          })
        }).catch(err => console.error('Failed to trigger submission notification:', err.message));
      } catch (err) {
        console.error('Notification trigger error:', err.message);
      }
    }

    res.status(201).json({
      success: true,
      message: hasBypassApproval ? 'Confirmation generated and auto-approved successfully' : 'Invoice created successfully',
      isBypassed: hasBypassApproval,
      data: newInvoiceData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update invoice status
// @route   PUT /api/invoices/:id/status
// @access  Public (or Protected)
export const updateInvoiceStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Please provide status'
      });
    }

    // Creator tenancy check for Accountant
    if (req.user && req.user.role === 'Accountant') {
      const existing = await getInvoiceByIdDB(id);
      if (existing && existing.createdBy && existing.createdBy !== req.user.name) {
        return res.status(403).json({
          success: false,
          message: 'Access Denied: You cannot modify invoices created by other accountants.'
        });
      }
    }

    const updated = await updateInvoiceStatusDB(id, status);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Trigger status transition notification internally to auth-service
    try {
      let notifType = '';
      let notifTitle = '';
      let notifMessage = '';
      if (status === 'Approved') {
        notifType = 'invoiceApproved';
        notifTitle = 'Invoice approved';
        notifMessage = `Invoice ${id} has passed final review and is cleared.`;
      } else if (status === 'Rejected') {
        notifType = 'invoiceRejected';
        notifTitle = 'Invoice rejected';
        notifMessage = `Invoice ${id} has been returned for corrections.`;
      } else if (status === 'Paid') {
        notifType = 'paymentReceived';
        notifTitle = 'Payment received';
        notifMessage = `Payment for invoice ${id} has been successfully cleared.`;
      }

      if (notifType) {
        // Resolve Creator UserId
        let targetUserId = 'usr_super_admin';
        try {
          const existing = await getInvoiceByIdDB(id);
          if (existing && existing.createdBy) {
            const pool = getPool();
            const [userRows] = await pool.query('SELECT id FROM dst_users WHERE name = ?', [existing.createdBy]);
            if (userRows.length > 0) {
              targetUserId = userRows[0].id;
            }
          }
        } catch (dbErr) {
          console.error('Failed to resolve invoice creator userId:', dbErr.message);
        }

        fetch(`${getAuthBaseUrl(req)}/api/auth/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: targetUserId,
            type: notifType,
            title: notifTitle,
            message: notifMessage
          })
        }).catch(err => console.error('Failed to trigger status notification:', err.message));
      }
    } catch (err) {
      console.error('Notification trigger error:', err.message);
    }

    res.status(200).json({
      success: true,
      message: `Invoice status updated successfully to ${status}`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete multiple invoices
// @route   DELETE /api/invoices
// @access  Protected (Super Admin, Chief Accountant, Division Director)
export const deleteInvoices = async (req, res, next) => {
  const { ids } = req.body;

  try {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of invoice ids to delete'
      });
    }

    await deleteInvoicesDB(ids);

    // [AUDIT LOG] Log the deletion
    try {
      for (const id of ids) {
        await insertAuditLogDB({
          user_name: req.user ? req.user.name : 'System',
          user_email: req.user ? req.user.email : null,
          action_type: 'DELETE',
          entity_type: 'INVOICE',
          entity_reference: id,
          details: { message: 'Invoice deleted via bulk delete operation' }
        });
      }
    } catch (auditErr) {
      console.error('Failed to write audit log for deleteInvoices:', auditErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Invoices deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel an invoice
// @route   PUT /api/invoices/:id/cancel
// @access  Protected
export const cancelInvoice = async (req, res, next) => {
  const { id } = req.params;

  try {
    // Creator tenancy check for Accountant
    if (req.user && req.user.role === 'Accountant') {
      const existing = await getInvoiceByIdDB(id);
      if (existing && existing.createdBy && existing.createdBy !== req.user.name) {
        return res.status(403).json({
          success: false,
          message: 'Access Denied: You cannot modify invoices created by other accountants.'
        });
      }
    }

    const cancelled = await cancelInvoiceDB(id);

    if (!cancelled) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Invoice cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update invoice details (and reset workflow)
// @route   PUT /api/invoices/:id
// @access  Protected
export const updateInvoice = async (req, res, next) => {
  const { id } = req.params;
  const { company, companyCode, referenceNo, serialNo, amount, date, usdToIdrRate, sarToIdrRate, dueDate, items, taxRate, currency, group_number, groupNumber, nationality } = req.body;

  try {
    // Creator tenancy check for Accountant
    if (req.user && req.user.role === 'Accountant') {
      const existing = await getInvoiceByIdDB(id);
      if (existing && existing.createdBy && existing.createdBy !== req.user.name) {
        return res.status(403).json({
          success: false,
          message: 'Access Denied: You cannot modify invoices created by other accountants.'
        });
      }
    }

    const updated = await updateInvoiceDB(id, {
      company,
      companyCode,
      referenceNo,
      serialNo,
      amount,
      date,
      usdToIdrRate,
      sarToIdrRate,
      dueDate,
      items,
      taxRate: taxRate ? parseFloat(taxRate) : 0.00,
      currency: currency || 'USD',
      group_number: group_number || groupNumber || null,
      nationality: nationality || null
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // [AUDIT LOG] Log the edit
    try {
      await insertAuditLogDB({
        user_name: req.user ? req.user.name : 'System',
        user_email: req.user ? req.user.email : null,
        action_type: 'EDIT',
        entity_type: 'INVOICE',
        entity_reference: id,
        details: { message: 'Invoice data edited', updatedFields: { amount, company, status: '0/4 Pending' } }
      });
    } catch (auditErr) {
      console.error('Failed to write audit log for updateInvoice:', auditErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Invoice updated and workflow reset successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload payment proof
// @route   PUT /api/invoices/:id/payment-proof
// @access  Protected
export const uploadPaymentProof = async (req, res, next) => {
  const { id } = req.params;
  const { paymentAttachment } = req.body;

  try {
    if (paymentAttachment === undefined) {
      return res.status(400).json({ success: false, message: 'paymentAttachment parameter is required' });
    }

    const success = await savePaymentProofDB(id, paymentAttachment);

    if (!success) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    res.status(200).json({
      success: true,
      message: paymentAttachment ? 'Payment proof uploaded successfully' : 'Payment proof cleared successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Currency Conversion Helper
export const convertCurrency = (amount, fromCurr = 'SAR', toCurr = 'SAR', rates = {}) => {
  const from = (fromCurr || 'SAR').toUpperCase().trim();
  const to = (toCurr || 'SAR').toUpperCase().trim();
  const num = parseFloat(amount) || 0;
  if (from === to || num === 0) return num;

  // Support explicit exchange rate passed in rates
  if (rates.exchangeRate && parseFloat(rates.exchangeRate) > 0) {
    const rate = parseFloat(rates.exchangeRate);
    if ((from === 'IDR' || from === 'RP') && (to === 'SAR' || to === 'USD')) {
      return rate > 1 ? (num / rate) : (num * rate);
    } else if ((to === 'IDR' || to === 'RP') && (from === 'SAR' || from === 'USD')) {
      return rate > 1 ? (num * rate) : (num / rate);
    } else if (from === 'USD' && to === 'SAR') {
      return rate > 1 ? (num * rate) : (num / rate);
    } else if (from === 'SAR' && to === 'USD') {
      return rate > 1 ? (num / rate) : (num * rate);
    }
  }

  const usdToIdr = parseFloat(rates.usdToIdr) || 18025;
  const sarToIdr = parseFloat(rates.sarToIdr) || 4800;
  const usdToSar = parseFloat(rates.usdToSar || (usdToIdr / sarToIdr)) || 3.75;

  // 1. Convert source to IDR
  let amountInIdr = num;
  if (from === 'SAR') amountInIdr = num * sarToIdr;
  else if (from === 'USD') amountInIdr = num * usdToIdr;

  // 2. Convert IDR to target currency
  if (to === 'IDR' || to === 'RP') return amountInIdr;
  if (to === 'SAR') return amountInIdr / sarToIdr;
  if (to === 'USD') return amountInIdr / usdToIdr;
  return num;
};

// Automatic Payment & Credit Balance Reconciliation Helper
export const reconcileInvoicePayments = async (invoiceNo, saveOverpaymentCredit = false, companyCode = null) => {
  try {
    const pool = getPool();
    const [invRows] = await pool.query(
      'SELECT amount, advancePayment, currency, usdToIdrRate, sarToIdrRate, companyCode, status FROM dst_invoices WHERE invoiceNo = ? OR id = ?',
      [invoiceNo, invoiceNo]
    );
    if (invRows.length === 0) return;

    const inv = invRows[0];
    const baseCurrency = (inv.currency || 'SAR').toUpperCase();
    const rawAmt = parseFloat(String(inv.amount || '0').replace(/[^0-9.-]/g, '')) || 0;
    const advPayment = parseFloat(inv.advancePayment || 0);
    const rates = {
      usdToIdr: parseFloat(inv.usdToIdrRate) || 18025,
      sarToIdr: parseFloat(inv.sarToIdrRate) || 4800
    };

    const [payRows] = await pool.query(
      "SELECT amount, currency, exchange_rate FROM dst_payment_history WHERE referenceId = ? AND moduleType = 'CONFIRMATION'",
      [invoiceNo]
    );

    let totalInstallmentsInBase = 0;
    for (const p of payRows) {
      const pAmt = parseFloat(p.amount) || 0;
      const pCurr = (p.currency || baseCurrency).toUpperCase();
      const pRate = parseFloat(p.exchange_rate) || undefined;
      totalInstallmentsInBase += convertCurrency(pAmt, pCurr, baseCurrency, { ...rates, exchangeRate: pRate });
    }

    const totalPaidSoFarInBase = advPayment + totalInstallmentsInBase;
    const remainingBalanceInBase = Math.max(0, rawAmt - totalPaidSoFarInBase);

    let newStatus = inv.status;
    if (remainingBalanceInBase <= 0.01 && inv.status !== 'Cancelled') {
      newStatus = 'Paid';
    } else if (totalPaidSoFarInBase > 0 && inv.status !== 'Cancelled') {
      newStatus = 'Approved';
    }

    await pool.query(
      'UPDATE dst_invoices SET remainingBalance = ?, status = ? WHERE invoiceNo = ? OR id = ?',
      [remainingBalanceInBase.toFixed(2), newStatus, invoiceNo, invoiceNo]
    );

    // Overpayment Credit Handling: Denominated strictly in baseCurrency (FR-1.3)
    if (saveOverpaymentCredit && (companyCode || inv.companyCode) && totalPaidSoFarInBase > (rawAmt + 0.01)) {
      const targetCompany = (companyCode || inv.companyCode).toUpperCase();
      const overpaymentInBase = totalPaidSoFarInBase - rawAmt;
      await pool.query(
        'UPDATE dst_companies SET creditBalance = creditBalance + ? WHERE code = ?',
        [overpaymentInBase.toFixed(2), targetCompany]
      );
      console.log(`Saved credit balance of ${overpaymentInBase.toFixed(2)} ${baseCurrency} for ${targetCompany}`);
    }
  } catch (err) {
    console.error('Failed to reconcile invoice payments:', err.message);
  }
};

// @desc    Add installment payment history
// @route   POST /api/invoices/:invoiceNo/payments
// @access  Protected
export const addPaymentHistory = async (req, res, next) => {
  const { invoiceNo } = req.params;
  const { amount, currency, paymentDate, note, proofUrl, saveOverpaymentCredit, companyCode, exchangeRate, exchange_rate } = req.body;

  try {
    if (!amount || !paymentDate) {
      return res.status(400).json({ success: false, message: 'Please provide amount and paymentDate' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be a positive number' });
    }

    const parsedRate = parseFloat(exchangeRate || exchange_rate);

    const paymentData = {
      id: `pay_${Date.now()}`,
      referenceId: invoiceNo,
      moduleType: 'CONFIRMATION',
      amount: numericAmount,
      currency: currency || 'SAR',
      exchangeRate: (!isNaN(parsedRate) && parsedRate > 0) ? parsedRate : undefined,
      paymentDate,
      note: note || '',
      proofUrl: proofUrl || null,
      createdBy: req.user ? req.user.name : 'System'
    };

    await addPaymentHistoryDB(paymentData);

    // Reconcile remainingBalance, status, and creditBalance with accurate multi-currency conversion
    await reconcileInvoicePayments(invoiceNo, saveOverpaymentCredit, companyCode);

    // Trigger notification internally to auth-service
    try {
      let targetUserId = 'usr_super_admin';
      try {
        const existing = await getInvoiceByIdDB(invoiceNo);
        if (existing && existing.createdBy) {
          const pool = getPool();
          const [userRows] = await pool.query('SELECT id FROM dst_users WHERE name = ?', [existing.createdBy]);
          if (userRows.length > 0) {
            targetUserId = userRows[0].id;
          }
        }
      } catch (dbErr) {}

      fetch(`${getAuthBaseUrl(req)}/api/auth/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUserId,
          type: 'paymentReceived',
          title: 'Payment received',
          message: `A payment of ${numericAmount.toLocaleString('en-US')} ${currency || 'SAR'} was recorded for invoice ${invoiceNo}.`
        })
      }).catch(err => console.error('Failed to trigger payment notification:', err.message));
    } catch (notifErr) {}

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: paymentData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment history for confirmation
// @route   GET /api/invoices/:invoiceNo/payments
// @access  Protected
export const getPaymentHistory = async (req, res, next) => {
  const { invoiceNo } = req.params;
  try {
    const history = await getPaymentHistoryDB(invoiceNo, 'CONFIRMATION');
    res.status(200).json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    next(error);
  }
};

export const updatePayment = async (req, res, next) => {
  const { paymentId } = req.params;
  const { amount, currency, paymentDate, note, proofUrl } = req.body;
  try {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be a positive number' });
    }

    const pool = getPool();
    const [existingRows] = await pool.query('SELECT referenceId FROM dst_payment_history WHERE id = ?', [paymentId]);

    await updatePaymentHistoryDB(paymentId, {
      amount: numericAmount,
      currency: currency || 'SAR',
      paymentDate,
      note,
      proofUrl
    });

    if (existingRows.length > 0) {
      await reconcileInvoicePayments(existingRows[0].referenceId);
    }

    res.status(200).json({
      success: true,
      message: 'Payment updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const deletePayment = async (req, res, next) => {
  const { paymentId } = req.params;
  try {
    const pool = getPool();
    const [existingRows] = await pool.query('SELECT referenceId FROM dst_payment_history WHERE id = ?', [paymentId]);

    await deletePaymentHistoryDB(paymentId);

    if (existingRows.length > 0) {
      await reconcileInvoicePayments(existingRows[0].referenceId);
    }

    res.status(200).json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get private audit logs
// @route   GET /api/invoices/audit-logs
// @access  Protected (Super Admin / Dimas / Ali only)
export const getAuditLogs = async (req, res, next) => {
  try {
    const userEmail = (req.user?.email || '').toLowerCase().trim();
    const ALLOWED_EMAILS = ['alvarizkidimas@gmail.com', 'ali@odst.id'];

    if (!ALLOWED_EMAILS.includes(userEmail)) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Audit logs are strictly restricted to alvarizkidimas@gmail.com and ali@odst.id only.'
      });
    }

    const logs = await getAuditLogsDB();
    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get invoice status by invoice number (for external integrations like Umrah System)
// @route   GET /api/invoices/:invoiceNo/status
// @access  Public / Integration
export const getInvoiceStatus = async (req, res, next) => {
  const { invoiceNo } = req.params;

  try {
    const invoice = await getInvoiceByIdDB(invoiceNo);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: `Invoice '${invoiceNo}' not found.`
      });
    }

    const st = String(invoice.status || '').toLowerCase().trim();
    const isApproved = ['approved', '4/4 approved', '3/3 approved', 'paid', 'paid and closed', 'fully_paid', 'fully paid', 'partial payment', 'deposit paid'].includes(st) || st.includes('paid') || st.includes('approved');
    const isPaid = ['paid', 'paid and closed', 'paid & closed', 'fully paid', 'fully_paid'].includes(st);
    const isPartial = st.includes('partial') || st.includes('deposit');

    const totalAmount = parseFloat(String(invoice.amount || '0').replace(/[^0-9.-]/g, '')) || 0;
    const totalPaid = invoice.totalPaid || 0;
    const remainingBalance = invoice.remainingBalance ?? Math.max(0, totalAmount - totalPaid);

    res.status(200).json({
      success: true,
      data: {
        invoiceNo: invoice.invoiceNo,
        company: invoice.company,
        companyCode: invoice.companyCode,
        status: invoice.status,
        isApproved,
        isPaid,
        isPartial,
        totalAmount,
        totalPaid,
        remainingBalance,
        currency: invoice.currency || 'USD',
        date: invoice.date,
        dueDate: invoice.dueDate,
        approvalStatus: invoice.requestStatus || (isApproved ? 'Approved' : 'Pending')
      }
    });
  } catch (error) {
    next(error);
  }
};

