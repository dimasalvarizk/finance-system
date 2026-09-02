import express from 'express';
import { getInvoices, createInvoice, updateInvoiceStatus, deleteInvoices, cancelInvoice, updateInvoice, uploadPaymentProof, addPaymentHistory, getPaymentHistory, updatePayment, deletePayment, getAuditLogs } from '../controllers/invoiceController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Audit logs route (Highly restricted)
router.get('/audit-logs', getAuditLogs);

// Get is public to all authenticated users, Create is restricted to platform operators (non-Viewers)
router.get('/', getInvoices);
router.post('/', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Accountant', 'Madinah Branch Accountant'), createInvoice);

// Payment History routes
router.get('/:invoiceNo/payments', getPaymentHistory);
router.post('/:invoiceNo/payments', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Accountant', 'Madinah Branch Accountant'), addPaymentHistory);
router.put('/payments/:paymentId', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Accountant', 'Madinah Branch Accountant'), updatePayment);
router.delete('/payments/:paymentId', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Accountant', 'Madinah Branch Accountant'), deletePayment);

// Admin-only route for deleting multiple invoices
router.delete('/', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Madinah Branch Accountant'), deleteInvoices);

// Edit and Cancel invoice routes
router.put('/:id', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Accountant', 'Madinah Branch Accountant'), updateInvoice);
router.put('/:id/cancel', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Accountant', 'Madinah Branch Accountant'), cancelInvoice);

// Only Super Admin, Chief Accountant, Division Director, Accountant, and Madinah Branch Accountant can update invoice statuses
router.put('/:id/status', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Accountant', 'Madinah Branch Accountant'), updateInvoiceStatus);

// Upload payment proof for paid invoices
router.put('/:id/payment-proof', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Accountant', 'Madinah Branch Accountant'), uploadPaymentProof);

export default router;
