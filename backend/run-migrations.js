/**
 * AUTO RUN DATABASE MIGRATIONS
 * Automatically executes SQL migration files
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const migrations = [
  '../database/migrations/001_add_user_phones_and_updated_order_status.sql',
  '../database/migrations/002_add_helper_functions.sql'
];

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');
  
  for (const migration of migrations) {
    try {
      const filePath = join(__dirname, migration);
      console.log(`📄 Running: ${migration}`);
      
      const sql = readFileSync(filePath, 'utf8');
      
      // Remove \c commands (not supported in node-postgres)
      const cleanSql = sql
        .replace(/\\c\s+\w+/g, '')
        .replace(/SET search_path TO agri, public;/g, '');
      
      await pool.query(cleanSql);
      
      console.log(`✅ Completed: ${migration}\n`);
    } catch (error) {
      console.error(`❌ Error in ${migration}:`, error.message);
      console.error('   Details:', error);
      process.exit(1);
    }
  }
  
  console.log('🎉 All migrations completed successfully!');
  
  // Verify
  console.log('\n🔍 Verifying migrations...');
  
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'agri' 
        AND table_name IN ('user_phones', 'order_status_history', 'revenue_records')
    `);
    
    console.log('✅ Tables created:', result.rows.map(r => r.table_name).join(', '));
    
    const enumResult = await pool.query(`
      SELECT unnest(enum_range(NULL::agri.user_role)) as role
    `);
    
    console.log('✅ User roles:', enumResult.rows.map(r => r.role).join(', '));
    
  } catch (error) {
    console.error('❌ Verification error:', error.message);
  }
  
  await pool.end();
}

runMigrations();
