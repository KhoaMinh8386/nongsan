import pool from '../config/db.js';

// Get all import receipts with filters
export const getImportReceipts = async (filters = {}) => {
  const {
    supplier_id,
    status,
    date_from,
    date_to,
    page = 1,
    limit = 20
  } = filters;

  const offset = (page - 1) * limit;
  let whereConditions = [];
  let params = [];
  let paramIndex = 1;

  if (supplier_id) {
    whereConditions.push(`ir.supplier_id = $${paramIndex++}`);
    params.push(supplier_id);
  }

  if (status) {
    whereConditions.push(`ir.status = $${paramIndex++}`);
    params.push(status);
  }

  if (date_from) {
    whereConditions.push(`ir.created_at >= $${paramIndex++}`);
    params.push(date_from);
  }

  if (date_to) {
    whereConditions.push(`ir.created_at <= $${paramIndex++}`);
    params.push(date_to);
  }

  const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

  // Get total count
  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM agri.import_receipts ir ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);

  // Get import receipts with supplier info
  params.push(limit, offset);
  const result = await pool.query(
    `SELECT 
      ir.id, ir.code, ir.supplier_id, ir.created_by, ir.status,
      ir.total_qty, ir.total_cost, ir.note, ir.created_at, ir.approved_at,
      s.name as supplier_name,
      a.full_name as created_by_name,
      (SELECT COUNT(*) FROM agri.import_receipt_items WHERE receipt_id = ir.id) as items_count
     FROM agri.import_receipts ir
     LEFT JOIN agri.suppliers s ON s.id = ir.supplier_id
     LEFT JOIN agri.accounts a ON a.id = ir.created_by
     ${whereClause}
     ORDER BY ir.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    params
  );

  return {
    receipts: result.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      total_pages: Math.ceil(total / limit)
    }
  };
};

// Get import receipt by ID with items
export const getImportReceiptById = async (receiptId) => {
  const receiptResult = await pool.query(
    `SELECT 
      ir.id, ir.code, ir.supplier_id, ir.created_by, ir.status,
      ir.total_qty, ir.total_cost, ir.note, ir.created_at, ir.approved_at,
      s.name as supplier_name, s.contact_name, s.phone as supplier_phone,
      a.full_name as created_by_name
     FROM agri.import_receipts ir
     LEFT JOIN agri.suppliers s ON s.id = ir.supplier_id
     LEFT JOIN agri.accounts a ON a.id = ir.created_by
     WHERE ir.id = $1`,
    [receiptId]
  );

  if (receiptResult.rows.length === 0) {
    return null;
  }

  const receipt = receiptResult.rows[0];

  // Get receipt items
  const itemsResult = await pool.query(
    `SELECT 
      iri.id, iri.product_id, iri.qty, iri.unit_cost, iri.line_total, iri.note,
      p.name as product_name, p.sku, p.unit
     FROM agri.import_receipt_items iri
     JOIN agri.products p ON p.id = iri.product_id
     WHERE iri.receipt_id = $1
     ORDER BY iri.id`,
    [receiptId]
  );

  receipt.items = itemsResult.rows.map(item => ({
    id: item.id,
    product_id: item.product_id,
    product_name: item.product_name,
    sku: item.sku,
    unit: item.unit,
    qty: parseFloat(item.qty),
    unit_cost: parseFloat(item.unit_cost),
    line_total: parseFloat(item.line_total),
    note: item.note
  }));

  return receipt;
};

// Generate receipt code
const generateReceiptCode = async () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  const result = await pool.query(
    `SELECT COUNT(*) as count 
     FROM agri.import_receipts 
     WHERE code LIKE $1`,
    [`PN-${year}-${month}-%`]
  );
  
  const count = parseInt(result.rows[0].count) + 1;
  const sequence = String(count).padStart(3, '0');
  
  return `PN-${year}-${month}-${sequence}`;
};

// Create import receipt (DRAFT status)
export const createImportReceipt = async (receiptData, userId) => {
  const { supplier_id, note, items } = receiptData;

  if (!items || items.length === 0) {
    throw new Error('Import receipt must have at least one item');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Generate receipt code
    const code = await generateReceiptCode();

    // Create receipt
    const receiptResult = await client.query(
      `INSERT INTO agri.import_receipts (code, supplier_id, created_by, status, note)
       VALUES ($1, $2, $3, 'DRAFT', $4)
       RETURNING id`,
      [code, supplier_id, userId, note || null]
    );

    const receiptId = receiptResult.rows[0].id;

    // Insert items
    let totalQty = 0;
    let totalCost = 0;

    for (const item of items) {
      const { product_id, qty, unit_cost, note: itemNote } = item;

      if (!product_id || qty <= 0 || unit_cost < 0) {
        throw new Error('Invalid item data');
      }

      await client.query(
        `INSERT INTO agri.import_receipt_items (receipt_id, product_id, qty, unit_cost, note)
         VALUES ($1, $2, $3, $4, $5)`,
        [receiptId, product_id, qty, unit_cost, itemNote || null]
      );

      totalQty += parseFloat(qty);
      totalCost += parseFloat(qty) * parseFloat(unit_cost);
    }

    // Update receipt totals
    await client.query(
      `UPDATE agri.import_receipts
       SET total_qty = $1, total_cost = $2
       WHERE id = $3`,
      [totalQty, totalCost, receiptId]
    );

    await client.query('COMMIT');

    return await getImportReceiptById(receiptId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Update import receipt (only DRAFT status can be updated)
export const updateImportReceipt = async (receiptId, receiptData) => {
  const { supplier_id, note, items } = receiptData;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if receipt is DRAFT
    const checkResult = await client.query(
      'SELECT status FROM agri.import_receipts WHERE id = $1 FOR UPDATE',
      [receiptId]
    );

    if (checkResult.rows.length === 0) {
      throw new Error('Import receipt not found');
    }

    if (checkResult.rows[0].status !== 'DRAFT') {
      throw new Error('Can only update DRAFT receipts');
    }

    // Update receipt header
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (supplier_id !== undefined) {
      updateFields.push(`supplier_id = $${paramIndex++}`);
      updateValues.push(supplier_id);
    }

    if (note !== undefined) {
      updateFields.push(`note = $${paramIndex++}`);
      updateValues.push(note);
    }

    if (updateFields.length > 0) {
      updateValues.push(receiptId);
      await client.query(
        `UPDATE agri.import_receipts SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
        updateValues
      );
    }

    // Update items if provided
    if (items && items.length > 0) {
      // Delete old items
      await client.query(
        'DELETE FROM agri.import_receipt_items WHERE receipt_id = $1',
        [receiptId]
      );

      // Insert new items
      let totalQty = 0;
      let totalCost = 0;

      for (const item of items) {
        const { product_id, qty, unit_cost, note: itemNote } = item;

        if (!product_id || qty <= 0 || unit_cost < 0) {
          throw new Error('Invalid item data');
        }

        await client.query(
          `INSERT INTO agri.import_receipt_items (receipt_id, product_id, qty, unit_cost, note)
           VALUES ($1, $2, $3, $4, $5)`,
          [receiptId, product_id, qty, unit_cost, itemNote || null]
        );

        totalQty += parseFloat(qty);
        totalCost += parseFloat(qty) * parseFloat(unit_cost);
      }

      // Update receipt totals
      await client.query(
        `UPDATE agri.import_receipts SET total_qty = $1, total_cost = $2 WHERE id = $3`,
        [totalQty, totalCost, receiptId]
      );
    }

    await client.query('COMMIT');

    return await getImportReceiptById(receiptId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Approve import receipt (update stock)
export const approveImportReceipt = async (receiptId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if receipt is DRAFT
    const checkResult = await client.query(
      'SELECT status FROM agri.import_receipts WHERE id = $1 FOR UPDATE',
      [receiptId]
    );

    if (checkResult.rows.length === 0) {
      throw new Error('Import receipt not found');
    }

    if (checkResult.rows[0].status !== 'DRAFT') {
      throw new Error('Receipt is already approved or cancelled');
    }

    // Get receipt items
    const itemsResult = await client.query(
      'SELECT product_id, qty, unit_cost FROM agri.import_receipt_items WHERE receipt_id = $1',
      [receiptId]
    );

    // Update stock for each item
    for (const item of itemsResult.rows) {
      // Check if inventory record exists
      const invCheck = await client.query(
        'SELECT product_id FROM agri.inventory WHERE product_id = $1',
        [item.product_id]
      );

      if (invCheck.rows.length === 0) {
        // Create inventory record
        await client.query(
          'INSERT INTO agri.inventory (product_id, stock_qty, reserved_qty) VALUES ($1, 0, 0)',
          [item.product_id]
        );
      }

      // Update stock
      await client.query(
        'UPDATE agri.inventory SET stock_qty = stock_qty + $1, updated_at = NOW() WHERE product_id = $2',
        [item.qty, item.product_id]
      );

      // Log stock movement
      await client.query(
        `INSERT INTO agri.stock_movements (product_id, change_qty, reason, ref_id)
         VALUES ($1, $2, 'IMPORT', $3)`,
        [item.product_id, item.qty, receiptId]
      );

      // Update product cost_price
      await client.query(
        'UPDATE agri.products SET cost_price = $1, updated_at = NOW() WHERE id = $2',
        [item.unit_cost, item.product_id]
      );
    }

    // Update receipt status
    await client.query(
      `UPDATE agri.import_receipts SET status = 'APPROVED', approved_at = NOW() WHERE id = $1`,
      [receiptId]
    );

    await client.query('COMMIT');

    return await getImportReceiptById(receiptId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Cancel import receipt
export const cancelImportReceipt = async (receiptId) => {
  const result = await pool.query(
    `UPDATE agri.import_receipts SET status = 'CANCELLED' WHERE id = $1 AND status = 'DRAFT' RETURNING id`,
    [receiptId]
  );

  if (result.rows.length === 0) {
    throw new Error('Cannot cancel receipt. It may not exist or is already approved.');
  }

  return await getImportReceiptById(receiptId);
};

// Delete import receipt (only DRAFT)
export const deleteImportReceipt = async (receiptId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if receipt is DRAFT
    const checkResult = await client.query(
      'SELECT status FROM agri.import_receipts WHERE id = $1',
      [receiptId]
    );

    if (checkResult.rows.length === 0) {
      throw new Error('Import receipt not found');
    }

    if (checkResult.rows[0].status !== 'DRAFT') {
      throw new Error('Can only delete DRAFT receipts');
    }

    // Delete items first
    await client.query('DELETE FROM agri.import_receipt_items WHERE receipt_id = $1', [receiptId]);

    // Delete receipt
    await client.query('DELETE FROM agri.import_receipts WHERE id = $1', [receiptId]);

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
