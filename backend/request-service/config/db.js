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
      console.log(`Database '${database}' verified/created for request-service`);
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
    console.log('MySQL Database pool connected successfully for request-service');
    connection.release();

    // Initialize schema & seeds
    if (!isVercel) {
      await initializeDatabase();
    } else {
      console.log('Running on Vercel: Skipping schema initialization for request-service');
    }
  } catch (error) {
    console.error('MySQL connection/initialization failed for request-service:', error.message);
    if (process.env.VERCEL !== '1') {
      process.exit(1);
    } else {
      throw error;
    }
  }
};

const initializeDatabase = async () => {
  try {
    const createRequestsTableQuery = `
      CREATE TABLE IF NOT EXISTS dst_requests (
        id VARCHAR(50) PRIMARY KEY,
        reqNo VARCHAR(100) UNIQUE NOT NULL,
        invoiceNo VARCHAR(100) NOT NULL,
        company VARCHAR(255) NOT NULL,
        companyCode VARCHAR(50) NOT NULL,
        amount VARCHAR(50) NOT NULL,
        requestedBy VARCHAR(255) NOT NULL,
        submittedDate VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        level1ApprovedAt VARCHAR(100) DEFAULT NULL,
        level2ApprovedAt VARCHAR(100) DEFAULT NULL,
        level3ApprovedAt VARCHAR(100) DEFAULT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(createRequestsTableQuery);
    console.log("Table 'dst_requests' is ready");

    // Alter table to add rejectionReason if it does not exist
    try {
      await pool.query('SELECT rejectionReason FROM dst_requests LIMIT 1');
    } catch (err) {
      console.log('Adding rejectionReason column to dst_requests...');
      try {
        await pool.query('ALTER TABLE dst_requests ADD COLUMN rejectionReason TEXT DEFAULT NULL');
      } catch (alterErr) {
        console.error('Failed to add rejectionReason column:', alterErr.message);
      }
    }

    // Alter table to add rejectedBy if it does not exist
    try {
      await pool.query('SELECT rejectedBy FROM dst_requests LIMIT 1');
    } catch (err) {
      console.log('Adding rejectedBy column to dst_requests...');
      try {
        await pool.query('ALTER TABLE dst_requests ADD COLUMN rejectedBy VARCHAR(255) DEFAULT NULL');
      } catch (alterErr) {
        console.error('Failed to add rejectedBy column:', alterErr.message);
      }
    }

    // Alter table to add rejectedAt if it does not exist
    try {
      await pool.query('SELECT rejectedAt FROM dst_requests LIMIT 1');
    } catch (err) {
      console.log('Adding rejectedAt column to dst_requests...');
      try {
        await pool.query('ALTER TABLE dst_requests ADD COLUMN rejectedAt VARCHAR(100) DEFAULT NULL');
      } catch (alterErr) {
        console.error('Failed to add rejectedAt column:', alterErr.message);
      }
    }

    // Alter table to add rejectedRole if it does not exist
    try {
      await pool.query('SELECT rejectedRole FROM dst_requests LIMIT 1');
    } catch (err) {
      console.log('Adding rejectedRole column to dst_requests...');
      try {
        await pool.query('ALTER TABLE dst_requests ADD COLUMN rejectedRole VARCHAR(50) DEFAULT NULL');
      } catch (alterErr) {
        console.error('Failed to add rejectedRole column:', alterErr.message);
      }
    }

    // Alter table to add level4ApprovedAt if it does not exist
    try {
      await pool.query('SELECT level4ApprovedAt FROM dst_requests LIMIT 1');
    } catch (err) {
      console.log('Adding level4ApprovedAt column to dst_requests...');
      try {
        await pool.query('ALTER TABLE dst_requests ADD COLUMN level4ApprovedAt VARCHAR(100) DEFAULT NULL');
      } catch (alterErr) {
        console.error('Failed to add level4ApprovedAt column:', alterErr.message);
      }
    }

    // Alter table to add note columns if they do not exist
    const noteColumns = ['level1Note', 'level2Note', 'level3Note', 'level4Note'];
    for (const col of noteColumns) {
      try {
        await pool.query(`SELECT ${col} FROM dst_requests LIMIT 1`);
      } catch (err) {
        console.log(`Adding ${col} column to dst_requests...`);
        try {
          await pool.query(`ALTER TABLE dst_requests ADD COLUMN ${col} TEXT DEFAULT NULL`);
        } catch (alterErr) {
          console.error(`Failed to add ${col} column:`, alterErr.message);
        }
      }
    }

    // Seeding disabled by request
    return;

    const seedRequests = [
      {
        id: 'req_1',
        reqNo: 'REQ-2026-001',
        invoiceNo: 'AIT-2608-011',
        company: 'Arie Tours',
        companyCode: 'AIT',
        amount: '$85,264.00',
        requestedBy: 'Ahmad Saleh',
        submittedDate: 'Oct 12, 2026',
        status: '0/3 Pending',
        level1ApprovedAt: null,
        level2ApprovedAt: null,
        level3ApprovedAt: null
      },
      {
        id: 'req_2',
        reqNo: 'REQ-2026-002',
        invoiceNo: 'WEN-2608-014',
        company: 'Wayne Enterprises',
        companyCode: 'WEN',
        amount: '$120,400.00',
        requestedBy: 'Ahmad Saleh',
        submittedDate: 'Oct 11, 2026',
        status: '1/3 Approved',
        level1ApprovedAt: 'Oct 12, 2026 at 09:15 AM',
        level2ApprovedAt: null,
        level3ApprovedAt: null
      },
      {
        id: 'req_3',
        reqNo: 'REQ-2026-003',
        invoiceNo: 'STI-2608-015',
        company: 'Stark Industries',
        companyCode: 'STI',
        amount: '$240,500.00',
        requestedBy: 'Ahmad Saleh',
        submittedDate: 'Oct 10, 2026',
        status: '2/3 Approved',
        level1ApprovedAt: 'Oct 12, 2026 at 09:15 AM',
        level2ApprovedAt: 'Oct 12, 2026 at 02:30 PM',
        level3ApprovedAt: null
      },
      {
        id: 'req_4',
        reqNo: 'REQ-2026-004',
        invoiceNo: 'CYB-2608-009',
        company: 'Cyberdyne Systems',
        companyCode: 'CYB',
        amount: '$42,200.00',
        requestedBy: 'Ahmad Saleh',
        submittedDate: 'Oct 09, 2026',
        status: '3/3 Approved',
        level1ApprovedAt: 'Oct 12, 2026 at 09:15 AM',
        level2ApprovedAt: 'Oct 12, 2026 at 02:30 PM',
        level3ApprovedAt: 'Oct 13, 2026 at 10:00 AM'
      },
      {
        id: 'req_5',
        reqNo: 'REQ-2026-005',
        invoiceNo: 'APL-2608-012',
        company: 'Aperture Labs',
        companyCode: 'APL',
        amount: '$14,500.00',
        requestedBy: 'Ahmad Saleh',
        submittedDate: 'Oct 08, 2026',
        status: '3/3 Approved',
        level1ApprovedAt: 'Oct 12, 2026 at 09:15 AM',
        level2ApprovedAt: 'Oct 12, 2026 at 02:30 PM',
        level3ApprovedAt: 'Oct 13, 2026 at 10:00 AM'
      },
      {
        id: 'req_6',
        reqNo: 'REQ-2026-006',
        invoiceNo: 'WYU-2608-007',
        company: 'Weyland-Yutani',
        companyCode: 'WYU',
        amount: '$310,000.00',
        requestedBy: 'Ahmad Saleh',
        submittedDate: 'Oct 07, 2026',
        status: '3/3 Approved',
        level1ApprovedAt: 'Oct 12, 2026 at 09:15 AM',
        level2ApprovedAt: 'Oct 12, 2026 at 02:30 PM',
        level3ApprovedAt: 'Oct 13, 2026 at 10:00 AM'
      },
      {
        id: 'req_7',
        reqNo: 'REQ-2026-007',
        invoiceNo: 'OSC-2608-005',
        company: 'Oscorp Corp',
        companyCode: 'OSC',
        amount: '$9,320.00',
        requestedBy: 'Ahmad Saleh',
        submittedDate: 'Oct 06, 2026',
        status: '3/3 Approved',
        level1ApprovedAt: 'Oct 12, 2026 at 09:15 AM',
        level2ApprovedAt: 'Oct 12, 2026 at 02:30 PM',
        level3ApprovedAt: 'Oct 13, 2026 at 10:00 AM'
      },
      {
        id: 'req_8',
        reqNo: 'REQ-2026-008',
        invoiceNo: 'AIT-2608-010',
        company: 'Arie Tours',
        companyCode: 'AIT',
        amount: '$62,000.00',
        requestedBy: 'Ahmad Saleh',
        submittedDate: 'Oct 05, 2026',
        status: 'Rejected',
        level1ApprovedAt: 'Oct 12, 2026 at 09:15 AM',
        level2ApprovedAt: null,
        level3ApprovedAt: null
      },
      {
        id: 'req_9',
        reqNo: 'REQ-2026-009',
        invoiceNo: 'WEN-2608-013',
        company: 'Wayne Enterprises',
        companyCode: 'WEN',
        amount: '$18,400.00',
        requestedBy: 'Ahmad Saleh',
        submittedDate: 'Oct 04, 2026',
        status: '3/3 Approved',
        level1ApprovedAt: 'Oct 12, 2026 at 09:15 AM',
        level2ApprovedAt: 'Oct 12, 2026 at 02:30 PM',
        level3ApprovedAt: 'Oct 13, 2026 at 10:00 AM'
      },
      {
        id: 'req_10',
        reqNo: 'REQ-2026-010',
        invoiceNo: 'STI-2608-014',
        company: 'Stark Industries',
        companyCode: 'STI',
        amount: '$195,000.00',
        requestedBy: 'Ahmad Saleh',
        submittedDate: 'Oct 04, 2026',
        status: '3/3 Approved',
        level1ApprovedAt: 'Oct 12, 2026 at 09:15 AM',
        level2ApprovedAt: 'Oct 12, 2026 at 02:30 PM',
        level3ApprovedAt: 'Oct 13, 2026 at 10:00 AM'
      },
      {
        id: 'req_11',
        reqNo: 'REQ-2026-011',
        invoiceNo: 'TYR-2608-004',
        company: 'Tyrell Corp',
        companyCode: 'TYR',
        amount: '$75,500.00',
        requestedBy: 'Ahmad Saleh',
        submittedDate: 'Oct 03, 2026',
        status: '3/3 Approved',
        level1ApprovedAt: 'Oct 12, 2026 at 09:15 AM',
        level2ApprovedAt: 'Oct 12, 2026 at 02:30 PM',
        level3ApprovedAt: 'Oct 13, 2026 at 10:00 AM'
      },
      {
        id: 'req_12',
        reqNo: 'REQ-2026-012',
        invoiceNo: 'LEX-2608-003',
        company: 'LexCorp',
        companyCode: 'LEX',
        amount: '$150,000.00',
        requestedBy: 'Ahmad Saleh',
        submittedDate: 'Oct 02, 2026',
        status: '3/3 Approved',
        level1ApprovedAt: 'Oct 12, 2026 at 09:15 AM',
        level2ApprovedAt: 'Oct 12, 2026 at 02:30 PM',
        level3ApprovedAt: 'Oct 13, 2026 at 10:00 AM'
      },
      {
        id: 'req_13',
        reqNo: 'REQ-2026-013',
        invoiceNo: 'SHN-2608-002',
        company: 'Shinra Electric Power',
        companyCode: 'SHN',
        amount: '$880,000.00',
        requestedBy: 'Ahmad Saleh',
        submittedDate: 'Oct 01, 2026',
        status: '3/3 Approved',
        level1ApprovedAt: 'Oct 12, 2026 at 09:15 AM',
        level2ApprovedAt: 'Oct 12, 2026 at 02:30 PM',
        level3ApprovedAt: 'Oct 13, 2026 at 10:00 AM'
      },
      {
        id: 'req_14',
        reqNo: 'REQ-2026-014',
        invoiceNo: 'ACME-2608-001',
        company: 'ACME Corporation',
        companyCode: 'ACM',
        amount: '$12,900.00',
        requestedBy: 'Ahmad Saleh',
        submittedDate: 'Sep 30, 2026',
        status: '3/3 Approved',
        level1ApprovedAt: 'Oct 12, 2026 at 09:15 AM',
        level2ApprovedAt: 'Oct 12, 2026 at 02:30 PM',
        level3ApprovedAt: 'Oct 13, 2026 at 10:00 AM'
      }
    ];

    const insertRequestQuery = `
      INSERT INTO dst_requests (id, reqNo, invoiceNo, company, companyCode, amount, requestedBy, submittedDate, status, level1ApprovedAt, level2ApprovedAt, level3ApprovedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const req of seedRequests) {
      await pool.query(insertRequestQuery, [
        req.id,
        req.reqNo,
        req.invoiceNo,
        req.company,
        req.companyCode,
        req.amount,
        req.requestedBy,
        req.submittedDate,
        req.status,
        req.level1ApprovedAt,
        req.level2ApprovedAt,
        req.level3ApprovedAt
      ]);
    }

    console.log('Seeded 14 default requests successfully');
  } catch (error) {
    console.error('Database schema/seed failed for request-service:', error.message);
  }
};

export const getPool = () => {
  if (!pool) {
    throw new Error('Database pool has not been initialized.');
  }
  return pool;
};
