import { getAllInvoicesDB, createInvoiceDB, updateInvoiceStatusDB, deleteInvoicesDB, cancelInvoiceDB, updateInvoiceDB, getInvoiceByIdDB } from '../models/invoiceModel.js';
import { getPool } from '../config/db.js';

const getAuthBaseUrl = (req) => {
  const isVercel = process.env.VERCEL === '1';
  if (isVercel && req) {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    return `${protocol}://${host}`;
  }
  return 'http://localhost:5001';
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
  const { invoiceNo, company, companyCode, referenceNo, serialNo, amount, date, status, usdToIdrRate, sarToIdrRate, dueDate, items, taxRate } = req.body;

  try {
    if (!invoiceNo || !company || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide invoiceNo, company, and amount'
      });
    }

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
      createdBy: req.user ? req.user.name : null
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
  const { company, companyCode, referenceNo, serialNo, amount, date, usdToIdrRate, sarToIdrRate, dueDate, items, taxRate } = req.body;

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
      taxRate: taxRate ? parseFloat(taxRate) : 0.00
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Invoice updated and workflow reset successfully'
    });
  } catch (error) {
    next(error);
  }
};
