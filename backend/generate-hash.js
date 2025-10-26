/**
 * GENERATE HASH SCRIPT
 * Tao bcrypt hash cho password
 * Usage: node generate-hash.js
 */

import bcrypt from 'bcryptjs';

async function generateHash() {
  const password = '123456';
  const hash = await bcrypt.hash(password, 10);
  
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\nVerifying...');
  
  const isMatch = await bcrypt.compare(password, hash);
  console.log('Verification:', isMatch ? '✅ SUCCESS' : '❌ FAILED');
}

generateHash();
