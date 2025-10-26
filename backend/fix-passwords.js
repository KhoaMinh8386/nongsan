/**
 * FIX PASSWORDS SCRIPT
 * Sua lai password hash cho cac tai khoan demo
 * Usage: node fix-passwords.js
 */

import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function fixPasswords() {
  console.log('='.repeat(60));
  console.log('🔧 FIXING PASSWORDS - NÔNG SẢN SẠCH');
  console.log('='.repeat(60));
  
  try {
    // Test connection
    console.log('\n📡 Connecting to database...');
    await pool.query('SELECT NOW()');
    console.log('✅ Connected!');
    
    // Define demo accounts
    const demoAccounts = [
      { email: 'admin@example.com', password: '123456', role: 'ADMIN' },
      { email: 'khach@example.com', password: '123456', role: 'CUSTOMER' }
    ];
    
    console.log('\n🔐 Generating new password hashes...');
    
    for (const account of demoAccounts) {
      console.log(`\n   Processing: ${account.email}`);
      
      // Generate new hash
      const newHash = await bcrypt.hash(account.password, 10);
      console.log(`   New hash: ${newHash.substring(0, 30)}...`);
      
      // Update database
      const result = await pool.query(
        `UPDATE agri.accounts 
         SET password_hash = $1, updated_at = NOW()
         WHERE email = $2
         RETURNING email, role`,
        [newHash, account.email]
      );
      
      if (result.rows.length > 0) {
        console.log(`   ✅ Updated ${result.rows[0].email} (${result.rows[0].role})`);
      } else {
        console.log(`   ⚠️  Account ${account.email} not found`);
      }
      
      // Verify the new hash works
      const verifyResult = await pool.query(
        `SELECT password_hash FROM agri.accounts WHERE email = $1`,
        [account.email]
      );
      
      if (verifyResult.rows.length > 0) {
        const isMatch = await bcrypt.compare(account.password, verifyResult.rows[0].password_hash);
        if (isMatch) {
          console.log(`   ✅ Verified: Password "${account.password}" now works!`);
        } else {
          console.log(`   ❌ Verification failed!`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ PASSWORD FIX COMPLETED!');
    console.log('='.repeat(60));
    console.log('\n📝 Demo accounts:');
    console.log('   Admin: admin@example.com / 123456');
    console.log('   Customer: khach@example.com / 123456');
    console.log('\n💡 You can now login with these credentials!');
    
  } catch (error) {
    console.log('\n❌ ERROR:', error.message);
    console.log('\nFull error:', error);
  } finally {
    await pool.end();
  }
}

fixPasswords();
