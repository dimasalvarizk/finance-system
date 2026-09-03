import cron from 'node-cron';
import { getPool } from '../config/db.js';

const getAuthBaseUrl = () => {
  return process.env.AUTH_SERVICE_URL || 'http://localhost:5001';
};

export const checkOverdueHotelReservations = async () => {
  console.log('[Cron] Running hotel reservations overdue check...');
  try {
    const pool = getPool();
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Auto-cancel and update notes for unpaid reservations past due date
    const [overdueUnpaid] = await pool.query(
      "SELECT id, reservationNo, notes FROM dst_hotel_reservations WHERE status NOT IN ('Cancelled', 'Paid and closed') AND (isPaid = 0 OR isPaid IS NULL) AND dueDate < ?",
      [todayStr]
    );

    for (const resv of overdueUnpaid) {
      const appendNote = ` [Auto-Cancelled: Unpaid past due date]`;
      const updatedNotes = resv.notes ? `${resv.notes}${appendNote}` : `Auto-cancelled: Unpaid after due date.`;

      await pool.query(
        "UPDATE dst_hotel_reservations SET status = 'Cancelled', notes = ? WHERE id = ?",
        [updatedNotes, resv.id]
      );
      console.log(`[Cron Auto-Cancel] Hotel reservation ${resv.reservationNo || resv.id} marked Cancelled (overdue).`);
    }

    // 2. Fetch all reservations that are overdue and not closed
    const [overdueReservations] = await pool.query(
      `SELECT id, reservationNo, guestName, companyName, dueDate, status, isPaid, approvedByKarim, employeeName 
       FROM dst_hotel_reservations 
       WHERE status NOT IN ('Paid and closed') AND (isPaid = 0 OR isPaid IS NULL) AND dueDate < ?`,
      [todayStr]
    );

    for (const res of overdueReservations) {
      // Users to notify: Karim (Hotel Approver), Super Admin, and the reservation creator
      let targetUsers = ['usr_kareem', 'usr_super_admin'];

      if (res.employeeName) {
        try {
          const [uRows] = await pool.query('SELECT id FROM dst_users WHERE name = ?', [res.employeeName]);
          if (uRows.length > 0 && !targetUsers.includes(uRows[0].id)) {
            targetUsers.push(uRows[0].id);
          }
        } catch (uErr) {}
      }

      for (const userId of targetUsers) {
        // Prevent duplicate overdue notifications
        const [existing] = await pool.query(
          `SELECT id FROM dst_notifications 
           WHERE userId = ? AND type = 'approvalOverdue' AND message LIKE ?`,
          [userId, `%${res.reservationNo}%`]
        );

        if (existing.length === 0) {
          console.log(`[Cron] Hotel reservation ${res.reservationNo} is overdue. Notifying ${userId}...`);
          try {
            await fetch(`${getAuthBaseUrl()}/api/auth/notifications`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: userId,
                type: 'approvalOverdue',
                title: 'Hotel reservation OVERDUE',
                message: `The hotel reservation ${res.reservationNo} (${res.guestName} - ${res.companyName}) is past its due date (${res.dueDate}) and is currently unpaid/unconfirmed.`
              })
            });
          } catch (err) {
            console.error(`[Cron] Failed to send overdue alert to ${userId}:`, err.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('[Cron] Error checking overdue hotel reservations:', error.message);
  }
};

// Schedule to run every day at 08:00 AM
export const initHotelOverdueCron = () => {
  cron.schedule('0 8 * * *', () => {
    checkOverdueHotelReservations();
  });
  console.log('[Cron] Hotel Reservation Overdue Checker scheduled daily at 08:00 AM');

  // Run on startup in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log('[Cron] Dev mode: Running initial hotel overdue check on startup...');
    setTimeout(checkOverdueHotelReservations, 5000);
  }
};
