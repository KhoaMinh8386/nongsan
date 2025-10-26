import pool from '../config/db.js';
import { hashPassword, comparePassword } from '../utils/bcrypt.js';
import { generateToken } from '../utils/jwt.js';

export const registerUser = async ({ email, password, full_name, phone }) => {
  const hashedPassword = await hashPassword(password);
  
  const result = await pool.query(
    `INSERT INTO agri.accounts (email, password_hash, full_name, phone, role)
     VALUES ($1, $2, $3, $4, 'CUSTOMER')
     RETURNING id, email, full_name, phone, role, created_at`,
    [email, hashedPassword, full_name, phone || null]
  );
  
  return result.rows[0];
};

export const loginUser = async ({ email, password }) => {
  const result = await pool.query(
    `SELECT id, email, full_name, phone, password_hash, role, is_active
     FROM agri.accounts
     WHERE email = $1`,
    [email]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Invalid credentials');
  }
  
  const user = result.rows[0];
  
  if (!user.is_active) {
    throw new Error('Account is inactive');
  }
  
  const isPasswordValid = await comparePassword(password, user.password_hash);
  
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }
  
  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role
  });
  
  delete user.password_hash;
  
  return { token, user };
};

export const getUserById = async (userId) => {
  const result = await pool.query(
    `SELECT id, email, full_name, phone, role, created_at, updated_at
     FROM agri.accounts
     WHERE id = $1`,
    [userId]
  );
  
  return result.rows[0] || null;
};
