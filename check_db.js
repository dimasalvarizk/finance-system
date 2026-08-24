import mysql from 'mysql2/promise';

async function main() {
  const host = 'mysql-2eb97f07-alvarizkidimas-adc9.d.aivencloud.com';
  const user = 'avnadmin';
  const password = 'AVNS_9ySGvnNH6nEdcZHIGI4';
  const database = 'defaultdb';
  const port = 10443;

  try {
    const connection = await mysql.createConnection({
      host,
      user,
      password,
      database,
      port,
      ssl: { rejectUnauthorized: false }
    });

    console.log('Connected to MySQL DB!');
    
    // Check if table exists and print users
    const [tables] = await connection.query("SHOW TABLES LIKE 'dst_users'");
    if (tables.length === 0) {
      console.log("Table 'dst_users' does not exist!");
      return;
    }

    const [users] = await connection.query("SELECT id, email, name, role, status FROM dst_users");
    console.log('Registered Users:', users);

    await connection.end();
  } catch (error) {
    console.error('Error connecting to DB:', error.message);
  }
}

main();
