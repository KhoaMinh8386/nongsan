  import pool from '../config/db.js';

  export const getProducts = async (filters = {}) => {
    const {
      category_id,
      brand_id,
      min_price,
      max_price,
      search,
      page = 1,
      limit = 12,
      sort = 'created_at',
      order = 'desc'
    } = filters;

    const offset = (page - 1) * limit;
    const validSort = ['created_at', 'price', 'name'].includes(sort) ? sort : 'created_at';
    const validOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    let whereConditions = ['p.is_active = true'];
    let params = [];
    let paramIndex = 1;

    if (category_id) {
      whereConditions.push(`p.category_id = $${paramIndex++}`);
      params.push(category_id);
    }

    if (brand_id) {
      whereConditions.push(`p.brand_id = $${paramIndex++}`);
      params.push(brand_id);
    }

    if (min_price) {
      whereConditions.push(`p.price >= $${paramIndex++}`);
      params.push(min_price);
    }

    if (max_price) {
      whereConditions.push(`p.price <= $${paramIndex++}`);
      params.push(max_price);
    }

    // ✅ Search theo tên, mô tả, danh mục, thương hiệu
    if (search && search.trim()) {
      whereConditions.push(`(
        p.name ILIKE $${paramIndex} 
        OR p.short_desc ILIKE $${paramIndex}
        OR c.name ILIKE $${paramIndex}
        OR b.name ILIKE $${paramIndex}
      )`);
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count (với JOIN nếu có search)
    const countResult = await pool.query(
      `SELECT COUNT(*) as total
      FROM agri.products p
      LEFT JOIN agri.categories c ON c.id = p.category_id
      LEFT JOIN agri.brands b ON b.id = p.brand_id
      WHERE ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total);

    // Get products
    params.push(limit, offset);
    const result = await pool.query(
      `SELECT 
        p.id, p.sku, p.name, p.slug, p.price, p.discount_rate, p.unit, p.short_desc, p.is_active,
        (p.price * (1 - p.discount_rate / 100.0)) as final_price,
        c.id as category_id, c.name as category_name,
        b.id as brand_id, b.name as brand_name,
        i.stock_qty,
        p.image_url as main_image
      FROM agri.products p
      LEFT JOIN agri.categories c ON c.id = p.category_id
      LEFT JOIN agri.brands b ON b.id = p.brand_id
      LEFT JOIN agri.inventory i ON i.product_id = p.id
      WHERE ${whereClause}
      ORDER BY p.${validSort} ${validOrder}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    const products = result.rows.map(row => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      slug: row.slug,
      category: row.category_id ? { id: row.category_id, name: row.category_name } : null,
      brand: row.brand_id ? { id: row.brand_id, name: row.brand_name } : null,
      price: parseFloat(row.price),
      discount_rate: parseFloat(row.discount_rate),
      final_price: parseFloat(row.final_price),
      unit: row.unit,
      short_desc: row.short_desc,
      main_image: row.main_image,
      stock_qty: row.stock_qty ? parseFloat(row.stock_qty) : 0,
      is_active: row.is_active
    }));

    return {
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        total_pages: Math.ceil(total / limit)
      }
    };
  };

  export const getProductById = async (productId) => {
    const result = await pool.query(
      `SELECT 
        p.*,
        c.id as category_id, c.name as category_name,
        b.id as brand_id, b.name as brand_name,
        i.stock_qty, i.reserved_qty,
        (SELECT jsonb_agg(
          jsonb_build_object('id', pi.id, 'url', pi.url, 'is_main', pi.is_main, 'sort_order', pi.sort_order)
          ORDER BY pi.is_main DESC, pi.sort_order
        ) FROM agri.product_images pi WHERE pi.product_id = p.id) as images
      FROM agri.products p
      LEFT JOIN agri.categories c ON c.id = p.category_id
      LEFT JOIN agri.brands b ON b.id = p.brand_id
      LEFT JOIN agri.inventory i ON i.product_id = p.id
      WHERE p.id = $1`,
      [productId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    
    return {
      id: row.id,
      sku: row.sku,
      name: row.name,
      slug: row.slug,
      category: row.category_id ? { id: row.category_id, name: row.category_name } : null,
      brand: row.brand_id ? { id: row.brand_id, name: row.brand_name } : null,
      price: parseFloat(row.price),
      cost_price: parseFloat(row.cost_price),
      tax_rate: parseFloat(row.tax_rate),
      discount_rate: parseFloat(row.discount_rate),
      final_price: parseFloat(row.price * (1 - row.discount_rate / 100.0)),
      unit: row.unit,
      weight_gram: row.weight_gram,
      short_desc: row.short_desc,
      description: row.description,
      image_url: row.image_url,
      main_image: row.image_url, // Alias for compatibility
      images: row.images || [],
      stock_qty: row.stock_qty ? parseFloat(row.stock_qty) : 0,
      reserved_qty: row.reserved_qty ? parseFloat(row.reserved_qty) : 0,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  };

  export const createProduct = async (productData) => {
    const {
      sku, name, slug, category_id, brand_id, unit, price, cost_price,
      tax_rate, discount_rate, weight_gram, short_desc, description, initial_stock
    } = productData;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO agri.products 
        (sku, name, slug, category_id, brand_id, unit, price, cost_price, tax_rate, discount_rate, weight_gram, short_desc, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [sku, name, slug, category_id, brand_id, unit, price, cost_price || 0, tax_rate || 0, discount_rate || 0, weight_gram, short_desc, description]
      );

      const product = result.rows[0];

      // Initialize inventory if initial_stock provided
      if (initial_stock > 0) {
        await client.query('SELECT agri.kho_khoi_tao($1, $2)', [product.id, initial_stock]);
      }

      await client.query('COMMIT');
      return product;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  export const updateProduct = async (productId, productData) => {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    const allowedFields = ['name', 'slug', 'category_id', 'brand_id', 'price', 'cost_price', 
      'tax_rate', 'discount_rate', 'weight_gram', 'short_desc', 'description', 'is_active'];

    allowedFields.forEach(field => {
      if (productData[field] !== undefined) {
        fields.push(`${field} = $${paramIndex++}`);
        values.push(productData[field]);
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(productId);
    
    const result = await pool.query(
      `UPDATE agri.products
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *`,
      values
    );

    return result.rows[0] || null;
  };

  export const deleteProduct = async (productId) => {
    const result = await pool.query(
      'DELETE FROM agri.products WHERE id = $1 RETURNING id',
      [productId]
    );
    
    return result.rows.length > 0;
  };

  // Add product image
  export const addProductImage = async (productId, imageUrl, isMain = false) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // If setting as main image, unset other main images
      if (isMain) {
        await client.query(
          'UPDATE agri.product_images SET is_main = false WHERE product_id = $1',
          [productId]
        );
      }

      // Get max sort order
      const sortResult = await client.query(
        'SELECT COALESCE(MAX(sort_order), 0) as max_sort FROM agri.product_images WHERE product_id = $1',
        [productId]
      );
      const nextSortOrder = sortResult.rows[0].max_sort + 1;

      // Insert new image
      const result = await client.query(
        `INSERT INTO agri.product_images (product_id, url, is_main, sort_order)
        VALUES ($1, $2, $3, $4)
        RETURNING *`,
        [productId, imageUrl, isMain, nextSortOrder]
      );

      // Update product image_url if this is the main image
      if (isMain) {
        await client.query(
          'UPDATE agri.products SET image_url = $1 WHERE id = $2',
          [imageUrl, productId]
        );
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  // Delete product image
  export const deleteProductImage = async (imageId) => {
    const result = await pool.query(
      'DELETE FROM agri.product_images WHERE id = $1 RETURNING product_id',
      [imageId]
    );
    
    return result.rows.length > 0;
  };

  // Set main product image
  export const setMainProductImage = async (productId, imageId) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Unset all main images for this product
      await client.query(
        'UPDATE agri.product_images SET is_main = false WHERE product_id = $1',
        [productId]
      );

      // Set the specified image as main
      const result = await client.query(
        `UPDATE agri.product_images 
        SET is_main = true 
        WHERE id = $1 AND product_id = $2
        RETURNING url`,
        [imageId, productId]
      );

      if (result.rows.length === 0) {
        throw new Error('Image not found');
      }

      // Update product image_url
      await client.query(
        'UPDATE agri.products SET image_url = $1 WHERE id = $2',
        [result.rows[0].url, productId]
      );

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };
