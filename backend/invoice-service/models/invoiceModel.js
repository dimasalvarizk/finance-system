import { getPool } from '../config/db.js';

const cleanAgentName = (agent) => {
  if (!agent) return null;
  const lower = agent.toLowerCase();
  if (lower.includes('hasoob')) {
    return 'Hasoob Technology';
  }
  if (lower.includes('odst')) {
    return 'ODST Travel & Tourizm';
  }
  return agent;
};

// Get all invoices (optionally filtered by createdBy for Accountant)
export const getAllInvoicesDB = async (createdByFilter = null) => {
  const pool = getPool();

  // 1. Auto-cancel invoices past due date
  try {
    const todayStr = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    await pool.query(`
      UPDATE dst_invoices 
      SET status = 'Cancelled', rejectionReason = 'Auto-Cancelled: Unpaid past due date'
      WHERE LOWER(status) NOT IN ('paid', 'cancelled', 'archived', 'rejected', 'paid and closed', 'fully_paid')
        AND dueDate IS NOT NULL 
        AND dueDate != '' 
        AND dueDate < ?
    `, [todayStr]);
  } catch (err) {
    console.error('Failed to auto-cancel overdue invoices:', err);
  }

  // 2. Retroactive Fix: Auto-repair any invoice stuck in PARTIAL/DEPOSIT status when total paid is 0
  try {
    await pool.query(`
      UPDATE dst_invoices i
      LEFT JOIN (
        SELECT referenceId, SUM(amount) AS totalInstallments 
        FROM dst_payment_history 
        WHERE moduleType = 'CONFIRMATION' 
        GROUP BY referenceId
      ) p ON (i.invoiceNo = p.referenceId OR i.id = p.referenceId)
      LEFT JOIN dst_requests r ON (i.invoiceNo = r.invoiceNo)
      SET i.status = COALESCE(NULLIF(r.status, '4/4 Approved'), 'Approved', '0/4 Pending'),
          i.remainingBalance = CAST(REPLACE(REPLACE(i.amount, '$', ''), ',', '') AS DECIMAL(15,2))
      WHERE LOWER(i.status) IN ('partial', 'partial payment', 'deposit_paid', 'deposit paid', 'fully_paid')
        AND (p.totalInstallments IS NULL OR p.totalInstallments = 0)
        AND (i.advancePayment IS NULL OR i.advancePayment = 0)
        AND (r.status IS NULL OR r.status NOT IN ('Paid', 'FULLY_PAID'));
    `);
  } catch (err) {
    console.error('Failed to auto-repair zero payment partial invoices:', err.message);
  }
  
  let query = `
    SELECT i.*, 
           COALESCE(c.agent, i.custom_agent, i.agent) AS agent,
           COALESCE(p.totalInstallments, 0) AS totalInstallments,
           (COALESCE(p.totalInstallments, 0) + COALESCE(i.advancePayment, 0)) AS totalPaid,
           r.status AS requestStatus
    FROM dst_invoices i
    LEFT JOIN dst_companies c ON i.companyCode = c.code
    LEFT JOIN (
      SELECT referenceId, SUM(amount) AS totalInstallments 
      FROM dst_payment_history 
      WHERE moduleType = 'CONFIRMATION' 
      GROUP BY referenceId
    ) p ON (i.invoiceNo = p.referenceId OR i.id = p.referenceId)
    LEFT JOIN dst_requests r ON (i.invoiceNo = r.invoiceNo)
    ORDER BY i.createdAt DESC
  `;
  let queryParams = [];
  
  if (createdByFilter) {
    query = `
      SELECT i.*, 
             COALESCE(c.agent, i.custom_agent, i.agent) AS agent,
             COALESCE(p.totalInstallments, 0) AS totalInstallments,
             (COALESCE(p.totalInstallments, 0) + COALESCE(i.advancePayment, 0)) AS totalPaid,
             r.status AS requestStatus
      FROM dst_invoices i
      LEFT JOIN dst_companies c ON i.companyCode = c.code
      LEFT JOIN (
        SELECT referenceId, SUM(amount) AS totalInstallments 
        FROM dst_payment_history 
        WHERE moduleType = 'CONFIRMATION' 
        GROUP BY referenceId
      ) p ON (i.invoiceNo = p.referenceId OR i.id = p.referenceId)
      LEFT JOIN dst_requests r ON (i.invoiceNo = r.invoiceNo)
      WHERE i.createdBy = ? OR i.createdBy IS NULL 
      ORDER BY i.createdAt DESC
    `;
    queryParams = [createdByFilter];
  }
  
  const [invoices] = await pool.query(query, queryParams);

  // Fetch items and enforce strict payment/remaining calculations
  for (const inv of invoices) {
    inv.agent = cleanAgentName(inv.agent);
    
    const rawAmt = parseFloat(String(inv.amount || '0').replace(/[^0-9.-]/g, '')) || 0;
    const advAmt = parseFloat(String(inv.advancePayment || 0));
    const totalInst = parseFloat(String(inv.totalInstallments || 0));
    const totalPaid = advAmt + totalInst;

    inv.totalPaid = totalPaid;
    inv.totalInstallments = totalInst;
    inv.remainingBalance = Math.max(0, rawAmt - totalPaid);

    // Strict status correction if totalPaid is 0
    const stLower = String(inv.status || '').toLowerCase();
    if (totalPaid === 0 && (stLower.includes('partial') || stLower === 'deposit_paid' || stLower === 'fully_paid')) {
      inv.status = inv.requestStatus === '4/4 Approved' ? 'Approved' : (inv.requestStatus || '0/4 Pending');
    }

    const [items] = await pool.query('SELECT description, qty, price FROM dst_invoice_items WHERE invoiceId = ?', [inv.id]);
    inv.items = items;
  }

  return invoices;
};

// Create a new invoice
export const createInvoiceDB = async (invoiceData) => {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const insertInvoiceQuery = `
      INSERT INTO dst_invoices (
        id, invoiceNo, company, companyCode, referenceNo, serialNo, amount, date, status, 
        usdToIdrRate, sarToIdrRate, dueDate, branch, createdBy, taxRate, currency, 
        advancePayment, remainingBalance, company_id, custom_company_name, custom_company_email, 
        custom_agent, custom_address, custom_tax_number
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await connection.query(insertInvoiceQuery, [
      invoiceData.id,
      invoiceData.invoiceNo,
      invoiceData.company,
      invoiceData.companyCode,
      invoiceData.referenceNo,
      invoiceData.serialNo,
      invoiceData.amount,
      invoiceData.date,
      invoiceData.status,
      invoiceData.usdToIdrRate || 18025.00,
      invoiceData.sarToIdrRate || 4800.00,
      invoiceData.dueDate,
      invoiceData.branch || null,
      invoiceData.createdBy || null,
      invoiceData.taxRate || 0.00,
      invoiceData.currency || 'USD',
      invoiceData.advancePayment || 0.00,
      invoiceData.remainingBalance !== undefined ? invoiceData.remainingBalance : null,
      invoiceData.company_id || null,
      invoiceData.custom_company_name || null,
      invoiceData.custom_company_email || null,
      invoiceData.custom_agent || null,
      invoiceData.custom_address || null,
      invoiceData.custom_tax_number || null
    ]);

    if (invoiceData.items && invoiceData.items.length > 0) {
      const insertItemQuery = `
        INSERT INTO dst_invoice_items (invoiceId, description, qty, price)
        VALUES (?, ?, ?, ?)
      `;

      for (const item of invoiceData.items) {
        await connection.query(insertItemQuery, [
          invoiceData.id,
          item.description,
          item.qty,
          item.price
        ]);
      }
    }

    await connection.commit();
    return invoiceData;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateInvoiceStatusDB = async (id, status) => {
  const pool = getPool();
  const [result] = await pool.query('UPDATE dst_invoices SET status = ? WHERE id = ? OR invoiceNo = ?', [status, id, id]);
  
  // Sync status to dst_requests table
  try {
    const [invoiceRows] = await pool.query('SELECT invoiceNo FROM dst_invoices WHERE id = ? OR invoiceNo = ?', [id, id]);
    if (invoiceRows.length > 0) {
      const invoiceNo = invoiceRows[0].invoiceNo;
      await pool.query('UPDATE dst_requests SET status = ? WHERE invoiceNo = ?', [status, invoiceNo]);
    }
  } catch (err) {
    console.error('Failed to sync status to dst_requests:', err.message);
  }
  
  return result.affectedRows > 0;
};

// Bulk delete invoices and their requests/items
export const deleteInvoicesDB = async (ids) => {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (ids && ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      
      // Get invoice Nos to delete associated requests
      const [invoices] = await connection.query(`SELECT invoiceNo FROM dst_invoices WHERE id IN (${placeholders}) OR invoiceNo IN (${placeholders})`, [...ids, ...ids]);
      const invoiceNos = invoices.map(i => i.invoiceNo);

      await connection.query(`DELETE FROM dst_invoices WHERE id IN (${placeholders}) OR invoiceNo IN (${placeholders})`, [...ids, ...ids]);

      if (invoiceNos.length > 0) {
        const reqPlaceholders = invoiceNos.map(() => '?').join(',');
        await connection.query(`DELETE FROM dst_requests WHERE invoiceNo IN (${reqPlaceholders})`, invoiceNos);
      }
    }

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const cancelInvoiceDB = async (id) => {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Update invoice status to Cancelled
    const [result] = await connection.query("UPDATE dst_invoices SET status = 'Cancelled' WHERE id = ? OR invoiceNo = ?", [id, id]);
    
    // Get invoiceNo of this invoice
    const [invoices] = await connection.query('SELECT invoiceNo FROM dst_invoices WHERE id = ? OR invoiceNo = ?', [id, id]);
    if (invoices.length > 0) {
      const invNo = invoices[0].invoiceNo;
      // Update corresponding request status to Cancelled
      await connection.query("UPDATE dst_requests SET status = 'Cancelled' WHERE invoiceNo = ?", [invNo]);
    }

    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateInvoiceDB = async (id, data) => {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Update invoice in dst_invoices
    const updateQuery = `
      UPDATE dst_invoices 
      SET company = ?, companyCode = ?, referenceNo = ?, serialNo = ?, amount = ?, date = ?, status = '0/4 Pending', usdToIdrRate = ?, sarToIdrRate = ?, dueDate = ?, taxRate = ?, currency = ?
      WHERE id = ? OR invoiceNo = ?
    `;
    await connection.query(updateQuery, [
      data.company,
      data.companyCode,
      data.referenceNo,
      data.serialNo,
      data.amount,
      data.date,
      data.usdToIdrRate || 18025.00,
      data.sarToIdrRate || 4800.00,
      data.dueDate,
      data.taxRate || 0.00,
      data.currency || 'USD',
      id,
      id
    ]);

    // 2. Refresh items (Delete old ones and insert new ones)
    const [invoices] = await connection.query('SELECT id, invoiceNo FROM dst_invoices WHERE id = ? OR invoiceNo = ?', [id, id]);
    if (invoices.length === 0) {
      throw new Error('Invoice not found');
    }
    const realInvoiceId = invoices[0].id;
    const invoiceNo = invoices[0].invoiceNo;

    await connection.query('DELETE FROM dst_invoice_items WHERE invoiceId = ?', [realInvoiceId]);

    if (data.items && data.items.length > 0) {
      const insertItemQuery = `
        INSERT INTO dst_invoice_items (invoiceId, description, qty, price)
        VALUES (?, ?, ?, ?)
      `;
      for (const item of data.items) {
        await connection.query(insertItemQuery, [realInvoiceId, item.description, item.qty, item.price]);
      }
    }

    // 3. Reset associated request in dst_requests
    const resetRequestQuery = `
      UPDATE dst_requests 
      SET status = '0/4 Pending', amount = ?, company = ?, companyCode = ?, level1ApprovedAt = NULL, level2ApprovedAt = NULL, level3ApprovedAt = NULL, level4ApprovedAt = NULL, level1Note = NULL, level2Note = NULL, level3Note = NULL, level4Note = NULL, rejectionReason = NULL
      WHERE invoiceNo = ?
    `;
    await connection.query(resetRequestQuery, [data.amount, data.company, data.companyCode, invoiceNo]);

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getInvoiceByIdDB = async (id) => {
  const pool = getPool();
  const [rows] = await pool.query(`
    SELECT i.*, 
           COALESCE(c.agent, i.custom_agent, i.agent) AS agent,
           COALESCE(p.totalInstallments, 0) AS totalInstallments,
           (COALESCE(p.totalInstallments, 0) + COALESCE(i.advancePayment, 0)) AS totalPaid,
           r.status AS requestStatus
    FROM dst_invoices i
    LEFT JOIN dst_companies c ON i.companyCode = c.code
    LEFT JOIN (
      SELECT referenceId, SUM(amount) AS totalInstallments 
      FROM dst_payment_history 
      WHERE moduleType = 'CONFIRMATION' 
      GROUP BY referenceId
    ) p ON (i.invoiceNo = p.referenceId OR i.id = p.referenceId)
    LEFT JOIN dst_requests r ON (i.invoiceNo = r.invoiceNo)
    WHERE i.id = ? OR i.invoiceNo = ?
  `, [id, id]);
  if (rows.length > 0) {
    const inv = rows[0];
    inv.agent = cleanAgentName(inv.agent);
    
    const rawAmt = parseFloat(String(inv.amount || '0').replace(/[^0-9.-]/g, '')) || 0;
    const advAmt = parseFloat(String(inv.advancePayment || 0));
    const totalInst = parseFloat(String(inv.totalInstallments || 0));
    const totalPaid = advAmt + totalInst;

    inv.totalPaid = totalPaid;
    inv.totalInstallments = totalInst;
    inv.remainingBalance = Math.max(0, rawAmt - totalPaid);

    // Strict status correction if totalPaid is 0
    const stLower = String(inv.status || '').toLowerCase();
    if (totalPaid === 0 && (stLower.includes('partial') || stLower === 'deposit_paid' || stLower === 'fully_paid')) {
      inv.status = inv.requestStatus === '4/4 Approved' ? 'Approved' : (inv.requestStatus || '0/4 Pending');
    }

    const [items] = await pool.query('SELECT description, qty, price FROM dst_invoice_items WHERE invoiceId = ?', [inv.id]);
    inv.items = items;
    return inv;
  }
  return null;
};

export const savePaymentProofDB = async (invoiceNo, base64Data) => {
  const pool = getPool();
  const [result] = await pool.query('UPDATE dst_invoices SET paymentAttachment = ? WHERE invoiceNo = ? OR id = ?', [base64Data, invoiceNo, invoiceNo]);
  return result.affectedRows > 0;
};

// Payment History Helpers
export const addPaymentHistoryDB = async (paymentData) => {
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Self-healing: Ensure currency and proofUrl columns exist in production table
    try {
      await connection.query("ALTER TABLE dst_payment_history ADD COLUMN currency VARCHAR(10) DEFAULT 'SAR'");
    } catch (e) {}
    try {
      await connection.query("ALTER TABLE dst_payment_history ADD COLUMN proofUrl LONGTEXT DEFAULT NULL");
    } catch (e) {}

    const insertQuery = `
      INSERT INTO dst_payment_history (id, referenceId, moduleType, amount, currency, paymentDate, note, proofUrl, createdBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await connection.query(insertQuery, [
      paymentData.id,
      paymentData.referenceId,
      paymentData.moduleType,
      paymentData.amount,
      paymentData.currency || 'SAR',
      paymentData.paymentDate,
      paymentData.note || null,
      paymentData.proofUrl || null,
      paymentData.createdBy || null
    ]);

    // Recalculate total paid & update remaining balance
    await recalculateInvoiceBalance(connection, paymentData.referenceId);

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getPaymentHistoryDB = async (referenceId, moduleType = 'CONFIRMATION') => {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT * FROM dst_payment_history WHERE referenceId = ? AND moduleType = ? ORDER BY paymentDate DESC, createdAt DESC',
    [referenceId, moduleType]
  );
  return rows;
};

export const recalculateInvoiceBalance = async (connection, referenceId) => {
  const [invoiceRows] = await connection.query('SELECT * FROM dst_invoices WHERE invoiceNo = ? OR id = ?', [referenceId, referenceId]);
  if (invoiceRows.length > 0) {
    const inv = invoiceRows[0];
    const rawAmt = parseFloat(String(inv.amount || '0').replace(/[^0-9.-]/g, '')) || 0;
    const advPayment = parseFloat(inv.advancePayment || 0);

    const [sumRows] = await connection.query(
      "SELECT SUM(amount) AS totalPaid FROM dst_payment_history WHERE referenceId = ? AND moduleType = 'CONFIRMATION'",
      [referenceId]
    );
    const totalInstallments = parseFloat(sumRows[0]?.totalPaid || 0);
    const totalPaid = advPayment + totalInstallments;
    const newRemaining = Math.max(0, rawAmt - totalPaid);

    let newStatus = inv.status;
    if (totalPaid >= rawAmt && rawAmt > 0) {
      newStatus = 'FULLY_PAID';
    } else if (totalPaid > 0) {
      newStatus = totalInstallments > 0 ? 'PARTIAL' : 'DEPOSIT_PAID';
    } else {
      // Total Paid is exactly 0: restore approval status from dst_requests
      const [reqRows] = await connection.query('SELECT status FROM dst_requests WHERE invoiceNo = ?', [inv.invoiceNo]);
      if (reqRows.length > 0 && reqRows[0].status) {
        newStatus = reqRows[0].status === '4/4 Approved' ? 'Approved' : reqRows[0].status;
      } else {
        newStatus = '0/4 Pending';
      }
    }

    await connection.query(
      'UPDATE dst_invoices SET remainingBalance = ?, status = ? WHERE invoiceNo = ? OR id = ?',
      [newRemaining, newStatus, referenceId, referenceId]
    );
  }
};

export const updatePaymentHistoryDB = async (paymentId, paymentData) => {
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    try {
      await connection.query("ALTER TABLE dst_payment_history ADD COLUMN currency VARCHAR(10) DEFAULT 'SAR'");
    } catch (e) {}
    try {
      await connection.query("ALTER TABLE dst_payment_history ADD COLUMN proofUrl LONGTEXT DEFAULT NULL");
    } catch (e) {}

    const [existing] = await connection.query('SELECT referenceId FROM dst_payment_history WHERE id = ?', [paymentId]);
    if (existing.length === 0) {
      throw new Error('Payment record not found');
    }
    const referenceId = existing[0].referenceId;

    await connection.query(
      `UPDATE dst_payment_history 
       SET amount = ?, currency = ?, paymentDate = ?, note = ?, proofUrl = ?
       WHERE id = ?`,
      [
        paymentData.amount,
        paymentData.currency || 'SAR',
        paymentData.paymentDate,
        paymentData.note || null,
        paymentData.proofUrl || null,
        paymentId
      ]
    );

    await recalculateInvoiceBalance(connection, referenceId);

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const deletePaymentHistoryDB = async (paymentId) => {
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existing] = await connection.query('SELECT referenceId FROM dst_payment_history WHERE id = ?', [paymentId]);
    if (existing.length === 0) {
      throw new Error('Payment record not found');
    }
    const referenceId = existing[0].referenceId;

    await connection.query('DELETE FROM dst_payment_history WHERE id = ?', [paymentId]);

    await recalculateInvoiceBalance(connection, referenceId);

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// --- PRIVATE AUDIT LOG ---
export const insertAuditLogDB = async (logData) => {
  const pool = getPool();
  try {
    const insertQuery = `
      INSERT INTO dst_audit_logs (id, user_name, user_email, action_type, entity_type, entity_reference, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await pool.query(insertQuery, [
      `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      logData.user_name || 'System',
      logData.user_email || null,
      logData.action_type,
      logData.entity_type || 'INVOICE',
      logData.entity_reference,
      logData.details ? JSON.stringify(logData.details) : null
    ]);
  } catch (err) {
    console.error('Failed to insert audit log:', err.message);
  }
};

export const getAuditLogsDB = async () => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM dst_audit_logs ORDER BY created_at DESC LIMIT 500');
  return rows;
};
