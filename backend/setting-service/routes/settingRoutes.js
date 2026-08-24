import express from 'express';
import {
  getTeam, createTeam, updateTeam, deleteTeam,
  getBranches, createBranch, updateBranch, deleteBranch,
  getNotif, updateNotif,
  updateProfile,
  updatePassword,
  getExchangeRates, updateExchangeRates, getExchangeRatesHistory,
  getServices, createService, updateService, deleteService,
  getTaxSetting, updateTaxSetting,
  getCompanySetting, updateCompanySetting
} from '../controllers/settingController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// All settings routes require auth token
router.use(protect);

// 1. Team Management
router.get('/team', getTeam);
// Add/Edit/Delete team members is restricted to Super Admin only
router.post('/team', restrictTo('Super Admin'), createTeam);
router.put('/team/:id', restrictTo('Super Admin'), updateTeam);
router.delete('/team/:id', restrictTo('Super Admin'), deleteTeam);

// 2. Branches
router.get('/branches', getBranches);
router.post('/branches', restrictTo('Super Admin', 'Chief Accountant', 'Division Director'), createBranch);
router.put('/branches/:id', restrictTo('Super Admin', 'Chief Accountant', 'Division Director'), updateBranch);
router.delete('/branches/:id', restrictTo('Super Admin', 'Chief Accountant', 'Division Director'), deleteBranch);

// 3. Notification Preferences
router.get('/notifications', getNotif);
router.put('/notifications', updateNotif);

// 4. Edit Profile
router.put('/profile', updateProfile);

// 5. Security (Password change)
router.put('/security/password', updatePassword);

// 6. Daily Exchange Rates
router.get('/exchange-rates', getExchangeRates);
router.get('/exchange-rates/history', getExchangeRatesHistory);
router.put('/exchange-rates', restrictTo('Super Admin', 'Chief Accountant', 'Division Director'), updateExchangeRates);

// 7. Services
router.get('/services', getServices);
router.post('/services', restrictTo('Super Admin', 'Chief Accountant', 'Division Director'), createService);
router.put('/services/:id', restrictTo('Super Admin', 'Chief Accountant', 'Division Director'), updateService);
router.delete('/services/:id', restrictTo('Super Admin', 'Chief Accountant', 'Division Director'), deleteService);

// 8. Tax Settings
router.get('/tax', getTaxSetting);
router.put('/tax', restrictTo('Super Admin', 'Chief Accountant', 'Division Director'), updateTaxSetting);

// 9. Company Settings
router.get('/company', getCompanySetting);
router.put('/company', restrictTo('Super Admin', 'Chief Accountant', 'Division Director'), updateCompanySetting);

export default router;
