
import { getAllInvoicesDB, createInvoiceDB, updateInvoiceStatusDB, deleteInvoicesDB, cancelInvoiceDB, updateInvoiceDB, getInvoiceByIdDB, savePaymentProofDB, addPaymentHistoryDB, getPaymentHistoryDB, updatePaymentHistoryDB, deletePaymentHistoryDB, insertAuditLogDB, getAuditLogsDB } from '../models/invoiceModel.js';
import { getPool } from '../config/db.js';
import { amountToEnglishWords } from '../utils/numberToWordsEnglish.js';

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
    if (req.user) {
      let parsedPerms = null;
      if (req.user.permissions) {
        if (typeof req.user.permissions === 'object' && !Array.isArray(req.user.permissions)) {
          parsedPerms = req.user.permissions;
        } else if (typeof req.user.permissions === 'string') {
          try {
            parsedPerms = JSON.parse(req.user.permissions);
          } catch (e) {}
        }
      }

      if (parsedPerms && parsedPerms.CAN_BYPASS_APPROVAL !== undefined) {
        hasBypassApproval = Boolean(parsedPerms.CAN_BYPASS_APPROVAL);
      } else if (Array.isArray(req.user.permissions)) {
        hasBypassApproval = req.user.permissions.includes('CAN_BYPASS_APPROVAL');
      } else {
        // Fallback only if CAN_BYPASS_APPROVAL has never been configured
        const cleanEmail = (req.user.email || '').toLowerCase().trim();
        const cleanName = (req.user.name || '').toLowerCase().trim();
        hasBypassApproval = Boolean(
          req.user.role === 'Super Admin' ||
          cleanEmail === 'alvarizkidimas@gmail.com' ||
          cleanEmail === 'ali@odst.id' ||
          cleanName.includes('dimas') ||
          cleanName.includes('ali warshan')
        );
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

  const rawUsdToIdr = parseFloat(rates.usdToIdr || rates.usdToIdrRate);
  const usdToIdr = (!isNaN(rawUsdToIdr) && rawUsdToIdr > 100) ? rawUsdToIdr : 18025;

  const rawSarToIdr = parseFloat(rates.sarToIdr || rates.sarToIdrRate);
  const sarToIdr = (!isNaN(rawSarToIdr) && rawSarToIdr > 100) ? rawSarToIdr : 4800;

  const rawUsdToSar = parseFloat(rates.usdToSar || (usdToIdr / sarToIdr));
  const usdToSar = (!isNaN(rawUsdToSar) && rawUsdToSar > 0) ? rawUsdToSar : (usdToIdr / sarToIdr);

  // Support explicit exchange rate passed in rates (only if plausible for the pair)
  if (rates.exchangeRate && parseFloat(rates.exchangeRate) > 0) {
    const rate = parseFloat(rates.exchangeRate);
    if ((from === 'IDR' || from === 'RP') && (to === 'SAR' || to === 'USD')) {
      if (rate > 100) {
        return num / rate;
      }
      if (to === 'SAR') return num / sarToIdr;
      if (to === 'USD') return num / usdToIdr;
    } else if ((to === 'IDR' || to === 'RP') && (from === 'SAR' || from === 'USD')) {
      if (rate > 100) {
        return num * rate;
      }
      if (from === 'SAR') return num * sarToIdr;
      if (from === 'USD') return num * usdToIdr;
    } else if (from === 'USD' && to === 'SAR') {
      return rate > 0.1 ? (num * rate) : (num * usdToSar);
    } else if (from === 'SAR' && to === 'USD') {
      return rate > 0.1 ? (num / rate) : (num / usdToSar);
    }
  }

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
    
    // Query live daily exchange rates from Settings (dst_exchange_rates)
    let rates = {
      usdToIdr: parseFloat(inv.usdToIdrRate) || 18000,
      sarToIdr: parseFloat(inv.sarToIdrRate) || 4800,
      usdToSar: 3.75
    };
    try {
      const [rateRows] = await pool.query('SELECT usdToIdr, sarToIdr, usdToSar FROM dst_exchange_rates WHERE id = ?', ['current']);
      if (rateRows.length > 0) {
        const dbUsd = parseFloat(rateRows[0].usdToIdr);
        const dbSar = parseFloat(rateRows[0].sarToIdr);
        const dbUsdSar = parseFloat(rateRows[0].usdToSar);
        if (!isNaN(dbUsd) && dbUsd > 100) rates.usdToIdr = dbUsd;
        if (!isNaN(dbSar) && dbSar > 100) rates.sarToIdr = dbSar;
        if (!isNaN(dbUsdSar) && dbUsdSar > 0) rates.usdToSar = dbUsdSar;
        else if (rates.usdToIdr && rates.sarToIdr) rates.usdToSar = rates.usdToIdr / rates.sarToIdr;
      }
    } catch (e) { }

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
    let effectiveRate = (!isNaN(parsedRate) && parsedRate > 0) ? parsedRate : undefined;

    // If rate is not specified or 1.0 for cross-currency, query live dst_exchange_rates (System Settings)
    if (!effectiveRate || effectiveRate <= 1) {
      try {
        const pool = getPool();
        const [rateRows] = await pool.query('SELECT usdToIdr, sarToIdr, usdToSar FROM dst_exchange_rates WHERE id = ?', ['current']);
        const [invRows] = await pool.query('SELECT currency FROM dst_invoices WHERE invoiceNo = ? OR id = ?', [invoiceNo, invoiceNo]);
        const invCurr = (invRows[0]?.currency || 'SAR').toUpperCase();
        const payCurr = (currency || 'SAR').toUpperCase();

        const usdRate = rateRows.length > 0 && parseFloat(rateRows[0].usdToIdr) > 100 ? parseFloat(rateRows[0].usdToIdr) : 18000;
        const sarRate = rateRows.length > 0 && parseFloat(rateRows[0].sarToIdr) > 100 ? parseFloat(rateRows[0].sarToIdr) : 4800;
        const usdSarRate = rateRows.length > 0 && parseFloat(rateRows[0].usdToSar) > 0 ? parseFloat(rateRows[0].usdToSar) : (usdRate / sarRate);

        if ((payCurr === 'IDR' || payCurr === 'RP') && invCurr === 'USD') effectiveRate = usdRate;
        else if ((payCurr === 'IDR' || payCurr === 'RP') && invCurr === 'SAR') effectiveRate = sarRate;
        else if (payCurr === 'USD' && invCurr === 'SAR') effectiveRate = usdSarRate;
        else if (payCurr === 'SAR' && invCurr === 'USD') effectiveRate = usdSarRate;
        else effectiveRate = 1.0;
      } catch (e) { }
    }

    const paymentData = {
      id: `pay_${Date.now()}`,
      referenceId: invoiceNo,
      moduleType: 'CONFIRMATION',
      amount: numericAmount,
      currency: currency || 'SAR',
      exchangeRate: effectiveRate,
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
      } catch (dbErr) { }

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
    } catch (notifErr) { }

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
  const { amount, currency, exchangeRate, exchange_rate, paymentDate, note, proofUrl } = req.body;
  try {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be a positive number' });
    }

    const parsedRate = parseFloat(exchangeRate || exchange_rate);

    const pool = getPool();
    const [existingRows] = await pool.query('SELECT referenceId FROM dst_payment_history WHERE id = ?', [paymentId]);

    await updatePaymentHistoryDB(paymentId, {
      amount: numericAmount,
      currency: currency || 'SAR',
      exchangeRate: (!isNaN(parsedRate) && parsedRate > 0) ? parsedRate : undefined,
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

// @desc    Get official receipt data for specific installment payment
// @route   GET /api/invoices/:invoiceNo/payments/:paymentId/receipt
// @access  Protected
export const getPaymentReceipt = async (req, res, next) => {
  const { invoiceNo, paymentId } = req.params;

  try {
    const invoice = await getInvoiceByIdDB(invoiceNo);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: `Invoice '${invoiceNo}' not found.`
      });
    }

    const pool = getPool();
    const [allPayments] = await pool.query(
      "SELECT * FROM dst_payment_history WHERE (referenceId = ? OR referenceId = ?) AND moduleType = 'CONFIRMATION' ORDER BY paymentDate ASC, createdAt ASC",
      [invoice.invoiceNo, invoice.id]
    );

    const isInitialDp = String(paymentId).toLowerCase().includes('dp-initial') ||
                        String(paymentId).toLowerCase().includes('initial') ||
                        String(paymentId).toLowerCase() === 'dp' ||
                        String(paymentId).toLowerCase() === '0';

    const rawAmt = parseFloat(String(invoice.amount || '0').replace(/[^0-9.-]/g, '')) || 0;
    const baseCurrency = (invoice.currency || 'SAR').toUpperCase();
    const advPayment = parseFloat(invoice.advancePayment || 0);

    let targetPayment;
    let seqIndex = 0;
    let receiptNo = '';

    // Calculate total paid up to this payment with live settings rates
    const rawUsdRate = parseFloat(invoice.usdToIdrRate);
    const rawSarRate = parseFloat(invoice.sarToIdrRate);
    let rates = {
      usdToIdr: (!isNaN(rawUsdRate) && rawUsdRate > 100) ? rawUsdRate : 18000,
      sarToIdr: (!isNaN(rawSarRate) && rawSarRate > 100) ? rawSarRate : 4800,
      usdToSar: 3.75
    };
    try {
      const [rateRows] = await pool.query('SELECT usdToIdr, sarToIdr, usdToSar FROM dst_exchange_rates WHERE id = ?', ['current']);
      if (rateRows.length > 0) {
        const dbUsd = parseFloat(rateRows[0].usdToIdr);
        const dbSar = parseFloat(rateRows[0].sarToIdr);
        const dbUsdSar = parseFloat(rateRows[0].usdToSar);
        if (!isNaN(dbUsd) && dbUsd > 100) rates.usdToIdr = dbUsd;
        if (!isNaN(dbSar) && dbSar > 100) rates.sarToIdr = dbSar;
        if (!isNaN(dbUsdSar) && dbUsdSar > 0) rates.usdToSar = dbUsdSar;
        else if (rates.usdToIdr && rates.sarToIdr) rates.usdToSar = rates.usdToIdr / rates.sarToIdr;
      }
    } catch (e) { }

    let totalPaidUpToThisInBase = 0;

    if (isInitialDp) {
      targetPayment = {
        id: 'dp-initial',
        amount: advPayment,
        currency: baseCurrency,
        paymentDate: invoice.date,
        note: 'Initial Advance Payment / Deposit',
        createdBy: invoice.createdBy || 'Finance System',
        createdAt: invoice.createdAt || new Date().toISOString(),
        exchange_rate: 1.0
      };
      seqIndex = 0;
      receiptNo = `REC-${invoice.invoiceNo}-00`;
      totalPaidUpToThisInBase = advPayment;
    } else {
      targetPayment = allPayments.find(p => String(p.id) === String(paymentId));
      if (!targetPayment) {
        return res.status(404).json({
          success: false,
          message: `Payment record '${paymentId}' not found for invoice '${invoiceNo}'.`
        });
      }
      seqIndex = allPayments.findIndex(p => String(p.id) === String(paymentId));
      const seqStr = String(advPayment > 0 ? seqIndex + 1 : seqIndex + 1).padStart(2, '0');
      receiptNo = `REC-${invoice.invoiceNo}-${seqStr}`;

      totalPaidUpToThisInBase = advPayment;
      for (let i = 0; i <= seqIndex; i++) {
        const p = allPayments[i];
        const pAmt = parseFloat(p.amount) || 0;
        const pCurr = (p.currency || baseCurrency).toUpperCase();
        const pRate = parseFloat(p.exchange_rate) || undefined;
        totalPaidUpToThisInBase += convertCurrency(pAmt, pCurr, baseCurrency, { ...rates, exchangeRate: pRate });
      }
    }

    const paymentAmount = parseFloat(targetPayment.amount) || 0;
    const paymentCurrency = (targetPayment.currency || baseCurrency).toUpperCase();

    const remainingAfterThis = Math.max(0, rawAmt - totalPaidUpToThisInBase);
    const amountInWords = amountToEnglishWords(paymentAmount, paymentCurrency);

    // Resolve targetExchangeRate for this specific payment
    let targetExchangeRate = parseFloat(targetPayment.exchange_rate);
    if (isNaN(targetExchangeRate) || targetExchangeRate <= 1) {
      if ((paymentCurrency === 'IDR' || paymentCurrency === 'RP') && baseCurrency === 'SAR') {
        targetExchangeRate = rates.sarToIdr;
      } else if ((paymentCurrency === 'IDR' || paymentCurrency === 'RP') && baseCurrency === 'USD') {
        targetExchangeRate = rates.usdToIdr;
      } else if (paymentCurrency === 'USD' && baseCurrency === 'SAR') {
        targetExchangeRate = rates.usdToSar;
      } else if (paymentCurrency === 'SAR' && baseCurrency === 'USD') {
        targetExchangeRate = rates.usdToSar;
      } else {
        targetExchangeRate = 1.0;
      }
    }

    const receiptData = {
      receiptNo,
      sequence: isInitialDp ? 0 : seqIndex + 1,
      paymentId: targetPayment.id,
      invoiceNo: invoice.invoiceNo,
      referenceNo: invoice.referenceNo || '-',
      serialNo: invoice.serialNo || '-',
      confirmationDate: invoice.date,
      dateOfPayment: targetPayment.paymentDate,
      receivedFrom: {
        company: invoice.company || invoice.custom_company_name || 'Client',
        companyCode: invoice.companyCode || '-',
        address: invoice.custom_address || 'Graha Al Badgel, Jakarta / Saudi Arabia',
        taxNumber: invoice.custom_tax_number || '-',
        email: invoice.custom_company_email || '-',
        agent: invoice.agent || '-'
      },
      amountReceived: {
        numeric: paymentAmount,
        currency: paymentCurrency,
        exchangeRate: targetExchangeRate,
        baseCurrency: baseCurrency
      },
      forPaymentOf: isInitialDp 
        ? `Deposit for Confirmation Ref # ${invoice.invoiceNo}`
        : `Installment Payment for Confirmation Ref # ${invoice.invoiceNo}`,
      ledgerSummary: {
        totalConfirmationAmount: rawAmt,
        advancePayment: advPayment,
        paymentAmountInThisReceipt: paymentAmount,
        totalPaidToDate: parseFloat(totalPaidUpToThisInBase.toFixed(2)),
        remainingBalance: parseFloat(remainingAfterThis.toFixed(2)),
        currency: baseCurrency
      },
      paymentDetails: {
        paymentDate: targetPayment.paymentDate,
        note: targetPayment.note || '',
        proofUrl: targetPayment.proofUrl || null,
        createdBy: targetPayment.createdBy || 'Finance System',
        createdAt: targetPayment.createdAt
      },
      issuedBy: 'ODST Group / PT. ODST AIRLINES INDO',
      issuedAt: new Date().toISOString(),
      language: 'en-US'
    };

    res.status(200).json({
      success: true,
      message: 'Receipt generated successfully',
      data: receiptData
    });
  } catch (error) {
    next(error);
  }
};



