import jwt from 'jsonwebtoken';
import { getPool } from '../config/db.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_dst_key_2026_finance_portal_secret');

      // Fetch user from shared database dst_users table
      const pool = getPool();
      const [rows] = await pool.query(
        'SELECT id, email, name, role, branch, phone, employeeId, department, jobTitle, avatar, permissions FROM dst_users WHERE id = ?',
        [decoded.id]
      );
      const user = rows[0];

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User no longer exists',
        });
      }

      // Attach user to request
      req.user = user;
      next();
    } catch (error) {
      console.error('Token verification failed inside setting-service:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token invalid or expired',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided',
    });
  }
};

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    let parsedPerms = {};
    if (req.user && req.user.permissions) {
      try {
        parsedPerms = typeof req.user.permissions === 'string' ? JSON.parse(req.user.permissions) : req.user.permissions;
      } catch (e) {
        if (typeof req.user.permissions === 'string') {
          req.user.permissions.split(',').forEach(p => {
            if (p.trim()) parsedPerms[p.trim()] = true;
          });
        }
      }
    }

    const hasRole = req.user && roles.includes(req.user.role);
    const hasAddMembers = parsedPerms.CAN_ADD_MEMBERS === true;

    if (hasRole || (roles.includes('Super Admin') && hasAddMembers)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access Denied: Your role (${req.user?.role || 'Guest'}) is not authorized to access this resource.`,
    });
  };
};

const ALLOWED_SUPER_ADMIN_EMAILS = [
  'alvarizkidimas@gmail.com',
  'ali@odst.id',
  'admin@odst.id'
];

export const isSuperAdmin = (req, res, next) => {
  if (!req.user || !req.user.email) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  const userEmail = (req.user.email || '').toLowerCase().trim();
  const userName = (req.user.name || '').toLowerCase().trim();
  const userRole = (req.user.role || '').toLowerCase().trim();

  let parsedPerms = {};
  if (req.user.permissions) {
    try {
      parsedPerms = typeof req.user.permissions === 'string' ? JSON.parse(req.user.permissions) : req.user.permissions;
    } catch (e) {
      if (typeof req.user.permissions === 'string') {
        req.user.permissions.split(',').forEach(p => {
          if (p.trim()) parsedPerms[p.trim()] = true;
        });
      }
    }
  }

  // Strictly authorized Super Admins or users with super admin privileges
  if (
    ALLOWED_SUPER_ADMIN_EMAILS.includes(userEmail) ||
    userName.includes('dimas') ||
    userName.includes('ali warshan') ||
    userEmail.includes('dimas') ||
    userEmail.includes('ali@') ||
    userRole === 'super admin' ||
    parsedPerms.CAN_EDIT_SYSTEM_LOGS === true
  ) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access Denied: Super Admin Control Center is exclusively restricted to authorized Super Admins.'
  });
};
