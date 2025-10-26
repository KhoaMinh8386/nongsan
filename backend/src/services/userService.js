import pool from '../config/db.js';

// ==================== USER PROFILE ====================

export const getUserProfile = async (userId) => {
  const result = await pool.query(
    `SELECT id, email, full_name, phone, role, is_active, created_at
     FROM agri.accounts
     WHERE id = $1`,
    [userId]
  );
  
  if (result.rows.length === 0) {
    throw new Error('User not found');
  }
  
  return result.rows[0];
};

export const updateUserProfile = async (userId, profileData) => {
  const { full_name, phone } = profileData;
  
  const result = await pool.query(
    `UPDATE agri.accounts
     SET full_name = COALESCE($1, full_name),
         phone = COALESCE($2, phone),
         updated_at = NOW()
     WHERE id = $3
     RETURNING id, email, full_name, phone, role`,
    [full_name, phone, userId]
  );
  
  return result.rows[0];
};

// ==================== USER PHONES ====================

export const getUserPhones = async (userId) => {
  const result = await pool.query(
    `SELECT id, phone, label, is_default, created_at
     FROM agri.user_phones
     WHERE account_id = $1
     ORDER BY is_default DESC, created_at DESC`,
    [userId]
  );
  
  return result.rows;
};

export const addUserPhone = async (userId, phoneData) => {
  const { phone, label, is_default } = phoneData;
  
  // If setting as default, unset others
  if (is_default) {
    await pool.query(
      `UPDATE agri.user_phones
       SET is_default = FALSE
       WHERE account_id = $1`,
      [userId]
    );
  }
  
  const result = await pool.query(
    `INSERT INTO agri.user_phones (account_id, phone, label, is_default)
     VALUES ($1, $2, $3, $4)
     RETURNING id, phone, label, is_default`,
    [userId, phone, label || null, is_default || false]
  );
  
  return result.rows[0];
};

export const updateUserPhone = async (userId, phoneId, phoneData) => {
  const { phone, label, is_default } = phoneData;
  
  // If setting as default, unset others
  if (is_default) {
    await pool.query(
      `UPDATE agri.user_phones
       SET is_default = FALSE
       WHERE account_id = $1 AND id != $2`,
      [userId, phoneId]
    );
  }
  
  const result = await pool.query(
    `UPDATE agri.user_phones
     SET phone = COALESCE($1, phone),
         label = COALESCE($2, label),
         is_default = COALESCE($3, is_default),
         updated_at = NOW()
     WHERE id = $4 AND account_id = $5
     RETURNING id, phone, label, is_default`,
    [phone, label, is_default, phoneId, userId]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Phone not found or does not belong to user');
  }
  
  return result.rows[0];
};

export const deleteUserPhone = async (userId, phoneId) => {
  const result = await pool.query(
    `DELETE FROM agri.user_phones
     WHERE id = $1 AND account_id = $2
     RETURNING id`,
    [phoneId, userId]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Phone not found or does not belong to user');
  }
  
  return true;
};

// ==================== USER ADDRESSES ====================

export const getUserAddresses = async (userId) => {
  const result = await pool.query(
    `SELECT id, label, recipient, phone, line1, line2, ward, district, city, 
            country, is_default, created_at
     FROM agri.addresses
     WHERE account_id = $1
     ORDER BY is_default DESC, created_at DESC`,
    [userId]
  );
  
  return result.rows;
};

export const addUserAddress = async (userId, addressData) => {
  const {
    label,
    recipient,
    phone,
    line1,
    line2,
    ward,
    district,
    city,
    country,
    is_default
  } = addressData;
  
  // If setting as default, unset others
  if (is_default) {
    await pool.query(
      `UPDATE agri.addresses
       SET is_default = FALSE
       WHERE account_id = $1`,
      [userId]
    );
  }
  
  const result = await pool.query(
    `INSERT INTO agri.addresses (
      account_id, label, recipient, phone, line1, line2, ward, district, city, country, is_default
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, label, recipient, phone, line1, line2, ward, district, city, is_default`,
    [userId, label, recipient, phone, line1, line2 || null, ward, district, city, country || 'VN', is_default || false]
  );
  
  return result.rows[0];
};

export const updateUserAddress = async (userId, addressId, addressData) => {
  const {
    label,
    recipient,
    phone,
    line1,
    line2,
    ward,
    district,
    city,
    country,
    is_default
  } = addressData;
  
  // If setting as default, unset others
  if (is_default) {
    await pool.query(
      `UPDATE agri.addresses
       SET is_default = FALSE
       WHERE account_id = $1 AND id != $2`,
      [userId, addressId]
    );
  }
  
  const result = await pool.query(
    `UPDATE agri.addresses
     SET label = COALESCE($1, label),
         recipient = COALESCE($2, recipient),
         phone = COALESCE($3, phone),
         line1 = COALESCE($4, line1),
         line2 = COALESCE($5, line2),
         ward = COALESCE($6, ward),
         district = COALESCE($7, district),
         city = COALESCE($8, city),
         country = COALESCE($9, country),
         is_default = COALESCE($10, is_default),
         updated_at = NOW()
     WHERE id = $11 AND account_id = $12
     RETURNING id, label, recipient, phone, line1, line2, ward, district, city, is_default`,
    [label, recipient, phone, line1, line2, ward, district, city, country, is_default, addressId, userId]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Address not found or does not belong to user');
  }
  
  return result.rows[0];
};

export const deleteUserAddress = async (userId, addressId) => {
  const result = await pool.query(
    `DELETE FROM agri.addresses
     WHERE id = $1 AND account_id = $2
     RETURNING id`,
    [addressId, userId]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Address not found or does not belong to user');
  }
  
  return true;
};

// ==================== ADMIN ACCOUNT MANAGEMENT ====================

export const getAllAccounts = async (filters = {}) => {
  const {
    search,
    role,
    is_active,
    page = 1,
    limit = 20
  } = filters;

  const offset = (page - 1) * limit;
  let whereConditions = [];
  let params = [];
  let paramIndex = 1;

  if (search) {
    whereConditions.push(`(email ILIKE $${paramIndex} OR full_name ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (role) {
    whereConditions.push(`role = $${paramIndex}`);
    params.push(role);
    paramIndex++;
  }

  if (is_active !== undefined) {
    whereConditions.push(`is_active = $${paramIndex}`);
    params.push(is_active);
    paramIndex++;
  }

  const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

  // Get total count
  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM agri.accounts ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);

  // Get accounts
  params.push(limit, offset);
  const result = await pool.query(
    `SELECT id, email, phone, full_name, role, is_active, created_at, updated_at
     FROM agri.accounts
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    params
  );

  return {
    accounts: result.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      total_pages: Math.ceil(total / limit)
    }
  };
};

export const updateAccountRoleStatus = async (accountId, updateData) => {
  const { role, is_active } = updateData;
  
  const fields = [];
  const values = [];
  let paramIndex = 1;

  if (role !== undefined) {
    fields.push(`role = $${paramIndex++}`);
    values.push(role);
  }

  if (is_active !== undefined) {
    fields.push(`is_active = $${paramIndex++}`);
    values.push(is_active);
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(accountId);

  const result = await pool.query(
    `UPDATE agri.accounts
     SET ${fields.join(', ')}, updated_at = NOW()
     WHERE id = $${paramIndex}
     RETURNING id, email, phone, full_name, role, is_active, created_at, updated_at`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error('Account not found');
  }

  return result.rows[0];
};
