import { getPool } from '../config/db.js';

// Get all invoices (optionally filtered by createdBy for Accountant)
export const getAllInvoicesDB = async (createdByFilter = null) => {
  const pool = getPool();
  
  let query = 'SELECT * FROM dst_invoices ORDER BY createdAt DESC';
  let queryParams = [];
  
  if (createdByFilter) {
    query = 'SELECT * FROM dst_invoices WHERE createdBy = ? OR createdBy IS NULL ORDER BY createdAt DESC';
    queryParams = [createdByFilter];
  }
  
  const [invoices] = await pool.query(query, queryParams);

  // Fetch items for each invoice
  for (const inv of invoices) {
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
      INSERT INTO dst_invoices (id, invoiceNo, company, companyCode, referenceNo, serialNo, amount, date, status, usdToIdrRate, sarToIdrRate, dueDate, branch, createdBy, taxRate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      invoiceData.usdToIdrRate || 16250.00,
      invoiceData.sarToIdrRate || 4333.00,
      invoiceData.dueDate,
      invoiceData.branch || null,
      invoiceData.createdBy || null,
      invoiceData.taxRate || 0.00
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
      SET company = ?, companyCode = ?, referenceNo = ?, serialNo = ?, amount = ?, date = ?, status = '0/3 Pending', usdToIdrRate = ?, sarToIdrRate = ?, dueDate = ?, taxRate = ?
      WHERE id = ? OR invoiceNo = ?
    `;
    await connection.query(updateQuery, [
      data.company,
      data.companyCode,
      data.referenceNo,
      data.serialNo,
      data.amount,
      data.date,
      data.usdToIdrRate || 16250.00,
      data.sarToIdrRate || 4333.00,
      data.dueDate,
      data.taxRate || 0.00,
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
      SET status = '0/3 Pending', amount = ?, company = ?, companyCode = ?, level1ApprovedAt = NULL, level2ApprovedAt = NULL, level3ApprovedAt = NULL, rejectionReason = NULL
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
  const [rows] = await pool.query('SELECT * FROM dst_invoices WHERE id = ? OR invoiceNo = ?', [id, id]);
  return rows[0] || null;
};
