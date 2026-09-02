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

  // Auto-cancel invoices past due date
  try {
    const todayStr = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    await pool.query(`
      UPDATE dst_invoices 
      SET status = 'Cancelled', rejectionReason = 'Auto-Cancelled: Unpaid past due date'
      WHERE LOWER(status) NOT IN ('paid', 'cancelled', 'archived', 'rejected', 'paid and closed')
        AND dueDate IS NOT NULL 
        AND dueDate != '' 
        AND dueDate < ?
    `, [todayStr]);
  } catch (err) {
    console.error('Failed to auto-cancel overdue invoices:', err);
  }
  
  let query = `
    SELECT i.*, c.agent AS agent 
    FROM dst_invoices i
    LEFT JOIN dst_companies c ON i.companyCode = c.code
    ORDER BY i.createdAt DESC
  `;
  let queryParams = [];
  
  if (createdByFilter) {
    query = `
      SELECT i.*, c.agent AS agent 
      FROM dst_invoices i
      LEFT JOIN dst_companies c ON i.companyCode = c.code
      WHERE i.createdBy = ? OR i.createdBy IS NULL 
      ORDER BY i.createdAt DESC
    `;
    queryParams = [createdByFilter];
  }
  
  const [invoices] = await pool.query(query, queryParams);

  // Fetch items for each invoice
  for (const inv of invoices) {
    inv.agent = cleanAgentName(inv.agent);
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
      INSERT INTO dst_invoices (id, invoiceNo, company, companyCode, referenceNo, serialNo, amount, date, status, usdToIdrRate, sarToIdrRate, dueDate, branch, createdBy, taxRate, currency, advancePayment, remainingBalance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      invoiceData.remainingBalance !== undefined ? invoiceData.remainingBalance : null
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
    SELECT i.*, c.agent AS agent 
    FROM dst_invoices i
    LEFT JOIN dst_companies c ON i.companyCode = c.code
    WHERE i.id = ? OR i.invoiceNo = ?
  `, [id, id]);
  if (rows.length > 0) {
    const inv = rows[0];
    inv.agent = cleanAgentName(inv.agent);
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
    const [invoiceRows] = await connection.query('SELECT * FROM dst_invoices WHERE invoiceNo = ? OR id = ?', [paymentData.referenceId, paymentData.referenceId]);
    if (invoiceRows.length > 0) {
      const inv = invoiceRows[0];
      const rawAmt = parseFloat(String(inv.amount || '0').replace(/[^0-9.-]/g, '')) || 0;
      const advPayment = parseFloat(inv.advancePayment || 0);

      const [sumRows] = await connection.query(
        "SELECT SUM(amount) AS totalPaid FROM dst_payment_history WHERE referenceId = ? AND moduleType = 'CONFIRMATION'",
        [paymentData.referenceId]
      );
      const totalInstallments = parseFloat(sumRows[0].totalPaid || 0);

      const newRemaining = Math.max(0, rawAmt - advPayment - totalInstallments);
      
      let newStatus = inv.status;
      if (newRemaining <= 0) {
        newStatus = 'FULLY_PAID';
      } else if (totalInstallments > 0) {
        newStatus = 'PARTIAL';
      } else if (advPayment > 0) {
        newStatus = 'DEPOSIT_PAID';
      }

      await connection.query(
        'UPDATE dst_invoices SET remainingBalance = ?, status = ? WHERE invoiceNo = ? OR id = ?',
        [newRemaining, newStatus, paymentData.referenceId, paymentData.referenceId]
      );
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

export const getPaymentHistoryDB = async (referenceId, moduleType = 'CONFIRMATION') => {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT * FROM dst_payment_history WHERE referenceId = ? AND moduleType = ? ORDER BY paymentDate DESC, createdAt DESC',
    [referenceId, moduleType]
  );
  return rows;
};

const recalculateInvoiceBalance = async (connection, referenceId) => {
  const [invoiceRows] = await connection.query('SELECT * FROM dst_invoices WHERE invoiceNo = ? OR id = ?', [referenceId, referenceId]);
  if (invoiceRows.length > 0) {
    const inv = invoiceRows[0];
    const rawAmt = parseFloat(String(inv.amount || '0').replace(/[^0-9.-]/g, '')) || 0;
    const advPayment = parseFloat(inv.advancePayment || 0);

    const [sumRows] = await connection.query(
      "SELECT SUM(amount) AS totalPaid FROM dst_payment_history WHERE referenceId = ? AND moduleType = 'CONFIRMATION'",
      [referenceId]
    );
    const totalInstallments = parseFloat(sumRows[0].totalPaid || 0);
    const newRemaining = Math.max(0, rawAmt - advPayment - totalInstallments);

    let newStatus = inv.status;
    if (newRemaining <= 0) {
      newStatus = 'FULLY_PAID';
    } else if (totalInstallments > 0) {
      newStatus = 'PARTIAL';
    } else if (advPayment > 0) {
      newStatus = 'DEPOSIT_PAID';
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
