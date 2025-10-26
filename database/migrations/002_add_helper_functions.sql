-- =============================================================
-- MIGRATION 002: Helper Functions for Order & User Management
-- Database: nong_san_db
-- =============================================================

\c nong_san_db
SET search_path TO agri, public;

-- =============================================================
-- 1) FUNCTION: Get user default address
-- =============================================================

CREATE OR REPLACE FUNCTION agri.get_user_default_address(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  label TEXT,
  recipient TEXT,
  phone VARCHAR(20),
  full_address TEXT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.label,
    a.recipient,
    a.phone,
    CONCAT_WS(', ',
      a.line1,
      a.line2,
      a.ward,
      a.district,
      a.city
    ) as full_address
  FROM agri.addresses a
  WHERE a.account_id = p_user_id
    AND a.is_default = TRUE
  LIMIT 1;
END$$;

-- =============================================================
-- 2) FUNCTION: Get user default phone
-- =============================================================

CREATE OR REPLACE FUNCTION agri.get_user_default_phone(p_user_id UUID)
RETURNS VARCHAR(20) LANGUAGE plpgsql AS $$
DECLARE
  v_phone VARCHAR(20);
BEGIN
  SELECT phone INTO v_phone
  FROM agri.user_phones
  WHERE account_id = p_user_id
    AND is_default = TRUE
  LIMIT 1;
  
  -- Fallback to account phone if no default
  IF v_phone IS NULL THEN
    SELECT phone INTO v_phone
    FROM agri.accounts
    WHERE id = p_user_id;
  END IF;
  
  RETURN v_phone;
END$$;

-- =============================================================
-- 3) FUNCTION: Create order from cart
-- =============================================================

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

-- =============================================================
-- 4) FUNCTION: Assign shipper to order
-- =============================================================

CREATE OR REPLACE FUNCTION agri.assign_shipper_to_order(
  p_order_id UUID,
  p_shipper_id UUID
)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
  v_shipper_role agri.user_role;
BEGIN
  -- Verify shipper role
  SELECT role INTO v_shipper_role
  FROM agri.accounts
  WHERE id = p_shipper_id;
  
  IF v_shipper_role != 'SHIPPER' THEN
    RAISE EXCEPTION 'User % is not a shipper', p_shipper_id;
  END IF;
  
  -- Assign shipper and update status
  UPDATE agri.orders
  SET
    shipper_id = p_shipper_id,
    status = 'SHIPPING'
  WHERE id = p_order_id
    AND status IN ('PENDING', 'PROCESSING');
  
  RETURN TRUE;
END$$;

-- =============================================================
-- 5) FUNCTION: Update order status (with validation)
-- =============================================================

CREATE OR REPLACE FUNCTION agri.update_order_status(
  p_order_id UUID,
  p_new_status agri.order_status,
  p_user_id UUID DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
  v_current_status agri.order_status;
BEGIN
  SELECT status INTO v_current_status
  FROM agri.orders
  WHERE id = p_order_id;
  
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  -- Status transition validation
  -- PENDING -> PROCESSING (Admin confirms)
  -- PROCESSING -> SHIPPING (Shipper starts delivery)
  -- SHIPPING -> DRIVER_ARRIVED (Shipper arrives)
  -- DRIVER_ARRIVED -> DELIVERED or FAILED
  
  UPDATE agri.orders
  SET status = p_new_status
  WHERE id = p_order_id;
  
  -- Log to history if note provided
  IF p_note IS NOT NULL THEN
    UPDATE agri.order_status_history
    SET note = p_note, changed_by = p_user_id
    WHERE order_id = p_order_id
      AND new_status = p_new_status
      AND created_at = (
        SELECT MAX(created_at)
        FROM agri.order_status_history
        WHERE order_id = p_order_id
      );
  END IF;
  
  RETURN TRUE;
END$$;

-- =============================================================
-- 6) FUNCTION: Confirm revenue (Admin only)
-- =============================================================

CREATE OR REPLACE FUNCTION agri.confirm_order_revenue(
  p_order_id UUID,
  p_admin_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
  v_amount NUMERIC(14,2);
  v_status agri.order_status;
BEGIN
  -- Get order details
  SELECT status, grand_total
  INTO v_status, v_amount
  FROM agri.orders
  WHERE id = p_order_id;
  
  IF v_status != 'DELIVERED' THEN
    RAISE EXCEPTION 'Can only confirm revenue for delivered orders';
  END IF;
  
  -- Check if already confirmed
  IF EXISTS (SELECT 1 FROM agri.revenue_records WHERE order_id = p_order_id) THEN
    RAISE EXCEPTION 'Revenue already confirmed for this order';
  END IF;
  
  -- Create revenue record
  INSERT INTO agri.revenue_records (order_id, amount, confirmed_by, note)
  VALUES (p_order_id, v_amount, p_admin_id, p_note);
  
  -- Update payment status
  UPDATE agri.orders
  SET payment_status = 'PAID'
  WHERE id = p_order_id;
  
  RETURN TRUE;
END$$;

-- =============================================================
-- HELPER FUNCTIONS COMPLETE
-- =============================================================
