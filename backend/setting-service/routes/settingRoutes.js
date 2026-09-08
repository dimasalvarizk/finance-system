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
  getMaintenanceLocks, updateMaintenanceLocks,
  getRoomTypes, createRoomType, updateRoomType, deleteRoomType,
  getMealTypes, createMealType, updateMealType, deleteMealType,
  exportFullDatabaseBackup, logBackupHistory, getBackupHistory,
  updateUserPermissions, getAuditLogs, createManualAuditLog, updateAuditLog, deleteAuditLog,
  getBankingGateways, getBankingGatewayById, createBankingGateway, updateBankingGateway, testBankingGatewayHandshake, getBankingAuditHistory,
  getActiveBankingGatewaysSummary
} from '../controllers/settingController.js';
import { protect, restrictTo, isSuperAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// All settings routes require auth token
router.use(protect);

// 1. Team Management
router.get('/team', getTeam);
// Add/Edit/Delete team members is restricted to Super Admin only
router.post('/team', restrictTo('Super Admin'), createTeam);
router.put('/team/:id', restrictTo('Super Admin'), updateTeam);
router.delete('/team/:id', restrictTo('Super Admin'), deleteTeam);

// 1.1 Dynamic Permission Management (Exclusively Super Admin: Dimas & Ali)
router.put('/users/:id/permissions', isSuperAdmin, updateUserPermissions);
router.put('/team/:id/permissions', isSuperAdmin, updateUserPermissions);

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

// 10. System Maintenance Broadcast & Module Locks
router.get('/maintenance/status', getMaintenanceLocks);
router.post('/maintenance/locks', isSuperAdmin, updateMaintenanceLocks);
router.post('/maintenance', isSuperAdmin, triggerMaintenanceNotif);

// 11. HB Management
router.get('/hb/room-types', getRoomTypes);
router.post('/hb/room-types', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Madinah Branch Accountant'), createRoomType);
router.put('/hb/room-types/:id', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Madinah Branch Accountant'), updateRoomType);
router.delete('/hb/room-types/:id', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Madinah Branch Accountant'), deleteRoomType);

router.get('/hb/meal-types', getMealTypes);
router.post('/hb/meal-types', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Madinah Branch Accountant'), createMealType);
router.put('/hb/meal-types/:id', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Madinah Branch Accountant'), updateMealType);
router.delete('/hb/meal-types/:id', restrictTo('Super Admin', 'Chief Accountant', 'Division Director', 'Madinah Branch Accountant'), deleteMealType);

// 12. Full Database Backup Export (All 18 MySQL Tables - Exclusively Dimas & Ali)
router.get('/backup/full', isSuperAdmin, exportFullDatabaseBackup);

// 13. Backup History (Exclusively Dimas & Ali)
router.get('/backup/history', isSuperAdmin, getBackupHistory);
router.post('/backup/history', isSuperAdmin, logBackupHistory);


// 14. System Audit Logs Management (Exclusively Super Admin: Dimas & Ali)
router.get('/audit-logs', isSuperAdmin, getAuditLogs);
router.post('/audit-logs', isSuperAdmin, createManualAuditLog);
router.put('/audit-logs/:id', isSuperAdmin, updateAuditLog);
router.delete('/audit-logs/:id', isSuperAdmin, deleteAuditLog);

// 15. Banking Gateways & IT API Integration
router.get('/banking-gateways-summary', getActiveBankingGatewaysSummary);
router.get('/banking-gateways', isSuperAdmin, getBankingGateways);
router.get('/banking-gateways-history', isSuperAdmin, getBankingAuditHistory);
router.get('/banking-gateways/:id', isSuperAdmin, getBankingGatewayById);
router.post('/banking-gateways', isSuperAdmin, createBankingGateway);
router.put('/banking-gateways/:id', isSuperAdmin, updateBankingGateway);
router.post('/banking-gateways/:id/test', isSuperAdmin, testBankingGatewayHandshake);

export default router;
