import bcrypt from 'bcryptjs';
import { getPool } from '../config/db.js';

export const findUserByEmail = async (email) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM dst_users WHERE email = ?', [email]);
  return rows[0] || null;
};

export const findUserById = async (id) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM dst_users WHERE id = ?', [id]);
  return rows[0] || null;
};

export const verifyPassword = async (inputPassword, userPasswordHash) => {
  return await bcrypt.compare(inputPassword, userPasswordHash);
};

export const getAllUsersDB = async () => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT id, email, name, role, branch, phone, employeeId, department, jobTitle, status, lastActive FROM dst_users ORDER BY name ASC');
  return rows;
};

export const createUserDB = async (userData) => {
  const pool = getPool();
  const id = `usr_${Date.now()}`;
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(userData.password || 'password123', salt);

  const insertQuery = `
    INSERT INTO dst_users (id, email, passwordHash, name, role, branch, phone, employeeId, department, jobTitle, status, lastActive)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await pool.query(insertQuery, [
    id,
    userData.email,
    passwordHash,
    userData.name,
    userData.role,
    userData.branch || null,
    userData.phone,
    userData.employeeId,
    userData.department,
    userData.jobTitle,
    userData.status || 'Active',
    userData.lastActive || 'Just now'
  ]);

  return { id, ...userData };
};

export const updateUserDB = async (id, userData) => {
  const pool = getPool();
  const updateQuery = `
    UPDATE dst_users 
    SET name = ?, email = ?, role = ?, phone = ?, employeeId = ?, department = ?, jobTitle = ?, status = ?
    WHERE id = ?
  `;
  await pool.query(updateQuery, [
    userData.name,
    userData.email,
    userData.role,
    userData.phone,
    userData.employeeId,
    userData.department,
    userData.jobTitle,
    userData.status,
    id
  ]);
  return { id, ...userData };
};

export const deleteUserDB = async (id) => {
  const pool = getPool();
  await pool.query('DELETE FROM dst_users WHERE id = ?', [id]);
  return { success: true };
};

export const updateLastActiveDB = async (id, statusText) => {
  const pool = getPool();
  const val = statusText || new Date().toISOString();
  await pool.query('UPDATE dst_users SET lastActive = ? WHERE id = ?', [val, id]);
};
