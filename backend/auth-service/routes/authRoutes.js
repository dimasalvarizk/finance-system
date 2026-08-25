import express from 'express';
import { login, logout, getMe, getUsers, createUser, updateUser, deleteUser, getSessions, revokeSession, getLoginLogs, getNotifications, markNotificationAsRead, markAllNotificationsAsRead, createNotification, forgotPassword, resetPassword, sendClientInvoice } from '../controllers/authController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

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
