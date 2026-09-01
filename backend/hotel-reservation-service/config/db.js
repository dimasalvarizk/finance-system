import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let pool;

export const connectDB = async () => {
  if (pool) return pool;
  try {
    const host = process.env.DB_HOST || 'localhost';
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || 'finance_db';
    const port = parseInt(process.env.DB_PORT || '3306');
    const isLocal = host === 'localhost' || host === '127.0.0.1' || process.env.DB_SSL === 'false';

    const connectionOptions = {
      host,
      user,
      password,
      port,
      ssl: isLocal ? undefined : { rejectUnauthorized: false }
    };

    if (isLocal) {
      // Connect without database to ensure database exists
      const tempConnection = await mysql.createConnection({
        host,
        user,
        password,
        port
      });
      await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
      await tempConnection.end();
      console.log(`Database '${database}' verified/created for hotel-reservation-service`);
    }

    const isVercel = process.env.VERCEL === '1';

    pool = mysql.createPool({
      ...connectionOptions,
      database,
      waitForConnections: true,
      connectionLimit: isVercel ? 2 : 10,
      queueLimit: 0,
    });

    const connection = await pool.getConnection();
    console.log('MySQL Database pool connected successfully for hotel-reservation-service');
    connection.release();

    await initializeDatabase().catch(err => console.error('initializeDatabase warning for hotel-reservation-service:', err.message));
  } catch (error) {
    console.error('MySQL connection/initialization failed for hotel-reservation-service:', error.message);
    if (process.env.VERCEL !== '1') {
      process.exit(1);
    } else {
      throw error;
    }
  }
};

const initializeDatabase = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS dst_hotel_reservations (
        id VARCHAR(50) PRIMARY KEY,
        reservationNo VARCHAR(100) UNIQUE NOT NULL,
        guestName VARCHAR(255) NOT NULL,
        guestPhone VARCHAR(100) DEFAULT NULL,
        referenceNo VARCHAR(100) NOT NULL,
        serialNo VARCHAR(100) NOT NULL,
        dueDate VARCHAR(100) NOT NULL,
        companyName VARCHAR(255) NOT NULL,
        clientTaxNo VARCHAR(100) DEFAULT NULL,
        clientAddress TEXT DEFAULT NULL,
        clientCityCountry VARCHAR(255) DEFAULT NULL,
        employeeName VARCHAR(255) NOT NULL,
        employeeId VARCHAR(100) NOT NULL,
        employeePhone VARCHAR(100) NOT NULL,
        employeeEmail VARCHAR(255) NOT NULL,
        employeeEntity VARCHAR(255) NOT NULL,
        currency VARCHAR(10) NOT NULL,
        taxRate DECIMAL(5,2) DEFAULT 0.00,
        status VARCHAR(50) NOT NULL,
        isPaid BOOLEAN DEFAULT FALSE,
        notes TEXT DEFAULT NULL,
        approvedByKarim BOOLEAN DEFAULT FALSE,
        approvedAtKarim VARCHAR(100) DEFAULT NULL,
        confirmationNo VARCHAR(100) DEFAULT NULL,
        type VARCHAR(50) NOT NULL,
        paymentInvoiceFile LONGTEXT DEFAULT NULL,
        usdToIdrRate DECIMAL(10,2) DEFAULT 18025.00,
        sarToIdrRate DECIMAL(10,2) DEFAULT 4800.00,
        rooms JSON NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(createTableQuery);
    console.log("Table 'dst_hotel_reservations' is ready");

    // Pastikan tipe kolom paymentInvoiceFile adalah LONGTEXT agar muat base64 file yang diupload
    try {
      await pool.query('ALTER TABLE dst_hotel_reservations MODIFY COLUMN paymentInvoiceFile LONGTEXT DEFAULT NULL');
      console.log("Column 'paymentInvoiceFile' has been verified/modified to LONGTEXT");
    } catch (alterErr) {
      console.error('Failed to modify column paymentInvoiceFile to LONGTEXT:', alterErr.message);
    }

    // Pastikan kolom usdToIdrRate, sarToIdrRate, dan companyTaxNo ada di tabel dst_hotel_reservations
    try {
      await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN IF NOT EXISTS usdToIdrRate DECIMAL(10,2) DEFAULT 18025.00');
      await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN IF NOT EXISTS sarToIdrRate DECIMAL(10,2) DEFAULT 4800.00');
      await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN IF NOT EXISTS companyTaxNo VARCHAR(100) DEFAULT "0000-0000-0001"');
      console.log("Columns 'usdToIdrRate', 'sarToIdrRate', and 'companyTaxNo' are verified");
    } catch (alterRatesErr) {
      try {
        await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN usdToIdrRate DECIMAL(10,2) DEFAULT 18025.00');
      } catch (e) {}
      try {
        await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN sarToIdrRate DECIMAL(10,2) DEFAULT 4800.00');
      } catch (e) {}
      try {
        await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN companyTaxNo VARCHAR(100) DEFAULT "0000-0000-0001"');
      } catch (e) {}
    }

    // Seed default reservations if empty
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM dst_hotel_reservations');
    if (rows[0].count === 0) {
      console.log('Seeding default hotel reservations...');
      const seedBookings = [
        {
          id: 'hr-001',
          reservationNo: 'HR-2024-001',
          guestName: 'PT. Arie Tour',
          guestPhone: '+62 000-0000-000',
          referenceNo: 'REF-2608-031',
          serialNo: 'SR-005231',
          dueDate: '2026-10-12',
          companyName: 'PT. Arie Tour',
          clientTaxNo: '0000-0000-0000',
          clientAddress: 'Menara Kencana, FI 18, JL. Sudirman No. 45',
          clientCityCountry: 'Jakarta, Indonesia 10210',
          employeeName: 'Ahmad S.',
          employeeId: '260111',
          employeePhone: '+62 000-0000-000',
          employeeEmail: 'info@odst.id',
          employeeEntity: 'ODST Group',
          currency: 'USD',
          taxRate: 0,
          status: 'Confirmed',
          approvedByKarim: true,
          approvedAtKarim: 'Oct 12, 2026 at 09:15 AM',
          confirmationNo: 'CNF-2026-124',
          type: 'Confirmation',
          rooms: [
            {
              hotelName: 'SAFWAT AL MADINAH',
              roomType: 'Suite',
              checkIn: '2026-09-05',
              checkOut: '2026-09-10',
              nights: 5,
              roomCount: 1,
              adults: 2,
              children: 0,
              mealPlan: 'FAREAST FULL BOARD',
              pricePerNight: 250.0,
              mealRate: 0.0
            }
          ]
        },
        {
          id: 'hr-002',
          reservationNo: 'HR-2024-002',
          guestName: 'PT. Arie Tour',
          guestPhone: '+62 000-0000-000',
          referenceNo: 'REF-2608-032',
          serialNo: 'SR-005232',
          dueDate: '2026-10-12',
          companyName: 'PT. Arie Tour',
          clientTaxNo: '0000-0000-0000',
          clientAddress: 'Menara Kencana, FI 18, JL. Sudirman No. 45',
          clientCityCountry: 'Jakarta, Indonesia 10210',
          employeeName: 'Sarah L.',
          employeeId: '260112',
          employeePhone: '+62 000-0000-000',
          employeeEmail: 'info@odst.id',
          employeeEntity: 'ODST Group',
          currency: 'USD',
          taxRate: 0,
          status: 'Tentative',
          approvedByKarim: false,
          approvedAtKarim: null,
          confirmationNo: null,
          type: 'Confirmation',
          rooms: [
            {
              hotelName: 'SAFWAT AL MADINAH',
              roomType: 'Double',
              checkIn: '2026-09-05',
              checkOut: '2026-09-10',
              nights: 4,
              roomCount: 1,
              adults: 2,
              children: 0,
              mealPlan: 'FAREAST FULL BOARD',
              pricePerNight: 160.0,
              mealRate: 0.0
            }
          ]
        },
        {
          id: 'hr-003',
          reservationNo: 'HR-2024-003',
          guestName: 'PT. Arie Tour',
          guestPhone: '+62 000-0000-000',
          referenceNo: 'REF-2608-033',
          serialNo: 'SR-005233',
          dueDate: '2026-10-11',
          companyName: 'PT. Arie Tour',
          clientTaxNo: '0000-0000-0000',
          clientAddress: 'Menara Kencana, FI 18, JL. Sudirman No. 45',
          clientCityCountry: 'Jakarta, Indonesia 10210',
          employeeName: 'Tony S.',
          employeeId: '260113',
          employeePhone: '+62 000-0000-000',
          employeeEmail: 'info@odst.id',
          employeeEntity: 'ODST Group',
          currency: 'USD',
          taxRate: 0,
          status: 'Confirmed',
          approvedByKarim: true,
          approvedAtKarim: 'Oct 11, 2026 at 02:40 PM',
          confirmationNo: 'CNF-2026-782',
          type: 'Confirmation',
          rooms: [
            {
              hotelName: 'SAFWAT AL MADINAH',
              roomType: 'Suite',
              checkIn: '2026-09-05',
              checkOut: '2026-09-10',
              nights: 5,
              roomCount: 1,
              adults: 2,
              children: 0,
              mealPlan: 'FAREAST FULL BOARD',
              pricePerNight: 196.0,
              mealRate: 0.0
            }
          ]
        },
        {
          id: 'hr-004',
          reservationNo: 'HR-2024-004',
          guestName: 'PT. Arie Tour',
          guestPhone: '+62 000-0000-000',
          referenceNo: 'REF-2608-034',
          serialNo: 'SR-005234',
          dueDate: '2026-10-10',
          companyName: 'PT. Arie Tour',
          clientTaxNo: '0000-0000-0000',
          clientAddress: 'Menara Kencana, FI 18, JL. Sudirman No. 45',
          clientCityCountry: 'Jakarta, Indonesia 10210',
          employeeName: 'John C.',
          employeeId: '260114',
          employeePhone: '+62 000-0000-000',
          employeeEmail: 'info@odst.id',
          employeeEntity: 'ODST Group',
          currency: 'USD',
          taxRate: 0,
          status: 'Tentative',
          approvedByKarim: false,
          approvedAtKarim: null,
          confirmationNo: null,
          type: 'Confirmation',
          rooms: [
            {
              hotelName: 'SAFWAT AL MADINAH',
              roomType: 'Single',
              checkIn: '2026-09-05',
              checkOut: '2026-09-10',
              nights: 4,
              roomCount: 1,
              adults: 1,
              children: 0,
              mealPlan: 'FAREAST FULL BOARD',
              pricePerNight: 130.0,
              mealRate: 0.0
            }
          ]
        },
        {
          id: 'hr-005',
          reservationNo: 'HR-2024-005',
          guestName: 'PT. Arie Tour',
          guestPhone: '+62 000-0000-000',
          referenceNo: 'REF-2608-035',
          serialNo: 'SR-005235',
          dueDate: '2026-10-10',
          companyName: 'PT. Arie Tour',
          clientTaxNo: '0000-0000-0000',
          clientAddress: 'Menara Kencana, FI 18, JL. Sudirman No. 45',
          clientCityCountry: 'Jakarta, Indonesia 10210',
          employeeName: 'Golam M.',
          employeeId: '260115',
          employeePhone: '+62 000-0000-000',
          employeeEmail: 'info@odst.id',
          employeeEntity: 'ODST Group',
          currency: 'USD',
          taxRate: 0,
          status: 'Confirmed',
          approvedByKarim: true,
          approvedAtKarim: 'Oct 10, 2026 at 11:20 AM',
          confirmationNo: 'CNF-2026-441',
          type: 'Confirmation',
          rooms: [
            {
              hotelName: 'SAFWAT AL MADINAH',
              roomType: 'Double',
              checkIn: '2026-09-05',
              checkOut: '2026-09-10',
              nights: 4,
              roomCount: 1,
              adults: 2,
              children: 0,
              mealPlan: 'FAREAST FULL BOARD',
              pricePerNight: 95.0,
              mealRate: 0.0
            }
          ]
        },
        {
          id: 'hr-006',
          reservationNo: 'HR-2024-006',
          guestName: 'PT. Arie Tour',
          guestPhone: '+62 000-0000-000',
          referenceNo: 'REF-2608-036',
          serialNo: 'SR-005236',
          dueDate: '2026-10-09',
          companyName: 'PT. Arie Tour',
          clientTaxNo: '0000-0000-0000',
          clientAddress: 'Menara Kencana, FI 18, JL. Sudirman No. 45',
          clientCityCountry: 'Jakarta, Indonesia 10210',
          employeeName: 'Ellen R.',
          employeeId: '260116',
          employeePhone: '+62 000-0000-000',
          employeeEmail: 'info@odst.id',
          employeeEntity: 'ODST Group',
          currency: 'USD',
          taxRate: 0,
          status: 'Tentative',
          approvedByKarim: false,
          approvedAtKarim: null,
          confirmationNo: null,
          type: 'Confirmation',
          rooms: [
            {
              hotelName: 'SAFWAT AL MADINAH',
              roomType: 'Single',
              checkIn: '2026-09-05',
              checkOut: '2026-09-10',
              nights: 2,
              roomCount: 1,
              adults: 1,
              children: 0,
              mealPlan: 'FAREAST FULL BOARD',
              pricePerNight: 110.0,
              mealRate: 0.0
            }
          ]
        },
        {
          id: 'hr-007',
          reservationNo: 'HR-2024-007',
          guestName: 'PT. Arie Tour',
          guestPhone: '+62 000-0000-000',
          referenceNo: 'REF-2608-037',
          serialNo: 'SR-005237',
          dueDate: '2026-10-08',
          companyName: 'PT. Arie Tour',
          clientTaxNo: '0000-0000-0000',
          clientAddress: 'Menara Kencana, FI 18, JL. Sudirman No. 45',
          clientCityCountry: 'Jakarta, Indonesia 10210',
          employeeName: 'Norman O.',
          employeeId: '260117',
          employeePhone: '+62 000-0000-000',
          employeeEmail: 'info@odst.id',
          employeeEntity: 'ODST Group',
          currency: 'USD',
          taxRate: 0,
          status: 'Cancelled',
          approvedByKarim: false,
          approvedAtKarim: null,
          confirmationNo: null,
          type: 'Confirmation',
          rooms: [
            {
              hotelName: 'SAFWAT AL MADINAH',
              roomType: 'Double',
              checkIn: '2026-09-05',
              checkOut: '2026-09-10',
              nights: 5,
              roomCount: 1,
              adults: 2,
              children: 0,
              mealPlan: 'FAREAST FULL BOARD',
              pricePerNight: 170.0,
              mealRate: 0.0
            }
          ]
        },
        {
          id: 'hr-008',
          reservationNo: 'HR-2024-008',
          guestName: 'PT. Arie Tour',
          guestPhone: '+62 000-0000-000',
          referenceNo: 'REF-2608-038',
          serialNo: 'SR-005238',
          dueDate: '2026-10-07',
          companyName: 'PT. Arie Tour',
          clientTaxNo: '0000-0000-0000',
          clientAddress: 'Menara Kencana, FI 18, JL. Sudirman No. 45',
          clientCityCountry: 'Jakarta, Indonesia 10210',
          employeeName: 'Rian K.',
          employeeId: '260118',
          employeePhone: '+62 000-0000-000',
          employeeEmail: 'info@odst.id',
          employeeEntity: 'ODST Group',
          currency: 'USD',
          taxRate: 0,
          status: 'Confirmed',
          approvedByKarim: true,
          approvedAtKarim: 'Oct 07, 2026 at 10:15 AM',
          confirmationNo: 'CNF-2026-118',
          type: 'Confirmation',
          rooms: [
            {
              hotelName: 'SAFWAT AL MADINAH',
              roomType: 'Suite',
              checkIn: '2026-09-05',
              checkOut: '2026-09-10',
              nights: 5,
              roomCount: 1,
              adults: 2,
              children: 0,
              mealPlan: 'FAREAST FULL BOARD',
              pricePerNight: 150.0,
              mealRate: 0.0
            }
          ]
        }
      ];

      const query = `
        INSERT INTO dst_hotel_reservations (
          id, reservationNo, guestName, guestPhone, referenceNo, serialNo, dueDate,
          companyName, clientTaxNo, clientAddress, clientCityCountry,
          employeeName, employeeId, employeePhone, employeeEmail, employeeEntity,
          currency, taxRate, status, approvedByKarim, approvedAtKarim, confirmationNo,
          type, rooms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      for (const b of seedBookings) {
        await pool.query(query, [
          b.id, b.reservationNo, b.guestName, b.guestPhone, b.referenceNo, b.serialNo, b.dueDate,
          b.companyName, b.clientTaxNo, b.clientAddress, b.clientCityCountry,
          b.employeeName, b.employeeId, b.employeePhone, b.employeeEmail, b.employeeEntity,
          b.currency, b.taxRate, b.status, b.approvedByKarim, b.approvedAtKarim, b.confirmationNo,
          b.type, JSON.stringify(b.rooms)
        ]);
      }
      console.log('Seeded 8 default hotel reservations successfully');
    }
  } catch (error) {
    console.error('Database schema/seed failed for hotel-reservation-service:', error.message);
  }
};

export const getPool = () => {
  if (!pool) {
    throw new Error('Database pool has not been initialized.');
  }
  return pool;
};
