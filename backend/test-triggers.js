/**
 * TEST DATABASE TRIGGERS
 * Kiểm tra xem triggers đã được tạo chưa
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

async function checkTriggers() {
  console.log('🔍 Checking Database Triggers...\n');
  
  try {
    // Check if triggers exist
    const triggerResult = await pool.query(`
      SELECT 
        tgname as trigger_name,
        tgrelid::regclass as table_name,
        proname as function_name
      FROM pg_trigger t
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE tgname IN ('trg_orders_new_order', 'trg_orders_status_change')
      ORDER BY tgname
    `);
    
    if (triggerResult.rows.length > 0) {
      console.log('✅ Triggers Found:');
      triggerResult.rows.forEach(row => {
        console.log(`   - ${row.trigger_name} on ${row.table_name} -> ${row.function_name}()`);
      });
    } else {
      console.log('❌ No triggers found! Need to run migrations:');
      console.log('   Run: node run-migrations.js');
    }
    
    // Check if functions exist
    console.log('\n🔍 Checking Trigger Functions...\n');
    const funcResult = await pool.query(`
      SELECT 
        proname as function_name,
        pg_get_functiondef(oid) as definition
      FROM pg_proc
      WHERE proname IN ('tg_notify_new_order', 'tg_log_order_status_change')
        AND pronamespace = 'agri'::regnamespace
      ORDER BY proname
    `);
    
    if (funcResult.rows.length > 0) {
      console.log('✅ Trigger Functions Found:');
      funcResult.rows.forEach(row => {
        console.log(`   - agri.${row.function_name}()`);
      });
    } else {
      console.log('❌ Trigger functions not found!');
      console.log('   Need to run: node run-migrations.js');
    }
    
    // Check products
    console.log('\n🔍 Checking Products...\n');
    const productResult = await pool.query('SELECT COUNT(*) as count FROM agri.products WHERE is_active = true');
    console.log(`📦 Active Products: ${productResult.rows[0].count}`);
    
    if (productResult.rows[0].count === '0') {
      console.log('   ⚠️ No active products in database!');
      console.log('   You need to add products via Admin panel');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTriggers();
