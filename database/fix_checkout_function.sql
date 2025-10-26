-- FIX: Update create_order_from_cart function to use proper enum casting
-- Run this in pgAdmin or psql

\c nong_san_db
SET search_path TO agri, public;

CREATE OR REPLACE FUNCTION agri.create_order_from_cart(
  p_customer_id UUID,
  p_address_id UUID,
  p_payment_method agri.payment_method,
  p_note TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_order_id UUID;
  v_order_code TEXT;
  v_cart_id UUID;
  v_subtotal NUMERIC(14,2) := 0;
  v_tax_total NUMERIC(14,2) := 0;
  v_grand_total NUMERIC(14,2) := 0;
  v_addr agri.addresses%ROWTYPE;
BEGIN
  -- Get cart
  SELECT id INTO v_cart_id
  FROM agri.carts
  WHERE customer_id = p_customer_id
  LIMIT 1;
  
  IF v_cart_id IS NULL THEN
    RAISE EXCEPTION 'Cart not found for customer %', p_customer_id;
  END IF;
  
  -- Get address details
  SELECT * INTO v_addr
  FROM agri.addresses
  WHERE id = p_address_id AND account_id = p_customer_id;
  
  IF v_addr.id IS NULL THEN
    RAISE EXCEPTION 'Address not found or does not belong to customer';
  END IF;
  
  -- Generate order code
  v_order_code := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  
  -- Create order
  INSERT INTO agri.orders (
    order_code,
    customer_id,
    shipping_addr_id,
    payment_method,
    shipping_recipient,
    shipping_phone,
    shipping_address,
    status,
    payment_status,
    note
  ) VALUES (
    v_order_code,
    p_customer_id,
    p_address_id,
    p_payment_method,
    v_addr.recipient,
    v_addr.phone,
    CONCAT_WS(', ', v_addr.line1, v_addr.line2, v_addr.ward, v_addr.district, v_addr.city),
    'PENDING'::agri.order_status,
    'UNPAID'::agri.payment_status,
    p_note
  ) RETURNING id INTO v_order_id;
  
  -- Copy cart items to order items
  INSERT INTO agri.order_items (
    order_id,
    product_id,
    qty,
    unit_price,
    discount_rate,
    tax_rate,
    line_subtotal,
    line_tax,
    line_total
  )
  SELECT
    v_order_id,
    ci.product_id,
    ci.qty,
    p.price,
    p.discount_rate,
    p.tax_rate,
    ci.qty * p.price * (1 - p.discount_rate / 100.0) as line_subtotal,
    ci.qty * p.price * (1 - p.discount_rate / 100.0) * (p.tax_rate / 100.0) as line_tax,
    ci.qty * p.price * (1 - p.discount_rate / 100.0) * (1 + p.tax_rate / 100.0) as line_total
  FROM agri.cart_items ci
  JOIN agri.products p ON p.id = ci.product_id
  WHERE ci.cart_id = v_cart_id;
  
  -- Calculate totals
  SELECT
    COALESCE(SUM(line_subtotal), 0),
    COALESCE(SUM(line_tax), 0),
    COALESCE(SUM(line_total), 0)
  INTO v_subtotal, v_tax_total, v_grand_total
  FROM agri.order_items
  WHERE order_id = v_order_id;
  
  -- Update order totals
  UPDATE agri.orders
  SET
    subtotal = v_subtotal,
    tax_total = v_tax_total,
    grand_total = v_grand_total
  WHERE id = v_order_id;
  
  -- Clear cart
  DELETE FROM agri.cart_items WHERE cart_id = v_cart_id;
  
  -- Reserve inventory
  PERFORM agri.kiem_tra_va_giu_ton(v_order_id);
  
  RETURN v_order_id;
END$$;

-- Verify function updated
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'agri'
  AND routine_name = 'create_order_from_cart';
