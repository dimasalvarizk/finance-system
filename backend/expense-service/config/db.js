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
      const tempConnection = await mysql.createConnection({
        host,
        user,
        password,
        port
      });
      await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
      await tempConnection.end();
      console.log(`Database '${database}' verified/created for expense-service`);
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
    console.log('MySQL Database pool connected successfully for expense-service');
    connection.release();

    try {
      await initializeDatabase();
    } catch (dbInitErr) {
      console.warn('Schema initialization warning for expense-service:', dbInitErr.message);
    }

    return pool;
  } catch (error) {
    console.error('MySQL connection/initialization failed for expense-service:', error.message);
    if (process.env.VERCEL !== '1') {
      process.exit(1);
    } else {
      throw error;
    }
  }
};

export const getPool = () => {
  if (!pool) {
    throw new Error('Database pool has not been initialized. Call connectDB first.');
  }
  return pool;
};

const initializeDatabase = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS dst_corporate_expenses (
        id VARCHAR(100) PRIMARY KEY,
        claimId VARCHAR(100) UNIQUE NOT NULL,
        projectRef VARCHAR(100) DEFAULT NULL,
        category VARCHAR(100) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'RP',
        amount DECIMAL(15,2) NOT NULL,
        expenseDate VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        bankName VARCHAR(100) DEFAULT NULL,
        bankAccountNumber VARCHAR(100) DEFAULT NULL,
        bankAccountHolder VARCHAR(255) DEFAULT NULL,
        submittedById VARCHAR(100) DEFAULT NULL,
        submittedByName VARCHAR(255) NOT NULL,
        submittedByEmail VARCHAR(255) DEFAULT NULL,
        department VARCHAR(100) DEFAULT 'Operations',
        status VARCHAR(50) NOT NULL DEFAULT 'Pending',
        receiptsCount INT DEFAULT 0,
        receipts LONGTEXT DEFAULT NULL,
        approvalTimeline LONGTEXT DEFAULT NULL,
        rejectionReason TEXT DEFAULT NULL,
        disbursementMethod VARCHAR(50) DEFAULT NULL,
        disbursementRef VARCHAR(100) DEFAULT NULL,
        disbursedAt VARCHAR(100) DEFAULT NULL,
        payrollPeriod VARCHAR(100) DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(createTableQuery);
    console.log("Table 'dst_corporate_expenses' is ready");

    // Check if initial records exist, seed if table is completely empty
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM dst_corporate_expenses');
    if (rows[0].count === 0) {
      console.log('Seeding initial corporate expense records...');
      const seedClaims = [
        {
          id: 'exp_seed_001',
          claimId: 'EXP-2024-890',
          projectRef: 'PRJ-RYD-2026',
          category: 'Transportation & Fuel',
          currency: 'RP',
          amount: 500000.00,
          expenseDate: '2026-10-05',
          description: 'Whatsapp Summit Fuel & Transport Expenses',
          bankName: 'Bank Danamon',
          bankAccountNumber: '0000000000000000',
          bankAccountHolder: 'Emad Moustafa',
          submittedById: '1',
          submittedByName: 'Emad Moustafa',
          submittedByEmail: 'emad@odst.id',
          department: 'Operations',
          status: 'Pending',
          receiptsCount: 2,
          receipts: JSON.stringify([
            { name: 'Fuel_Receipt_Oct05.pdf', size: 1048576, type: 'application/pdf' }
          ]),
          approvalTimeline: JSON.stringify([
            { step: 'Claim Submitted', approver: 'Emad Moustafa', status: 'completed', date: 'Oct 05, 2026 09:15' },
            { step: 'Finance Director Review', approver: 'Mr. Hesham Mokhtar', status: 'in_progress' },
            { step: 'Branch General Manager Review', approver: 'Mr. Khalid Idriss', status: 'pending' },
            { step: 'Financial Controller Review', approver: 'Mr. Emad Moustafa', status: 'pending' }
          ]),
          notes: 'Operational transport logistics for attending WhatsApp Meta Summit event in Riyadh.'
        },
        {
          id: 'exp_seed_002',
          claimId: 'EXP-2024-889',
          projectRef: 'PRJ-MKK-2026',
          category: 'Mission Meals',
          currency: 'RP',
          amount: 500000.00,
          expenseDate: '2026-10-05',
          description: 'Mission Meals for Site Engineering Team',
          bankName: 'Bank Danamon',
          bankAccountNumber: '0000000000000000',
          bankAccountHolder: 'Emad Moustafa',
          submittedById: '1',
          submittedByName: 'Emad Moustafa',
          submittedByEmail: 'emad@odst.id',
          department: 'Engineering',
          status: 'Mr.Khalid Review',
          receiptsCount: 1,
          receipts: JSON.stringify([
            { name: 'Catering_Invoice_Makkah.pdf', size: 524288, type: 'application/pdf' }
          ]),
          approvalTimeline: JSON.stringify([
            { step: 'Claim Submitted', approver: 'Emad Moustafa', status: 'completed', date: 'Oct 05, 2026 08:30' },
            { step: 'Finance Director Review', approver: 'Mr. Hesham Mokhtar', status: 'completed', date: 'Oct 05, 2026 10:00' },
            { step: 'Branch General Manager Review', approver: 'Mr. Khalid Idriss', status: 'in_progress' },
            { step: 'Financial Controller Review', approver: 'Mr. Emad Moustafa', status: 'pending' }
          ]),
          notes: 'Dinner and lunch per diem allowances for weekend site inspections.'
        }
      ];

      for (const item of seedClaims) {
        await pool.query(
          `INSERT INTO dst_corporate_expenses (
            id, claimId, projectRef, category, currency, amount, expenseDate,
            description, bankName, bankAccountNumber, bankAccountHolder,
            submittedById, submittedByName, submittedByEmail, department,
            status, receiptsCount, receipts, approvalTimeline, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id, item.claimId, item.projectRef, item.category, item.currency, item.amount, item.expenseDate,
            item.description, item.bankName, item.bankAccountNumber, item.bankAccountHolder,
            item.submittedById, item.submittedByName, item.submittedByEmail, item.department,
            item.status, item.receiptsCount, item.receipts, item.approvalTimeline, item.notes
          ]
        );
      }
      console.log('dst_corporate_expenses successfully seeded');
    }
  } catch (error) {
    console.error('Failed to initialize dst_corporate_expenses table:', error);
    throw error;
  }
};
