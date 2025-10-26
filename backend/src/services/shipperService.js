import pool from '../config/db.js';

// Get all orders for shipper (PENDING or assigned to them)
export const getShipperOrders = async (shipperId) => {
  const result = await pool.query(
    `SELECT 
      o.id,
      o.order_code,
      o.customer_id,
      o.shipper_id,
      o.status,
      o.grand_total,
      o.shipping_recipient,
      o.shipping_phone,
      o.shipping_address,
      o.payment_method,
      o.created_at,
      o.updated_at,
      acc.full_name as customer_name
     FROM agri.orders o
     JOIN agri.accounts acc ON acc.id = o.customer_id
     WHERE o.status IN ('PENDING', 'PROCESSING', 'SHIPPING', 'DRIVER_ARRIVED')
       AND (o.shipper_id IS NULL OR o.shipper_id = $1)
     ORDER BY o.created_at ASC`,
    [shipperId]
  );
  
  return result.rows.map(row => ({
    ...row,
    grand_total: parseFloat(row.grand_total)
  }));
};

// Assign order to shipper and start delivery
export const startDelivery = async (shipperId, orderId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Call stored procedure
    await client.query(
      'SELECT agri.assign_shipper_to_order($1, $2)',
      [orderId, shipperId]
    );
    
    // Get updated order
    const result = await client.query(
      `SELECT o.*, a.full_name as customer_name
       FROM agri.orders o
       JOIN agri.accounts a ON a.id = o.customer_id
       WHERE o.id = $1`,
      [orderId]
    );
    
    await client.query('COMMIT');
    return result.rows[0]; // ✅ QUAN TRỌNG: Return order
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Update order status (shipper actions)
export const updateOrderStatus = async (shipperId, orderId, newStatus) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify order belongs to this shipper
    const checkResult = await client.query(
      `SELECT shipper_id, status, grand_total, payment_method FROM agri.orders WHERE id = $1`,
      [orderId]
    );
    
    if (checkResult.rows.length === 0) {
      throw new Error('Order not found');
    }
    
    const order = checkResult.rows[0];
    
    if (order.shipper_id !== shipperId) {
      throw new Error('Order not assigned to this shipper');
    }
    
    // Validate status transition
    const validTransitions = {
      'SHIPPING': ['DRIVER_ARRIVED', 'FAILED'],
      'DRIVER_ARRIVED': ['DELIVERED', 'FAILED']
    };
    
    if (!validTransitions[order.status] || !validTransitions[order.status].includes(newStatus)) {
      throw new Error(`Invalid status transition from ${order.status} to ${newStatus}`);
    }
    
    // Update status
    await client.query(
      `SELECT agri.update_order_status($1, $2::agri.order_status, $3)`,
      [orderId, newStatus, shipperId]
    );

    // Update payment status based on delivery result
    if (newStatus === 'DELIVERED') {
      // Successful delivery -> Mark as PAID
      await client.query(
        `UPDATE agri.orders 
         SET payment_status = 'PAID', updated_at = NOW()
         WHERE id = $1`,
        [orderId]
      );
    } else if (newStatus === 'FAILED') {
      // Failed delivery -> Mark as UNPAID (or keep as is)
      await client.query(
        `UPDATE agri.orders 
         SET payment_status = 'UNPAID', updated_at = NOW()
         WHERE id = $1`,
        [orderId]
      );
    }
    
    const result = await client.query(
      `SELECT 
        o.id,
        o.order_code,
        o.status,
        o.payment_status,
        o.customer_id
       FROM agri.orders o
       WHERE o.id = $1`,
      [orderId]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Get shipper's delivery history
export const getShipperHistory = async (shipperId) => {
  const result = await pool.query(
    `SELECT 
      o.id,
      o.order_code,
      o.status,
      o.grand_total,
      o.shipping_recipient,
      o.created_at,
      o.updated_at
     FROM agri.orders o
     WHERE o.shipper_id = $1
       AND o.status IN ('DELIVERED', 'FAILED')
     ORDER BY o.updated_at DESC
     LIMIT 50`,
    [shipperId]
  );
  
  return result.rows;
};

// Get shipper statistics
export const getShipperStats = async (shipperId) => {
  const result = await pool.query(
    `SELECT 
      COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END) as delivered_count,
      COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_count,
      COUNT(CASE WHEN status IN ('SHIPPING', 'DRIVER_ARRIVED') THEN 1 END) as active_count,
      COALESCE(SUM(CASE WHEN status = 'DELIVERED' THEN grand_total ELSE 0 END), 0) as total_delivered_amount
     FROM agri.orders
     WHERE shipper_id = $1`,
    [shipperId]
  );
  
  return {
    delivered_count: parseInt(result.rows[0].delivered_count),
    failed_count: parseInt(result.rows[0].failed_count),
    active_count: parseInt(result.rows[0].active_count),
    total_delivered_amount: parseFloat(result.rows[0].total_delivered_amount)
  };
};

// Get order detail for shipper
export const getOrderDetail = async (shipperId, orderId) => {
  const result = await pool.query(
    `SELECT 
      o.id, o.order_code, o.status, o.payment_status, o.customer_id, o.shipper_id,
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

  // Shipper can view orders that are unassigned OR assigned to them
  if (order.shipper_id && order.shipper_id !== shipperId) {
    throw new Error('Unauthorized to view this order');
  }

  // Get order items with product images
  const itemsResult = await pool.query(
    `SELECT oi.product_id, p.name, p.image_url, oi.qty, oi.unit_price, oi.discount_rate, oi.tax_rate, oi.line_total
     FROM agri.order_items oi
     JOIN agri.products p ON p.id = oi.product_id
     WHERE oi.order_id = $1`,
    [orderId]
  );

  return {
    id: order.id,
    order_code: order.order_code,
    status: order.status,
    payment_status: order.payment_status,
    customer: {
      id: order.customer_id,
      full_name: order.customer_name,
      email: order.customer_email,
      phone: order.customer_phone
    },
    shipping_address: order.recipient ? {
      recipient: order.recipient,
      phone: order.shipping_phone,
      address: [order.line1, order.line2, order.ward, order.district, order.city].filter(Boolean).join(', ')
    } : null,
    items: itemsResult.rows.map(item => ({
      product_id: item.product_id,
      name: item.name,
      image_url: item.image_url,
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
    created_at: order.created_at
  };
};
