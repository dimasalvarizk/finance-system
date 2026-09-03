
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
// @access  Public (or Protected)
export const createInvoice = async (req, res, next) => {
  const { invoiceNo, company, companyCode, referenceNo, serialNo, amount, date, status, usdToIdrRate, sarToIdrRate, dueDate, items, taxRate, currency, advancePayment } = req.body;

  try {
    if (!invoiceNo || !company || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide invoiceNo, company, and amount'
      });
    }

    const rawAmt = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^0-9.-]/g, '')) || 0;
    const advAmt = parseFloat(advancePayment || 0);
    const initialRemaining = Math.max(0, rawAmt - advAmt);

    const newInvoiceData = {
      id: `inv_${Date.now()}`,
      invoiceNo,
      company,
      companyCode: companyCode || 'GEN',
      referenceNo: referenceNo || `REF-${Date.now()}`,
      serialNo: serialNo || `SR-${Date.now()}`,
      amount,
      date,
      status: status || 'Pending',
      usdToIdrRate,
      sarToIdrRate,
      dueDate,
      items: items || [],
      taxRate: taxRate ? parseFloat(taxRate) : 0.00,
      branch: req.user ? req.user.branch : null,
      createdBy: req.user ? req.user.name : null,
      currency: currency || 'USD',
      advancePayment: advAmt,
      remainingBalance: initialRemaining
    };

    await createInvoiceDB(newInvoiceData);

    // Trigger notification internally to auth-service
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

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
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
  const { company, companyCode, referenceNo, serialNo, amount, date, usdToIdrRate, sarToIdrRate, dueDate, items, taxRate, currency } = req.body;

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
      currency: currency || 'USD'
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

// @desc    Add installment payment history
// @route   POST /api/invoices/:invoiceNo/payments
// @access  Protected
export const addPaymentHistory = async (req, res, next) => {
  const { invoiceNo } = req.params;
  const { amount, currency, paymentDate, note, proofUrl, saveOverpaymentCredit, companyCode } = req.body;

  try {
    if (!amount || !paymentDate) {
      return res.status(400).json({ success: false, message: 'Please provide amount and paymentDate' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be a positive number' });
    }

    const paymentData = {
      id: `pay_${Date.now()}`,
      referenceId: invoiceNo,
      moduleType: 'CONFIRMATION',
      amount: numericAmount,
      currency: currency || 'SAR',
      paymentDate,
      note: note || '',
      proofUrl: proofUrl || null,
      createdBy: req.user ? req.user.name : 'System'
    };

    await addPaymentHistoryDB(paymentData);

    // If saveOverpaymentCredit is true, update company credit balance in company-service or MySQL
    if (saveOverpaymentCredit && companyCode) {
      try {
        const pool = getPool();
        // Get overpayment excess
        const [invRows] = await pool.query('SELECT amount, advancePayment FROM dst_invoices WHERE invoiceNo = ? OR id = ?', [invoiceNo, invoiceNo]);
        if (invRows.length > 0) {
          const inv = invRows[0];
          const rawAmt = parseFloat(String(inv.amount || '0').replace(/[^0-9.-]/g, '')) || 0;
          const advPayment = parseFloat(inv.advancePayment || 0);

          const [sumRows] = await pool.query(
            "SELECT SUM(amount) AS totalPaid FROM dst_payment_history WHERE referenceId = ? AND moduleType = 'CONFIRMATION'",
            [invoiceNo]
          );
          const totalInstallments = parseFloat(sumRows[0].totalPaid || 0);
          const totalPaidSoFar = advPayment + totalInstallments;

          if (totalPaidSoFar > rawAmt) {
            const overpaymentCredit = totalPaidSoFar - rawAmt;
            await pool.query('UPDATE dst_companies SET creditBalance = creditBalance + ? WHERE code = ?', [overpaymentCredit, companyCode]);
            console.log(`Credit of $${overpaymentCredit} saved for company ${companyCode}`);
          }
        }
      } catch (creditErr) {
        console.error('Failed to update company credit balance:', creditErr.message);
      }
    }

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

    await updatePaymentHistoryDB(paymentId, {
      amount: numericAmount,
      currency: currency || 'SAR',
      paymentDate,
      note,
      proofUrl
    });

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
    await deletePaymentHistoryDB(paymentId);
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
    const userName = req.user ? req.user.name : '';
    // Very strict guard as per PRD
    if (!userName.includes('Dimas') && !userName.includes('Ali') && userName !== 'Super Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: You do not have permission to view audit logs.'
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

