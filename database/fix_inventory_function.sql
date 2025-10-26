-- FIX: Create missing inventory reservation function
-- Run this in pgAdmin or psql

\c nong_san_db
SET search_path TO agri, public;

-- Create the missing kiem_tra_va_giu_ton function
CREATE OR REPLACE FUNCTION agri.kiem_tra_va_giu_ton(p_order_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_item RECORD;
  v_available NUMERIC;
BEGIN
  -- Loop through all order items
  FOR v_item IN
    SELECT product_id, qty
    FROM agri.order_items
    WHERE order_id = p_order_id
  LOOP
    -- Check available stock
    SELECT stock_qty - reserved_qty INTO v_available
    FROM agri.inventory
    WHERE product_id = v_item.product_id;
    
    -- If not enough stock, raise exception
    IF v_available IS NULL OR v_available < v_item.qty THEN
      RAISE EXCEPTION 'Not enough stock for product %', v_item.product_id;
    END IF;
    
    -- Reserve the quantity
    UPDATE agri.inventory
    SET reserved_qty = reserved_qty + v_item.qty,
        updated_at = NOW()
    WHERE product_id = v_item.product_id;
    
    -- Log stock movement
    INSERT INTO agri.stock_movements (product_id, change_qty, reason, ref_id)
    VALUES (v_item.product_id, -v_item.qty, 'ORDER', p_order_id);
  END LOOP;
END$$;

-- Verify function created
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'agri'
  AND routine_name = 'kiem_tra_va_giu_ton';

SELECT 'Function created successfully!' as status;
