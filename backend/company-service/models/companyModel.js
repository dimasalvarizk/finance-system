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
    INSERT INTO dst_companies (code, name, phone, address, taxNumber)
    VALUES (?, ?, ?, ?, ?)
  `;
  await pool.query(insertQuery, [
    companyData.code.toUpperCase(),
    companyData.name,
    companyData.phone,
    companyData.address,
    companyData.taxNumber
  ]);
  return companyData;
};

export const updateCompanyDB = async (code, companyData) => {
  const pool = getPool();
  const updateQuery = `
    UPDATE dst_companies 
    SET name = ?, phone = ?, address = ?, taxNumber = ? 
    WHERE code = ?
  `;
  await pool.query(updateQuery, [
    companyData.name,
    companyData.phone,
    companyData.address,
    companyData.taxNumber,
    code.toUpperCase()
  ]);
  return { code, ...companyData };
};

export const deleteCompanyDB = async (code) => {
  const pool = getPool();
  await pool.query('DELETE FROM dst_companies WHERE code = ?', [code.toUpperCase()]);
  return { success: true };
};
