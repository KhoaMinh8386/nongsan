import pool from '../config/db.js';

export const createOrderFromCart = async (userId, checkoutData) => {
  const { address_id, payment_method, note } = checkoutData;
  
  // Validate payment method
  if (!['COD', 'BANK_TRANSFER'].includes(payment_method)) {
    throw new Error('Invalid payment method');
  }
  
  try {
    // Call PostgreSQL function to create order
    const result = await pool.query(
      `SELECT agri.create_order_from_cart($1, $2, $3::agri.payment_method, $4) as order_id`,
      [userId, address_id, payment_method, note || null]
    );
    
    const orderId = result.rows[0].order_id;
    
    // Get full order details
    const orderResult = await pool.query(
      `SELECT 
        o.id,
        o.order_code,
        o.status,
        o.payment_status,
        o.payment_method,
        o.subtotal,
        o.tax_total,
        o.grand_total,
        o.shipping_recipient,
        o.shipping_phone,
        o.shipping_address,
        o.note,
        o.created_at
       FROM agri.orders o
       WHERE o.id = $1`,
      [orderId]
    );
    
    if (orderResult.rows.length === 0) {
      throw new Error('Order created but not found');
    }
    
    const order = orderResult.rows[0];
    
    // Get order items
    const itemsResult = await pool.query(
      `SELECT 
        oi.id,
        oi.product_id,
        p.name as product_name,
        oi.qty,
        oi.unit_price,
        oi.discount_rate,
        oi.line_total
       FROM agri.order_items oi
       JOIN agri.products p ON p.id = oi.product_id
       WHERE oi.order_id = $1`,
      [orderId]
    );
    
    order.items = itemsResult.rows;
    
    return order;
    
  } catch (error) {
    // If it's a known error from function, rethrow
    if (error.message.includes('Cart not found') || 
        error.message.includes('Address not found')) {
      throw error;
    }
    
    // Otherwise wrap it
    throw new Error('Failed to create order: ' + error.message);
  }
};

export const getOrderById = async (userId, orderId, userRole) => {
  let query;
  let params;
  
  if (userRole === 'ADMIN' || userRole === 'STAFF') {
    // Admin can see any order
    query = `
      SELECT 
        o.id,
        o.order_code,
        o.customer_id,
        o.shipper_id,
        o.status,
        o.payment_status,
        o.payment_method,
        o.subtotal,
        o.tax_total,
        o.grand_total,
        o.shipping_recipient,
        o.shipping_phone,
        o.shipping_address,
        o.note,
        o.created_at,
        o.updated_at,
        acc.full_name as customer_name,
        acc.email as customer_email,
        shipper.full_name as shipper_name
       FROM agri.orders o
       JOIN agri.accounts acc ON acc.id = o.customer_id
       LEFT JOIN agri.accounts shipper ON shipper.id = o.shipper_id
       WHERE o.id = $1
    `;
    params = [orderId];
  } else {
    // Customer can only see their own order
    query = `
      SELECT 
        o.id,
        o.order_code,
        o.status,
        o.payment_status,
        o.payment_method,
        o.subtotal,
        o.tax_total,
        o.grand_total,
        o.shipping_recipient,
        o.shipping_phone,
        o.shipping_address,
        o.note,
        o.created_at,
        o.updated_at
       FROM agri.orders o
       WHERE o.id = $1 AND o.customer_id = $2
    `;
    params = [orderId, userId];
  }
  
  const result = await pool.query(query, params);
  
  if (result.rows.length === 0) {
    throw new Error('Order not found');
  }
  
  const order = result.rows[0];
  
  // Get order items
  const itemsResult = await pool.query(
    `SELECT 
      oi.id,
      oi.product_id,
      p.name as product_name,
      p.unit,
      p.image_url as image,
      oi.qty,
      oi.unit_price,
      oi.discount_rate,
      oi.line_subtotal,
      oi.line_tax,
      oi.line_total
     FROM agri.order_items oi
     JOIN agri.products p ON p.id = oi.product_id
     WHERE oi.order_id = $1`,
    [orderId]
  );
  
  order.items = itemsResult.rows;
  
  // Get status history
  const historyResult = await pool.query(
    `SELECT 
      old_status,
      new_status,
      note,
      created_at
     FROM agri.order_status_history
     WHERE order_id = $1
     ORDER BY created_at ASC`,
    [orderId]
  );
  
  order.status_history = historyResult.rows;
  
  return order;
};
