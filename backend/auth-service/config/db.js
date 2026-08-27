import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
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
      console.log(`Database '${database}' verified/created for auth-service`);
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
    console.log('MySQL Database pool connected successfully for auth-service');
    connection.release();

    // Initialize schema & seeds
    if (!isVercel) {
      await initializeDatabase();
    } else {
      console.log('Running on Vercel: Skipping schema initialization for auth-service');
    }
  } catch (error) {
    console.error('MySQL connection/initialization failed for auth-service:', error.message);
    if (process.env.VERCEL !== '1') {
      process.exit(1);
    } else {
      throw error;
    }
  }
};

const initializeDatabase = async () => {
  try {
    const createUsersTableQuery = `
      CREATE TABLE IF NOT EXISTS dst_users (
        id VARCHAR(50) PRIMARY KEY,
        email VARCHAR(100) UNIQUE NOT NULL,
        passwordHash VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL,
        branch VARCHAR(100) NOT NULL,
        phone VARCHAR(50),
        employeeId VARCHAR(50),
        department VARCHAR(100),
        jobTitle VARCHAR(100),
        avatar LONGTEXT,
        status VARCHAR(50) DEFAULT 'Active',
        lastActive VARCHAR(100) DEFAULT 'Just now',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(createUsersTableQuery);
    console.log("Table 'dst_users' is ready");

    // Alter table to add resetPasswordToken and resetPasswordExpires if they do not exist
    try {
      await pool.query('SELECT resetPasswordToken FROM dst_users LIMIT 1');
    } catch (err) {
      console.log('Adding resetPasswordToken and resetPasswordExpires columns to dst_users...');
      try {
        await pool.query('ALTER TABLE dst_users ADD COLUMN resetPasswordToken VARCHAR(255) DEFAULT NULL, ADD COLUMN resetPasswordExpires VARCHAR(255) DEFAULT NULL');
      } catch (alterErr) {
        console.error('Failed to add resetPasswordToken columns:', alterErr.message);
      }
    }

    // Alter table to add permissions if it does not exist
    try {
      await pool.query('SELECT permissions FROM dst_users LIMIT 1');
    } catch (err) {
      console.log('Adding permissions column to dst_users...');
      try {
        await pool.query('ALTER TABLE dst_users ADD COLUMN permissions TEXT DEFAULT NULL');
      } catch (alterErr) {
        console.error('Failed to add permissions column:', alterErr.message);
      }
    }

    // Dynamic Updates for Level 2/3 users
    try {
      await pool.query(`
        UPDATE dst_users 
        SET name = 'Mr. Hesham Mokhtar' 
        WHERE id = 'usr_hesham'
      `);

      // Karim Gharba
      const [karimExists] = await pool.query("SELECT id FROM dst_users WHERE id = 'usr_kareem'");
      if (karimExists.length > 0) {
        await pool.query(`
          UPDATE dst_users 
          SET email = 'Karimgharba5@gmail.com', name = 'Mr. Karim Gharba', role = 'Level_3_Approver', permissions = 'manage_companies'
          WHERE id = 'usr_kareem'
        `);
      } else {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);
        await pool.query(`
          INSERT INTO dst_users (id, email, passwordHash, name, role, branch, phone, employeeId, department, jobTitle, status, permissions)
          VALUES ('usr_kareem', 'Karimgharba5@gmail.com', ?, 'Mr. Karim Gharba', 'Level_3_Approver', 'Graha Al Badegel', '+62 812-7777-8888', 'EMP-105', 'Finance', 'Level 3 Approver', 'Active', 'manage_companies')
        `, [hashedPassword]);
      }

      // Raed AlBadrani
      const [raedExists] = await pool.query("SELECT id FROM dst_users WHERE id = 'usr_raed'");
      if (raedExists.length > 0) {
        await pool.query(`
          UPDATE dst_users 
          SET email = 'Raed@almokhtaragroup.com', name = 'Mr. Raed AlBadrani', role = 'Level_3_Approver'
          WHERE id = 'usr_raed'
        `);
      } else {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);
        await pool.query(`
          INSERT INTO dst_users (id, email, passwordHash, name, role, branch, phone, employeeId, department, jobTitle, status)
          VALUES ('usr_raed', 'Raed@almokhtaragroup.com', ?, 'Mr. Raed AlBadrani', 'Level_3_Approver', 'Graha Al Badegel', '+62 812-7777-9999', 'EMP-106', 'Finance', 'Level 3 Approver', 'Active')
        `, [hashedPassword]);
      }
      console.log('User roles & names updated successfully');
    } catch (dbErr) {
      console.error('Failed to run dynamic updates for user accounts:', dbErr.message);
    }

    // Create dst_sessions table
    const createSessionsTableQuery = `
      CREATE TABLE IF NOT EXISTS dst_sessions (
        id VARCHAR(255) PRIMARY KEY,
        userId VARCHAR(50) NOT NULL,
        device VARCHAR(255) NOT NULL,
        ip VARCHAR(100) NOT NULL,
        location VARCHAR(255) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES dst_users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(createSessionsTableQuery);
    console.log("Table 'dst_sessions' is ready");

    // Create dst_login_logs table
    const createLoginLogsTableQuery = `
      CREATE TABLE IF NOT EXISTS dst_login_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(100) NOT NULL,
        ip VARCHAR(100) NOT NULL,
        agent VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(createLoginLogsTableQuery);
    console.log("Table 'dst_login_logs' is ready");

    // Create dst_notifications table
    const createNotificationsTableQuery = `
      CREATE TABLE IF NOT EXISTS dst_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId VARCHAR(50) NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        unread BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES dst_users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await pool.query(createNotificationsTableQuery);
    console.log("Table 'dst_notifications' is ready");

    // Only seed default users if the table is empty to avoid wiping user modifications during server restart
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM dst_users');
    if (rows[0].count === 0) {
      console.log('Seeding default users...');

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);

      const seedUsers = [
        {
          id: 'usr_super_admin',
          email: 'admin@odst.id',
          name: 'Mr. Emad Moustafa',
          role: 'Super Admin',
          branch: 'CBC Office (Head Office)',
          phone: '+62 812-0000-0000',
          employeeId: 'EMP-100',
          department: 'Finance',
          jobTitle: 'Finance Director',
          status: 'Active',
          lastActive: 'Just now',
          permissions: null
        },
        {
          id: 'usr_emad_moustafa',
          email: 'emad@mukhtaraair.com',
          name: 'Emad Moustafa',
          role: 'Super Admin',
          branch: 'CBC Office (Head Office)',
          phone: '+62 812-0000-9999',
          employeeId: 'EMP-104',
          department: 'Finance',
          jobTitle: 'Main Admin',
          status: 'Active',
          lastActive: 'Just now',
          permissions: null
        },
        {
          id: 'usr_hesham',
          email: 'hesham.mokhtar@mukhtaraair.com',
          name: 'Mr. Hesham Mokhtar',
          role: 'Chief Accountant',
          branch: 'CBC Office (Head Office)',
          phone: '+62 812-1111-2222',
          employeeId: 'EMP-101',
          department: 'Finance',
          jobTitle: 'Chief Accountant',
          status: 'Active',
          lastActive: '2 hrs ago',
          permissions: null
        },
        {
          id: 'usr_khalid',
          email: 'khalid@odst.id',
          name: 'Khalid Idriss',
          role: 'Division Director',
          branch: 'CBC Office (Head Office)',
          phone: '+62 812-3333-4444',
          employeeId: 'EMP-102',
          department: 'Finance',
          jobTitle: 'Umrah Division Director',
          status: 'Active',
          lastActive: 'Yesterday',
          permissions: null
        },
        {
          id: 'usr_ahmad',
          email: 'ahmad@odst.id',
          name: 'Ahmad Saleh',
          role: 'Accountant',
          branch: 'CBC Office (Head Office)',
          phone: '+62 812-5555-6666',
          employeeId: 'EMP-103',
          department: 'Finance',
          jobTitle: 'Senior Accountant',
          status: 'Active',
          lastActive: '3 days ago',
          permissions: null
        },
        {
          id: 'usr_kareem',
          email: 'Karimgharba5@gmail.com',
          name: 'Mr. Karim Gharba',
          role: 'Level_3_Approver',
          branch: 'Graha Al Badegel',
          phone: '+62 812-7777-8888',
          employeeId: 'EMP-105',
          department: 'Finance',
          jobTitle: 'Level 3 Approver',
          status: 'Active',
          lastActive: 'Just now',
          permissions: 'manage_companies'
        },
        {
          id: 'usr_raed',
          email: 'Raed@almokhtaragroup.com',
          name: 'Mr. Raed AlBadrani',
          role: 'Level_3_Approver',
          branch: 'Graha Al Badegel',
          phone: '+62 812-7777-9999',
          employeeId: 'EMP-106',
          department: 'Finance',
          jobTitle: 'Level 3 Approver',
          status: 'Active',
          lastActive: 'Just now',
          permissions: null
        }
      ];

      const seedUserQuery = `
        INSERT INTO dst_users (id, email, passwordHash, name, role, branch, phone, employeeId, department, jobTitle, status, lastActive, permissions)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      for (const u of seedUsers) {
        await pool.query(seedUserQuery, [
          u.id,
          u.email,
          hashedPassword,
          u.name,
          u.role,
          u.branch,
          u.phone,
          u.employeeId,
          u.department,
          u.jobTitle,
          u.status,
          u.lastActive,
          u.permissions
        ]);
      }
      console.log('Default users seeded successfully with full metadata');

      // Seed default initial notifications for usr_super_admin
      console.log('Seeding default notifications...');
      const seedNotifications = [
        {
          userId: 'usr_super_admin',
          type: 'newInvoiceSubmitted',
          title: 'New invoice approval request',
          message: 'Ahmad submitted INV-2847 ($12,400) for CBC Office branch.',
          unread: true
        },
        {
          userId: 'usr_super_admin',
          type: 'approvalOverdue',
          title: 'Invoice OVERDUE warning',
          message: 'INV-2691 is now 15 days past due threshold limit.',
          unread: false
        },
        {
          userId: 'usr_super_admin',
          type: 'approvalCompleted',
          title: 'Approval completed by Khalid',
          message: 'Invoice INV-2830 successfully approved for payout queue.',
          unread: false
        }
      ];
      const insertNotifQuery = `
        INSERT INTO dst_notifications (userId, type, title, message, unread)
        VALUES (?, ?, ?, ?, ?)
      `;
      for (const n of seedNotifications) {
        await pool.query(insertNotifQuery, [n.userId, n.type, n.title, n.message, n.unread]);
      }
      console.log('Default notifications seeded successfully');
    }
  } catch (error) {
    console.error('Database schema/seed failed:', error.message);
  }
};

export const getPool = () => {
  if (!pool) {
    throw new Error('Database pool has not been initialized. Please call connectDB first.');
  }
  return pool;
};
