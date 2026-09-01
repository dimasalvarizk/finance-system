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

    // 1. Dapatkan daftar kolom yang benar-benar ada di tabel dst_hotel_reservations
    let existingCols = [];
    try {
      const [cols] = await pool.query("SHOW COLUMNS FROM dst_hotel_reservations");
      existingCols = cols.map(c => c.Field);
    } catch (e) {
      console.error('Error fetching SHOW COLUMNS:', e.message);
    }

    // 2. Coba tambahkan kolom baru jika belum ada
    if (existingCols.length > 0) {
      if (!existingCols.includes('companyTaxNo')) {
        try {
          await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN companyTaxNo VARCHAR(100) DEFAULT "0000-0000-0001"');
          existingCols.push('companyTaxNo');
        } catch (e) {
          console.error('Failed adding companyTaxNo column:', e.message);
        }
      }
      if (!existingCols.includes('usdToIdrRate')) {
        try {
          await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN usdToIdrRate DECIMAL(10,2) DEFAULT 18025.00');
          existingCols.push('usdToIdrRate');
        } catch (e) {
          console.error('Failed adding usdToIdrRate column:', e.message);
        }
      }
      if (!existingCols.includes('sarToIdrRate')) {
        try {
          await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN sarToIdrRate DECIMAL(10,2) DEFAULT 4800.00');
          existingCols.push('sarToIdrRate');
        } catch (e) {
          console.error('Failed adding sarToIdrRate column:', e.message);
        }
      }
    }

    const {
      id, reservationNo, guestName, guestPhone, referenceNo, serialNo, dueDate,
      companyName, clientTaxNo, clientAddress, clientCityCountry,
      employeeName, employeeId, employeePhone, employeeEmail, employeeEntity, companyTaxNo,
      currency, taxRate, status, type, rooms, notes, usdToIdrRate, sarToIdrRate
    } = req.body;

    // Pastikan id unik
    let finalId = id || `hr-${Date.now()}`;
    const [existingId] = await pool.query('SELECT id FROM dst_hotel_reservations WHERE id = ?', [finalId]);
    if (existingId.length > 0) {
      finalId = `hr-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    }

    // Pastikan reservationNo unik agar tidak memicu ER_DUP_ENTRY UNIQUE constraint
    let finalReservationNo = reservationNo || `HR-${Date.now()}`;
    const [existingRes] = await pool.query('SELECT id FROM dst_hotel_reservations WHERE reservationNo = ?', [finalReservationNo]);
    if (existingRes.length > 0) {
      const parts = finalReservationNo.split('-');
      const compCode = parts[0] || 'RES';
      const mmdd = parts[1] || (String(new Date().getMonth() + 1).padStart(2, '0') + String(new Date().getDate()).padStart(2, '0'));
      const randSuffix = Math.floor(100 + Math.random() * 900);
      finalReservationNo = `${compCode}-${mmdd}-${randSuffix}`;
    }

    // 3. Susun data kandidat kolom & nilai
    const fieldsToInsert = [
      { col: 'id', val: finalId },
      { col: 'reservationNo', val: finalReservationNo },
      { col: 'guestName', val: guestName || 'Guest' },
      { col: 'guestPhone', val: guestPhone || '+62 000-0000-000' },
      { col: 'referenceNo', val: referenceNo || 'REF-001' },
      { col: 'serialNo', val: serialNo || 'SR-001' },
      { col: 'dueDate', val: dueDate || new Date().toISOString().split('T')[0] },
      { col: 'companyName', val: companyName || 'Unknown Company' },
      { col: 'clientTaxNo', val: clientTaxNo || '0000-0000-0000' },
      { col: 'clientAddress', val: clientAddress || '' },
      { col: 'clientCityCountry', val: clientCityCountry || '' },
      { col: 'employeeName', val: employeeName || 'Dimas Alva Rizki' },
      { col: 'employeeId', val: employeeId || 'UMP-111' },
      { col: 'employeePhone', val: employeePhone || '' },
      { col: 'employeeEmail', val: employeeEmail || '' },
      { col: 'employeeEntity', val: employeeEntity || '' },
      { col: 'companyTaxNo', val: companyTaxNo || '0000-0000-0001' },
      { col: 'currency', val: currency || 'USD' },
      { col: 'taxRate', val: taxRate || 0 },
      { col: 'status', val: status || 'Tentative' },
      { col: 'type', val: type || 'Confirmation' },
      { col: 'rooms', val: JSON.stringify(rooms || []) },
      { col: 'notes', val: notes || '' },
      { col: 'approvedByKarim', val: 0 },
      { col: 'isPaid', val: 0 },
      { col: 'usdToIdrRate', val: usdToIdrRate || 18025.00 },
      { col: 'sarToIdrRate', val: sarToIdrRate || 4800.00 }
    ];

    // Filter hanya kolom yang benar-benar ada di database (jika existingCols berhasil di-fetch)
    const validFields = existingCols.length > 0
      ? fieldsToInsert.filter(f => existingCols.includes(f.col))
      : fieldsToInsert.filter(f => f.col !== 'companyTaxNo'); // Fallback aman jika existingCols tidak tersedia

    const colNames = validFields.map(f => f.col).join(', ');
    const placeholders = validFields.map(() => '?').join(', ');
    const params = validFields.map(f => f.val);

    const query = `INSERT INTO dst_hotel_reservations (${colNames}) VALUES (${placeholders})`;

    await pool.query(query, params);

    const [rows] = await pool.query('SELECT * FROM dst_hotel_reservations WHERE id = ?', [finalId]);
    const created = rows[0];
    if (created) {
      created.rooms = typeof created.rooms === 'string' ? JSON.parse(created.rooms) : created.rooms;
      created.approvedByKarim = false;
      created.isPaid = false;
    }

    res.status(201).json(created);
  } catch (error) {
    console.error('Error in createReservation:', error);
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
