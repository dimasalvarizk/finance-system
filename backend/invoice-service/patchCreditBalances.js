import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function checkDatabase() {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'finance_db';
  const port = parseInt(process.env.DB_PORT || '3306');
  const isLocal = host === 'localhost' || host === '127.0.0.1' || process.env.DB_SSL === 'false';

  console.log(`Connecting to ${host}:${port}/${database} as ${user}...`);
  const conn = await mysql.createConnection({
    host,
    user,
    password,
    database,
    port,
    ssl: isLocal ? undefined : { rejectUnauthorized: false }
  });

  console.log('Connected successfully!');

  // 1. Get all companies
  const [companies] = await conn.query('SELECT code, name, creditBalance FROM dst_companies ORDER BY creditBalance DESC');
  console.log('\n--- ALL COMPANIES & CREDIT BALANCES ---');
  console.table(companies);

  // 2. Check HAW invoices and payments
  const [hawInvoices] = await conn.query("SELECT invoiceNo, company, companyCode, amount, currency, remainingBalance, status FROM dst_invoices WHERE companyCode = 'HAW' OR company LIKE '%Hafidzah%'");
  console.log('\n--- HAW INVOICES ---');
  console.table(hawInvoices);

  for (const inv of hawInvoices) {
    const [payments] = await conn.query("SELECT id, referenceId, amount, currency, exchange_rate, paymentDate, note FROM dst_payment_history WHERE referenceId = ?", [inv.invoiceNo]);
    console.log(`\n--- PAYMENTS FOR INVOICE ${inv.invoiceNo} ---`);
    console.table(payments);
  }

  // 3. If any company has an inflated credit balance (> 50,000 USD/SAR or HAW with huge balance), patch it to 0.00
  for (const c of companies) {
    const bal = parseFloat(c.creditBalance || 0);
    if (bal > 50000 || c.code === 'HAW') {
      console.log(`\nPatching company ${c.code} (${c.name}): current balance = ${bal} -> setting to 0.00`);
      await conn.query("UPDATE dst_companies SET creditBalance = 0.00 WHERE code = ?", [c.code]);
      console.log(`Successfully patched ${c.code} to 0.00`);
    }
  }

  // Verify patched result
  const [updated] = await conn.query('SELECT code, name, creditBalance FROM dst_companies ORDER BY creditBalance DESC');
  console.log('\n--- UPDATED COMPANIES & CREDIT BALANCES ---');
  console.table(updated);

  await conn.end();
}

checkDatabase().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
