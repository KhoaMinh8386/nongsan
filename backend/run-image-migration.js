import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import pool from './src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  console.log('🔄 Running product images migration...\n');

  try {
    // Read migration file
    const migrationPath = join(__dirname, '../database/migrations/003_add_product_images.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    await pool.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('   - Added main_image column to products table');
    console.log('   - Created product_images table for multiple images\n');

    // Verify the changes
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'agri' 
        AND table_name = 'products' 
        AND column_name = 'main_image'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Verification: main_image column exists');
      console.log(`   Column type: ${result.rows[0].data_type}\n`);
    } else {
      console.log('⚠️  Warning: Could not verify main_image column');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
