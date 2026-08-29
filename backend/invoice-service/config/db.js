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
      // 1. Connect without database to ensure database exists
      const tempConnection = await mysql.createConnection({
        host,
        user,
        password,
        port
      });
      await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
      await tempConnection.end();
      console.log(`Database '${database}' verified/created for invoice-service`);
    }

    const isVercel = process.env.VERCEL === '1';

    // 2. Create the connection pool on the database
    pool = mysql.createPool({
      ...connectionOptions,
      database,
      waitForConnections: true,
      connectionLimit: isVercel ? 2 : 10,
      queueLimit: 0,
    });

    // Test pool connection
    const connection = await pool.getConnection();
    console.log('MySQL Database pool connected successfully for invoice-service');
    connection.release();

    // Initialize schema & seeds
    await initializeDatabase();
  } catch (error) {
    console.error('MySQL connection/initialization failed for invoice-service:', error.message);
    if (process.env.VERCEL !== '1') {
      process.exit(1);
    } else {
      throw error;
    }
  }
};

const initializeDatabase = async () => {
  try {
    // Create dst_invoices table if not exists
    const createInvoicesTableQuery = `
      CREATE TABLE IF NOT EXISTS dst_invoices (
        id VARCHAR(50) PRIMARY KEY,
        invoiceNo VARCHAR(100) UNIQUE NOT NULL,
        company VARCHAR(255) NOT NULL,
        companyCode VARCHAR(50) NOT NULL,
        referenceNo VARCHAR(100) NOT NULL,
        serialNo VARCHAR(100) NOT NULL,
        amount VARCHAR(50) NOT NULL,
        date VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        usdToIdrRate DECIMAL(10,2) DEFAULT 16250.00,
        sarToIdrRate DECIMAL(10,2) DEFAULT 4333.00,
        dueDate VARCHAR(50),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(createInvoicesTableQuery);

    // Create dst_invoice_items table if not exists
    const createInvoiceItemsTableQuery = `
      CREATE TABLE IF NOT EXISTS dst_invoice_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoiceId VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        qty INT NOT NULL,
        price DECIMAL(15,2) NOT NULL,
        FOREIGN KEY (invoiceId) REFERENCES dst_invoices(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(createInvoiceItemsTableQuery);
    console.log("Tables 'dst_invoices' and 'dst_invoice_items' are verified/ready");

    // Alter table to add branch and createdBy if they do not exist
    try {
      await pool.query('SELECT branch FROM dst_invoices LIMIT 1');
    } catch (err) {
      console.log('Adding branch and createdBy columns to dst_invoices...');
      try {
        await pool.query('ALTER TABLE dst_invoices ADD COLUMN branch VARCHAR(100) DEFAULT NULL, ADD COLUMN createdBy VARCHAR(255) DEFAULT NULL');
      } catch (alterErr) {
        console.error('Failed to add branch/createdBy columns to dst_invoices:', alterErr.message);
      }
    }

    // Alter table to add rejectionReason if it does not exist
    try {
      await pool.query('SELECT rejectionReason FROM dst_invoices LIMIT 1');
    } catch (err) {
      console.log('Adding rejectionReason column to dst_invoices...');
      try {
        await pool.query('ALTER TABLE dst_invoices ADD COLUMN rejectionReason TEXT DEFAULT NULL');
      } catch (alterErr) {
        console.error('Failed to add rejectionReason column to dst_invoices:', alterErr.message);
      }
    }

    // Alter table to add taxRate if it does not exist
    try {
      await pool.query('SELECT taxRate FROM dst_invoices LIMIT 1');
    } catch (err) {
      console.log('Adding taxRate column to dst_invoices...');
      try {
        await pool.query('ALTER TABLE dst_invoices ADD COLUMN taxRate DECIMAL(5,2) DEFAULT 0.00');
      } catch (alterErr) {
        console.error('Failed to add taxRate column to dst_invoices:', alterErr.message);
      }
    }

    // Alter table to add paymentAttachment if it does not exist
    try {
      await pool.query('SELECT paymentAttachment FROM dst_invoices LIMIT 1');
    } catch (err) {
      console.log('Adding paymentAttachment column to dst_invoices...');
      try {
        await pool.query('ALTER TABLE dst_invoices ADD COLUMN paymentAttachment LONGTEXT DEFAULT NULL');
      } catch (alterErr) {
        console.error('Failed to add paymentAttachment column to dst_invoices:', alterErr.message);
      }
    }

    // Alter table to add currency if it does not exist
    try {
      await pool.query('SELECT currency FROM dst_invoices LIMIT 1');
    } catch (err) {
      console.log('Adding currency column to dst_invoices...');
      try {
        await pool.query("ALTER TABLE dst_invoices ADD COLUMN currency VARCHAR(10) DEFAULT 'USD'");
      } catch (alterErr) {
        console.error('Failed to add currency column to dst_invoices:', alterErr.message);
      }
    }

  } catch (error) {
    console.error('Database schema failed for invoice-service:', error.message);
  }
};

export const getPool = () => {
  if (!pool) {
    throw new Error('Database pool has not been initialized.');
  }
  return pool;
};
