import pool from '../config/db.js';

// Get all categories
export const getCategories = async (filters = {}) => {
  try {
    let query = 'SELECT * FROM agri.categories';
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Filter by active status
    if (filters.is_active !== undefined) {
      conditions.push(`is_active = $${paramIndex++}`);
      params.push(filters.is_active);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY name ASC';

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Get categories error:', error);
    throw error;
  }
};

// Get category by ID
export const getCategoryById = async (id) => {
  try {
    const result = await pool.query(
      'SELECT * FROM agri.categories WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Category not found');
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Get category by ID error:', error);
    throw error;
  }
};

// Create category
export const createCategory = async (data) => {
  try {
    const { name, slug, description, is_active = true } = data;
    
    const result = await pool.query(
      `INSERT INTO agri.categories (name, slug, description, is_active) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name, slug, description, is_active]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Create category error:', error);
    throw error;
  }
};

// Update category
export const updateCategory = async (id, data) => {
  try {
    const { name, slug, description, is_active } = data;
    
    const result = await pool.query(
      `UPDATE agri.categories 
       SET name = $1, slug = $2, description = $3, is_active = $4, updated_at = NOW()
       WHERE id = $5 
       RETURNING *`,
      [name, slug, description, is_active, id]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Category not found');
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Update category error:', error);
    throw error;
  }
};

// Delete category
export const deleteCategory = async (id) => {
  try {
    // Check if category has products
    const productCheck = await pool.query(
      'SELECT COUNT(*) FROM agri.products WHERE category_id = $1',
      [id]
    );
    
    const productCount = parseInt(productCheck.rows[0].count);
    
    if (productCount > 0) {
      throw new Error(`Cannot delete category. It has ${productCount} products.`);
    }
    
    const result = await pool.query(
      'DELETE FROM agri.categories WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Category not found');
    }
    
    return true;
  } catch (error) {
    console.error('Delete category error:', error);
    throw error;
  }
};

// Get products in category
export const getCategoryProducts = async (categoryId, filters = {}) => {
  try {
    const { limit = 50, offset = 0 } = filters;
    
    const result = await pool.query(
      `SELECT 
        p.id, p.sku, p.name, p.slug, p.unit, p.price, p.is_active,
        i.stock_qty, i.reserved_qty,
        (SELECT url FROM agri.product_images WHERE product_id = p.id AND is_main = TRUE LIMIT 1) as image_url
       FROM agri.products p
       LEFT JOIN agri.inventory i ON i.product_id = p.id
       WHERE p.category_id = $1
       ORDER BY p.name ASC
       LIMIT $2 OFFSET $3`,
      [categoryId, limit, offset]
    );
    
    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM agri.products WHERE category_id = $1',
      [categoryId]
    );
    
    return {
      products: result.rows.map(row => ({
        ...row,
        price: parseFloat(row.price),
        stock_qty: parseFloat(row.stock_qty || 0),
        reserved_qty: parseFloat(row.reserved_qty || 0)
      })),
      total: parseInt(countResult.rows[0].count)
    };
  } catch (error) {
    console.error('Get category products error:', error);
    throw error;
  }
};

// Get category statistics
export const getCategoryStats = async (categoryId) => {
  try {
    const result = await pool.query(
      `SELECT 
        COUNT(p.id) as total_products,
        COUNT(CASE WHEN p.is_active = TRUE THEN 1 END) as active_products,
        COALESCE(SUM(i.stock_qty), 0) as total_stock
       FROM agri.products p
       LEFT JOIN agri.inventory i ON i.product_id = p.id
       WHERE p.category_id = $1`,
      [categoryId]
    );
    
    return {
      total_products: parseInt(result.rows[0].total_products),
      active_products: parseInt(result.rows[0].active_products),
      total_stock: parseFloat(result.rows[0].total_stock)
    };
  } catch (error) {
    console.error('Get category stats error:', error);
    throw error;
  }
};
