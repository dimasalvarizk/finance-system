import express from 'express';
import { login, logout, getMe, getUsers, createUser, updateUser, deleteUser, getSessions, revokeSession, getLoginLogs, getNotifications, markNotificationAsRead, markAllNotificationsAsRead, createNotification, forgotPassword, resetPassword, sendClientInvoice } from '../controllers/authController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import { sendResetPasswordEmail } from '../services/emailService.js';

const router = express.Router();

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

router.get('/test-email', async (req, res) => {
  try {
    const email = req.query.email || 'alvarizkidimas@gmail.com';
    const result = await sendResetPasswordEmail(email, 'Test User', 'https://example.com/reset-password?token=test');
    res.status(200).json({
      success: true,
      message: 'Test email execution finished',
      sentResult: result,
      env: {
        SMTP_HOST: process.env.SMTP_HOST || 'not-set',
        SMTP_PORT: process.env.SMTP_PORT || 'not-set',
        SMTP_USER: process.env.SMTP_USER ? 'configured' : 'not-set',
        SMTP_SECURE: process.env.SMTP_SECURE || 'not-set',
        NODE_ENV: process.env.NODE_ENV || 'not-set'
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
      stack: err.stack
    });
  }
});

// Session management & Login activity routes
router.get('/me/sessions', protect, getSessions);
router.delete('/me/sessions/:id', protect, revokeSession);
router.get('/me/login-logs', protect, getLoginLogs);

// Notification routes
router.get('/me/notifications', protect, getNotifications);
router.put('/me/notifications/:id/read', protect, markNotificationAsRead);
router.put('/me/notifications/read-all', protect, markAllNotificationsAsRead);
router.post('/notifications', createNotification);
router.post('/send-client-invoice', sendClientInvoice);

// User/team member management routes (Super Admin only)
router.get('/users', protect, restrictTo('Super Admin'), getUsers);
router.post('/users', protect, restrictTo('Super Admin'), createUser);
router.put('/users/:id', protect, restrictTo('Super Admin'), updateUser);
router.delete('/users/:id', protect, restrictTo('Super Admin'), deleteUser);

export default router;
