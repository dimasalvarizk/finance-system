import { getPool } from '../config/db.js';

export const createExpenseInDB = async (data) => {
  const pool = getPool();
  const query = `
    INSERT INTO dst_corporate_expenses (
      id, claimId, projectRef, category, currency, amount, expenseDate,
      description, bankName, bankAccountNumber, bankAccountHolder,
      submittedById, submittedByName, submittedByEmail, department,
      status, receiptsCount, receipts, approvalTimeline, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    data.id,
    data.claimId,
    data.projectRef || null,
    data.category,
    data.currency || 'RP',
    data.amount,
    data.expenseDate,
    data.description,
    data.bankName || null,
    data.bankAccountNumber || null,
    data.bankAccountHolder || null,
    data.submittedById || null,
    data.submittedByName,
    data.submittedByEmail || null,
    data.department || 'Operations',
    data.status || 'Pending',
    data.receiptsCount || 0,
    typeof data.receipts === 'string' ? data.receipts : JSON.stringify(data.receipts || []),
    typeof data.approvalTimeline === 'string' ? data.approvalTimeline : JSON.stringify(data.approvalTimeline || []),
    data.notes || null
  ];

  await pool.query(query, values);
  return getExpenseByIdFromDB(data.id);
};

export const getAllExpensesFromDB = async (filters = {}) => {
  const pool = getPool();
  let query = 'SELECT * FROM dst_corporate_expenses WHERE 1=1';
  const params = [];

  if (filters.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }

  if (filters.category) {
    query += ' AND category = ?';
    params.push(filters.category);
  }

  if (filters.currency) {
    query += ' AND currency = ?';
    params.push(filters.currency);
  }

  if (filters.search) {
    const s = `%${filters.search}%`;
    query += ` AND (
      claimId LIKE ? OR
      projectRef LIKE ? OR
      description LIKE ? OR
      submittedByName LIKE ? OR
      department LIKE ? OR
      bankName LIKE ?
    )`;
    params.push(s, s, s, s, s, s);
  }

  query += ' ORDER BY createdAt DESC';

  const [rows] = await pool.query(query, params);
  return rows.map(formatExpenseRow);
};

export const getExpensesByUserFromDB = async (userId, userName) => {
  const pool = getPool();
  let query = 'SELECT * FROM dst_corporate_expenses WHERE 1=1';
  const params = [];

  if (userId && userName) {
    query += ' AND (submittedById = ? OR submittedByName = ?)';
    params.push(userId, userName);
  } else if (userId) {
    query += ' AND submittedById = ?';
    params.push(userId);
  } else if (userName) {
    query += ' AND submittedByName = ?';
    params.push(userName);
  }

  query += ' ORDER BY createdAt DESC';

  const [rows] = await pool.query(query, params);
  return rows.map(formatExpenseRow);
};

export const getExpenseByIdFromDB = async (id) => {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT * FROM dst_corporate_expenses WHERE id = ? OR claimId = ? LIMIT 1',
    [id, id]
  );
  if (!rows || rows.length === 0) return null;
  return formatExpenseRow(rows[0]);
};

export const updateExpenseInDB = async (id, updateData) => {
  const pool = getPool();
  const allowedFields = [
    'status', 'rejectionReason', 'disbursementMethod',
    'disbursementRef', 'disbursedAt', 'payrollPeriod',
    'approvalTimeline', 'notes', 'bankName', 'bankAccountNumber',
    'bankAccountHolder'
  ];

  const setClauses = [];
  const values = [];

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      setClauses.push(`${field} = ?`);
      let val = updateData[field];
      if (typeof val === 'object' && val !== null) {
        val = JSON.stringify(val);
      }
      values.push(val);
    }
  }

  if (setClauses.length === 0) return getExpenseByIdFromDB(id);

  values.push(id, id);
  const query = `UPDATE dst_corporate_expenses SET ${setClauses.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ? OR claimId = ?`;

  await pool.query(query, values);
  return getExpenseByIdFromDB(id);
};

export const bulkUpdateExpensesInDB = async (ids, updateData) => {
  const pool = getPool();
  if (!ids || ids.length === 0) return 0;

  const placeholders = ids.map(() => '?').join(', ');
  const setClauses = [];
  const values = [];

  const allowedFields = [
    'status', 'disbursementMethod', 'disbursementRef',
    'disbursedAt', 'payrollPeriod'
  ];

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      setClauses.push(`${field} = ?`);
      values.push(updateData[field]);
    }
  }

  if (setClauses.length === 0) return 0;

  const query = `UPDATE dst_corporate_expenses SET ${setClauses.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id IN (${placeholders}) OR claimId IN (${placeholders})`;

  const [result] = await pool.query(query, [...values, ...ids, ...ids]);
  return result.affectedRows;
};

export const deleteExpenseFromDB = async (id) => {
  const pool = getPool();
  const [result] = await pool.query(
    'DELETE FROM dst_corporate_expenses WHERE id = ? OR claimId = ?',
    [id, id]
  );
  return result.affectedRows > 0;
};

export const getExpenseStatsFromDB = async () => {
  const pool = getPool();
  const [rows] = await pool.query(`
    SELECT
      COUNT(*) as totalClaims,
      SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pendingCount,
      SUM(CASE WHEN status = 'Ready for Payment' THEN 1 ELSE 0 END) as readyForPaymentCount,
      SUM(CASE WHEN status = 'Paid' OR status = 'Approved' THEN 1 ELSE 0 END) as approvedPaidCount,
      SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejectedCount,
      SUM(amount) as totalAmountSum
    FROM dst_corporate_expenses
  `);
  return rows[0] || {};
};

function formatExpenseRow(row) {
  if (!row) return null;
  const receipts = typeof row.receipts === 'string' ? safeJsonParse(row.receipts, []) : (row.receipts || []);
  const rawTimeline = typeof row.approvalTimeline === 'string' ? safeJsonParse(row.approvalTimeline, []) : (row.approvalTimeline || []);

  // Deduplicate duplicate timeline steps (e.g. repeated settlement steps)
  const approvalTimeline = [];
  const seenSettlement = new Set();
  for (const step of rawTimeline) {
    const isSettlement = (step.step || '').toLowerCase().includes('settlement completed');
    if (isSettlement) {
      if (!seenSettlement.has('settlement')) {
        seenSettlement.add('settlement');
        approvalTimeline.push(step);
      }
    } else {
      approvalTimeline.push(step);
    }
  }

  let cleanNotes = row.notes;
  if (cleanNotes && cleanNotes.includes('Settle Code:')) {
    const parts = cleanNotes.split(/\|\s*Settle Code:/i);
    const base = parts[0].trim();
    const lastPart = parts[parts.length - 1].trim();
    const codeMatch = lastPart.match(/(SETTLE-[A-Z0-9-]+)/i);
    const lastCode = codeMatch ? codeMatch[1] : lastPart;
    cleanNotes = base ? `${base} | Settle Code: ${lastCode}` : `Settle Code: ${lastCode}`;
  }

  let formattedDate = row.expenseDate;
  if (row.expenseDate && !isNaN(Date.parse(row.expenseDate))) {
    try {
      formattedDate = new Date(row.expenseDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    } catch {
      formattedDate = row.expenseDate;
    }
  }

  return {
    ...row,
    notes: cleanNotes,
    reason: row.description || row.reason || '',
    submitDate: formattedDate || (row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'N/A'),
    submittedBy: row.submittedByName || row.submittedBy || 'Administrator',
    amount: parseFloat(row.amount) || 0,
    receiptsCount: row.receiptsCount !== undefined ? row.receiptsCount : (receipts ? receipts.length : 0),
    receiptName: receipts[0]?.name || undefined,
    receipts,
    approvalTimeline
  };
}

function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}
