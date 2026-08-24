import bcrypt from 'bcrypt';
import { getPool } from '../config/db.js';

// ==========================================
// 1. MANAGE TEAM (dst_users CRUD)
// ==========================================
export const getTeam = async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT id, name, email, phone, employeeId, role, branch, department, jobTitle, status, lastActive FROM dst_users ORDER BY name ASC');
    res.status(200).json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    next(error);
  }
};

export const createTeam = async (req, res, next) => {
  const { name, email, phone, employeeId, role, branch, department, jobTitle } = req.body;
  try {
    if (!name || !email || !role || !branch) {
      return res.status(400).json({ success: false, message: 'Required fields: name, email, role, branch' });
    }

    const pool = getPool();
    // Check if email already exists
    const [exists] = await pool.query('SELECT id FROM dst_users WHERE email = ?', [email]);
    if (exists.length > 0) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    // Default password for new members is password123
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);
    const id = `usr_${Math.random().toString(36).substr(2, 9)}`;
    const empId = employeeId || `EMP-${Math.floor(100 + Math.random() * 900)}`;

    const insertQuery = `
      INSERT INTO dst_users (id, email, passwordHash, name, role, branch, phone, employeeId, department, jobTitle, status, lastActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', 'Just added')
    `;

    await pool.query(insertQuery, [
      id, email, passwordHash, name, role, branch, phone || '', empId, department || '', jobTitle || ''
    ]);

    // Automatically increment the branch teamCount in the database when a new member is added and assigned to it
    if (branch) {
      await pool.query('UPDATE dst_branches SET teamCount = teamCount + 1 WHERE name = ?', [branch]);
    }

    const newUser = {
      id, email, name, role, branch, phone, employeeId: empId, department, jobTitle, status: 'Active', lastActive: 'Just added'
    };

    res.status(201).json({ success: true, message: 'Team member added successfully', data: newUser });
  } catch (error) {
    next(error);
  }
};

export const updateTeam = async (req, res, next) => {
  const { id } = req.params;
  const { name, phone, role, branch, department, jobTitle } = req.body;
  try {
    const pool = getPool();
    // Get old branch of the user first to check if the branch changed
    const [oldUserRows] = await pool.query('SELECT branch FROM dst_users WHERE id = ?', [id]);
    const oldBranch = oldUserRows[0]?.branch;

    const updateQuery = `
      UPDATE dst_users 
      SET name = ?, phone = ?, role = ?, branch = ?, department = ?, jobTitle = ?
      WHERE id = ?
    `;

    await pool.query(updateQuery, [name, phone, role, branch, department, jobTitle, id]);

    // Update branch teamCount in the database if branch changed
    if (branch !== oldBranch) {
      if (oldBranch) {
        await pool.query('UPDATE dst_branches SET teamCount = GREATEST(0, teamCount - 1) WHERE name = ?', [oldBranch]);
      }
      if (branch) {
        await pool.query('UPDATE dst_branches SET teamCount = teamCount + 1 WHERE name = ?', [branch]);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Team member updated successfully',
      data: { id, name, phone, role, branch, department, jobTitle }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTeam = async (req, res, next) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    // Get branch of the user first to decrement count
    const [userRows] = await pool.query('SELECT branch FROM dst_users WHERE id = ?', [id]);
    const userBranch = userRows[0]?.branch;

    await pool.query('DELETE FROM dst_users WHERE id = ?', [id]);

    // Decrement the branch teamCount in the database
    if (userBranch) {
      await pool.query('UPDATE dst_branches SET teamCount = GREATEST(0, teamCount - 1) WHERE name = ?', [userBranch]);
    }

    res.status(200).json({ success: true, message: 'Team member removed successfully' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. BRANCHES (dst_branches CRUD)
// ==========================================
export const getBranches = async (req, res, next) => {
  try {
    const pool = getPool();
    const [branches] = await pool.query('SELECT id, name, address, phone, country, teamCount FROM dst_branches ORDER BY name ASC');
    res.status(200).json({ success: true, count: branches.length, data: branches });
  } catch (error) {
    next(error);
  }
};

export const createBranch = async (req, res, next) => {
  const { name, address, phone, country, teamCount } = req.body;
  try {
    if (!name || !address) {
      return res.status(400).json({ success: false, message: 'Name and Address are required' });
    }
    const pool = getPool();
    const finalTeamCount = typeof teamCount === 'number' ? teamCount : parseInt(teamCount) || 0;
    const [result] = await pool.query(
      'INSERT INTO dst_branches (name, address, phone, country, teamCount) VALUES (?, ?, ?, ?, ?)',
      [name, address, phone || '', country || 'Indonesia', finalTeamCount]
    );

    const newBranch = { id: result.insertId.toString(), name, address, phone, country, teamCount: finalTeamCount };
    res.status(201).json({ success: true, message: 'Branch created successfully', data: newBranch });
  } catch (error) {
    next(error);
  }
};

export const updateBranch = async (req, res, next) => {
  const { id } = req.params;
  const { name, address, phone, country, teamCount } = req.body;
  try {
    const pool = getPool();
    const finalTeamCount = typeof teamCount === 'number' ? teamCount : parseInt(teamCount) || 0;
    const [result] = await pool.query(
      'UPDATE dst_branches SET name = ?, address = ?, phone = ?, country = ?, teamCount = ? WHERE id = ?',
      [name, address, phone || '', country || 'Indonesia', finalTeamCount, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }
    res.status(200).json({ success: true, message: 'Branch updated successfully', data: { id, name, address, phone, country, teamCount: finalTeamCount } });
  } catch (error) {
    next(error);
  }
};

export const deleteBranch = async (req, res, next) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    const [result] = await pool.query('DELETE FROM dst_branches WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }
    res.status(200).json({ success: true, message: 'Branch deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. NOTIFICATIONS
// ==========================================
const DEFAULT_NOTIF_SETTINGS = {
  newInvoiceSubmitted: { email: true, inApp: true },
  invoiceApproved: { email: true, inApp: true },
  invoiceRejected: { email: true, inApp: true },
  paymentReceived: { email: false, inApp: true },
  approvalRequestAssigned: { email: true, inApp: true },
  approvalCompleted: { email: false, inApp: true },
  approvalOverdue: { email: true, inApp: true },
  securityAlerts: { email: true, inApp: true },
  teamMemberChanges: { email: true, inApp: false },
  systemMaintenance: { email: false, inApp: true },
};

export const getNotif = async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT settings FROM dst_notification_settings WHERE userId = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.status(200).json({ success: true, data: DEFAULT_NOTIF_SETTINGS });
    }
    res.status(200).json({ success: true, data: JSON.parse(rows[0].settings) });
  } catch (error) {
    next(error);
  }
};

export const updateNotif = async (req, res, next) => {
  try {
    const pool = getPool();
    const settingsStr = JSON.stringify(req.body);
    await pool.query(
      'INSERT INTO dst_notification_settings (userId, settings) VALUES (?, ?) ON DUPLICATE KEY UPDATE settings = ?',
      [req.user.id, settingsStr, settingsStr]
    );
    res.status(200).json({ success: true, message: 'Notification settings updated', data: req.body });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. EDIT PROFILE (Current User Profile Update)
// ==========================================
export const updateProfile = async (req, res, next) => {
  const { name, phone, avatar } = req.body;
  try {
    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    const pool = getPool();
    if (avatar !== undefined) {
      await pool.query('UPDATE dst_users SET name = ?, phone = ?, avatar = ? WHERE id = ?', [name, phone || '', avatar, req.user.id]);
    } else {
      await pool.query('UPDATE dst_users SET name = ?, phone = ? WHERE id = ?', [name, phone || '', req.user.id]);
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { ...req.user, name, phone, avatar }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. SECURITY (Change Password)
// ==========================================
export const updatePassword = async (req, res, next) => {
  const { currPassword, newPassword } = req.body;
  try {
    if (!currPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and New password are required' });
    }

    const pool = getPool();
    // Retrieve passwordHash from db
    const [rows] = await pool.query('SELECT passwordHash FROM dst_users WHERE id = ?', [req.user.id]);
    const user = rows[0];

    // Verify current password
    const isMatch = await bcrypt.compare(currPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    // Hash new password and update
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    await pool.query('UPDATE dst_users SET passwordHash = ? WHERE id = ?', [newHash, req.user.id]);

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 6. DAILY EXCHANGE RATES
// ==========================================
export const getExchangeRates = async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT usdToIdr, sarToIdr, usdToSar FROM dst_exchange_rates WHERE id = ?', ['current']);
    if (rows.length === 0) {
      return res.status(200).json({ success: true, data: { usdToIdr: '17,250', sarToIdr: '4,333', usdToSar: '3.75' } });
    }
    res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

export const updateExchangeRates = async (req, res, next) => {
  const { usdToIdr, sarToIdr, usdToSar } = req.body;
  try {
    const pool = getPool();
    await pool.query(
      'INSERT INTO dst_exchange_rates (id, usdToIdr, sarToIdr, usdToSar) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE usdToIdr = ?, sarToIdr = ?, usdToSar = ?',
      ['current', usdToIdr, sarToIdr, usdToSar, usdToIdr, sarToIdr, usdToSar]
    );

    // Save to audit log/history table with user who made the change
    const updatedBy = req.user?.name || 'System';
    await pool.query(
      'INSERT INTO dst_exchange_rates_history (usdToIdr, sarToIdr, usdToSar, updatedBy) VALUES (?, ?, ?, ?)',
      [usdToIdr, sarToIdr, usdToSar, updatedBy]
    );

    res.status(200).json({ success: true, message: 'Exchange rates updated', data: req.body });
  } catch (error) {
    next(error);
  }
};

export const getExchangeRatesHistory = async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT usdToIdr, sarToIdr, usdToSar, updatedBy, createdAt as date FROM dst_exchange_rates_history ORDER BY createdAt DESC LIMIT 10'
    );

    const formattedHistory = rows.map(r => ({
      date: new Date(r.date).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      }),
      usdIdr: r.usdToIdr,
      sarIdr: r.sarToIdr,
      usdSar: r.usdToSar,
      user: r.updatedBy
    }));

    res.status(200).json({ success: true, count: formattedHistory.length, data: formattedHistory });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 7. SERVICES (dst_services CRUD)
// ==========================================
export const getServices = async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM dst_services ORDER BY name ASC');
    // Map numerical price to float
    const mapped = rows.map(r => ({ ...r, price: parseFloat(r.price) }));
    res.status(200).json({ success: true, count: mapped.length, data: mapped });
  } catch (error) {
    next(error);
  }
};

export const createService = async (req, res, next) => {
  const { name, price, status } = req.body;
  try {
    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: 'Service name and price are required' });
    }
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO dst_services (name, price, status) VALUES (?, ?, ?)',
      [name, parseFloat(price), status || 'Active']
    );

    const newService = { id: result.insertId.toString(), name, price: parseFloat(price), status: status || 'Active' };
    res.status(201).json({ success: true, message: 'Service created successfully', data: newService });
  } catch (error) {
    next(error);
  }
};

export const updateService = async (req, res, next) => {
  const { id } = req.params;
  const { name, price, status } = req.body;
  try {
    const pool = getPool();
    const [result] = await pool.query(
      'UPDATE dst_services SET name = ?, price = ?, status = ? WHERE id = ?',
      [name, parseFloat(price), status, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    res.status(200).json({ success: true, message: 'Service updated successfully', data: { id, name, price: parseFloat(price), status } });
  } catch (error) {
    next(error);
  }
};

export const deleteService = async (req, res, next) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    const [result] = await pool.query('DELETE FROM dst_services WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    res.status(200).json({ success: true, message: 'Service deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 8. TAX SETTINGS (dst_tax_settings)
// ==========================================
export const getTaxSetting = async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT taxPercentage FROM dst_tax_settings WHERE id = ?', ['current']);
    res.status(200).json({
      success: true,
      data: rows[0] || { taxPercentage: '0.00' }
    });
  } catch (error) {
    next(error);
  }
};

export const updateTaxSetting = async (req, res, next) => {
  const { taxPercentage } = req.body;
  try {
    const pool = getPool();
    await pool.query('UPDATE dst_tax_settings SET taxPercentage = ? WHERE id = ?', [taxPercentage, 'current']);
    res.status(200).json({
      success: true,
      data: { taxPercentage }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 9. COMPANY SETTINGS (dst_company_settings)
// ==========================================
export const getCompanySetting = async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT phone, taxNumber, defaultNotes, termsAndConditions FROM dst_company_settings WHERE id = ?', ['current']);
    res.status(200).json({
      success: true,
      data: rows[0] || {
        phone: '+62 856 9332 3122',
        taxNumber: '0000-0000-0000',
        defaultNotes: '',
        termsAndConditions: ''
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateCompanySetting = async (req, res, next) => {
  const { phone, taxNumber, defaultNotes, termsAndConditions } = req.body;
  try {
    const pool = getPool();
    const updates = [];
    const params = [];
    
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone);
    }
    if (taxNumber !== undefined) {
      updates.push('taxNumber = ?');
      params.push(taxNumber);
    }
    if (defaultNotes !== undefined) {
      updates.push('defaultNotes = ?');
      params.push(defaultNotes);
    }
    if (termsAndConditions !== undefined) {
      updates.push('termsAndConditions = ?');
      params.push(termsAndConditions);
    }
    
    if (updates.length > 0) {
      params.push('current');
      await pool.query(`UPDATE dst_company_settings SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    
    const [rows] = await pool.query('SELECT phone, taxNumber, defaultNotes, termsAndConditions FROM dst_company_settings WHERE id = ?', ['current']);
    res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
};
