import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let pool;

export const connectDB = async () => {
  try {
    const host = process.env.DB_HOST || 'localhost';
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || 'finance_db';
    const port = parseInt(process.env.DB_PORT || '3306');
    const isLocal = host === 'localhost' || host === '127.0.0.1';

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
      console.log(`Database '${database}' verified/created for company-service`);
    }

    // 2. Create the connection pool on the database
    pool = mysql.createPool({
      ...connectionOptions,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // Test pool connection
    const connection = await pool.getConnection();
    console.log('MySQL Database pool connected successfully for company-service');
    connection.release();

    // Initialize schema & seeds
    await initializeDatabase();
  } catch (error) {
    console.error('MySQL connection/initialization failed for company-service:', error.message);
    process.exit(1);
  }
};

const initializeDatabase = async () => {
  try {
    // Create dst_companies table
    const createCompaniesTableQuery = `
      CREATE TABLE IF NOT EXISTS dst_companies (
        code VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(100),
        address TEXT,
        taxNumber VARCHAR(100),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(createCompaniesTableQuery);
    console.log("Table 'dst_companies' is verified/ready in company-service");
    // Seeding disabled by request
    return;

    // Seed default companies
    console.log('Seeding default companies in company-service...');
    const seedCompanies = [
      { code: 'AIT', name: 'Arie Tours', phone: '+62 21 5550 1234', address: 'Jl. Sudirman No. 45, Jakarta 10210', taxNumber: '01.234.567.8-012.000' },
      { code: 'WEN', name: 'Wayne Enterprises', phone: '+1 212 555 0199', address: '1007 Mountain Drive, Gotham', taxNumber: '98.765.432.1-098.000' },
      { code: 'STI', name: 'Stark Industries', phone: '+1 310 555 0147', address: '10880 Malibu Point, CA', taxNumber: '87.654.321.0-087.000' },
      { code: 'CYB', name: 'Cyberdyne Systems', phone: '+1 408 555 0163', address: '18144 El Camino Real, Sunnyvale', taxNumber: '76.543.210.9-076.000' },
      { code: 'APL', name: 'Aperture Labs', phone: '+1 906 555 0182', address: 'Upper Michigan, MI 49801', taxNumber: '65.432.109.8-065.000' },
      { code: 'WYU', name: 'Weyland-Yutani', phone: '+44 20 7946 0958', address: 'Canary Wharf, London E14', taxNumber: '54.321.098.7-054.000' },
      { code: 'PTN', name: 'PT Pariwisata Nusantara', phone: '+62 21 5550 5678', address: 'Menara Kencana, Jakarta 12190', taxNumber: '32.109.876.5-032.000' },
      { code: 'OSC', name: 'Oscorp Corp', phone: '+1 212 555 0891', address: 'Oscorp Tower, Manhattan, NY', taxNumber: '43.210.987.6-043.000' },
      { code: 'TYR', name: 'Tyrell Corp', phone: '+1 213 555 0284', address: 'Tyrell Tower, Los Angeles, CA', taxNumber: '21.098.765.4-021.000' },
      { code: 'LEX', name: 'LexCorp', phone: '+1 302 555 0110', address: 'LexCorp Plaza, Metropolis', taxNumber: '11.048.273.6-011.000' },
      { code: 'SHN', name: 'Shinra Electric Power', phone: '+81 3 5555 0190', address: 'Shinra Building, Sector 0, Midgar', taxNumber: '99.234.876.1-099.000' },
      { code: 'ACM', name: 'ACME Corporation', phone: '+1 602 555 0100', address: 'Desert Road Route 66, AZ', taxNumber: '50.124.876.3-050.000' }
    ];

    const insertCompanyQuery = `
      INSERT INTO dst_companies (code, name, phone, address, taxNumber)
      VALUES (?, ?, ?, ?, ?)
    `;

    for (const comp of seedCompanies) {
      await pool.query(insertCompanyQuery, [comp.code, comp.name, comp.phone, comp.address, comp.taxNumber]);
    }
    console.log('Seeded default companies successfully in company-service');
  } catch (error) {
    console.error('Database schema/seed failed for company-service:', error.message);
  }
};

export const getPool = () => {
  if (!pool) {
    throw new Error('Database pool has not been initialized. Please call connectDB first.');
  }
  return pool;
};
