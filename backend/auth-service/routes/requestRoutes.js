import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { downloadRequestInvoice, printRequestInvoice } from '../controllers/requestController.js';

const router = express.Router();

// Enforce auth protection on both endpoints
router.get('/:reqNo/download', protect, downloadRequestInvoice);
router.get('/:reqNo/print', protect, printRequestInvoice);

export default router;
