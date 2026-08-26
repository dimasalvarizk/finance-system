import express from 'express';
import { getInvoices, createInvoice, updateInvoiceStatus, deleteInvoices, cancelInvoice, updateInvoice, uploadPaymentProof } from '../controllers/invoiceController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get and Create are public to all authenticated users
router.get('/', getInvoices);
router.post('/', createInvoice);

// Admin-only route for deleting multiple invoices
router.delete('/', restrictTo('Super Admin', 'Chief Accountant', 'Division Director'), deleteInvoices);

// Edit and Cancel invoice routes
router.put('/:id', updateInvoice);
router.put('/:id/cancel', cancelInvoice);

// Only Super Admin, Chief Accountant, Division Director, Accountant, and Madinah Branch Accountant can update invoice statuses
router.put('/:id/status', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Accountant', 'Madinah Branch Accountant'), updateInvoiceStatus);

// Upload payment proof for paid invoices
router.put('/:id/payment-proof', uploadPaymentProof);

export default router;
