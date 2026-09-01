import { getPool } from '../config/db.js';

const checkAndCancelOverdueReservations = async (pool) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Cari reservasi aktif (bukan Cancelled atau Paid and closed), belum lunas, dan sudah melewati jatuh tempo
    const [overdue] = await pool.query(
      'SELECT id, notes FROM dst_hotel_reservations WHERE status NOT IN ("Cancelled", "Paid and closed") AND isPaid = 0 AND dueDate < ?',
      [todayStr]
    );

    for (const resv of overdue) {
      const appendNote = ` [Auto-Cancelled: Unpaid past due date]`;
      const updatedNotes = resv.notes ? `${resv.notes}${appendNote}` : `Auto-cancelled: Unpaid after due date.`;
      
      await pool.query(
        'UPDATE dst_hotel_reservations SET status = "Cancelled", notes = ? WHERE id = ?',
        [updatedNotes, resv.id]
      );
      console.log(`[Auto-Cancel] Reservation ID ${resv.id} has been automatically cancelled due to unpaid status past due date.`);
    }
  } catch (error) {
    console.error('Error running auto-cancel check for overdue hotel reservations:', error);
  }
};

// 1. Get all hotel reservations
export const getReservations = async (req, res, next) => {
  try {
    const pool = getPool();
    
    // Jalankan pengecekan jatuh tempo sebelum memuat data
    await checkAndCancelOverdueReservations(pool);

    const [rows] = await pool.query('SELECT * FROM dst_hotel_reservations ORDER BY createdAt DESC');
    
    // Parse rooms JSON column back to objects
    const parsedRows = rows.map(row => {
      let rooms = [];
      try {
        rooms = typeof row.rooms === 'string' ? JSON.parse(row.rooms) : row.rooms;
      } catch (err) {
        console.error('Failed to parse rooms for reservation ID:', row.id, err);
      }
      return {
        ...row,
        approvedByKarim: !!row.approvedByKarim,
        isPaid: !!row.isPaid,
        rooms
      };
    });

    res.status(200).json(parsedRows);
  } catch (error) {
    next(error);
  }
};

// 2. Create new hotel reservation
export const createReservation = async (req, res, next) => {
  try {
    const pool = getPool();
    const {
      id, reservationNo, guestName, guestPhone, referenceNo, serialNo, dueDate,
      companyName, clientTaxNo, clientAddress, clientCityCountry,
      employeeName, employeeId, employeePhone, employeeEmail, employeeEntity, companyTaxNo,
      currency, taxRate, status, type, rooms, notes, usdToIdrRate, sarToIdrRate
    } = req.body;

    const query = `
      INSERT INTO dst_hotel_reservations (
        id, reservationNo, guestName, guestPhone, referenceNo, serialNo, dueDate,
        companyName, clientTaxNo, clientAddress, clientCityCountry,
        employeeName, employeeId, employeePhone, employeeEmail, employeeEntity, companyTaxNo,
        currency, taxRate, status, type, rooms, notes, approvedByKarim, isPaid,
        usdToIdrRate, sarToIdrRate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
    `;

    await pool.query(query, [
      id, reservationNo, guestName, guestPhone, referenceNo, serialNo, dueDate,
      companyName, clientTaxNo, clientAddress, clientCityCountry,
      employeeName, employeeId, employeePhone, employeeEmail, employeeEntity, companyTaxNo || '0000-0000-0001',
      currency, taxRate || 0, status || 'Tentative', type || 'Confirmation',
      JSON.stringify(rooms || []), notes || '',
      usdToIdrRate || 18025.00, sarToIdrRate || 4800.00
    ]);

    const [rows] = await pool.query('SELECT * FROM dst_hotel_reservations WHERE id = ?', [id]);
    const created = rows[0];
    if (created) {
      created.rooms = JSON.parse(created.rooms);
      created.approvedByKarim = false;
      created.isPaid = false;
    }

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
};

// 3. Approve reservation (Karim)
export const approveReservation = async (req, res, next) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const { confirmationNo, approvedAtKarim } = req.body;

    const [existing] = await pool.query('SELECT * FROM dst_hotel_reservations WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    await pool.query(
      'UPDATE dst_hotel_reservations SET approvedByKarim = 1, approvedAtKarim = ?, confirmationNo = ?, status = "Confirmed" WHERE id = ?',
      [approvedAtKarim, confirmationNo, id]
    );

    const [rows] = await pool.query('SELECT * FROM dst_hotel_reservations WHERE id = ?', [id]);
    const updated = rows[0];
    if (updated) {
      updated.rooms = typeof updated.rooms === 'string' ? JSON.parse(updated.rooms) : updated.rooms;
      updated.approvedByKarim = true;
      updated.isPaid = !!updated.isPaid;
    }

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

// 4. Update status (including Paid / Cancelled)
export const updateStatus = async (req, res, next) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const { status, isPaid, notes, paymentInvoiceFile } = req.body;

    const [existing] = await pool.query('SELECT * FROM dst_hotel_reservations WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    const updates = [];
    const params = [];

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (isPaid !== undefined) {
      updates.push('isPaid = ?');
      params.push(isPaid ? 1 : 0);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }
    if (paymentInvoiceFile !== undefined) {
      updates.push('paymentInvoiceFile = ?');
      params.push(paymentInvoiceFile);
    }

    if (updates.length > 0) {
      params.push(id);
      await pool.query(`UPDATE dst_hotel_reservations SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const [rows] = await pool.query('SELECT * FROM dst_hotel_reservations WHERE id = ?', [id]);
    const updated = rows[0];
    if (updated) {
      updated.rooms = typeof updated.rooms === 'string' ? JSON.parse(updated.rooms) : updated.rooms;
      updated.approvedByKarim = !!updated.approvedByKarim;
      updated.isPaid = !!updated.isPaid;
    }

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

// 5. Delete reservation
export const deleteReservation = async (req, res, next) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    const [existing] = await pool.query('SELECT * FROM dst_hotel_reservations WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    await pool.query('DELETE FROM dst_hotel_reservations WHERE id = ?', [id]);
    res.status(200).json({ success: true, message: 'Reservation deleted successfully' });
  } catch (error) {
    next(error);
  }
};
