import express from 'express';
import {
  getReservations,
  createReservation,
  approveReservation,
  updateStatus,
  deleteReservation,
  addHotelPaymentHistory,
  getHotelPaymentHistory,
  sendReservationConfirmationEmail
} from '../controllers/hotelReservationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require auth token
router.use(protect);

router.get('/', getReservations);
router.post('/', createReservation);
router.get('/:id/payments', getHotelPaymentHistory);
router.post('/:id/payments', addHotelPaymentHistory);
router.post('/:id/send-email', sendReservationConfirmationEmail);
router.put('/:id/approve', approveReservation);
router.put('/:id/status', updateStatus);
router.delete('/:id', deleteReservation);

export default router;

