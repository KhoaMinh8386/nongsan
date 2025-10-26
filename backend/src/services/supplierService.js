import pool from '../config/db.js';

// Get all suppliers with optional filters
export const getSuppliers = async (filters = {}) => {
  const {
    search,
    page = 1,
    limit = 20
  } = filters;

  const offset = (page - 1) * limit;
  let whereConditions = [];
  let params = [];
  let paramIndex = 1;

  if (search) {
    whereConditions.push(`(name ILIKE $${paramIndex} OR contact_name ILIKE $${paramIndex} OR phone ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

  // Get total count
  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM agri.suppliers ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);

  // Get suppliers
  params.push(limit, offset);
  const result = await pool.query(
    `SELECT id, name, contact_name, phone, email, address, note, created_at, updated_at
     FROM agri.suppliers
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    params
  );

  return {
    suppliers: result.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      total_pages: Math.ceil(total / limit)
    }
  };
};

// Get supplier by ID
export const getSupplierById = async (supplierId) => {
  const result = await pool.query(
    `SELECT id, name, contact_name, phone, email, address, note, created_at, updated_at
     FROM agri.suppliers
     WHERE id = $1`,
    [supplierId]
  );

  return result.rows[0] || null;
};

// Create new supplier
export const createSupplier = async (supplierData) => {
  const { name, contact_name, phone, email, address, note } = supplierData;

  const result = await pool.query(
    `INSERT INTO agri.suppliers (name, contact_name, phone, email, address, note)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [name, contact_name || null, phone || null, email || null, address || null, note || null]
  );

  return result.rows[0];
};

// Update supplier
export const updateSupplier = async (supplierId, supplierData) => {
  const { name, contact_name, phone, email, address, note } = supplierData;

  const fields = [];
  const values = [];
  let paramIndex = 1;

  if (name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(name);
  }

  if (contact_name !== undefined) {
    fields.push(`contact_name = $${paramIndex++}`);
    values.push(contact_name);
  }

  if (phone !== undefined) {
    fields.push(`phone = $${paramIndex++}`);
    values.push(phone);
  }

  if (email !== undefined) {
    fields.push(`email = $${paramIndex++}`);
    values.push(email);
  }

  if (address !== undefined) {
    fields.push(`address = $${paramIndex++}`);
    values.push(address);
  }

  if (note !== undefined) {
    fields.push(`note = $${paramIndex++}`);
    values.push(note);
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(supplierId);

  const result = await pool.query(
    `UPDATE agri.suppliers
     SET ${fields.join(', ')}, updated_at = NOW()
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error('Supplier not found');
  }

  return result.rows[0];
};

// Delete supplier
export const deleteSupplier = async (supplierId) => {
  // Check if supplier has import receipts
  const checkResult = await pool.query(
    'SELECT COUNT(*) as count FROM agri.import_receipts WHERE supplier_id = $1',
    [supplierId]
  );

  if (parseInt(checkResult.rows[0].count) > 0) {
    throw new Error('Cannot delete supplier with existing import receipts');
  }

  const result = await pool.query(
    'DELETE FROM agri.suppliers WHERE id = $1 RETURNING id',
    [supplierId]
  );

  return result.rows.length > 0;
};
