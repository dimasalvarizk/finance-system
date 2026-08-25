import { getAllRequestsDB, getRequestByInvoiceNoDB, createRequestDB, approveRequestDB, rejectRequestDB } from '../models/requestModel.js';
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
      status: '0/3 Pending' // New requests start at Level 1 (0/3 Approved)
    };

    const newRequest = await createRequestDB(payload);

    // Trigger notification for new request to Level 1 assignees (Super Admins)
    try {
      const adminIds = ['usr_super_admin', 'usr_emad_moustafa'];
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
  const userRole = req.user.role;

  try {
    const fs = await import('fs');
    fs.appendFileSync('debug_approval.log', `[${new Date().toISOString()}] Approve requested: id=${id}, user=${JSON.stringify(req.user)}, role=${userRole}\n`);
  } catch (e) {
    console.error('Logging failed:', e);
  }

  try {
    const result = await approveRequestDB(id, userRole);

    if (!result.success) {
      return res.status(result.code || 400).json({
        success: false,
        message: result.message
      });
    }

    // Trigger notifications internally to auth-service
    try {
      const isFullyApproved = result.nextStatus === '3/3 Approved';
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
            message: `Your invoice request ${id} has been fully approved by all 3 directors.`
          })
        }).catch(err => console.error('Failed to trigger creator approved notification:', err.message));
      }

      // 3. Trigger approvalRequestAssigned to next level assignee
      let nextAssigneeId = null;
      let nextAssigneeRole = '';
      if (result.nextStatus === '1/3 Approved') {
        nextAssigneeId = 'usr_hesham'; // Chief Accountant (Level 2)
        nextAssigneeRole = 'Chief Accountant';
      } else if (result.nextStatus === '2/3 Approved') {
        nextAssigneeId = 'usr_khalid'; // Division Director (Level 3)
        nextAssigneeRole = 'Division Director';
      }

      if (nextAssigneeId) {
        fetch(`${getAuthBaseUrl(req)}/api/auth/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: nextAssigneeId,
            type: 'approvalRequestAssigned',
            title: 'Approval request assigned',
            message: `A new invoice request ${id} has been assigned to you for ${nextAssigneeRole} approval.`
          })
        }).catch(err => console.error('Failed to trigger request assigned notification:', err.message));
      }

      // 4. Trigger approvalCompleted to previous level approvers (downstream team completed)
      let downstreamNotifUsers = [];
      let completionMsg = '';
      if (result.nextStatus === '2/3 Approved') {
        downstreamNotifUsers = ['usr_super_admin', 'usr_emad_moustafa'];
        completionMsg = `Invoice request ${id} has been approved by Chief Accountant (Level 2).`;
      } else if (result.nextStatus === '3/3 Approved') {
        downstreamNotifUsers = ['usr_super_admin', 'usr_emad_moustafa', 'usr_hesham'];
        completionMsg = `Invoice request ${id} has been fully approved by all directors.`;
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

    if (request.status !== '3/3 Approved' && request.status !== 'Approved') {
      return res.status(403).json({
        success: false,
        allowed: false,
        message: 'Access Denied: Invoice must be fully approved by all 3 directors (Finance Director, Chief Accountant, and Division Director) before printing or downloading.'
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

    const [invoiceRows] = await pool.query('SELECT * FROM dst_invoices WHERE invoiceNo = ?', [request.invoiceNo]);
    if (invoiceRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    const invoice = invoiceRows[0];

    const [itemRows] = await pool.query('SELECT description, qty, price FROM dst_invoice_items WHERE invoiceId = ?', [invoice.id]);
    invoice.items = itemRows;

    const response = await fetch(`${getAuthBaseUrl(req)}/api/auth/send-client-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toEmail: email,
        invoiceDetails: {
          invoiceNo: invoice.invoiceNo,
          company: invoice.company,
          companyCode: invoice.companyCode,
          amount: invoice.amount,
          referenceNo: invoice.referenceNo,
          serialNo: invoice.serialNo,
          dueDate: invoice.dueDate,
          date: invoice.date,
          items: invoice.items,
          taxRate: invoice.taxRate
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
