import { verifyToken } from '../services/tokenService.js';
import { findUserById } from '../models/userModel.js';
import { getPool } from '../config/db.js';

export const protect = async (req, res, next) => {
  let token;

  // Get token from cookies or Authorization header
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route, token missing',
    });
  }

  try {
    // Verify token
    const decoded = verifyToken(token);

    // If token has sessionId, verify it in the database
    if (decoded.sessionId) {
      const pool = getPool();
      const [sessionRows] = await pool.query('SELECT id FROM dst_sessions WHERE id = ?', [decoded.sessionId]);
      if (sessionRows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, session has been revoked',
        });
      }
    }

    // Get user from DB
    const user = await findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists',
      });
    }

    // Attach user to request
    req.user = {
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
      sessionId: decoded.sessionId || null,
      status: user.status,
      lastActive: user.lastActive,
      permissions: user.permissions,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token invalid or expired',
    });
  }
};

// Restrict access to specific roles
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access Denied: Your role (${req.user?.role || 'Guest'}) is not authorized to access this resource.`,
      });
    }
    next();
  };
};

