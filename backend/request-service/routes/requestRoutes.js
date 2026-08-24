import express from 'express';
import { getRequests, createRequest, approveRequest, rejectRequest, checkDownloadPermission, sendInvoiceEmail } from '../controllers/requestController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getRequests);
router.post('/', protect, createRequest);
router.put('/:id/approve', protect, approveRequest);
router.put('/:id/reject', protect, rejectRequest);
router.get('/:id/download-check', checkDownloadPermission);
router.post('/:id/send-email', protect, sendInvoiceEmail);

export default router;
