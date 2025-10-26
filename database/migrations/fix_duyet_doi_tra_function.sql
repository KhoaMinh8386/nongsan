-- Migration: Fix duyet_doi_tra function - SQL Error 42804
-- Date: 2025-10-26
-- Description: Cast payment_status enum values properly to avoid type mismatch error

CREATE OR REPLACE FUNCTION agri.duyet_doi_tra(p_return_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_order UUID;
  v_amt NUMERIC;
  r RECORD;
BEGIN
  -- Lock return record
  SELECT order_id, refund_amount 
  INTO v_order, v_amt
  FROM agri.returns 
  WHERE id = p_return_id 
  FOR UPDATE;

  -- Update return status
  UPDATE agri.returns 
  SET status = 'COMPLETED', updated_at = NOW() 
  WHERE id = p_return_id;

  -- Process each return item - restore inventory
  FOR r IN
    SELECT oi.product_id, ri.qty
    FROM agri.return_items ri
    JOIN agri.order_items oi ON oi.id = ri.order_item_id
    WHERE ri.return_id = p_return_id
  LOOP
    -- UPSERT inventory: INSERT if not exists, UPDATE if exists
    INSERT INTO agri.inventory (product_id, stock_qty, reserved_qty, updated_at)
    VALUES (r.product_id, r.qty, 0, NOW())
    ON CONFLICT (product_id) DO UPDATE
    SET 
      stock_qty = agri.inventory.stock_qty + EXCLUDED.stock_qty,
      updated_at = NOW();

    -- Record stock movement
    INSERT INTO agri.stock_movements(product_id, change_qty, reason, ref_id)
    VALUES (r.product_id, r.qty, 'RETURN', p_return_id);
  END LOOP;

  -- Update order payment status (FIX: Cast to proper enum type)
  IF v_amt > 0 THEN
    UPDATE agri.orders
    SET payment_status = CASE
      WHEN v_amt >= grand_total THEN 'REFUNDED'::agri.payment_status
      ELSE 'PARTIALLY_REFUNDED'::agri.payment_status
    END,
    updated_at = NOW()
    WHERE id = v_order;
  END IF;

  -- Send notification
  PERFORM pg_notify('return_approved', 
    json_build_object(
      'return_id', p_return_id,
      'order_id', v_order,
      'refund_amount', v_amt
    )::text
  );
END$$;
