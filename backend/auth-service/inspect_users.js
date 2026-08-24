import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'finance_db'
  });
  
  const [branches] = await conn.query('SELECT id, name FROM dst_branches');
  console.log('--- BRANCHES IN DATABASE ---');
  console.log(branches);
  
  await conn.end();
  process.exit(0);
}

main().catch(console.error);
