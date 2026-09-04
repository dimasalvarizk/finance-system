import { getAllRequestsDB, getRequestByInvoiceNoDB, createRequestDB, approveRequestDB, rejectRequestDB } from '../models/requestModel.js';
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


// Get all requests
export const getRequests = async (req, res, next) => {
  try {
    let list = await getAllRequestsDB();

    // Filter requests: Accountant only sees their own requests
    if (req.user && req.user.role === 'Accountant') {
      list = list.filter(r => r.requestedBy === req.user.name);
    }

    res.status(200).json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (error) {
    next(error);
  }
};

// Create a new request (triggered when a new invoice is generated)
export const createRequest = async (req, res, next) => {
  const { invoiceNo, company, companyCode, amount, requestedBy, submittedDate } = req.body;

  try {
    if (!invoiceNo || !company || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide invoiceNo, company, and amount'
      });
    }

    const payload = {
      invoiceNo,
      company,
      companyCode,
      amount,
      requestedBy,
      submittedDate,
      status: '0/4 Pending' // New requests start at Level 1 (0/4 Approved)
    };

    const newRequest = await createRequestDB(payload);

    // Trigger notification for new request to Level 1 assignees (Chief Accountant)
    try {
      const adminIds = ['usr_hesham'];
      for (const adminId of adminIds) {
        fetch(`${getAuthBaseUrl(req)}/api/auth/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: adminId,
            type: 'approvalRequestAssigned',
            title: 'Approval request assigned',
            message: `A new invoice request ${invoiceNo} for ${company} (${amount}) has been submitted by ${requestedBy || 'Accountant'} and is assigned to you for review.`
          })
        }).catch(err => console.error('Failed to trigger submission notification:', err.message));
      }
    } catch (err) {
      console.error('Submission notification trigger error:', err.message);
    }

    res.status(201).json({
      success: true,
      message: 'Approval request generated successfully',
      data: newRequest
    });
  } catch (error) {
    next(error);
  }
};

// Approve request level (signed by logged in user)
export const approveRequest = async (req, res, next) => {
  const { id } = req.params;
  const { note } = req.body;
  const userRole = req.user.role;

  try {
    const fs = await import('fs');
    fs.appendFileSync('debug_approval.log', `[${new Date().toISOString()}] Approve requested: id=${id}, user=${JSON.stringify(req.user)}, role=${userRole}, note=${note}\n`);
  } catch (e) {
    console.error('Logging failed:', e);
  }

  try {
    const result = await approveRequestDB(id, userRole, note);

    if (!result.success) {
      return res.status(result.code || 400).json({
        success: false,
        message: result.message
      });
    }

    // Trigger notifications internally to auth-service
    try {
      const isFullyApproved = result.nextStatus === '4/4 Approved';
      const pool = getPool();

      // 1. Resolve Creator/Requestor UserId
      let creatorUserId = 'usr_super_admin';
      if (result.requestedBy) {
        const [userRows] = await pool.query('SELECT id FROM dst_users WHERE name = ?', [result.requestedBy]);
        if (userRows.length > 0) {
          creatorUserId = userRows[0].id;
        }
      }

      // 2. Trigger notification to Creator if fully approved
      if (isFullyApproved) {
        fetch(`${getAuthBaseUrl(req)}/api/auth/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: creatorUserId,
            type: 'invoiceApproved',
            title: 'Invoice approved',
            message: `Your invoice request ${id} has been fully approved by all accountants and directors.`
          })
        }).catch(err => console.error('Failed to trigger creator approved notification:', err.message));
      }

      // 3. Trigger approvalRequestAssigned to next level assignee
      let nextAssigneeId = null;
      let nextAssigneeRole = '';
      if (result.nextStatus === '1/4' || result.nextStatus === '1/4 Approved') {
        nextAssigneeId = ['usr_kareem', 'usr_raed']; // Level 2 Approvers (Karim & Raed)
        nextAssigneeRole = 'Level 2 Approver';
      } else if (result.nextStatus === '2/4' || result.nextStatus === '2/4 Approved') {
        nextAssigneeId = 'usr_khalid'; // Division Director (Level 3)
        nextAssigneeRole = 'Division Director';
      } else if (result.nextStatus === '3/4' || result.nextStatus === '3/4 Approved') {
        nextAssigneeId = ['usr_super_admin', 'usr_emad_moustafa']; // Financial Controller (Level 4)
        nextAssigneeRole = 'Financial Controller';
      }

      if (nextAssigneeId) {
        const assignees = Array.isArray(nextAssigneeId) ? nextAssigneeId : [nextAssigneeId];
        for (const assigneeId of assignees) {
          fetch(`${getAuthBaseUrl(req)}/api/auth/notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: assigneeId,
              type: 'approvalRequestAssigned',
              title: 'Approval request assigned',
              message: `A new invoice request ${id} has been assigned to you for ${nextAssigneeRole} approval.`
            })
          }).catch(err => console.error('Failed to trigger request assigned notification:', err.message));
        }
      }

      // 4. Trigger approvalCompleted to previous level approvers (downstream team completed)
      let downstreamNotifUsers = [];
      let completionMsg = '';
      if (result.nextStatus === '2/4' || result.nextStatus === '2/4 Approved') {
        downstreamNotifUsers = ['usr_hesham'];
        completionMsg = `Invoice request ${id} has been approved by Level 2 Approver.`;
      } else if (result.nextStatus === '3/4' || result.nextStatus === '3/4 Approved') {
        downstreamNotifUsers = ['usr_hesham', 'usr_kareem', 'usr_raed'];
        completionMsg = `Invoice request ${id} has been approved by Division Director.`;
      } else if (result.nextStatus === '4/4 Approved') {
        downstreamNotifUsers = ['usr_hesham', 'usr_kareem', 'usr_raed', 'usr_khalid'];
        completionMsg = `Invoice request ${id} has been fully approved by all directors and controllers.`;
      }

      for (const userId of downstreamNotifUsers) {
        fetch(`${getAuthBaseUrl(req)}/api/auth/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            type: 'approvalCompleted',
            title: 'Approval completed',
            message: completionMsg
          })
        }).catch(err => console.error('Failed to trigger approval completed notification:', err.message));
      }
    } catch (err) {
      console.error('Notification trigger error:', err.message);
    }

    res.status(200).json({
      success: true,
      message: `Approved Level successfully. Current Status: ${result.nextStatus}`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// Reject request
export const rejectRequest = async (req, res, next) => {
  const { id } = req.params;
  const userRole = req.user.role;
  const userName = req.user.name || 'Director';
  const { reason } = req.body;

  try {
    const fs = await import('fs');
    fs.appendFileSync('debug_approval.log', `[${new Date().toISOString()}] Reject requested: id=${id}, user=${JSON.stringify(req.user)}, role=${userRole}\n`);
  } catch (e) {
    console.error('Logging failed:', e);
  }

  try {
    const result = await rejectRequestDB(id, userRole, userName, reason);

    if (!result.success) {
      return res.status(result.code || 400).json({
        success: false,
        message: result.message
      });
    }

    // Trigger notification internally to auth-service
    try {
      const pool = getPool();
      let targetUserId = 'usr_super_admin';
      if (result.requestedBy) {
        const [userRows] = await pool.query('SELECT id FROM dst_users WHERE name = ?', [result.requestedBy]);
        if (userRows.length > 0) {
          targetUserId = userRows[0].id;
        }
      }

      fetch(`${getAuthBaseUrl(req)}/api/auth/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUserId,
          type: 'invoiceRejected',
          title: 'Invoice rejected',
          message: `Invoice request ${id} has been rejected by ${req.user?.name || 'Director'} (${userRole}). Reason: ${reason || 'No reason provided'}`
        })
      }).catch(err => console.error('Failed to trigger reject notification:', err.message));
    } catch (err) {
      console.error('Notification trigger error:', err.message);
    }

    res.status(200).json({
      success: true,
      message: 'Request has been rejected successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// Download and Print Access Control Verification Check
export const checkDownloadPermission = async (req, res, next) => {
  const { id } = req.params;

  try {
    const request = await getRequestByInvoiceNoDB(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.status !== '4/4 Approved' && request.status !== 'Approved') {
      return res.status(403).json({
        success: false,
        allowed: false,
        message: 'Access Denied: Invoice must be fully approved by all accountants and directors before printing or downloading.'
      });
    }

    res.status(200).json({
      success: true,
      allowed: true,
      message: 'Access Granted: Print or download is permitted.'
    });
  } catch (error) {
    next(error);
  }
};

// Send invoice email to client
export const sendInvoiceEmail = async (req, res, next) => {
  const { id } = req.params;
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ success: false, message: 'Recipient email is required' });
    }

    const pool = getPool();
    const [requestRows] = await pool.query('SELECT * FROM dst_requests WHERE id = ? OR invoiceNo = ?', [id, id]);
    if (requestRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    const request = requestRows[0];

    const [invoiceRows] = await pool.query(`
      SELECT i.*, 
             COALESCE(c.name, i.company) AS companyName,
             COALESCE(c.taxNumber, '') AS clientTaxNo,
             COALESCE(c.agent, '') AS clientAgent,
             COALESCE(c.address, '') AS clientAddress
      FROM dst_invoices i
      LEFT JOIN dst_companies c ON i.companyCode = c.code
      WHERE i.invoiceNo = ? OR i.id = ?
    `, [request.invoiceNo, request.invoiceNo]);

    if (invoiceRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    const invoice = invoiceRows[0];

    const [userRows] = await pool.query('SELECT name, email, employeeId FROM dst_users WHERE name = ? OR email = ?', [invoice.createdBy || request.createdBy, invoice.createdBy || request.createdBy]);
    const creator = userRows[0] || { name: invoice.createdBy || request.createdBy || '', email: 'info@odst.id', employeeId: '' };

    const [settingRows] = await pool.query('SELECT * FROM dst_company_settings LIMIT 1');
    const compSettings = settingRows[0] || {
      companyName: 'ODST Group',
      phone: '+62 8111 1203 330',
      taxNumber: '0000-0000-0001',
      bankName: 'Danamon',
      accountName: 'PT ODST Airlines Indo',
      idrAccountNumber: '003711895213',
      usdAccountNumber: '003711895643'
    };

    const splitAddress = (fullAddress) => {
      if (!fullAddress) return { address: '', cityCountry: '' };
      const parts = fullAddress.split(',').map(p => p.trim());
      if (parts.length <= 3) {
        return {
          address: parts[0] || '',
          cityCountry: parts.slice(1).join(', ') || ''
        };
      }
      const cityCountryParts = parts.slice(-3);
      const addressParts = parts.slice(0, -3);
      return {
        address: addressParts.join(', '),
        cityCountry: cityCountryParts.join(', ')
      };
    };

    const cleanAgentName = (agentName) => {
      if (!agentName) return undefined;
      const lower = agentName.toLowerCase();
      if (lower.includes('hasoob')) return 'Hasoob Technology';
      if (lower.includes('odst')) return 'ODST Travel & Tourizm';
      return agentName;
    };

    const rawAddr = invoice.clientAddress || invoice.address || '';
    const splitAddr = splitAddress(rawAddr);
    const cleanedAgent = cleanAgentName(invoice.clientAgent || invoice.agent);

    const billFrom = {
      name: creator.name || '',
      id: creator.employeeId || '',
      entity: 'ODST Group',
      branch: 'Graha Al Badegel',
      phone: compSettings.phone || '+62 8111 1203 330',
      email: 'info@odst.id',
      tax: compSettings.taxNumber || '0000-0000-0001'
    };

    const billTo = {
      company: invoice.companyName || invoice.company || '',
      tax: invoice.clientTaxNo || invoice.taxNumber || '',
      agent: cleanedAgent || '',
      address: splitAddr.address || '',
      cityCountry: splitAddr.cityCountry || ''
    };

    const [itemRows] = await pool.query('SELECT description, qty, price FROM dst_invoice_items WHERE invoiceId = ?', [invoice.id]);
    invoice.items = itemRows;

    const response = await fetch(`${getAuthBaseUrl(req)}/api/auth/send-client-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toEmail: email,
        invoiceDetails: {
          invoiceNo: invoice.invoiceNo,
          company: invoice.companyName || invoice.company,
          companyCode: invoice.companyCode,
          amount: invoice.amount,
          referenceNo: invoice.referenceNo,
          serialNo: invoice.serialNo,
          dueDate: invoice.dueDate,
          date: invoice.date,
          items: invoice.items,
          taxRate: invoice.taxRate || 0,
          currency: invoice.currency || 'SAR',
          usdToIdrRate: invoice.usdToIdrRate || 18000,
          sarToIdrRate: invoice.sarToIdrRate || 4800,
          billFrom,
          billTo,
          documentType: 'Invoice / Confirmation'
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: data.message || 'Failed to send client invoice email via auth-service'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Client invoice email sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update request note for active level
// @route   PUT /api/requests/:id/note
// @access  Protected
export const updateRequestNote = async (req, res, next) => {
  const { id } = req.params;
  const { note } = req.body;
  const userRole = req.user.role;

  try {
    const { updateRequestNoteDB } = await import('../models/requestModel.js');
    const result = await updateRequestNoteDB(id, userRole, note);
    if (!result.success) {
      return res.status(result.code || 400).json(result);
    }
    res.status(200).json({ success: true, message: 'Note saved successfully' });
  } catch (error) {
    next(error);
  }
};
