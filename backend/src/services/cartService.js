import pool from '../config/db.js';

export const getCart = async (customerId) => {
  const result = await pool.query(
    `SELECT 
      c.id as cart_id,
      ci.product_id, p.name, p.price, p.discount_rate, p.unit, ci.qty,
      (p.price * (1 - p.discount_rate / 100.0) * ci.qty) as line_total,
      (SELECT url FROM agri.product_images WHERE product_id = p.id AND is_main = true LIMIT 1) as image
     FROM agri.carts c
     JOIN agri.cart_items ci ON ci.cart_id = c.id
     JOIN agri.products p ON p.id = ci.product_id
     WHERE c.customer_id = $1`,
    [customerId]
  );

  const items = result.rows.map(row => ({
    product_id: row.product_id,
    name: row.name,
    price: parseFloat(row.price),
    discount_rate: parseFloat(row.discount_rate),
    unit: row.unit,
    qty: parseFloat(row.qty),
    line_total: parseFloat(row.line_total),
    image: row.image
  }));

  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);

  return {
    cart_id: result.rows[0]?.cart_id || null,
    items,
    total_items: items.length,
    subtotal
  };
};

export const updateCart = async (customerId, items) => {
  const itemsJson = JSON.stringify(items);
  
  await pool.query(
    'SELECT agri.cap_nhat_gio_hang($1, $2::jsonb)',
    [customerId, itemsJson]
  );
  
  return true;
};

export const clearCart = async (customerId) => {
  const result = await pool.query(
    'SELECT id FROM agri.carts WHERE customer_id = $1',
    [customerId]
  );

  if (result.rows.length > 0) {
    await pool.query(
      'DELETE FROM agri.cart_items WHERE cart_id = $1',
      [result.rows[0].id]
    );
  }

  return true;
};
