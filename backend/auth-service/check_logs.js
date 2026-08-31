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

  const [logs] = await conn.query('SELECT * FROM dst_login_logs ORDER BY createdAt DESC LIMIT 10');
  console.log('Recent login logs:', logs);

  await conn.end();
  process.exit(0);
}

main().catch(console.error);
