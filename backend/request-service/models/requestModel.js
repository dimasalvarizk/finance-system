import { getPool } from '../config/db.js';

// Format dynamic approval date: e.g. "Oct 12, 2026 at 09:15 AM"
const formatApprovalDate = () => {
  const now = new Date();
  const options = { month: 'short', day: '2-digit', year: 'numeric' };
  const datePart = now.toLocaleDateString('en-US', options);

  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const timePart = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;

  return `${datePart} at ${timePart}`;
};

// Fetch all requests
export const getAllRequestsDB = async () => {
  const pool = getPool();
  const [requests] = await pool.query('SELECT * FROM dst_requests ORDER BY createdAt DESC');
  
  // Enrich requests with details from dst_invoices and dst_invoice_items
  for (const req of requests) {
    const [invRows] = await pool.query('SELECT referenceNo, serialNo, dueDate, usdToIdrRate, sarToIdrRate, id, branch, taxRate FROM dst_invoices WHERE invoiceNo = ?', [req.invoiceNo]);
    if (invRows.length > 0) {
      const inv = invRows[0];
      req.referenceNo = inv.referenceNo;
      req.serialNo = inv.serialNo;
      req.dueDate = inv.dueDate;
      req.usdToIdrRate = inv.usdToIdrRate;
      req.sarToIdrRate = inv.sarToIdrRate;
      req.branch = inv.branch;
      req.taxRate = inv.taxRate;

      const [items] = await pool.query('SELECT description, qty, price FROM dst_invoice_items WHERE invoiceId = ?', [inv.id]);
      req.items = items;
    } else {
      req.items = [];
    }
  }

  return requests;
};

// Fetch request by invoice number or request ID
export const getRequestByInvoiceNoDB = async (invoiceNo) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM dst_requests WHERE invoiceNo = ? OR reqNo = ?', [invoiceNo, invoiceNo]);
  const req = rows[0];
  if (!req) return null;

  const [invRows] = await pool.query('SELECT referenceNo, serialNo, dueDate, usdToIdrRate, sarToIdrRate, id, branch, taxRate FROM dst_invoices WHERE invoiceNo = ?', [req.invoiceNo]);
  if (invRows.length > 0) {
    const inv = invRows[0];
    req.referenceNo = inv.referenceNo;
    req.serialNo = inv.serialNo;
    req.dueDate = inv.dueDate;
    req.usdToIdrRate = inv.usdToIdrRate;
    req.sarToIdrRate = inv.sarToIdrRate;
    req.branch = inv.branch;
    req.taxRate = inv.taxRate;

    const [items] = await pool.query('SELECT description, qty, price FROM dst_invoice_items WHERE invoiceId = ?', [inv.id]);
    req.items = items;
  } else {
    req.items = [];
  }

  return req;
};

// Create new approval request
export const createRequestDB = async (reqData) => {
  const pool = getPool();
  const id = `req_${Date.now()}`;

  // Calculate reqNo based on highest current number
  const [rows] = await pool.query('SELECT reqNo FROM dst_requests WHERE reqNo LIKE "REQ-2026-%"');
  let nextCounter = 9;
  if (rows.length > 0) {
    const counters = rows.map(r => {
      const parts = r.reqNo.split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      return isNaN(num) ? 0 : num;
    });
    nextCounter = Math.max(...counters) + 1;
  }
  const reqNo = `REQ-2026-${String(nextCounter).padStart(3, '0')}`;

  const insertQuery = `
    INSERT INTO dst_requests (id, reqNo, invoiceNo, company, companyCode, amount, requestedBy, submittedDate, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await pool.query(insertQuery, [
    id,
    reqNo,
    reqData.invoiceNo,
    reqData.company,
    reqData.companyCode,
    reqData.amount,
    reqData.requestedBy || 'Ahmad Saleh',
    reqData.submittedDate || new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    reqData.status || '0/3 Pending'
  ]);

  return { id, reqNo, ...reqData };
};

// Update request approval level (with role checks and recording of timestamp)
export const approveRequestDB = async (id, userRole) => {
  const pool = getPool();

  // Find current request
  const [rows] = await pool.query('SELECT * FROM dst_requests WHERE id = ? OR reqNo = ? OR invoiceNo = ?', [id, id, id]);
  const request = rows[0];
  if (!request) return { success: false, code: 404, message: 'Request not found' };

  const currentStatus = request.status;
  let nextStatus = currentStatus;
  let updateField = '';
  const timestamp = formatApprovalDate();

  // Validate Level 1 Approval
  if (currentStatus === '0/3 Pending') {
    if (userRole !== 'Super Admin') {
      return { success: false, code: 403, message: 'Access Denied: Only Mr. Emad Moustafa (Finance Director / Super Admin) can approve Level 1.' };
    }
    nextStatus = '1/3 Approved';
    updateField = 'level1ApprovedAt';
  }
  // Validate Level 2 Approval
  else if (currentStatus === '1/3 Approved') {
    if (userRole !== 'Chief Accountant') {
      return { success: false, code: 403, message: 'Access Denied: Only Chief Accountant (Mr. Hesham Mokhtar) can approve Level 2.' };
    }
    nextStatus = '2/3 Approved';
    updateField = 'level2ApprovedAt';
  }
  // Validate Level 3 Approval
  else if (currentStatus === '2/3 Approved') {
    if (userRole !== 'Division Director') {
      return { success: false, code: 403, message: 'Access Denied: Only Division Director (Mr. Khalid Idriss) can approve Level 3.' };
    }
    nextStatus = '3/3 Approved';
    updateField = 'level3ApprovedAt';
  }
  else {
    return { success: false, code: 400, message: 'Request is already fully approved or rejected.' };
  }

  // Perform database update
  if (updateField) {
    const updateQuery = `UPDATE dst_requests SET status = ?, ${updateField} = ? WHERE id = ?`;
    await pool.query(updateQuery, [nextStatus, timestamp, request.id]);
  } else {
    await pool.query('UPDATE dst_requests SET status = ? WHERE id = ?', [nextStatus, request.id]);
  }

  // Sync to dst_invoices table in same database
  if (nextStatus === '3/3 Approved') {
    await pool.query('UPDATE dst_invoices SET status = "Approved" WHERE invoiceNo = ?', [request.invoiceNo]);
  } else {
    await pool.query('UPDATE dst_invoices SET status = ? WHERE invoiceNo = ?', [nextStatus, request.invoiceNo]);
  }

  return { success: true, nextStatus, timestamp, requestNo: request.reqNo, invoiceNo: request.invoiceNo, requestedBy: request.requestedBy };
};

// Reject request
export const rejectRequestDB = async (id, userRole, userName, reason) => {
  const pool = getPool();

  const [rows] = await pool.query('SELECT * FROM dst_requests WHERE id = ? OR reqNo = ? OR invoiceNo = ?', [id, id, id]);
  const request = rows[0];
  if (!request) return { success: false, code: 404, message: 'Request not found' };

  if (userRole === 'Accountant') {
    return { success: false, code: 403, message: 'Access Denied: Accountants are not permitted to reject requests.' };
  }

  // Reject constraints for Level 1
  if (request.status === '0/3 Pending') {
    if (userRole !== 'Super Admin') {
      return { success: false, code: 403, message: 'Access Denied: Only Mr. Emad Moustafa (Finance Director / Super Admin) can reject Level 1.' };
    }
  }
  // Reject constraints for Level 2
  else if (request.status === '1/3 Approved') {
    if (userRole !== 'Chief Accountant') {
      return { success: false, code: 403, message: 'Access Denied: Only Chief Accountant (Mr. Hesham Mokhtar) can reject Level 2.' };
    }
  }
  // Reject constraints for Level 3
  else if (request.status === '2/3 Approved') {
    if (userRole !== 'Division Director') {
      return { success: false, code: 403, message: 'Access Denied: Only Division Director (Mr. Khalid Idriss) can reject Level 3.' };
    }
  }
  else {
    return { success: false, code: 400, message: 'Request is already processed and cannot be rejected.' };
  }

  const timestamp = formatApprovalDate();

  const updateRequestQuery = `
    UPDATE dst_requests 
    SET status = "Rejected", 
        rejectionReason = ?, 
        rejectedBy = ?, 
        rejectedAt = ?, 
        rejectedRole = ? 
    WHERE id = ?
  `;
  await pool.query(updateRequestQuery, [reason || 'No reason provided', userName, timestamp, userRole, request.id]);
  
  // Sync to dst_invoices table
  await pool.query('UPDATE dst_invoices SET status = "Rejected", rejectionReason = ? WHERE invoiceNo = ?', [reason || 'No reason provided', request.invoiceNo]);
  
  return { 
    success: true, 
    invoiceNo: request.invoiceNo,
    rejectedBy: userName,
    rejectedAt: timestamp,
    rejectedRole: userRole,
    rejectionReason: reason || 'No reason provided',
    requestedBy: request.requestedBy
  };
};
