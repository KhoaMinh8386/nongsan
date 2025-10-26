import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
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

async function fixInventory() {
  console.log('🔧 Creating missing inventory function...\n');
  
  try {
    const filePath = join(__dirname, '../database/fix_inventory_function.sql');
    const sql = readFileSync(filePath, 'utf8');
    
    // Remove \c commands
    const cleanSql = sql
      .replace(/\\c\s+\w+/g, '')
      .replace(/SET search_path TO agri, public;/g, '');
    
    await pool.query(cleanSql);
    
    console.log('✅ Inventory function created successfully!');
    console.log('\n🎉 Checkout should work now!');
    
  } catch (error) {
    console.error('❌ Error creating function:', error.message);
    process.exit(1);
  }
  
  await pool.end();
}

fixInventory();
