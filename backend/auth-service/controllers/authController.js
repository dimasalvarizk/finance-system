import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { findUserByEmail, verifyPassword, findUserById, getAllUsersDB, createUserDB, updateUserDB, deleteUserDB, updateLastActiveDB } from '../models/userModel.js';
import { generateToken, sendTokenCookie } from '../services/tokenService.js';
import { getPool } from '../config/db.js';
import { sendNotificationEmail, sendResetPasswordEmail, sendClientInvoiceEmail } from '../services/emailService.js';

const parseUserAgent = (userAgent) => {
  if (!userAgent) return 'Unknown Device';

  let os = 'Unknown OS';
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS') || userAgent.includes('macOS')) os = 'macOS';
  else if (userAgent.includes('iPhone')) os = 'iPhone';
  else if (userAgent.includes('iPad')) os = 'iPad';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('Linux')) os = 'Linux';

  let browser = 'Unknown Browser';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  else if (userAgent.includes('Opera') || userAgent.includes('OPR')) browser = 'Opera';

  return `${browser} on ${os}`;
};

const recordLoginLog = async (email, ip, agentStr, status) => {
  try {
    const pool = getPool();
    const agent = parseUserAgent(agentStr);
    await pool.query(
      'INSERT INTO dst_login_logs (email, ip, agent, status) VALUES (?, ?, ?, ?)',
      [email, ip, agent, status]
    );
  } catch (error) {
    console.error('Failed to record login log:', error.message);
  }
};


// @desc    Authenticate User & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/phone number and password',
      });
    }

    // Find user
    const user = await findUserByEmail(email);
    if (!user) {
      // Record failed log
      const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
      await recordLoginLog(email, ip, req.headers['user-agent'] || '', 'Failed');
      triggerSecurityAlert(email, ip, 'usr_super_admin');
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check password
    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      // Record failed log
      const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
      await recordLoginLog(email, ip, req.headers['user-agent'] || '', 'Failed');
      triggerSecurityAlert(email, ip, user.id);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate Session ID
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const userAgentStr = req.headers['user-agent'] || '';
    const device = parseUserAgent(userAgentStr);

    // Set location as "Jakarta, Indonesia" by default, or "Local Host" if local IP
    const isLocal = ip === '127.0.0.1' || ip === '::1' || ip.includes('192.168.') || ip.includes('10.');
    const location = isLocal ? 'Local Host' : 'Jakarta, Indonesia';

    const pool = getPool();
    await pool.query(
      'INSERT INTO dst_sessions (id, userId, device, ip, location) VALUES (?, ?, ?, ?, ?)',
      [sessionId, user.id, device, ip, location]
    );

    // Check last successful login IP for security alerts (IP Change check)
    try {
      const [lastLoginRows] = await pool.query(
        'SELECT ip FROM dst_login_logs WHERE email = ? AND status = \'Success\' ORDER BY createdAt DESC LIMIT 1',
        [email]
      );
      if (lastLoginRows.length > 0 && lastLoginRows[0].ip !== ip) {
        triggerSecurityAlert(email, ip, user.id, lastLoginRows[0].ip);
      }
    } catch (ipErr) {
      console.error('Failed to run successful login IP change check:', ipErr.message);
    }

    // Record success log
    await recordLoginLog(email, ip, userAgentStr, 'Success');

    // Generate Token with sessionId
    const token = generateToken(user.id, sessionId);

    // Update lastActive status to real-time ISO timestamp on login
    const nowIso = new Date().toISOString();
    await updateLastActiveDB(user.id, nowIso);
    user.lastActive = nowIso;

    // Send Token in cookie
    sendTokenCookie(res, token);

    // Respond with user details (excluding passwordHash)
    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        branch: user.branch,
        phone: user.phone,
        employeeId: user.employeeId,
        department: user.department,
        jobTitle: user.jobTitle,
        avatar: user.avatar,
        sessionId: sessionId,
        status: user.status,
        lastActive: user.lastActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log user out / clear cookie
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res, next) => {
  try {
    if (req.user && req.user.sessionId) {
      const pool = getPool();
      await pool.query('DELETE FROM dst_sessions WHERE id = ?', [req.user.sessionId]);
    }

    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user details
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    // req.user is populated by protect middleware
    const token = req.cookies?.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

    // Update lastActive status to real-time ISO timestamp on authentication request
    if (req.user && req.user.id) {
      const nowIso = new Date().toISOString();
      await updateLastActiveDB(req.user.id, nowIso);
      req.user.lastActive = nowIso;
    }

    res.status(200).json({
      success: true,
      token,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (for team management)
// @route   GET /api/auth/users
// @access  Private
export const getUsers = async (req, res, next) => {
  try {
    const list = await getAllUsersDB();
    res.status(200).json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new user/team member
// @route   POST /api/auth/users
// @access  Private
export const createUser = async (req, res, next) => {
  const { email, name, role, branch, phone, employeeId, department, jobTitle } = req.body;
  try {
    if (!email || !name || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, name, and role'
      });
    }

    const payload = {
      email,
      name,
      role,
      branch,
      phone,
      employeeId,
      department,
      jobTitle,
      status: 'Active',
      lastActive: 'Just now'
    };

    const newUser = await createUserDB(payload);

    // Log Team Member Change notification for admin
    try {
      const pool = getPool();
      const [settingRows] = await pool.query('SELECT settings FROM dst_notification_settings WHERE userId = ?', ['usr_super_admin']);
      let inAppEnabled = true;
      let emailEnabled = true;
      if (settingRows.length > 0) {
        const settings = JSON.parse(settingRows[0].settings);
        if (settings.teamMemberChanges) {
          if (settings.teamMemberChanges.inApp !== undefined) inAppEnabled = settings.teamMemberChanges.inApp;
          if (settings.teamMemberChanges.email !== undefined) emailEnabled = settings.teamMemberChanges.email;
        }
      }

      const title = 'Team member changes';
      const message = `A new team member ${name} (${role}) has been added to the platform.`;

      if (emailEnabled) {
        const [adminRows] = await pool.query('SELECT name, email FROM dst_users WHERE id = ?', ['usr_super_admin']);
        if (adminRows.length > 0) {
          sendNotificationEmail(adminRows[0].email, adminRows[0].name, title, message).catch(err => { });
        }
      }

      if (inAppEnabled) {
        await pool.query(
          'INSERT INTO dst_notifications (userId, type, title, message) VALUES (?, ?, ?, ?)',
          ['usr_super_admin', 'teamMemberChanges', title, message]
        );
      }
    } catch (err) {
      console.error('Failed to log team member change notification:', err.message);
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: newUser
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a user/team member
// @route   PUT /api/auth/users/:id
// @access  Private
export const updateUser = async (req, res, next) => {
  const { id } = req.params;
  const { name, email, role, phone, employeeId, department, jobTitle, status } = req.body;
  try {
    const exists = await findUserById(id);
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: `User not found`
      });
    }

    const payload = {
      name,
      email,
      role,
      phone,
      employeeId,
      department,
      jobTitle,
      status: status || exists.status
    };

    const updated = await updateUserDB(id, payload);
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a user/team member
// @route   DELETE /api/auth/users/:id
// @access  Private
export const deleteUser = async (req, res, next) => {
  const { id } = req.params;
  try {
    // Prevent self-deletion
    if (req.user && req.user.id === id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const exists = await findUserById(id);
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: `User not found`
      });
    }

    await deleteUserDB(id);

    // Log Team Member Change notification for admin
    try {
      const pool = getPool();
      const [settingRows] = await pool.query('SELECT settings FROM dst_notification_settings WHERE userId = ?', ['usr_super_admin']);
      let inAppEnabled = true;
      let emailEnabled = true;
      if (settingRows.length > 0) {
        const settings = JSON.parse(settingRows[0].settings);
        if (settings.teamMemberChanges) {
          if (settings.teamMemberChanges.inApp !== undefined) inAppEnabled = settings.teamMemberChanges.inApp;
          if (settings.teamMemberChanges.email !== undefined) emailEnabled = settings.teamMemberChanges.email;
        }
      }

      const title = 'Team member changes';
      const message = `Team member ${exists.name} (${exists.role}) has been removed from the platform.`;

      if (emailEnabled) {
        const [adminRows] = await pool.query('SELECT name, email FROM dst_users WHERE id = ?', ['usr_super_admin']);
        if (adminRows.length > 0) {
          sendNotificationEmail(adminRows[0].email, adminRows[0].name, title, message).catch(err => { });
        }
      }

      if (inAppEnabled) {
        await pool.query(
          'INSERT INTO dst_notifications (userId, type, title, message) VALUES (?, ?, ?, ?)',
          ['usr_super_admin', 'teamMemberChanges', title, message]
        );
      }
    } catch (err) {
      console.error('Failed to log team member delete notification:', err.message);
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all active sessions for current user
// @route   GET /api/auth/me/sessions
// @access  Private
export const getSessions = async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT id, device, ip, location, createdAt as active FROM dst_sessions WHERE userId = ? ORDER BY createdAt DESC',
      [req.user.id]
    );

    const formattedSessions = rows.map(session => ({
      id: session.id,
      device: session.device,
      ip: session.ip,
      location: session.location,
      active: session.id === req.user.sessionId ? 'Current Session' : `Last active: ${new Date(session.active).toLocaleString()}`,
      isCurrent: session.id === req.user.sessionId
    }));

    res.status(200).json({
      success: true,
      count: formattedSessions.length,
      data: formattedSessions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Revoke an active session
// @route   DELETE /api/auth/me/sessions/:id
// @access  Private
export const revokeSession = async (req, res, next) => {
  const { id } = req.params;
  try {
    const pool = getPool();

    // Check if session exists and belongs to current user
    const [rows] = await pool.query('SELECT id FROM dst_sessions WHERE id = ? AND userId = ?', [id, req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Session not found or not authorized'
      });
    }

    await pool.query('DELETE FROM dst_sessions WHERE id = ?', [id]);

    res.status(200).json({
      success: true,
      message: 'Session revoked successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user's login activity logs
// @route   GET /api/auth/me/login-logs
// @access  Private
export const getLoginLogs = async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT createdAt as timestamp, ip as ip, agent, status FROM dst_login_logs WHERE email = ? ORDER BY createdAt DESC LIMIT 5',
      [req.user.email]
    );

    const formattedLogs = rows.map(log => ({
      timestamp: new Date(log.timestamp).toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }),
      ip: log.ip,
      agent: log.agent,
      status: log.status
    }));

    res.status(200).json({
      success: true,
      count: formattedLogs.length,
      data: formattedLogs
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// NOTIFICATIONS SYSTEM
// ==========================================

const getUiType = (backendType) => {
  if (backendType.includes('Approved') || backendType.includes('Completed') || backendType.includes('Received')) {
    return 'completed';
  }
  if (backendType.includes('Rejected') || backendType.includes('Overdue') || backendType.includes('Alerts') || backendType.includes('Maintenance')) {
    return 'warning';
  }
  return 'request';
};

const getRelativeTime = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
};

const triggerSecurityAlert = async (email, ip, targetUserId = 'usr_super_admin', oldIp = null) => {
  try {
    const pool = getPool();
    const [settingRows] = await pool.query('SELECT settings FROM dst_notification_settings WHERE userId = ?', [targetUserId]);
    let inAppEnabled = true;
    let emailEnabled = true;
    if (settingRows.length > 0) {
      const settings = JSON.parse(settingRows[0].settings);
      if (settings.securityAlerts) {
        if (settings.securityAlerts.inApp !== undefined) inAppEnabled = settings.securityAlerts.inApp;
        if (settings.securityAlerts.email !== undefined) emailEnabled = settings.securityAlerts.email;
      }
    }

    const title = 'Security alerts';
    const message = oldIp
      ? `Successful login detected from IP ${ip} (which is different from your last session IP: ${oldIp}).`
      : `Failed login attempt detected from IP ${ip} for email ${email}.`;

    if (emailEnabled) {
      const [userRows] = await pool.query('SELECT name, email FROM dst_users WHERE id = ?', [targetUserId]);
      if (userRows.length > 0) {
        sendNotificationEmail(userRows[0].email, userRows[0].name, title, message).catch(err => { });
      }
    }

    if (inAppEnabled) {
      await pool.query(
        'INSERT INTO dst_notifications (userId, type, title, message) VALUES (?, ?, ?, ?)',
        [targetUserId, 'securityAlerts', title, message]
      );
    }
  } catch (err) {
    console.error('Failed to trigger security alert notification:', err.message);
  }
};

// @desc    Get current user notifications
// @route   GET /api/auth/me/notifications
// @access  Private
export const getNotifications = async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT id, type, title, message, unread, createdAt FROM dst_notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 20',
      [req.user.id]
    );

    const mappedNotifications = rows.map(r => ({
      id: r.id.toString(),
      type: getUiType(r.type),
      title: r.title,
      message: r.message,
      time: getRelativeTime(r.createdAt),
      unread: !!r.unread
    }));

    res.status(200).json({ success: true, count: mappedNotifications.length, data: mappedNotifications });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a notification as read
// @route   PUT /api/auth/me/notifications/:id/read
// @access  Private
export const markNotificationAsRead = async (req, res, next) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    await pool.query('UPDATE dst_notifications SET unread = FALSE WHERE id = ? AND userId = ?', [id, req.user.id]);
    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all user's notifications as read
// @route   PUT /api/auth/me/notifications/read-all
// @access  Private
export const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const pool = getPool();
    await pool.query('UPDATE dst_notifications SET unread = FALSE WHERE userId = ?', [req.user.id]);
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new notification (called internally or by other services)
// @route   POST /api/auth/notifications
// @access  Public
export const createNotification = async (req, res, next) => {
  const { userId, type, title, message } = req.body;
  try {
    if (!userId || !type || !title || !message) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const pool = getPool();

    let targets = [];
    if (userId === 'all') {
      const [rows] = await pool.query('SELECT id, name, email FROM dst_users');
      targets = rows;
    } else if (userId === 'directors') {
      const [rows] = await pool.query('SELECT id, name, email FROM dst_users WHERE role != "Accountant"');
      targets = rows;
    } else {
      const [rows] = await pool.query('SELECT id, name, email FROM dst_users WHERE id = ?', [userId]);
      targets = rows;
    }

    if (targets.length === 0) {
      return res.status(200).json({ success: true, message: 'No target users found, notification skipped.' });
    }

    for (const target of targets) {
      // Check user preferences first
      const [settingRows] = await pool.query('SELECT settings FROM dst_notification_settings WHERE userId = ?', [target.id]);

      let inAppEnabled = true;
      let emailEnabled = true;
      if (settingRows.length > 0) {
        const settings = JSON.parse(settingRows[0].settings);
        if (settings[type] && settings[type].inApp !== undefined) {
          inAppEnabled = settings[type].inApp;
        }
        if (settings[type] && settings[type].email !== undefined) {
          emailEnabled = settings[type].email;
        }
      }

      // Process Email sending if enabled
      if (emailEnabled) {
        sendNotificationEmail(target.email, target.name, title, message).catch(err => {
          console.error(`Failed to send notification email to ${target.email}:`, err.message);
        });
      }

      if (inAppEnabled) {
        // Insert notification
        await pool.query(
          'INSERT INTO dst_notifications (userId, type, title, message) VALUES (?, ?, ?, ?)',
          [target.id, type, title, message]
        );
      }
    }

    res.status(201).json({ success: true, message: `Notification processed for ${targets.length} user(s)` });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot Password - send secure reset link via email
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address',
      });
    }

    // Find user
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User with this email address does not exist',
      });
    }

    // Generate secure reset token and expiry time (30 minutes)
    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetExpires = Date.now() + 30 * 60 * 1000;

    // Update user token and expiry in database
    const pool = getPool();
    await pool.query(
      'UPDATE dst_users SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE id = ?',
      [resetToken, resetExpires.toString(), user.id]
    );

    // Send email via nodemailer
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    await sendResetPasswordEmail(user.email, user.name, resetUrl);

    res.status(200).json({
      success: true,
      message: 'Password reset link sent to email',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Password using secure token
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res, next) => {
  const { token, password } = req.body;

  try {
    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide token and new password',
      });
    }

    const pool = getPool();
    // Find user with matching token
    const [users] = await pool.query(
      'SELECT id, resetPasswordExpires FROM dst_users WHERE resetPasswordToken = ?',
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token',
      });
    }

    const user = users[0];
    const expiresTime = parseInt(user.resetPasswordExpires);
    if (Date.now() > expiresTime) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token has expired',
      });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Update passwordHash, clear token and expiry
    await pool.query(
      'UPDATE dst_users SET passwordHash = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE id = ?',
      [passwordHash, user.id]
    );

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/auth/send-client-invoice
// @access  Public
export const sendClientInvoice = async (req, res, next) => {
  const { toEmail, invoiceDetails } = req.body;
  try {
    if (!toEmail || !invoiceDetails) {
      return res.status(400).json({ success: false, message: 'Missing required fields toEmail or invoiceDetails' });
    }

    const success = await sendClientInvoiceEmail(toEmail, invoiceDetails);
    if (!success) {
      return res.status(500).json({ success: false, message: 'Failed to send client invoice email via SMTP' });
    }

    res.status(200).json({ success: true, message: 'Client invoice email sent successfully' });
  } catch (error) {
    next(error);
  }
};
