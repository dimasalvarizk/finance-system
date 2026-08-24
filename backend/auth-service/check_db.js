import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

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
    
    const [rows] = await connection.query("SELECT email, passwordHash FROM dst_users WHERE email = 'hesham.mokhtar@mukhtaraair.com'");
    if (rows.length === 0) {
      console.log('User not found!');
      return;
    }

    const dbUser = rows[0];
    console.log('User found! Email:', dbUser.email);
    console.log('Password hash in DB:', dbUser.passwordHash);

    const match = await bcrypt.compare('password123', dbUser.passwordHash);
    console.log('Does password123 match the hash?', match);

    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
