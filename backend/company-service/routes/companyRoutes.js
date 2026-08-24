import express from 'express';
import { getCompanies, getCompanyByCode, createCompany, updateCompany, deleteCompany } from '../controllers/companyController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Viewing companies is allowed for all authenticated users
router.get('/', getCompanies);
router.get('/:code', getCompanyByCode);

// Modifying companies is restricted to Super Admin, Chief Accountant, and Division Director
router.post('/', restrictTo('Super Admin', 'Chief Accountant', 'Division Director'), createCompany);
router.put('/:code', restrictTo('Super Admin', 'Chief Accountant', 'Division Director'), updateCompany);
router.delete('/:code', restrictTo('Super Admin', 'Chief Accountant', 'Division Director'), deleteCompany);

export default router;
