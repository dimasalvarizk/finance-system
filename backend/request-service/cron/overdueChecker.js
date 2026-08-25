import cron from 'node-cron';
import { getPool } from '../config/db.js';

const getAuthBaseUrl = () => {
  return process.env.AUTH_SERVICE_URL || 'http://localhost:5001';
};

export const checkOverdueRequests = async () => {
  console.log('[Cron] Running overdue requests check...');
  try {
    const pool = getPool();
    const [overdueRequests] = await pool.query(
      `SELECT id, invoiceNo, dueDate, status, requestedBy 
       FROM dst_requests 
       WHERE status IN ('0/3 Pending', '1/3 Approved', '2/3 Approved')`
    );

    if (overdueRequests.length === 0) {
      console.log('[Cron] No active pending requests found.');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const req of overdueRequests) {
      if (!req.dueDate) continue;

      const due = new Date(req.dueDate);
      if (isNaN(due.getTime()) || due > today) {
        continue; // Not overdue
      }

      // Determine assignees based on current status
      let assignees = [];
      if (req.status === '0/3 Pending') {
        assignees = ['usr_super_admin', 'usr_emad_moustafa'];
      } else if (req.status === '1/3 Approved') {
        assignees = ['usr_hesham'];
      } else if (req.status === '2/3 Approved') {
        assignees = ['usr_khalid'];
      }

      for (const userId of assignees) {
        // Prevent duplicate overdue notifications
        const [existing] = await pool.query(
          `SELECT id FROM dst_notifications 
           WHERE userId = ? AND type = 'approvalOverdue' AND message LIKE ?`,
          [userId, `%${req.invoiceNo}%`]
        );

        if (existing.length === 0) {
          console.log(`[Cron] Request ${req.invoiceNo} is overdue. Notifying ${userId}...`);
          try {
            const response = await fetch(`${getAuthBaseUrl()}/api/auth/notifications`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: userId,
                type: 'approvalOverdue',
                title: 'Approval request OVERDUE',
                message: `The invoice request ${req.invoiceNo} is past its due date (${req.dueDate}) and requires your urgent approval.`
              })
            });
            const resData = await response.json();
            console.log(`[Cron] Notification response for ${userId}:`, resData);
          } catch (err) {
            console.error(`[Cron] Failed to send overdue alert to ${userId}:`, err.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('[Cron] Error checking overdue requests:', error.message);
  }
};

// Schedule to run every day at 08:00 AM
export const initOverdueCron = () => {
  cron.schedule('0 8 * * *', () => {
    checkOverdueRequests();
  });
  console.log('[Cron] Overdue Requests checker scheduled daily at 08:00 AM');
  
  // Also run immediately on startup in development to verify it works
  if (process.env.NODE_ENV === 'development') {
    console.log('[Cron] Dev mode: Running initial liveness check on startup...');
    setTimeout(checkOverdueRequests, 5000);
  }
};
