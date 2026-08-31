import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

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

  const [rows] = await conn.query("SELECT * FROM dst_users WHERE id = 'usr_raed'");
  console.log('User:', rows[0]);

  if (rows.length > 0) {
    const isMatch = await bcrypt.compare('password123', rows[0].passwordHash);
    console.log('Is password "password123" correct?', isMatch);
  }

  await conn.end();
  process.exit(0);
}

main().catch(console.error);
