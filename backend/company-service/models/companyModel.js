import { getPool } from '../config/db.js';

export const getAllCompaniesDB = async () => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM dst_companies ORDER BY name ASC');
  return rows;
};

export const getCompanyByCodeDB = async (code) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM dst_companies WHERE code = ?', [code]);
  return rows[0];
};

export const createCompanyDB = async (companyData) => {
  const pool = getPool();
  const insertQuery = `
    INSERT INTO dst_companies (code, name, phone, address, taxNumber, agent)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  await pool.query(insertQuery, [
    companyData.code.toUpperCase(),
    companyData.name,
    companyData.phone,
    companyData.address,
    companyData.taxNumber,
    companyData.agent || null
  ]);
  return companyData;
};

export const updateCompanyDB = async (code, companyData) => {
  const pool = getPool();
  const updateQuery = `
    UPDATE dst_companies 
    SET name = ?, phone = ?, address = ?, taxNumber = ?, agent = ? 
    WHERE code = ?
  `;
  await pool.query(updateQuery, [
    companyData.name,
    companyData.phone,
    companyData.address,
    companyData.taxNumber,
    companyData.agent || null,
    code.toUpperCase()
  ]);
  return { code, ...companyData };
};

export const deleteCompanyDB = async (code) => {
  const pool = getPool();
  await pool.query('DELETE FROM dst_companies WHERE code = ?', [code.toUpperCase()]);
  return { success: true };
};

export const updateCompanyCreditDB = async (code, creditAmount, mode = 'add', user = null) => {
  const pool = getPool();
  const upperCode = code.toUpperCase();
  if (mode === 'set') {
    await pool.query('UPDATE dst_companies SET creditBalance = ? WHERE code = ?', [Math.max(0, creditAmount), upperCode]);
  } else {
    await pool.query('UPDATE dst_companies SET creditBalance = creditBalance + ? WHERE code = ?', [creditAmount, upperCode]);
  }

  // Audit log entry for financial governance
  try {
    const actor = user ? (user.name || user.email) : 'System / Auto-Reconcile';
    const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const actionDesc = mode === 'set' && creditAmount === 0
      ? `Reset credit balance to SAR 0.00 for company ${upperCode}`
      : `Updated credit balance by ${creditAmount} (mode: ${mode}) for company ${upperCode}`;
    
    await pool.query(
      `INSERT INTO dst_audit_logs (id, action, module, description, performedBy, createdAt)
       VALUES (?, ?, 'COMPANY', ?, ?, NOW())`,
      [logId, mode === 'set' ? 'RESET_CREDIT' : 'UPDATE_CREDIT', actionDesc, actor]
    );
  } catch (auditErr) {
    console.warn('Audit log entry for credit update failed (non-blocking):', auditErr.message);
  }

  return { success: true };
};
