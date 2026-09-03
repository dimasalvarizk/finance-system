import { getPool } from '../config/db.js';

const getAuthBaseUrl = (req) => {
  const isVercel = process.env.VERCEL === '1';
  if (isVercel && req) {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    return `${protocol}://${host}`;
  }
  return process.env.AUTH_SERVICE_URL || 'http://localhost:5001';
};


const checkAndCancelOverdueReservations = async (pool) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Cari reservasi aktif (bukan Cancelled atau Paid and closed), belum lunas, dan sudah melewati jatuh tempo
    const [overdue] = await pool.query(
      'SELECT id, notes FROM dst_hotel_reservations WHERE status NOT IN (\'Cancelled\', \'Paid and closed\') AND isPaid = 0 AND dueDate < ?',
      [todayStr]
    );

    for (const resv of overdue) {
      const appendNote = ` [Auto-Cancelled: Unpaid past due date]`;
      const updatedNotes = resv.notes ? `${resv.notes}${appendNote}` : `Auto-cancelled: Unpaid after due date.`;
      
      await pool.query(
        'UPDATE dst_hotel_reservations SET status = \'Cancelled\', notes = ? WHERE id = ?',
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
        companyName: row.custom_company_name || row.companyName,
        agent: row.custom_agent || row.agent,
        clientAddress: row.custom_address || row.clientAddress,
        clientTaxNo: row.custom_tax_number || row.clientTaxNo,
        clientCityCountry: row.custom_city_country || row.clientCityCountry,
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
          await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN companyTaxNo VARCHAR(100) DEFAULT \'0000-0000-0001\'');
          existingCols.push('companyTaxNo');
        } catch (e) {}
      }
      if (!existingCols.includes('usdToIdrRate')) {
        try {
          await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN usdToIdrRate DECIMAL(10,2) DEFAULT 18025.00');
          existingCols.push('usdToIdrRate');
        } catch (e) {}
      }
      if (!existingCols.includes('sarToIdrRate')) {
        try {
          await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN sarToIdrRate DECIMAL(10,2) DEFAULT 4800.00');
          existingCols.push('sarToIdrRate');
        } catch (e) {}
      }
      if (!existingCols.includes('company_id')) {
        try {
          await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN company_id VARCHAR(50) DEFAULT NULL');
          existingCols.push('company_id');
        } catch (e) {}
      }
      if (!existingCols.includes('custom_company_name')) {
        try {
          await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN custom_company_name VARCHAR(255) DEFAULT NULL');
          existingCols.push('custom_company_name');
        } catch (e) {}
      }
      if (!existingCols.includes('custom_company_email')) {
        try {
          await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN custom_company_email VARCHAR(255) DEFAULT NULL');
          existingCols.push('custom_company_email');
        } catch (e) {}
      }
      if (!existingCols.includes('custom_agent')) {
        try {
          await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN custom_agent VARCHAR(255) DEFAULT NULL');
          existingCols.push('custom_agent');
        } catch (e) {}
      }
      if (!existingCols.includes('custom_address')) {
        try {
          await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN custom_address TEXT DEFAULT NULL');
          existingCols.push('custom_address');
        } catch (e) {}
      }
      if (!existingCols.includes('custom_tax_number')) {
        try {
          await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN custom_tax_number VARCHAR(100) DEFAULT NULL');
          existingCols.push('custom_tax_number');
        } catch (e) {}
      }
      if (!existingCols.includes('custom_city_country')) {
        try {
          await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN custom_city_country VARCHAR(255) DEFAULT NULL');
          existingCols.push('custom_city_country');
        } catch (e) {}
      }
    }

    const {
      id, reservationNo, guestName, guestPhone, referenceNo, serialNo, dueDate,
      companyName, clientTaxNo, clientAddress, clientCityCountry,
      employeeName, employeeId, employeePhone, employeeEmail, employeeEntity, companyTaxNo,
      currency, taxRate, status, type, rooms, notes, usdToIdrRate, sarToIdrRate,
      company_id, custom_company_name, custom_company_email, custom_agent, custom_address, custom_tax_number, custom_city_country,
      advancePayment, remainingBalance, isCustomClient
    } = req.body;

    const isCustom = isCustomClient || company_id === 'Others' || !company_id;
    const finalCompanyName = isCustom
      ? (custom_company_name || companyName || 'Others')
      : (companyName || 'Unknown Company');

    const finalClientTaxNo = isCustom
      ? (custom_tax_number || clientTaxNo || '0000-0000-0000')
      : (clientTaxNo || '0000-0000-0000');

    const finalClientAddress = isCustom
      ? (custom_address || clientAddress || '')
      : (clientAddress || '');

    const finalClientCityCountry = isCustom
      ? (custom_city_country || clientCityCountry || '')
      : (clientCityCountry || '');

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
      const compCode = isCustom ? 'RCN' : (parts[0] === 'OTH' ? 'RCN' : (parts[0] || 'RES'));
      const mmdd = parts[1] || (String(new Date().getMonth() + 1).padStart(2, '0') + String(new Date().getDate()).padStart(2, '0'));
      const randSuffix = Math.floor(100 + Math.random() * 900);
      finalReservationNo = `${compCode}-${mmdd}-${randSuffix}`;
    }

    // 3. Susun data kandidat kolom & nilai
    const fieldsToInsert = [
      { col: 'id', val: finalId },
      { col: 'reservationNo', val: finalReservationNo },
      { col: 'guestName', val: guestName || finalCompanyName },
      { col: 'guestPhone', val: guestPhone || '+62 000-0000-000' },
      { col: 'referenceNo', val: referenceNo || 'REF-001' },
      { col: 'serialNo', val: serialNo || 'SR-001' },
      { col: 'dueDate', val: dueDate || new Date().toISOString().split('T')[0] },
      { col: 'companyName', val: finalCompanyName },
      { col: 'clientTaxNo', val: finalClientTaxNo },
      { col: 'clientAddress', val: finalClientAddress },
      { col: 'clientCityCountry', val: finalClientCityCountry },
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
      { col: 'sarToIdrRate', val: sarToIdrRate || 4800.00 },
      { col: 'advancePayment', val: parseFloat(advancePayment || 0) },
      { col: 'remainingBalance', val: remainingBalance !== undefined ? parseFloat(remainingBalance) : null },
      { col: 'company_id', val: isCustom ? null : company_id },
      { col: 'custom_company_name', val: isCustom ? custom_company_name || finalCompanyName : null },
      { col: 'custom_company_email', val: isCustom ? custom_company_email : null },
      { col: 'custom_agent', val: isCustom ? custom_agent : null },
      { col: 'custom_address', val: isCustom ? custom_address : null },
      { col: 'custom_tax_number', val: isCustom ? custom_tax_number : null },
      { col: 'custom_city_country', val: isCustom ? custom_city_country : null }
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

    // Trigger internal notification to auth-service for Karim and directors
    try {
      fetch(`${getAuthBaseUrl(req)}/api/auth/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'usr_kareem',
          type: 'approvalRequestAssigned',
          title: 'Approval request assigned',
          message: `New hotel reservation ${finalReservationNo} for ${companyName} (${guestName}) submitted by ${employeeName || 'Staff'} is assigned to you for approval.`
        })
      }).catch(err => console.error('Failed to trigger reservation notification:', err.message));
    } catch (notifErr) {}

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

    const currentApprovedAt = approvedAtKarim || new Date().toISOString();

    await pool.query(
      'UPDATE dst_hotel_reservations SET approvedByKarim = 1, approvedAtKarim = ?, confirmationNo = ?, status = ? WHERE id = ?',
      [currentApprovedAt, confirmationNo || '', 'Confirmed', id]
    );

    const [rows] = await pool.query('SELECT * FROM dst_hotel_reservations WHERE id = ?', [id]);
    const updated = rows[0];
    if (updated) {
      updated.rooms = typeof updated.rooms === 'string' ? JSON.parse(updated.rooms) : updated.rooms;
      updated.approvedByKarim = true;
      updated.isPaid = !!updated.isPaid;
    }

    // Trigger notification to creator
    try {
      let targetUserId = 'usr_super_admin';
      if (existing[0].employeeName) {
        const [uRows] = await pool.query('SELECT id FROM dst_users WHERE name = ?', [existing[0].employeeName]);
        if (uRows.length > 0) targetUserId = uRows[0].id;
      }

      fetch(`${getAuthBaseUrl(req)}/api/auth/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUserId,
          type: 'invoiceApproved',
          title: 'Confirmation approved',
          message: `Hotel reservation ${existing[0].reservationNo} has been confirmed by Karim (Conf #: ${confirmationNo || '-'}).`
        })
      }).catch(err => {});
    } catch (notifErr) {}

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

// 6. Add hotel payment history (Installment tracking)
export const addHotelPaymentHistory = async (req, res, next) => {
  const { id } = req.params;
  const { amount, paymentDate, note } = req.body;

  try {
    if (!amount || !paymentDate) {
      return res.status(400).json({ success: false, message: 'Please provide amount and paymentDate' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be a positive number' });
    }

    const pool = getPool();
    const paymentId = `pay_${Date.now()}`;
    const insertQuery = `
      INSERT INTO dst_payment_history (id, referenceId, moduleType, amount, paymentDate, note, createdBy)
      VALUES (?, ?, 'HOTEL', ?, ?, ?, ?)
    `;
    await pool.query(insertQuery, [
      paymentId,
      id,
      numericAmount,
      paymentDate,
      note || '',
      req.user ? req.user.name : 'System'
    ]);

    // Calculate total rooms price for remaining balance
    const [resvRows] = await pool.query('SELECT * FROM dst_hotel_reservations WHERE id = ? OR reservationNo = ?', [id, id]);
    if (resvRows.length > 0) {
      const resv = resvRows[0];
      let totalAmount = 0;
      try {
        const rooms = typeof resv.rooms === 'string' ? JSON.parse(resv.rooms) : resv.rooms;
        totalAmount = rooms.reduce((acc, r) => acc + (parseFloat(r.totalPrice) || 0), 0);
      } catch (e) {}

      const advPayment = parseFloat(resv.advancePayment || 0);

      const [sumRows] = await pool.query(
        "SELECT SUM(amount) AS totalPaid FROM dst_payment_history WHERE referenceId = ? AND moduleType = 'HOTEL'",
        [id]
      );
      const totalInstallments = parseFloat(sumRows[0].totalPaid || 0);
      const newRemaining = Math.max(0, totalAmount - advPayment - totalInstallments);

      let isPaidVal = newRemaining <= 0 ? 1 : 0;
      let statusVal = resv.status;
      if (newRemaining <= 0) {
        statusVal = 'Paid and closed';
      }

      await pool.query(
        'UPDATE dst_hotel_reservations SET remainingBalance = ?, isPaid = ?, status = ? WHERE id = ? OR reservationNo = ?',
        [newRemaining, isPaidVal, statusVal, id, id]
      );

      // Trigger notification internally to auth-service
      try {
        let targetUserId = 'usr_super_admin';
        if (resv.employeeName) {
          const [userRows] = await pool.query('SELECT id FROM dst_users WHERE name = ?', [resv.employeeName]);
          if (userRows.length > 0) targetUserId = userRows[0].id;
        }

        fetch(`${getAuthBaseUrl(req)}/api/auth/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: targetUserId,
            type: 'paymentReceived',
            title: 'Payment received',
            message: `Payment of ${numericAmount.toLocaleString('en-US')} ${resv.currency || 'SAR'} recorded for hotel reservation ${resv.reservationNo}.`
          })
        }).catch(err => {});
      } catch (notifErr) {}
    }

    res.status(201).json({
      success: true,
      message: 'Hotel payment recorded successfully',
      data: { id: paymentId, referenceId: id, moduleType: 'HOTEL', amount: numericAmount, paymentDate, note }
    });
  } catch (error) {
    next(error);
  }
};

// 7. Get hotel payment history
export const getHotelPaymentHistory = async (req, res, next) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      "SELECT * FROM dst_payment_history WHERE referenceId = ? AND moduleType = 'HOTEL' ORDER BY paymentDate DESC, createdAt DESC",
      [id]
    );
    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

// 8. Send Hotel Reservation Confirmation Email to Client
export const sendReservationConfirmationEmail = async (req, res, next) => {
  const { id } = req.params;
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ success: false, message: 'Recipient email is required' });
    }

    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM dst_hotel_reservations WHERE id = ? OR reservationNo = ?', [id, id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Hotel reservation not found' });
    }
    const resv = rows[0];
    let rooms = [];
    try {
      rooms = typeof resv.rooms === 'string' ? JSON.parse(resv.rooms) : resv.rooms;
    } catch (e) {}

    let totalAmount = 0;
    try {
      totalAmount = rooms.reduce((acc, r) => acc + (parseFloat(r.totalPrice) || (parseFloat(r.pricePerNight || 0) + parseFloat(r.mealRate || 0)) * (r.roomCount || 1) * (r.nights || 1)), 0);
    } catch (e) {}

    const items = rooms.map(r => ({
      description: `${r.hotelName || 'Hotel'} - ${r.roomType || 'Standard'} (${r.checkIn || '-'} to ${r.checkOut || '-'}, ${r.nights || 1} nights, ${r.roomCount || 1} rooms, ${r.mealPlan || 'RO'})`,
      qty: r.roomCount || 1,
      price: (parseFloat(r.pricePerNight || 0) + parseFloat(r.mealRate || 0)) * (r.nights || 1)
    }));

    try {
      const formattedAmount = typeof totalAmount === 'number' 
        ? `$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : totalAmount;

      const authResp = await fetch(`${getAuthBaseUrl(req)}/api/auth/send-client-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: email,
          invoiceDetails: {
            invoiceNo: resv.reservationNo || resv.invoiceNo,
            company: resv.companyName || 'Client',
            companyCode: resv.companyCode || resv.clientCompanyCode || 'ACM',
            amount: formattedAmount,
            referenceNo: resv.referenceNo || 'REF-HOTEL',
            serialNo: resv.serialNo || 'SN-HOTEL',
            dueDate: resv.dueDate || new Date().toISOString().split('T')[0],
            date: resv.createdAt ? new Date(resv.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            items: items,
            taxRate: resv.taxRate || 0,
            documentType: 'Hotel Reservation Confirmation'
          }
        })
      });
      const data = await authResp.json();
      if (!authResp.ok) {
        console.error('Auth service email failed:', data);
        return res.status(authResp.status || 500).json({
          success: false,
          message: data.message || 'Failed to send client email via email service'
        });
      }
    } catch (err) {
      console.error('Could not contact auth-service for sending email:', err.message);
      return res.status(500).json({
        success: false,
        message: `Failed to connect to email service: ${err.message}`
      });
    }

    res.status(200).json({
      success: true,
      message: `Reservation confirmation email successfully sent to ${email}`
    });
  } catch (error) {
    next(error);
  }
};

