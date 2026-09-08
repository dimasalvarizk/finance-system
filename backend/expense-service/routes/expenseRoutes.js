import express from 'express';
import {
  submitExpense,
  getExpenses,
  getMyExpenses,
  getExpenseById,
  updateExpenseStatus,
  bulkAction,
  deleteExpense,
  getCategories,
  getStats,
  executeSettlement,
  inquireBankAccount
} from '../controllers/expenseController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public / Pre-defined data
router.get('/categories', getCategories);
router.get('/stats', optionalAuth, getStats);

// Bank Account Inquiry & Verification via SNAP BI
router.post('/account-inquiry', optionalAuth, inquireBankAccount);

// Claim Submission (Supports optionalAuth or protect so authenticated user info is captured)
router.post('/', optionalAuth, submitExpense);

// Get my claims
router.get('/my-claims', protect, getMyExpenses);

// Bulk actions (e.g. payroll, bank transfer, delete)
router.post('/bulk-action', optionalAuth, bulkAction);

// Bank API Settlement execution routes
router.post('/execute-settlement', optionalAuth, executeSettlement);
router.post('/:id/execute-settlement', optionalAuth, executeSettlement);

// Get all claims (with filters)
router.get('/', optionalAuth, getExpenses);

// Single claim operations
router.get('/:id', optionalAuth, getExpenseById);
router.patch('/:id/status', optionalAuth, updateExpenseStatus);
router.delete('/:id', optionalAuth, deleteExpense);

export default router;
