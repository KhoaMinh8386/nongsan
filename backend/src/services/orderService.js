import pool from '../config/db.js';

export const createOrder = async (customerId, orderData) => {
  const { shipping_address_id, items, shipping_fee, discount_total, note } = orderData;
  
  const itemsJson = JSON.stringify(items);
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      'SELECT agri.tao_don_hang($1, $2, $3::jsonb, $4, $5) as order_id',
      [customerId, shipping_address_id, itemsJson, shipping_fee || 0, discount_total || 0]
    );

    const orderId = result.rows[0].order_id;

    if (note) {
      await client.query(
        'UPDATE agri.orders SET note = $1 WHERE id = $2',
        [note, orderId]
      );
    }

    // Get order details
    const orderResult = await client.query(
      'SELECT id, order_code, grand_total FROM agri.orders WHERE id = $1',
      [orderId]
    );

    await client.query('COMMIT');
    return orderResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getOrders = async (userId, role, filters = {}) => {
  const { status, page = 1, limit = 10 } = filters;
  const offset = (page - 1) * limit;

  let whereConditions = [];
  let params = [];
  let paramIndex = 1;

  if (role === 'CUSTOMER') {
    whereConditions.push(`customer_id = $${paramIndex++}`);
    params.push(userId);
  }

  if (status) {
    whereConditions.push(`status = $${paramIndex++}`);
    params.push(status);
  }

  const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

  // Get total count
  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM agri.orders ${whereClause}`,
    params
  );

  const total = parseInt(countResult.rows[0].total);

  // Get orders with item count
  params.push(limit, offset);
  const result = await pool.query(
    `SELECT o.id, o.order_code, o.status, o.payment_status, o.grand_total, o.created_at,
            a.full_name as customer_name,
            COALESCE(
              (SELECT COUNT(*) FROM agri.order_items oi WHERE oi.order_id = o.id), 
              0
            ) as total_items
     FROM agri.orders o
     JOIN agri.accounts a ON a.id = o.customer_id
     ${whereClause}
     ORDER BY o.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    params
  );

  return {
    orders: result.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      total_pages: Math.ceil(total / limit)
    }
  };
};

export const getOrderDetail = async (orderId, userId, role) => {
  try {
    const result = await pool.query(
      `SELECT 
        o.id, o.order_code, o.status, o.payment_status, o.payment_method, o.customer_id,
        o.subtotal, o.tax_total, o.shipping_fee, o.discount_total, o.grand_total, o.note, o.created_at,
        a.full_name as customer_name, a.email as customer_email, a.phone as customer_phone,
        addr.recipient, addr.phone as shipping_phone, addr.line1, addr.line2, addr.ward, addr.district, addr.city
       FROM agri.orders o
       JOIN agri.accounts a ON a.id = o.customer_id
       LEFT JOIN agri.addresses addr ON addr.id = o.shipping_addr_id
       WHERE o.id = $1`,
      [orderId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const order = result.rows[0];

    // Authorization check
    if (role === 'CUSTOMER' && order.customer_id !== userId) {
      throw new Error('Unauthorized to view this order');
    }

    // Get order items
    const itemsResult = await pool.query(
      `SELECT oi.id, oi.product_id, p.name as product_name, p.unit, p.image_url, 
              oi.qty, oi.unit_price, oi.discount_rate, oi.tax_rate, oi.line_total
       FROM agri.order_items oi
       JOIN agri.products p ON p.id = oi.product_id
       WHERE oi.order_id = $1`,
      [orderId]
    );

    // Get status history (with fallback if table doesn't exist)
    let historyResult;
    try {
      historyResult = await pool.query(
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
    } catch (historyError) {
      console.warn('Could not fetch order status history:', historyError.message);
      historyResult = { rows: [] };
    }

    return {
      id: order.id,
      order_code: order.order_code,
      status: order.status,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      shipping_recipient: order.recipient,
      shipping_phone: order.shipping_phone,
      shipping_address: order.recipient ? [order.line1, order.line2, order.ward, order.district, order.city].filter(Boolean).join(', ') : null,
      items: itemsResult.rows.map(item => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        unit: item.unit,
        image: item.image_url,
        qty: parseFloat(item.qty),
        unit_price: parseFloat(item.unit_price),
        discount_rate: parseFloat(item.discount_rate),
        tax_rate: parseFloat(item.tax_rate),
        line_total: parseFloat(item.line_total)
      })),
      subtotal: parseFloat(order.subtotal),
      tax_total: parseFloat(order.tax_total),
      shipping_fee: parseFloat(order.shipping_fee),
      discount_total: parseFloat(order.discount_total),
      grand_total: parseFloat(order.grand_total),
      note: order.note,
      created_at: order.created_at,
      status_history: historyResult.rows
    };
  } catch (error) {
    console.error('Error in getOrderDetail:', error);
    throw error;
  }
};

export const updateOrderStatus = async (orderId, newStatus) => {
  await pool.query(
    'SELECT agri.cap_nhat_trang_thai_don($1, $2::agri.order_status)',
    [orderId, newStatus]
  );
  
  return true;
};

export const markOrderPaid = async (orderId, paymentData) => {
  const { amount, method, txn_ref } = paymentData;
  
  await pool.query(
    'SELECT agri.danh_dau_thanh_toan($1, $2, $3, $4)',
    [orderId, amount, method, txn_ref || null]
  );
  
  return true;
};

// Customer confirms they have transferred money
export const customerConfirmPayment = async (orderId, userId) => {
  // Update order to show customer has confirmed payment
  await pool.query(
    `UPDATE agri.orders 
     SET payment_status = 'PENDING_CONFIRMATION'::agri.payment_status,
         updated_at = NOW()
     WHERE id = $1 AND customer_id = $2 AND payment_method = 'BANK_TRANSFER'`,
    [orderId, userId]
  );
  
  return true;
};

// Admin confirms payment received
export const adminConfirmPayment = async (orderId, paymentData) => {
  const { amount, txn_ref, note } = paymentData;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get order info
    const orderResult = await client.query(
      'SELECT grand_total, payment_method FROM agri.orders WHERE id = $1',
      [orderId]
    );
    
    if (orderResult.rows.length === 0) {
      throw new Error('Order not found');
    }
    
    const orderTotal = parseFloat(orderResult.rows[0].grand_total);
    const paidAmount = amount || orderTotal;
    const paymentMethod = orderResult.rows[0].payment_method;
    
    // Insert payment record
    await client.query(
      `INSERT INTO agri.payments (order_id, method, amount, paid_at, txn_ref)
       VALUES ($1, $2, $3, NOW(), $4)`,
      [orderId, paymentMethod, paidAmount, txn_ref || null]
    );
    
    // Update order payment status to PAID
    await client.query(
      `UPDATE agri.orders 
       SET payment_status = 'PAID'::agri.payment_status,
           updated_at = NOW()
       WHERE id = $1`,
      [orderId]
    );
    
    // Add admin note if provided
    if (note) {
      await client.query(
        `UPDATE agri.orders 
         SET note = COALESCE(note || E'\\n', '') || $1
         WHERE id = $2`,
        [`[Admin xác nhận thanh toán: ${note}]`, orderId]
      );
    }
    
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in adminConfirmPayment:', error);
    throw error;
  } finally {
    client.release();
  }
};
