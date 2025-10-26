/**
 * CHECK DATABASE SCRIPT
 * Kiem tra database da co du lieu demo chua
 * Usage: node check-database.js
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

async function checkDatabase() {
  console.log('='.repeat(60));
  console.log('🔍 CHECKING DATABASE - NÔNG SẢN SẠCH');
  console.log('='.repeat(60));
  
  try {
    // 1. Check connection
    console.log('\n📡 Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully!');
    console.log('   Host:', process.env.DB_HOST);
    console.log('   Database:', process.env.DB_NAME);
    console.log('   User:', process.env.DB_USER);
    
    // 2. Check schema exists
    console.log('\n📋 Checking schema...');
    const schemaCheck = await pool.query(`
      SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'agri'
    `);
    if (schemaCheck.rows.length > 0) {
      console.log('✅ Schema "agri" exists');
    } else {
      console.log('❌ Schema "agri" NOT found!');
      console.log('   Please run: psql -U postgres -f database/nong_san_full.sql');
      return;
    }
    
    // 3. Check accounts table
    console.log('\n👥 Checking accounts...');
    const accounts = await pool.query(`
      SELECT id, email, full_name, role, is_active, 
             LEFT(password_hash, 20) as hash_preview
      FROM agri.accounts
      ORDER BY role, email
    `);
    
    if (accounts.rows.length === 0) {
      console.log('❌ No accounts found!');
      console.log('   Please import database/nong_san_full.sql');
      return;
    }
    
    console.log(`✅ Found ${accounts.rows.length} accounts:`);
    accounts.rows.forEach((acc, idx) => {
      console.log(`\n   ${idx + 1}. ${acc.email}`);
      console.log(`      Name: ${acc.full_name}`);
      console.log(`      Role: ${acc.role}`);
      console.log(`      Active: ${acc.is_active}`);
      console.log(`      Hash: ${acc.hash_preview}...`);
    });
    
    // 4. Test password hash for admin
    console.log('\n🔐 Testing password hash for admin@example.com...');
    const adminResult = await pool.query(`
      SELECT password_hash FROM agri.accounts WHERE email = 'admin@example.com'
    `);
    
    if (adminResult.rows.length > 0) {
      const storedHash = adminResult.rows[0].password_hash;
      const testPassword = '123456';
      
      console.log('   Stored hash:', storedHash.substring(0, 30) + '...');
      console.log('   Testing password:', testPassword);
      
      const isMatch = await bcrypt.compare(testPassword, storedHash);
      
      if (isMatch) {
        console.log('   ✅ Password "123456" matches hash!');
      } else {
        console.log('   ❌ Password "123456" does NOT match hash!');
        console.log('   This is the problem! Hash in database is wrong.');
        
        // Generate correct hash
        console.log('\n   💡 Generating correct hash...');
        const correctHash = await bcrypt.hash(testPassword, 10);
        console.log('   Correct hash should be:', correctHash);
        console.log('\n   Fix with SQL:');
        console.log(`   UPDATE agri.accounts SET password_hash = '${correctHash}' WHERE email = 'admin@example.com';`);
      }
    }
    
    // 5. Check products
    console.log('\n📦 Checking products...');
    const products = await pool.query(`
      SELECT COUNT(*) as count FROM agri.products
    `);
    console.log(`✅ Found ${products.rows[0].count} products`);
    
    // 6. Check inventory
    console.log('\n📊 Checking inventory...');
    const inventory = await pool.query(`
      SELECT COUNT(*) as count FROM agri.inventory
    `);
    console.log(`✅ Found ${inventory.rows[0].count} inventory records`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ DATABASE CHECK COMPLETED!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.log('\n❌ ERROR:', error.message);
    console.log('\nFull error:', error);
  } finally {
    await pool.end();
  }
}

checkDatabase();
