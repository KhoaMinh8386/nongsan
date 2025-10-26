import pool from '../config/db.js';

export const createReturn = async (userId, returnData) => {
  const { order_id, reason, items } = returnData;
  
  const itemsJson = JSON.stringify(items);
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const result = await client.query(
      'SELECT agri.tao_yeu_cau_doi_tra($1, $2, $3, $4::jsonb) as return_id',
      [order_id, userId, reason, itemsJson]
    );
    
    const returnId = result.rows[0].return_id;
    
    const returnResult = await client.query(
      'SELECT id, status, refund_amount FROM agri.returns WHERE id = $1',
      [returnId]
    );
    
    // Get order info for notification
    const orderResult = await client.query(
      'SELECT order_code, customer_id FROM agri.orders WHERE id = $1',
      [order_id]
    );
    
    // Emit return_requested event via NOTIFY
    if (orderResult.rows.length > 0) {
      const notifyPayload = {
        return_id: returnId,
        order_id: order_id,
        order_code: orderResult.rows[0].order_code,
        customer_id: orderResult.rows[0].customer_id,
        reason: reason
      };
      
      await client.query(
        "SELECT pg_notify('return_requested', $1)",
        [JSON.stringify(notifyPayload)]
      );
    }
    
    await client.query('COMMIT');
    return returnResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getReturns = async (userId, role) => {
  let query;
  let params;

  if (role === 'CUSTOMER') {
    query = `
      SELECT r.id, r.order_id, r.status, r.reason, r.refund_amount, r.created_at,
             o.order_code
      FROM agri.returns r
      JOIN agri.orders o ON o.id = r.order_id
      WHERE r.request_by = $1
      ORDER BY r.created_at DESC
    `;
    params = [userId];
  } else {
    query = `
      SELECT r.id, r.order_id, r.status, r.reason, r.refund_amount, r.created_at,
             o.order_code, a.full_name as customer_name
      FROM agri.returns r
      JOIN agri.orders o ON o.id = r.order_id
      JOIN agri.accounts a ON a.id = r.request_by
      ORDER BY r.created_at DESC
    `;
    params = [];
  }

  const result = await pool.query(query, params);
  
  // Get return items for each return
  const returns = await Promise.all(result.rows.map(async (row) => {
    const itemsResult = await pool.query(
      `SELECT 
        ri.id, ri.order_item_id, ri.qty, ri.refund_line,
        p.name as product_name, p.unit
       FROM agri.return_items ri
       JOIN agri.order_items oi ON oi.id = ri.order_item_id
       JOIN agri.products p ON p.id = oi.product_id
       WHERE ri.return_id = $1`,
      [row.id]
    );

    return {
      id: row.id,
      order_id: row.order_id,
      order_code: row.order_code,
      customer_name: row.customer_name,
      status: row.status,
      reason: row.reason,
      refund_amount: parseFloat(row.refund_amount),
      created_at: row.created_at,
      items: itemsResult.rows.map(item => ({
        id: item.id,
        order_item_id: item.order_item_id,
        product_name: item.product_name,
        unit: item.unit,
        qty: parseFloat(item.qty),
        refund_line: parseFloat(item.refund_line)
      }))
    };
  }));
  
  return returns;
};

export const approveReturn = async (returnId) => {
  await pool.query('SELECT agri.duyet_doi_tra($1)', [returnId]);
  return true;
};

export const rejectReturn = async (returnId) => {
  await pool.query(
    `UPDATE agri.returns 
     SET status = 'REJECTED', updated_at = NOW() 
     WHERE id = $1`,
    [returnId]
  );
  return true;
};
