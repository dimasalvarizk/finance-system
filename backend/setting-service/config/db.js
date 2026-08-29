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
      console.log(`Database '${database}' verified/created for setting-service`);
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
    console.log('MySQL Database pool connected successfully for setting-service');
    connection.release();

    // Initialize schema & seeds
    if (!isVercel) {
      await initializeDatabase();
    } else {
      console.log('Running on Vercel: Skipping schema initialization for setting-service');
    }
  } catch (error) {
    console.error('MySQL connection/initialization failed for setting-service:', error.message);
    if (process.env.VERCEL !== '1') {
      process.exit(1);
    } else {
      throw error;
    }
  }
};

const initializeDatabase = async () => {
  try {
    // 1. Create dst_branches table
    const createBranchesQuery = `
      CREATE TABLE IF NOT EXISTS dst_branches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        address TEXT,
        phone VARCHAR(100),
        country VARCHAR(100),
        teamCount INT DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(createBranchesQuery);
    console.log("Table 'dst_branches' is ready");

    // Seed default branches if empty
    const [branchRows] = await pool.query('SELECT COUNT(*) as count FROM dst_branches');
    if (false && branchRows[0].count === 0) {
      console.log('Seeding default branches...');
      const seedBranches = [
        { name: 'CBC Office (Head Office)', address: 'Menara Kencana, Fl 18, Jl. Sudirman No. 45, Jakarta 10210', phone: '+62 21 5550 1234', country: 'Indonesia', teamCount: 12 },
        { name: 'Surabaya Office', address: 'Jl. Pemuda No. 27, Surabaya 60271', phone: '+62 31 5550 5678', country: 'Indonesia', teamCount: 8 },
        { name: 'Medan Office', address: 'Jl. Gatot Subroto No. 15, Medan 20112', phone: '+62 61 4550 9012', country: 'Indonesia', teamCount: 5 },
        { name: 'Al Badegel Office', address: 'Al Badegel District, Jeddah 23447', phone: '+62 61 3213 9012', country: 'Indonesia', teamCount: 6 }
      ];
      const insertBranch = 'INSERT INTO dst_branches (name, address, phone, country, teamCount) VALUES (?, ?, ?, ?, ?)';
      for (const b of seedBranches) {
        await pool.query(insertBranch, [b.name, b.address, b.phone, b.country, b.teamCount]);
      }
    }

    // 2. Create dst_services table
    const createServicesQuery = `
      CREATE TABLE IF NOT EXISTS dst_services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        price DECIMAL(15,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'Active',
        currency VARCHAR(10) DEFAULT 'USD',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(createServicesQuery);
    console.log("Table 'dst_services' is ready");

    // Add currency column if it doesn't exist
    try {
      await pool.query('SELECT currency FROM dst_services LIMIT 1');
    } catch (err) {
      console.log('Adding currency column to dst_services table...');
      try {
        await pool.query("ALTER TABLE dst_services ADD COLUMN currency VARCHAR(10) DEFAULT 'USD'");
      } catch (alterErr) {
        console.error('Failed to alter dst_services table:', alterErr);
      }
    }

    // Seed default services if empty
    const [serviceRows] = await pool.query('SELECT COUNT(*) as count FROM dst_services');
    if (false && serviceRows[0].count === 0) {
      console.log('Seeding default services...');
      const seedServices = [
        { name: 'Umrah Visa', price: 118.00, status: 'Active' },
        { name: 'Umrah Visa + Bus', price: 132.00, status: 'Active' },
        { name: 'Hajj Visa', price: 250.00, status: 'Active' },
        { name: 'Airport Transfer (One Way)', price: 45.00, status: 'Active' },
        { name: 'Hotel Booking (Per Night)', price: 85.00, status: 'Active' },
        { name: 'Ground Handling Package - VIP', price: 1000.00, status: 'Active' },
        { name: 'Ground Handling Package - Standard', price: 500.00, status: 'Active' },
        { name: 'Flight Ticket Booking Fee', price: 25.00, status: 'Inactive' }
      ];
      const insertService = 'INSERT INTO dst_services (name, price, status) VALUES (?, ?, ?)';
      for (const s of seedServices) {
        await pool.query(insertService, [s.name, s.price, s.status]);
      }
    }

    // 3. Create dst_exchange_rates table
    const createExchangeRatesQuery = `
      CREATE TABLE IF NOT EXISTS dst_exchange_rates (
        id VARCHAR(50) PRIMARY KEY,
        usdToIdr VARCHAR(100) NOT NULL,
        sarToIdr VARCHAR(100) NOT NULL,
        usdToSar VARCHAR(100) NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(createExchangeRatesQuery);
    console.log("Table 'dst_exchange_rates' is ready");

    // Seed default exchange rates if empty
    const [rateRows] = await pool.query('SELECT COUNT(*) as count FROM dst_exchange_rates');
    if (rateRows[0].count === 0) {
      console.log('Seeding default exchange rates...');
      const insertRates = 'INSERT INTO dst_exchange_rates (id, usdToIdr, sarToIdr, usdToSar) VALUES (?, ?, ?, ?)';
      await pool.query(insertRates, ['current', '18025', '4800', '3.75']);
    }

    // Create dst_exchange_rates_history table
    const createExchangeRatesHistoryQuery = `
      CREATE TABLE IF NOT EXISTS dst_exchange_rates_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usdToIdr VARCHAR(100) NOT NULL,
        sarToIdr VARCHAR(100) NOT NULL,
        usdToSar VARCHAR(100) NOT NULL,
        updatedBy VARCHAR(255) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(createExchangeRatesHistoryQuery);
    console.log("Table 'dst_exchange_rates_history' is ready");

    // Seed default exchange rates history if empty
    const [historyRows] = await pool.query('SELECT COUNT(*) as count FROM dst_exchange_rates_history');
    if (false && historyRows[0].count === 0) {
      console.log('Seeding default exchange rates history...');
      const seedHistory = [
        { usdToIdr: '16,250', sarToIdr: '4,333', usdToSar: '3.750', updatedBy: 'Mr. Emad Moustafa' },
        { usdToIdr: '16,210', sarToIdr: '4,322', usdToSar: '3.750', updatedBy: 'Mr. Emad Moustafa' },
        { usdToIdr: '16,180', sarToIdr: '4,314', usdToSar: '3.750', updatedBy: 'Ahmad Saleh' },
        { usdToIdr: '16,240', sarToIdr: '4,330', usdToSar: '3.750', updatedBy: 'Hesham Ahmed' },
        { usdToIdr: '16,280', sarToIdr: '4,341', usdToSar: '3.750', updatedBy: 'Mr. Emad Moustafa' }
      ];
      const insertHistory = 'INSERT INTO dst_exchange_rates_history (usdToIdr, sarToIdr, usdToSar, updatedBy) VALUES (?, ?, ?, ?)';
      for (const h of seedHistory) {
        await pool.query(insertHistory, [h.usdToIdr, h.sarToIdr, h.usdToSar, h.updatedBy]);
      }
    }

    // 4. Create dst_notification_settings table
    const createNotifSettingsQuery = `
      CREATE TABLE IF NOT EXISTS dst_notification_settings (
        userId VARCHAR(50) PRIMARY KEY,
        settings TEXT NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(createNotifSettingsQuery);
    console.log("Table 'dst_notification_settings' is ready");

    // 5. Create dst_tax_settings table
    const createTaxSettingsQuery = `
      CREATE TABLE IF NOT EXISTS dst_tax_settings (
        id VARCHAR(50) PRIMARY KEY,
        taxPercentage VARCHAR(50) NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(createTaxSettingsQuery);
    console.log("Table 'dst_tax_settings' is ready");

    // Seed default tax settings if empty
    const [taxRows] = await pool.query('SELECT COUNT(*) as count FROM dst_tax_settings');
    if (taxRows[0].count === 0) {
      console.log('Seeding default tax settings...');
      await pool.query('INSERT INTO dst_tax_settings (id, taxPercentage) VALUES (?, ?)', ['current', '0.00']);
    }

    // 6. Create dst_company_settings table
    const createCompanySettingsQuery = `
      CREATE TABLE IF NOT EXISTS dst_company_settings (
        id VARCHAR(50) PRIMARY KEY,
        companyName VARCHAR(255) DEFAULT 'ODST Group',
        phone VARCHAR(100) NOT NULL,
        taxNumber VARCHAR(100) NOT NULL,
        defaultNotes TEXT,
        termsAndConditions TEXT,
        bankName VARCHAR(255) DEFAULT 'Danamon',
        accountName VARCHAR(255) DEFAULT 'PT ODST Airlines Indo',
        idrAccountNumber VARCHAR(100) DEFAULT '102-8829-011',
        usdAccountNumber VARCHAR(100) DEFAULT '102-8829-022',
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(createCompanySettingsQuery);
    console.log("Table 'dst_company_settings' is ready");

    // Add companyName column if it doesn't exist
    try {
      await pool.query('SELECT companyName FROM dst_company_settings LIMIT 1');
    } catch (err) {
      console.log('Adding companyName column to dst_company_settings table...');
      try {
        await pool.query("ALTER TABLE dst_company_settings ADD COLUMN companyName VARCHAR(255) DEFAULT 'ODST Group'");
      } catch (alterErr) {
        console.error('Failed to alter dst_company_settings table:', alterErr);
      }
    }

    // Add bank fields if they don't exist
    const bankFields = [
      { name: 'bankName', type: "VARCHAR(255) DEFAULT 'Danamon'" },
      { name: 'accountName', type: "VARCHAR(255) DEFAULT 'PT ODST Airlines Indo'" },
      { name: 'idrAccountNumber', type: "VARCHAR(100) DEFAULT '102-8829-011'" },
      { name: 'usdAccountNumber', type: "VARCHAR(100) DEFAULT '102-8829-022'" }
    ];

    for (const f of bankFields) {
      try {
        await pool.query(`SELECT ${f.name} FROM dst_company_settings LIMIT 1`);
      } catch (err) {
        console.log(`Adding ${f.name} column to dst_company_settings table...`);
        try {
          await pool.query(`ALTER TABLE dst_company_settings ADD COLUMN ${f.name} ${f.type}`);
        } catch (alterErr) {
          console.error(`Failed to add column ${f.name}:`, alterErr);
        }
      }
    }

    // Seed default company settings if empty
    const [companyRows] = await pool.query('SELECT COUNT(*) as count FROM dst_company_settings');
    if (companyRows[0].count === 0) {
      console.log('Seeding default company settings...');
      await pool.query(`
        INSERT INTO dst_company_settings (id, companyName, phone, taxNumber, defaultNotes, termsAndConditions)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        'current',
        'ODST Group',
        '+62 856 9332 3122',
        '0000-0000-0000',
        'Please ensure the Invoice Number (e.g. AIT-2608-011) is listed as the payment description reference.\nAttach hotel booking confirmation numbers where applicable for ground handling operations.',
        'Payment is due strictly by the specified date on the ledger. For billing inquiries, contact ODST Admin Team. Thank you for your continued partnership.'
      ]);
    }

  } catch (error) {
    console.error('Database schema/seed failed for setting-service:', error.message);
  }
};

export const getPool = () => {
  if (!pool) {
    throw new Error('Database pool has not been initialized. Please call connectDB first.');
  }
  return pool;
};
