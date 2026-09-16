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
        companyTaxNo VARCHAR(100) DEFAULT '0000-0000-0001',
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
        group_number VARCHAR(255) DEFAULT NULL,
        nationality VARCHAR(255) DEFAULT NULL,
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
    } catch (alterErr) {}

    // Pastikan kolom-kolom baru ada di tabel dst_hotel_reservations via INFORMATION_SCHEMA
    try {
      const [cols] = await pool.query("SHOW COLUMNS FROM dst_hotel_reservations");
      const existingCols = cols.map(c => c.Field);

      if (!existingCols.includes('companyTaxNo')) {
        await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN companyTaxNo VARCHAR(100) DEFAULT "0000-0000-0001"');
      }
      if (!existingCols.includes('usdToIdrRate')) {
        await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN usdToIdrRate DECIMAL(10,2) DEFAULT 18025.00');
      }
      if (!existingCols.includes('sarToIdrRate')) {
        await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN sarToIdrRate DECIMAL(10,2) DEFAULT 4800.00');
      }
      if (!existingCols.includes('advancePayment')) {
        await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN advancePayment DECIMAL(15,2) DEFAULT 0.00');
      }
      if (!existingCols.includes('remainingBalance')) {
        await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN remainingBalance DECIMAL(15,2) DEFAULT NULL');
      }
      if (!existingCols.includes('company_id')) {
        await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN company_id VARCHAR(50) DEFAULT NULL');
      }
      if (!existingCols.includes('custom_company_name')) {
        await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN custom_company_name VARCHAR(255) DEFAULT NULL');
      }
      if (!existingCols.includes('custom_company_email')) {
        await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN custom_company_email VARCHAR(255) DEFAULT NULL');
      }
      if (!existingCols.includes('custom_agent')) {
        await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN custom_agent VARCHAR(255) DEFAULT NULL');
      }
      if (!existingCols.includes('custom_address')) {
        await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN custom_address TEXT DEFAULT NULL');
      }
      if (!existingCols.includes('custom_tax_number')) {
        await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN custom_tax_number VARCHAR(100) DEFAULT NULL');
      }
      if (!existingCols.includes('custom_city_country')) {
        await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN custom_city_country VARCHAR(255) DEFAULT NULL');
      }
      if (!existingCols.includes('group_number')) {
        await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN group_number VARCHAR(255) DEFAULT NULL');
      }
      if (!existingCols.includes('nationality')) {
        await pool.query('ALTER TABLE dst_hotel_reservations ADD COLUMN nationality VARCHAR(255) DEFAULT NULL');
      }
    } catch (alterRatesErr) {
      console.error('Failed checking columns for dst_hotel_reservations:', alterRatesErr.message);
    }

    // Permanently remove any legacy dummy/test hotel reservations
    try {
      await pool.query(
        "DELETE FROM dst_hotel_reservations WHERE id IN ('hr-001', 'hr-002', 'hr-003', 'hr-004', 'hr-005', 'hr-006', 'hr-007', 'hr-008') OR reservationNo LIKE 'HR-2024-%' OR guestName = 'PT. Arie Tour' OR referenceNo = 'BIW-0915-001' OR reservationNo = 'BIW-0915-001' OR guestName LIKE '%Biota Wisata%' OR companyName LIKE '%Biota Wisata%'"
      );
      console.log("Verified/Cleaned legacy dummy hotel reservations from 'dst_hotel_reservations'");
    } catch (cleanErr) {
      console.warn('Could not clean legacy dummy reservations:', cleanErr.message);
    }
  } catch (error) {
    console.error('Database schema failed for hotel-reservation-service:', error.message);
  }
};

export const getPool = () => {
  if (!pool) {
    throw new Error('Database pool has not been initialized.');
  }
  return pool;
};
