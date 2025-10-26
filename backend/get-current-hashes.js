/**
 * GET CURRENT HASHES FROM DATABASE
 * Lay password hash dang hoat dong trong database
 * Usage: node get-current-hashes.js
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function getCurrentHashes() {
  try {
    const result = await pool.query(`
      SELECT email, password_hash 
      FROM agri.accounts 
      WHERE email IN ('admin@example.com', 'khach@example.com')
      ORDER BY email
    `);
    
    console.log('Current working password hashes:\n');
    
    for (const row of result.rows) {
      console.log(`Email: ${row.email}`);
      console.log(`Hash: ${row.password_hash}`);
      console.log('');
    }
    
    console.log('\nSQL UPDATE statements for nong_san_full.sql:');
    console.log('='.repeat(60));
    
    for (const row of result.rows) {
      const role = row.email.includes('admin') ? 'ADMIN' : 'CUSTOMER';
      const name = row.email.includes('admin') ? 'Admin' : 'Nguyen Van A';
      const phone = row.email.includes('admin') ? '0900000000' : '0901111222';
      
      console.log(`\nINSERT INTO agri.accounts (email, phone, full_name, password_hash, role)`);
      console.log(`VALUES ('${row.email}','${phone}','${name}', '${row.password_hash}', '${role}')`);
      console.log(`ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

getCurrentHashes();
