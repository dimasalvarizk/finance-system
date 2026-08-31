import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;
  const port = parseInt(process.env.DB_PORT || '3306');

  const conn = await mysql.createConnection({
    host,
    user,
    password,
    database,
    port,
    ssl: { rejectUnauthorized: false }
  });

  const testEmails = [
    'Raed@almokhtaragroup.com',
    'raed@almokhtaragroup.com',
    'RAED@almokhtaragroup.com'
  ];

  for (const email of testEmails) {
    const [rows] = await conn.query('SELECT id, email FROM dst_users WHERE email = ?', [email]);
    console.log(`Query for "${email}":`, rows);
  }

  // Get table details
  const [cols] = await conn.query(`SHOW FULL COLUMNS FROM dst_users LIKE 'email'`);
  console.log('Column details for email:', cols);

  await conn.end();
  process.exit(0);
}

main().catch(console.error);
