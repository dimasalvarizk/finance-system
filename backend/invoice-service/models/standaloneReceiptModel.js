import { getPool } from '../config/db.js';

// Generate unique sequential receipt number e.g. REC-DEP-2609-001
export const generateNextReceiptNumber = async (paymentDateStr) => {
  const pool = getPool();
  const dateObj = paymentDateStr ? new Date(paymentDateStr) : new Date();
  const yy = String(dateObj.getFullYear()).slice(-2);
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const prefix = `REC-DEP-${yy}${mm}-`;

  try {
    const [rows] = await pool.query(
      'SELECT receiptNo FROM dst_standalone_receipts WHERE receiptNo LIKE ? ORDER BY receiptNo DESC LIMIT 1',
      [`${prefix}%`]
    );

    let nextSeq = 1;
    if (rows.length > 0 && rows[0].receiptNo) {
      const parts = rows[0].receiptNo.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }
    return `${prefix}${String(nextSeq).padStart(3, '0')}`;
  } catch (err) {
    const fallbackRandom = Math.floor(100 + Math.random() * 900);
    return `${prefix}${fallbackRandom}`;
  }
};

export const createStandaloneReceiptDB = async (data) => {
  const pool = getPool();
  
  const id = data.id || `rec_dep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const receiptNo = data.receiptNo || await generateNextReceiptNumber(data.paymentDate);

  const query = `
    INSERT INTO dst_standalone_receipts (
      id, receiptNo, paymentDate, companyName, companyCode,
      payerAddress, payerTaxNumber, payerEmail, payerAgent,
      payerBankName, payerAccountName, payerAccountNumber,
      ourBankName, ourAccountName, ourAccountNumber, ourBankBranch, ourSwiftCode,
      amount, currency, exchangeRate, paymentMethod,
      forPaymentOf, referenceNo, groupNumber, proofUrl, note, createdBy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    id,
    receiptNo,
    data.paymentDate || new Date(),
    data.companyName || 'General Client',
    data.companyCode || null,
    data.payerAddress || null,
    data.payerTaxNumber || null,
    data.payerEmail || null,
    data.payerAgent || null,
    data.payerBankName || null,
    data.payerAccountName || null,
    data.payerAccountNumber || null,
    data.ourBankName || 'PT Bank Negara Indonesia (Persero) Tbk',
    data.ourAccountName || 'PT ODST AIRLINES INDO',
    data.ourAccountNumber || null,
    data.ourBankBranch || null,
    data.ourSwiftCode || null,
    parseFloat(data.amount) || 0.00,
    (data.currency || 'SAR').toUpperCase(),
    parseFloat(data.exchangeRate) || 1.0000,
    data.paymentMethod || 'Bank Transfer',
    data.forPaymentOf || 'Advance Deposit Payment',
    data.referenceNo || null,
    data.groupNumber || null,
    data.proofUrl || null,
    data.note || null,
    data.createdBy || 'System'
  ];

  await pool.query(query, values);
  return { id, receiptNo, ...data };
};

export const getAllStandaloneReceiptsDB = async () => {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT * FROM dst_standalone_receipts ORDER BY paymentDate DESC, createdAt DESC'
  );
  return rows;
};

export const getStandaloneReceiptByIdDB = async (idOrNo) => {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT * FROM dst_standalone_receipts WHERE id = ? OR receiptNo = ? LIMIT 1',
    [idOrNo, idOrNo]
  );
  return rows.length > 0 ? rows[0] : null;
};

export const deleteStandaloneReceiptDB = async (id) => {
  const pool = getPool();
  const [result] = await pool.query(
    'DELETE FROM dst_standalone_receipts WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
};
