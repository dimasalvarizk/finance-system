import express from 'express';
import { getRequests, createRequest, approveRequest, rejectRequest, checkDownloadPermission, sendInvoiceEmail, updateRequestNote } from '../controllers/requestController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getRequests);
router.post('/', protect, restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Accountant', 'Madinah Branch Accountant'), createRequest);
router.put('/:id/approve', protect, restrictTo('Super Admin', 'Chief Accountant', 'Level_3_Approver', 'Division Director', 'Madinah Branch Accountant'), approveRequest);
router.put('/:id/reject', protect, restrictTo('Super Admin', 'Chief Accountant', 'Level_3_Approver', 'Division Director', 'Madinah Branch Accountant'), rejectRequest);
router.put('/:id/note', protect, restrictTo('Super Admin', 'Chief Accountant', 'Level_3_Approver', 'Division Director', 'Madinah Branch Accountant'), updateRequestNote);
router.get('/:id/download-check', checkDownloadPermission);
router.post('/:id/send-email', protect, restrictTo('Super Admin', 'Chief Accountant', 'Level_3_Approver', 'Division Director', 'Accountant', 'Madinah Branch Accountant'), sendInvoiceEmail);

export default router;
