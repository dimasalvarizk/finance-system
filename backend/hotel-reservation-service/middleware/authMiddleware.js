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
        'SELECT id, email, name, role, branch, phone, employeeId, department, jobTitle, avatar FROM dst_users WHERE id = ?',
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
      console.error('Token verification failed inside hotel-reservation-service:', error.message);
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
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access Denied: Your role (${req.user?.role || 'Guest'}) is not authorized to access this resource.`,
      });
    }
    next();
  };
};
