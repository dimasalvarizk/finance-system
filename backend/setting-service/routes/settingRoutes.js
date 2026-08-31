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
  getCompanySetting, updateCompanySetting,
  triggerMaintenanceNotif,
  getRoomTypes, createRoomType, updateRoomType, deleteRoomType,
  getMealTypes, createMealType, updateMealType, deleteMealType
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
router.post('/branches', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Madinah Branch Accountant'), createBranch);
router.put('/branches/:id', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Madinah Branch Accountant'), updateBranch);
router.delete('/branches/:id', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Madinah Branch Accountant'), deleteBranch);

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
router.put('/exchange-rates', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Madinah Branch Accountant'), updateExchangeRates);

// 7. Services
router.get('/services', getServices);
router.post('/services', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Madinah Branch Accountant'), createService);
router.put('/services/:id', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Madinah Branch Accountant'), updateService);
router.delete('/services/:id', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Madinah Branch Accountant'), deleteService);

// 8. Tax Settings
router.get('/tax', getTaxSetting);
router.put('/tax', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Madinah Branch Accountant'), updateTaxSetting);

// 9. Company Settings
router.get('/company', getCompanySetting);
router.put('/company', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Madinah Branch Accountant'), updateCompanySetting);

// 10. System Maintenance Broadcast
router.post('/maintenance', restrictTo('Super Admin'), triggerMaintenanceNotif);

// 11. HB Management
router.get('/hb/room-types', getRoomTypes);
router.post('/hb/room-types', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Madinah Branch Accountant'), createRoomType);
router.put('/hb/room-types/:id', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Madinah Branch Accountant'), updateRoomType);
router.delete('/hb/room-types/:id', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Madinah Branch Accountant'), deleteRoomType);

router.get('/hb/meal-types', getMealTypes);
router.post('/hb/meal-types', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Madinah Branch Accountant'), createMealType);
router.put('/hb/meal-types/:id', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Madinah Branch Accountant'), updateMealType);
router.delete('/hb/meal-types/:id', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Madinah Branch Accountant'), deleteMealType);

export default router;
