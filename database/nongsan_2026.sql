--
-- PostgreSQL database dump
--

\restrict lj8W7JOJwhAR39vRtcLcDZOaCpCzQWZ2RmBlkADegGPNEoQQ1m5bXGQVNdNdzD4

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: agri; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA agri;


ALTER SCHEMA agri OWNER TO postgres;

--
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA agri;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: unaccent; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;


--
-- Name: EXTENSION unaccent; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION unaccent IS 'text search dictionary that removes accents';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: order_status; Type: TYPE; Schema: agri; Owner: postgres
--

CREATE TYPE agri.order_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'SHIPPING',
    'DRIVER_ARRIVED',
    'DELIVERED',
    'FAILED',
    'CANCELLED',
    'RETURN_REQUESTED',
    'RETURNED'
);


ALTER TYPE agri.order_status OWNER TO postgres;

--
-- Name: payment_method; Type: TYPE; Schema: agri; Owner: postgres
--

CREATE TYPE agri.payment_method AS ENUM (
    'COD',
    'BANK_TRANSFER'
);


ALTER TYPE agri.payment_method OWNER TO postgres;

--
-- Name: payment_status; Type: TYPE; Schema: agri; Owner: postgres
--

CREATE TYPE agri.payment_status AS ENUM (
    'UNPAID',
    'PENDING_CONFIRMATION',
    'PAID',
    'REFUNDED',
    'PARTIALLY_REFUNDED'
);


ALTER TYPE agri.payment_status OWNER TO postgres;

--
-- Name: TYPE payment_status; Type: COMMENT; Schema: agri; Owner: postgres
--

COMMENT ON TYPE agri.payment_status IS 'Payment status: UNPAID, PENDING_CONFIRMATION (customer confirmed), PAID, REFUNDED, PARTIALLY_REFUNDED';


--
-- Name: return_status; Type: TYPE; Schema: agri; Owner: postgres
--

CREATE TYPE agri.return_status AS ENUM (
    'REQUESTED',
    'APPROVED',
    'REJECTED',
    'COMPLETED'
);


ALTER TYPE agri.return_status OWNER TO postgres;

--
-- Name: unit_type; Type: TYPE; Schema: agri; Owner: postgres
--

CREATE TYPE agri.unit_type AS ENUM (
    'KG',
    'G',
    'BOX',
    'BUNDLE',
    'PCS',
    'L',
    'ML'
);


ALTER TYPE agri.unit_type OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: agri; Owner: postgres
--

CREATE TYPE agri.user_role AS ENUM (
    'ADMIN',
    'STAFF',
    'SHIPPER',
    'CUSTOMER'
);


ALTER TYPE agri.user_role OWNER TO postgres;

--
-- Name: approve_import_receipt(uuid); Type: FUNCTION; Schema: agri; Owner: postgres
--

CREATE FUNCTION agri.approve_import_receipt(p_receipt_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    item RECORD;
BEGIN
    -- Cập nhật trạng thái phiếu nhập
    UPDATE agri.import_receipts 
    SET status = 'APPROVED', approved_at = NOW()
    WHERE id = p_receipt_id AND status = 'DRAFT';

    -- Tăng tồn kho từng sản phẩm
    FOR item IN 
        SELECT product_id, qty, unit_cost FROM agri.import_receipt_items WHERE receipt_id = p_receipt_id 
    LOOP
        UPDATE agri.inventory 
        SET stock_qty = stock_qty + item.qty
        WHERE product_id = item.product_id;

        -- Ghi lịch sử nhập kho
        INSERT INTO agri.stock_movements (product_id, change_qty, reason, ref_id, created_at)
        VALUES (item.product_id, item.qty, 'IMPORT', p_receipt_id, NOW());

        -- (Optional) Cập nhật giá nhập gần nhất
        UPDATE agri.products 
        SET cost_price = item.unit_cost
        WHERE id = item.product_id;
    END LOOP;
END;
$$;


ALTER FUNCTION agri.approve_import_receipt(p_receipt_id uuid) OWNER TO postgres;

--
-- Name: assign_shipper_to_order(uuid, uuid); Type: FUNCTION; Schema: agri; Owner: postgres
--

CREATE FUNCTION agri.assign_shipper_to_order(p_order_id uuid, p_shipper_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
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


ALTER FUNCTION agri.assign_shipper_to_order(p_order_id uuid, p_shipper_id uuid) OWNER TO postgres;

--
-- Name: cap_nhat_gio_hang(uuid, jsonb); Type: FUNCTION; Schema: agri; Owner: postgres
--

CREATE FUNCTION agri.cap_nhat_gio_hang(p_customer_id uuid, p_items jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_cart UUID;
  it JSONB;
BEGIN
  SELECT id INTO v_cart FROM agri.carts WHERE customer_id = p_customer_id;
  IF v_cart IS NULL THEN
    INSERT INTO agri.carts(id, customer_id) VALUES (uuid_generate_v4(), p_customer_id)
    RETURNING id INTO v_cart;
  END IF;

  DELETE FROM agri.cart_items WHERE cart_id = v_cart;

  FOR it IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO agri.cart_items(cart_id, product_id, qty)
    VALUES (v_cart, (it->>'product_id')::uuid, COALESCE((it->>'qty')::numeric,1));
  END LOOP;

  UPDATE agri.carts SET updated_at = NOW() WHERE id = v_cart;
END$$;


ALTER FUNCTION agri.cap_nhat_gio_hang(p_customer_id uuid, p_items jsonb) OWNER TO postgres;

--
-- Name: cap_nhat_trang_thai_don(uuid, agri.order_status); Type: FUNCTION; Schema: agri; Owner: postgres
--

CREATE FUNCTION agri.cap_nhat_trang_thai_don(p_order_id uuid, p_status agri.order_status) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE agri.orders
  SET status = p_status, updated_at = NOW()
  WHERE id = p_order_id;
END$$;


ALTER FUNCTION agri.cap_nhat_trang_thai_don(p_order_id uuid, p_status agri.order_status) OWNER TO postgres;

--
-- Name: confirm_order_revenue(uuid, uuid, text); Type: FUNCTION; Schema: agri; Owner: postgres
--

CREATE FUNCTION agri.confirm_order_revenue(p_order_id uuid, p_admin_id uuid, p_note text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
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


ALTER FUNCTION agri.confirm_order_revenue(p_order_id uuid, p_admin_id uuid, p_note text) OWNER TO postgres;

--
-- Name: create_order_from_cart(uuid, uuid, agri.payment_method, text); Type: FUNCTION; Schema: agri; Owner: postgres
--

CREATE FUNCTION agri.create_order_from_cart(p_customer_id uuid, p_address_id uuid, p_payment_method agri.payment_method, p_note text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
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


ALTER FUNCTION agri.create_order_from_cart(p_customer_id uuid, p_address_id uuid, p_payment_method agri.payment_method, p_note text) OWNER TO postgres;

--
-- Name: danh_dau_thanh_toan(uuid, numeric, text, text); Type: FUNCTION; Schema: agri; Owner: postgres
--

CREATE FUNCTION agri.danh_dau_thanh_toan(p_order_id uuid, p_amount numeric, p_method text, p_txn_ref text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_total NUMERIC;
  v_paid NUMERIC;
BEGIN
  INSERT INTO agri.payments(order_id, method, amount, paid_at, txn_ref)
  VALUES (p_order_id, p_method, p_amount, NOW(), p_txn_ref);

  SELECT grand_total INTO v_total FROM agri.orders WHERE id = p_order_id FOR UPDATE;
  SELECT COALESCE(SUM(amount),0) INTO v_paid FROM agri.payments WHERE order_id = p_order_id;

  UPDATE agri.orders
  SET payment_status = CASE
    WHEN v_paid = 0 THEN 'UNPAID'
    WHEN v_paid < v_total THEN 'PARTIALLY_REFUNDED'
    ELSE 'PAID'
  END
  WHERE id = p_order_id;
END$$;


ALTER FUNCTION agri.danh_dau_thanh_toan(p_order_id uuid, p_amount numeric, p_method text, p_txn_ref text) OWNER TO postgres;

--
-- Name: don_hang_chi_tiet(uuid); Type: FUNCTION; Schema: agri; Owner: postgres
--

CREATE FUNCTION agri.don_hang_chi_tiet(p_order_id uuid) RETURNS TABLE(id uuid, order_code text, status agri.order_status, payment_status agri.payment_status, grand_total numeric, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT o.id, o.order_code, o.status, o.payment_status, o.grand_total, o.created_at
  FROM agri.orders o
  WHERE o.id = p_order_id;
END$$;


ALTER FUNCTION agri.don_hang_chi_tiet(p_order_id uuid) OWNER TO postgres;

--
-- Name: donhang_tinh_lai_tong(uuid); Type: FUNCTION; Schema: agri; Owner: postgres
--

CREATE FUNCTION agri.donhang_tinh_lai_tong(p_order_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_sub NUMERIC := 0;
  v_tax NUMERIC := 0;
  v_ship NUMERIC := 0;
  v_discount NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(line_subtotal),0), COALESCE(SUM(line_tax),0)
    INTO v_sub, v_tax
  FROM agri.order_items WHERE order_id = p_order_id;

  SELECT shipping_fee, discount_total INTO v_ship, v_discount
  FROM agri.orders WHERE id = p_order_id FOR UPDATE;

  UPDATE agri.orders
  SET subtotal = v_sub,
      tax_total = v_tax,
      grand_total = GREATEST(v_sub + v_tax + COALESCE(v_ship,0) - COALESCE(v_discount,0), 0),
      updated_at = NOW()
  WHERE id = p_order_id;
END$$;


ALTER FUNCTION agri.donhang_tinh_lai_tong(p_order_id uuid) OWNER TO postgres;

--
-- Name: duyet_doi_tra(uuid); Type: FUNCTION; Schema: agri; Owner: postgres
--

CREATE FUNCTION agri.duyet_doi_tra(p_return_id uuid) RETURNS void
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


ALTER FUNCTION agri.duyet_doi_tra(p_return_id uuid) OWNER TO postgres;

--
-- Name: get_user_default_address(uuid); Type: FUNCTION; Schema: agri; Owner: postgres
--

CREATE FUNCTION agri.get_user_default_address(p_user_id uuid) RETURNS TABLE(id uuid, label text, recipient text, phone character varying, full_address text)
    LANGUAGE plpgsql
    AS $$
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


ALTER FUNCTION agri.get_user_default_address(p_user_id uuid) OWNER TO postgres;

--
-- Name: get_user_default_phone(uuid); Type: FUNCTION; Schema: agri; Owner: postgres
--

CREATE FUNCTION agri.get_user_default_phone(p_user_id uuid) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
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


ALTER FUNCTION agri.get_user_default_phone(p_user_id uuid) OWNER TO postgres;

--
-- Name: go_giu_ton(uuid, numeric); Type: FUNCTION; Schema: agri; Owner: postgres
--

CREATE FUNCTION agri.go_giu_ton(p_product_id uuid, p_qty numeric) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE agri.inventory
  SET reserved_qty = GREATEST(reserved_qty - p_qty, 0),
      updated_at = NOW()
  WHERE product_id = p_product_id;
END$$;


ALTER FUNCTION agri.go_giu_ton(p_product_id uuid, p_qty numeric) OWNER TO postgres;

--
-- Name: kho_khoi_tao(uuid, numeric); Type: FUNCTION; Schema: agri; Owner: postgres
--

CREATE FUNCTION agri.kho_khoi_tao(p_product_id uuid, p_qty numeric) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO agri.inventory(product_id, stock_qty, reserved_qty)
  VALUES (p_product_id, GREATEST(p_qty,0), 0)
  ON CONFLICT (product_id) DO NOTHING;

  INSERT INTO agri.stock_movements(product_id, change_qty, reason)
  VALUES (p_product_id, p_qty, 'MANUAL_IN');
END$$;


ALTER FUNCTION agri.kho_khoi_tao(p_product_id uuid, p_qty numeric) OWNER TO postgres;

--
-- Name: kiem_tra_va_giu_ton(uuid); Type: FUNCTION; Schema: agri; Owner: postgres
--

CREATE FUNCTION agri.kiem_tra_va_giu_ton(p_order_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
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


ALTER FUNCTION agri.kiem_tra_va_giu_ton(p_order_id uuid) OWNER TO postgres;

--
-- Name: kiem_tra_va_giu_ton(uuid, numeric); Type: FUNCTION; Schema: agri; Owner: postgres
--

CREATE FUNCTION agri.kiem_tra_va_giu_ton(p_product_id uuid, p_qty numeric) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_stock NUMERIC;
  v_reserved NUMERIC;
BEGIN
  SELECT stock_qty, reserved_qty INTO v_stock, v_reserved
  FROM agri.inventory WHERE product_id = p_product_id FOR UPDATE;

  IF v_stock IS NULL THEN
    RAISE EXCEPTION 'Product % has no inventory row', p_product_id;
  END IF;

  IF v_stock - v_reserved < p_qty THEN
    RETURN FALSE;
  END IF;

  UPDATE agri.inventory
  SET reserved_qty = reserved_qty + p_qty,
      updated_at = NOW()
  WHERE product_id = p_product_id;

  RETURN TRUE;
END$$;


ALTER FUNCTION agri.kiem_tra_va_giu_ton(p_product_id uuid, p_qty numeric) OWNER TO postgres;

--
-- Name: tao_don_hang(uuid, uuid, jsonb, numeric, numeric); Type: FUNCTION; Schema: agri; Owner: postgres
--

CREATE FUNCTION agri.tao_don_hang(p_customer_id uuid, p_shipping_addr_id uuid, p_items jsonb, p_shipping_fee numeric DEFAULT 0, p_discount_total numeric DEFAULT 0) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_order_id UUID := uuid_generate_v4();
  it JSONB;
  v_prod UUID;
  v_qty NUMERIC;
  v_price NUMERIC;
  v_tax NUMERIC;
  v_disc NUMERIC;
  v_ok BOOLEAN;
BEGIN
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'p_items must be a non-empty jsonb array';
  END IF;

  INSERT INTO agri.orders(id, order_code, customer_id, shipping_addr_id, shipping_fee, discount_total)
  VALUES (v_order_id,
          'AGRI-' || TO_CHAR(NOW(),'YYYYMMDD') || '-' || SUBSTRING(uuid_generate_v4()::text,1,8),
          p_customer_id, p_shipping_addr_id, COALESCE(p_shipping_fee,0), COALESCE(p_discount_total,0));

  FOR it IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_prod := (it->>'product_id')::uuid;
    v_qty  := COALESCE((it->>'qty')::numeric, 0);
    IF v_qty <= 0 THEN RAISE EXCEPTION 'Invalid qty for product %', v_prod; END IF;

    v_ok := agri.kiem_tra_va_giu_ton(v_prod, v_qty);
    IF NOT v_ok THEN RAISE EXCEPTION 'Not enough stock for product %', v_prod; END IF;

    SELECT price * (1 - COALESCE(discount_rate,0)/100.0),
           COALESCE(tax_rate,0),
           COALESCE(discount_rate,0)
    INTO v_price, v_tax, v_disc
    FROM agri.products WHERE id = v_prod AND is_active = TRUE;

    IF v_price IS NULL THEN RAISE EXCEPTION 'Product % not found or inactive', v_prod; END IF;

    INSERT INTO agri.order_items(order_id, product_id, qty, unit_price, discount_rate, tax_rate, line_subtotal, line_tax, line_total)
    SELECT v_order_id, v_prod, v_qty, v_price, v_disc, v_tax, s.line_subtotal, s.line_tax, s.line_total
    FROM agri.tinh_tien_dong(v_price, v_qty, 0, v_tax) AS s;
  END LOOP;

  PERFORM agri.donhang_tinh_lai_tong(v_order_id);
  RETURN v_order_id;
END$$;


ALTER FUNCTION agri.tao_don_hang(p_customer_id uuid, p_shipping_addr_id uuid, p_items jsonb, p_shipping_fee numeric, p_discount_total numeric) OWNER TO postgres;

--
-- Name: tao_yeu_cau_doi_tra(uuid, uuid, text, jsonb); Type: FUNCTION; Schema: agri; Owner: postgres
--

CREATE FUNCTION agri.tao_yeu_cau_doi_tra(p_order_id uuid, p_request_by uuid, p_reason text, p_items jsonb) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_return_id UUID := uuid_generate_v4();
  it JSONB;
  v_oi UUID;
  v_qty NUMERIC;
  v_unit NUMERIC;
  v_tax NUMERIC;
BEGIN
  INSERT INTO agri.returns(id, order_id, request_by, status, reason)
  VALUES (v_return_id, p_order_id, p_request_by, 'REQUESTED', p_reason);

  FOR it IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_oi := (it->>'order_item_id')::uuid;
    v_qty := COALESCE((it->>'qty')::numeric,0);
    IF v_qty <= 0 THEN RAISE EXCEPTION 'Invalid return qty for order_item %', v_oi; END IF;

    SELECT unit_price, tax_rate INTO v_unit, v_tax
    FROM agri.order_items WHERE id = v_oi AND order_id = p_order_id;
    IF v_unit IS NULL THEN RAISE EXCEPTION 'Order item % not found or not in order %', v_oi, p_order_id; END IF;

    INSERT INTO agri.return_items(return_id, order_item_id, qty, refund_line)
    SELECT v_return_id, v_oi, v_qty,
           (agri.tinh_tien_dong(v_unit, v_qty, 0, v_tax)).line_total;
  END LOOP;

  UPDATE agri.returns
  SET refund_amount = (SELECT COALESCE(SUM(refund_line),0) FROM agri.return_items WHERE return_id = v_return_id)
  WHERE id = v_return_id;

  RETURN v_return_id;
END$$;


ALTER FUNCTION agri.tao_yeu_cau_doi_tra(p_order_id uuid, p_request_by uuid, p_reason text, p_items jsonb) OWNER TO postgres;

--
-- Name: tg_log_order_status_change(); Type: FUNCTION; Schema: agri; Owner: postgres
--

CREATE FUNCTION agri.tg_log_order_status_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO agri.order_status_history (order_id, old_status, new_status)
    VALUES (NEW.id, OLD.status, NEW.status);
    
    -- Send PostgreSQL NOTIFY for realtime updates
    PERFORM pg_notify(
      'order_status_changed',
      json_build_object(
        'order_id', NEW.id::text,
        'order_code', NEW.order_code,
        'customer_id', NEW.customer_id::text,
        'shipper_id', NEW.shipper_id::text,
        'old_status', OLD.status::text,
        'new_status', NEW.status::text,
        'timestamp', NOW()
      )::text
    );
  END IF;
  
  RETURN NEW;
END$$;


ALTER FUNCTION agri.tg_log_order_status_change() OWNER TO postgres;

--
-- Name: tg_notify_new_order(); Type: FUNCTION; Schema: agri; Owner: postgres
--

CREATE FUNCTION agri.tg_notify_new_order() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Notify all shippers about new order
  PERFORM pg_notify(
    'new_order_created',
    json_build_object(
      'order_id', NEW.id::text,
      'order_code', NEW.order_code,
      'customer_id', NEW.customer_id::text,
      'status', NEW.status::text,
      'grand_total', NEW.grand_total,
      'timestamp', NOW()
    )::text
  );
  
  RETURN NEW;
END$$;


ALTER FUNCTION agri.tg_notify_new_order() OWNER TO postgres;

--
-- Name: tg_products_tsv(); Type: FUNCTION; Schema: agri; Owner: postgres
--

CREATE FUNCTION agri.tg_products_tsv() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.search_tsv :=
    to_tsvector('simple',
      unaccent(coalesce(NEW.name,'') || ' ' || coalesce(NEW.short_desc,'') || ' ' || coalesce(NEW.description,'')));
  RETURN NEW;
END $$;


ALTER FUNCTION agri.tg_products_tsv() OWNER TO postgres;

--
-- Name: tg_set_updated_at(); Type: FUNCTION; Schema: agri; Owner: postgres
--

CREATE FUNCTION agri.tg_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END$$;


ALTER FUNCTION agri.tg_set_updated_at() OWNER TO postgres;

--
-- Name: thong_ke_doanh_thu(date, date); Type: FUNCTION; Schema: agri; Owner: postgres
--

CREATE FUNCTION agri.thong_ke_doanh_thu(p_start date, p_end date) RETURNS TABLE(d date, orders_count integer, gross numeric, shipping numeric, discount numeric, tax numeric, net numeric)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT dd::date AS d,
         COUNT(o.id) FILTER (WHERE o.created_at::date = dd)::int AS orders_count,
         COALESCE(SUM(o.subtotal) FILTER (WHERE o.created_at::date = dd),0) AS gross,
         COALESCE(SUM(o.shipping_fee) FILTER (WHERE o.created_at::date = dd),0) AS shipping,
         COALESCE(SUM(o.discount_total) FILTER (WHERE o.created_at::date = dd),0) AS discount,
         COALESCE(SUM(o.tax_total) FILTER (WHERE o.created_at::date = dd),0) AS tax,
         COALESCE(SUM(o.grand_total) FILTER (WHERE o.created_at::date = dd),0) AS net
  FROM generate_series(p_start, p_end, '1 day') dd
  LEFT JOIN agri.orders o ON o.created_at::date = dd
       AND o.status IN ('CONFIRMED','PACKED','SHIPPING','DELIVERED')
  GROUP BY dd
  ORDER BY dd;
END$$;


ALTER FUNCTION agri.thong_ke_doanh_thu(p_start date, p_end date) OWNER TO postgres;

--
-- Name: tinh_tien_dong(numeric, numeric, numeric, numeric); Type: FUNCTION; Schema: agri; Owner: postgres
--

CREATE FUNCTION agri.tinh_tien_dong(p_unit_price numeric, p_qty numeric, p_discount_rate numeric, p_tax_rate numeric) RETURNS TABLE(line_subtotal numeric, line_tax numeric, line_total numeric)
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
  v_price NUMERIC := GREATEST(p_unit_price * (1 - COALESCE(p_discount_rate,0)/100.0), 0);
BEGIN
  line_subtotal := ROUND(v_price * p_qty, 2);
  line_tax      := ROUND(line_subtotal * (COALESCE(p_tax_rate,0)/100.0), 2);
  line_total    := line_subtotal + line_tax;
  RETURN NEXT;
END$$;


ALTER FUNCTION agri.tinh_tien_dong(p_unit_price numeric, p_qty numeric, p_discount_rate numeric, p_tax_rate numeric) OWNER TO postgres;

--
-- Name: tong_quan_dashboard(date, date); Type: FUNCTION; Schema: agri; Owner: postgres
--

CREATE FUNCTION agri.tong_quan_dashboard(p_start date, p_end date) RETURNS TABLE(total_orders integer, total_revenue numeric, delivered integer, cancelled integer, returning_count integer)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::int AS total_orders,
    COALESCE(SUM(grand_total),0) AS total_revenue,
    COUNT(*) FILTER (WHERE status='DELIVERED')::int AS delivered,
    COUNT(*) FILTER (WHERE status='CANCELLED')::int AS cancelled,
    COUNT(*) FILTER (WHERE status IN ('RETURN_REQUESTED','RETURNED'))::int AS returning_count
  FROM agri.orders
  WHERE created_at::date BETWEEN p_start AND p_end;
END$$;


ALTER FUNCTION agri.tong_quan_dashboard(p_start date, p_end date) OWNER TO postgres;

--
-- Name: top_san_pham_theo_doanh_thu(date, date, integer); Type: FUNCTION; Schema: agri; Owner: postgres
--

CREATE FUNCTION agri.top_san_pham_theo_doanh_thu(p_start date, p_end date, p_limit integer DEFAULT 10) RETURNS TABLE(product_id uuid, name text, total_qty numeric, revenue numeric)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT oi.product_id, p.name,
         SUM(oi.qty) AS total_qty,
         SUM(oi.line_total) AS revenue
  FROM agri.order_items oi
  JOIN agri.orders o ON o.id = oi.order_id
  JOIN agri.products p ON p.id = oi.product_id
  WHERE o.created_at::date BETWEEN p_start AND p_end
    AND o.status IN ('CONFIRMED','PACKED','SHIPPING','DELIVERED')
  GROUP BY oi.product_id, p.name
  ORDER BY revenue DESC
  LIMIT p_limit;
END$$;


ALTER FUNCTION agri.top_san_pham_theo_doanh_thu(p_start date, p_end date, p_limit integer) OWNER TO postgres;

--
-- Name: trigger_approve_import_receipt(); Type: FUNCTION; Schema: agri; Owner: postgres
--

CREATE FUNCTION agri.trigger_approve_import_receipt() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.status = 'APPROVED' AND OLD.status != 'APPROVED' THEN
        PERFORM agri.approve_import_receipt(NEW.id);
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION agri.trigger_approve_import_receipt() OWNER TO postgres;

--
-- Name: update_order_status(uuid, agri.order_status, uuid, text); Type: FUNCTION; Schema: agri; Owner: postgres
--

CREATE FUNCTION agri.update_order_status(p_order_id uuid, p_new_status agri.order_status, p_user_id uuid DEFAULT NULL::uuid, p_note text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
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


ALTER FUNCTION agri.update_order_status(p_order_id uuid, p_new_status agri.order_status, p_user_id uuid, p_note text) OWNER TO postgres;

--
-- Name: xuat_kho(uuid, numeric, uuid); Type: FUNCTION; Schema: agri; Owner: postgres
--

CREATE FUNCTION agri.xuat_kho(p_product_id uuid, p_qty numeric, p_order_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE agri.inventory
  SET stock_qty = stock_qty - p_qty,
      reserved_qty = GREATEST(reserved_qty - p_qty, 0),
      updated_at = NOW()
  WHERE product_id = p_product_id;

  INSERT INTO agri.stock_movements(product_id, change_qty, reason, ref_id)
  VALUES (p_product_id, -p_qty, 'ORDER', p_order_id);
END$$;


ALTER FUNCTION agri.xuat_kho(p_product_id uuid, p_qty numeric, p_order_id uuid) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: agri; Owner: postgres
--

CREATE TABLE agri.accounts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email public.citext NOT NULL,
    phone character varying(20),
    full_name text NOT NULL,
    password_hash text NOT NULL,
    role agri.user_role DEFAULT 'CUSTOMER'::agri.user_role NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE agri.accounts OWNER TO postgres;

--
-- Name: addresses; Type: TABLE; Schema: agri; Owner: postgres
--

CREATE TABLE agri.addresses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    account_id uuid NOT NULL,
    label text,
    recipient text NOT NULL,
    phone character varying(20),
    line1 text NOT NULL,
    line2 text,
    ward text,
    district text,
    city text,
    country text DEFAULT 'VN'::text,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE agri.addresses OWNER TO postgres;

--
-- Name: brands; Type: TABLE; Schema: agri; Owner: postgres
--

CREATE TABLE agri.brands (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE agri.brands OWNER TO postgres;

--
-- Name: cart_items; Type: TABLE; Schema: agri; Owner: postgres
--

CREATE TABLE agri.cart_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    cart_id uuid NOT NULL,
    product_id uuid NOT NULL,
    qty numeric(14,3) NOT NULL,
    CONSTRAINT cart_items_qty_check CHECK ((qty > (0)::numeric))
);


ALTER TABLE agri.cart_items OWNER TO postgres;

--
-- Name: carts; Type: TABLE; Schema: agri; Owner: postgres
--

CREATE TABLE agri.carts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    customer_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE agri.carts OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: agri; Owner: postgres
--

CREATE TABLE agri.categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    parent_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE agri.categories OWNER TO postgres;

--
-- Name: import_receipt_items; Type: TABLE; Schema: agri; Owner: postgres
--

CREATE TABLE agri.import_receipt_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    receipt_id uuid,
    product_id uuid,
    qty numeric(14,3) NOT NULL,
    unit_cost numeric(14,2) NOT NULL,
    line_total numeric(14,2) GENERATED ALWAYS AS ((qty * unit_cost)) STORED,
    note text,
    CONSTRAINT import_receipt_items_qty_check CHECK ((qty > (0)::numeric)),
    CONSTRAINT import_receipt_items_unit_cost_check CHECK ((unit_cost >= (0)::numeric))
);


ALTER TABLE agri.import_receipt_items OWNER TO postgres;

--
-- Name: import_receipts; Type: TABLE; Schema: agri; Owner: postgres
--

CREATE TABLE agri.import_receipts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code text NOT NULL,
    supplier_id uuid,
    created_by uuid,
    status text DEFAULT 'DRAFT'::text,
    total_qty numeric(14,3) DEFAULT 0,
    total_cost numeric(14,2) DEFAULT 0,
    note text,
    created_at timestamp with time zone DEFAULT now(),
    approved_at timestamp with time zone
);


ALTER TABLE agri.import_receipts OWNER TO postgres;

--
-- Name: inventory; Type: TABLE; Schema: agri; Owner: postgres
--

CREATE TABLE agri.inventory (
    product_id uuid NOT NULL,
    stock_qty numeric(14,3) DEFAULT 0 NOT NULL,
    reserved_qty numeric(14,3) DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT inventory_reserved_qty_check CHECK ((reserved_qty >= (0)::numeric)),
    CONSTRAINT inventory_stock_qty_check CHECK ((stock_qty >= (0)::numeric))
);


ALTER TABLE agri.inventory OWNER TO postgres;

--
-- Name: order_items; Type: TABLE; Schema: agri; Owner: postgres
--

CREATE TABLE agri.order_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    qty numeric(14,3) NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    discount_rate numeric(5,2) DEFAULT 0 NOT NULL,
    tax_rate numeric(5,2) DEFAULT 0 NOT NULL,
    line_subtotal numeric(14,2) DEFAULT 0 NOT NULL,
    line_tax numeric(14,2) DEFAULT 0 NOT NULL,
    line_total numeric(14,2) DEFAULT 0 NOT NULL,
    CONSTRAINT order_items_qty_check CHECK ((qty > (0)::numeric)),
    CONSTRAINT order_items_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


ALTER TABLE agri.order_items OWNER TO postgres;

--
-- Name: order_status_history; Type: TABLE; Schema: agri; Owner: postgres
--

CREATE TABLE agri.order_status_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    old_status agri.order_status,
    new_status agri.order_status NOT NULL,
    changed_by uuid,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE agri.order_status_history OWNER TO postgres;

--
-- Name: TABLE order_status_history; Type: COMMENT; Schema: agri; Owner: postgres
--

COMMENT ON TABLE agri.order_status_history IS 'Tracks all status changes for orders';


--
-- Name: orders; Type: TABLE; Schema: agri; Owner: postgres
--

CREATE TABLE agri.orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_code text,
    customer_id uuid NOT NULL,
    shipping_addr_id uuid,
    status agri.order_status DEFAULT 'PENDING'::agri.order_status NOT NULL,
    payment_status agri.payment_status DEFAULT 'UNPAID'::agri.payment_status NOT NULL,
    subtotal numeric(14,2) DEFAULT 0 NOT NULL,
    tax_total numeric(14,2) DEFAULT 0 NOT NULL,
    discount_total numeric(14,2) DEFAULT 0 NOT NULL,
    shipping_fee numeric(12,2) DEFAULT 0 NOT NULL,
    grand_total numeric(14,2) DEFAULT 0 NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    shipper_id uuid,
    payment_method agri.payment_method DEFAULT 'COD'::agri.payment_method,
    shipping_phone character varying(20),
    shipping_address text,
    shipping_recipient text
);


ALTER TABLE agri.orders OWNER TO postgres;

--
-- Name: COLUMN orders.shipper_id; Type: COMMENT; Schema: agri; Owner: postgres
--

COMMENT ON COLUMN agri.orders.shipper_id IS 'Shipper assigned to deliver this order';


--
-- Name: COLUMN orders.payment_method; Type: COMMENT; Schema: agri; Owner: postgres
--

COMMENT ON COLUMN agri.orders.payment_method IS 'Payment method: COD or BANK_TRANSFER';


--
-- Name: payments; Type: TABLE; Schema: agri; Owner: postgres
--

CREATE TABLE agri.payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    method text NOT NULL,
    amount numeric(14,2) NOT NULL,
    paid_at timestamp with time zone,
    txn_ref text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payments_amount_check CHECK ((amount >= (0)::numeric))
);


ALTER TABLE agri.payments OWNER TO postgres;

--
-- Name: product_images; Type: TABLE; Schema: agri; Owner: postgres
--

CREATE TABLE agri.product_images (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    product_id uuid NOT NULL,
    url text NOT NULL,
    is_main boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


ALTER TABLE agri.product_images OWNER TO postgres;

--
-- Name: COLUMN product_images.url; Type: COMMENT; Schema: agri; Owner: postgres
--

COMMENT ON COLUMN agri.product_images.url IS 'Full image URL (local path or external URL) - no length limit';


--
-- Name: products; Type: TABLE; Schema: agri; Owner: postgres
--

CREATE TABLE agri.products (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    sku text,
    name text NOT NULL,
    slug text NOT NULL,
    category_id uuid,
    brand_id uuid,
    unit agri.unit_type NOT NULL,
    price numeric(12,2) NOT NULL,
    cost_price numeric(12,2) DEFAULT 0 NOT NULL,
    tax_rate numeric(5,2) DEFAULT 0 NOT NULL,
    discount_rate numeric(5,2) DEFAULT 0 NOT NULL,
    weight_gram integer,
    short_desc text,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    search_tsv tsvector,
    image_url text,
    main_image text,
    CONSTRAINT products_cost_price_check CHECK ((cost_price >= (0)::numeric)),
    CONSTRAINT products_discount_rate_check CHECK (((discount_rate >= (0)::numeric) AND (discount_rate <= (100)::numeric))),
    CONSTRAINT products_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT products_tax_rate_check CHECK ((tax_rate >= (0)::numeric))
);


ALTER TABLE agri.products OWNER TO postgres;

--
-- Name: COLUMN products.image_url; Type: COMMENT; Schema: agri; Owner: postgres
--

COMMENT ON COLUMN agri.products.image_url IS 'Main product image URL - no length limit';


--
-- Name: return_items; Type: TABLE; Schema: agri; Owner: postgres
--

CREATE TABLE agri.return_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    return_id uuid NOT NULL,
    order_item_id uuid NOT NULL,
    qty numeric(14,3) NOT NULL,
    refund_line numeric(14,2) DEFAULT 0 NOT NULL,
    CONSTRAINT return_items_qty_check CHECK ((qty > (0)::numeric))
);


ALTER TABLE agri.return_items OWNER TO postgres;

--
-- Name: returns; Type: TABLE; Schema: agri; Owner: postgres
--

CREATE TABLE agri.returns (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    request_by uuid NOT NULL,
    status agri.return_status DEFAULT 'REQUESTED'::agri.return_status NOT NULL,
    reason text,
    refund_amount numeric(14,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE agri.returns OWNER TO postgres;

--
-- Name: revenue_records; Type: TABLE; Schema: agri; Owner: postgres
--

CREATE TABLE agri.revenue_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    amount numeric(14,2) NOT NULL,
    confirmed_by uuid,
    confirmed_at timestamp with time zone DEFAULT now() NOT NULL,
    note text
);


ALTER TABLE agri.revenue_records OWNER TO postgres;

--
-- Name: TABLE revenue_records; Type: COMMENT; Schema: agri; Owner: postgres
--

COMMENT ON TABLE agri.revenue_records IS 'Tracks confirmed revenue from completed orders';


--
-- Name: stock_movements; Type: TABLE; Schema: agri; Owner: postgres
--

CREATE TABLE agri.stock_movements (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    product_id uuid NOT NULL,
    change_qty numeric(14,3) NOT NULL,
    reason text NOT NULL,
    ref_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE agri.stock_movements OWNER TO postgres;

--
-- Name: suppliers; Type: TABLE; Schema: agri; Owner: postgres
--

CREATE TABLE agri.suppliers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    contact_name text,
    phone character varying(20),
    email text,
    address text,
    note text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE agri.suppliers OWNER TO postgres;

--
-- Name: user_phones; Type: TABLE; Schema: agri; Owner: postgres
--

CREATE TABLE agri.user_phones (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    account_id uuid NOT NULL,
    phone character varying(20) NOT NULL,
    label text,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE agri.user_phones OWNER TO postgres;

--
-- Name: TABLE user_phones; Type: COMMENT; Schema: agri; Owner: postgres
--

COMMENT ON TABLE agri.user_phones IS 'Stores multiple phone numbers per user account';


--
-- Data for Name: accounts; Type: TABLE DATA; Schema: agri; Owner: postgres
--

COPY agri.accounts (id, email, phone, full_name, password_hash, role, is_active, created_at, updated_at) FROM stdin;
0fd53fcb-c51e-4fe1-bc76-aa20abde826e	khoa	\N	Admin Khoa	$2a$06$NHQwJeG8LwPxsbmEsxqLaONP8CcX2TLJCRILt3EZebtdwCvlwGqzq	ADMIN	t	2025-10-23 08:26:34.340915+07	2025-10-23 08:26:34.340915+07
f59b72e8-bbec-4282-bffd-629444f3313b	admin@example.com	0900000000	Admin	$2a$10$K./q9BXadvOC86OxIhGAbO3x6Wjqzs0pftITCgeUjjN09mQeA7ia2	ADMIN	t	2025-10-22 06:33:24.943388+07	2025-10-23 08:32:34.662434+07
9f23c6c0-f6bb-46eb-8698-a2deb439cb31	khach@example.com	0901111222	Nguyen Van A	$2a$10$ocF2UAJqPJRH6v17aYoj2eRm.G30/zI32gOlk3XvnL.fTODj7WOt2	CUSTOMER	t	2025-10-22 06:33:24.943388+07	2025-10-23 08:32:34.800583+07
6dbef3d6-a414-4889-aaae-58d572159c22	shipper@example.com	0912345678	Shipper Test	$2a$10$K./q9BXadvOC86OxIhGAbO3x6Wjqzs0pftITCgeUjjN09mQeA7ia2	SHIPPER	t	2025-10-23 10:16:19.403214+07	2025-10-23 10:16:19.403214+07
265cfa8f-9600-4466-aa62-c51570451d38	khoa@gmail.com	\N	huỳnh minh khoa	$2a$10$UT1D7HsYzhI7X3gMqgWtHe7Gfw4mjgEYEALk7g4B4Pi/KeEd89RPS	CUSTOMER	t	2025-10-22 07:18:41.250715+07	2025-10-24 23:31:07.985826+07
\.


--
-- Data for Name: addresses; Type: TABLE DATA; Schema: agri; Owner: postgres
--

COPY agri.addresses (id, account_id, label, recipient, phone, line1, line2, ward, district, city, country, is_default, created_at, updated_at) FROM stdin;
0ba22993-a5f4-4c3a-ad39-dbb44abeafa4	9f23c6c0-f6bb-46eb-8698-a2deb439cb31	Nha	Nguyen Van A	0901111222	123 Duong A	\N	Phuong 1	Quan 1	TPHCM	VN	t	2025-10-22 06:33:24.943388+07	2025-10-22 06:33:24.943388+07
505240ef-58ea-407f-bc91-340e202c55da	f59b72e8-bbec-4282-bffd-629444f3313b	Nhà riêng	Admin	0914318513	84 phú thọ	\N	1	11	tphcm	VN	t	2025-10-23 10:21:54.847587+07	2025-10-23 10:21:54.847587+07
65679bcd-2de1-4b19-a4db-27a2e6ce9509	f59b72e8-bbec-4282-bffd-629444f3313b	nhà thằng fen	tan huy	0345433544	60 duong so 1 gv		8	gv	hcm	VN	f	2025-10-25 01:17:44.035237+07	2025-10-25 01:17:50.677745+07
\.


--
-- Data for Name: brands; Type: TABLE DATA; Schema: agri; Owner: postgres
--

COPY agri.brands (id, name, slug, created_at, updated_at) FROM stdin;
974a450b-5fcd-4c0f-9ed4-1994da37b92c	Farm Fresh	farm-fresh	2025-10-22 06:33:24.943388+07	2025-10-22 06:33:24.943388+07
1c219abb-1425-4c2f-ae77-285e98f32a3b	Green Valley	green-valley	2025-10-22 06:33:24.943388+07	2025-10-22 06:33:24.943388+07
74d31649-6ab1-484c-bb73-1b6af60ab513	Organic Home	organic-home	2025-10-22 06:33:24.943388+07	2025-10-22 06:33:24.943388+07
\.


--
-- Data for Name: cart_items; Type: TABLE DATA; Schema: agri; Owner: postgres
--

COPY agri.cart_items (id, cart_id, product_id, qty) FROM stdin;
8985f740-773c-456b-90c7-8357a3176cd1	09b59306-9e7c-45cf-93d3-e4c09e56b7ef	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	4.000
ff246e2c-1c9a-4004-b93e-b471e51ea161	09b59306-9e7c-45cf-93d3-e4c09e56b7ef	343979d6-e119-4834-be4f-7ce1a2c916f2	2.000
\.


--
-- Data for Name: carts; Type: TABLE DATA; Schema: agri; Owner: postgres
--

COPY agri.carts (id, customer_id, created_at, updated_at) FROM stdin;
d10b60b7-447a-4140-a156-0692d8bce5c8	9f23c6c0-f6bb-46eb-8698-a2deb439cb31	2025-10-23 10:37:40.635686+07	2025-10-24 12:04:54.736811+07
09b59306-9e7c-45cf-93d3-e4c09e56b7ef	6dbef3d6-a414-4889-aaae-58d572159c22	2025-10-24 14:20:27.216692+07	2025-10-24 14:20:35.255529+07
9423788f-446e-408f-ad8e-ed3b3a08a88e	f59b72e8-bbec-4282-bffd-629444f3313b	2025-10-23 08:47:51.9778+07	2025-10-26 20:53:41.871043+07
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: agri; Owner: postgres
--

COPY agri.categories (id, name, slug, parent_id, created_at, updated_at) FROM stdin;
20658ecf-8c34-48d8-815b-d0b958f36ec4	Rau cu	rau-cu	\N	2025-10-22 06:33:24.943388+07	2025-10-22 06:33:24.943388+07
6297981d-a59d-4959-8a23-e436f1bce3ca	Trai cay	trai-cay	\N	2025-10-22 06:33:24.943388+07	2025-10-22 06:33:24.943388+07
4f0c9bad-3dd4-48c0-8a83-ba70ffa8400a	Hat - Ngu coc	hat-ngu-coc	\N	2025-10-22 06:33:24.943388+07	2025-10-22 06:33:24.943388+07
588035c1-f0dd-43cc-a94d-7e8fcc6beb4c	Nam	nam	\N	2025-10-22 06:33:24.943388+07	2025-10-22 06:33:24.943388+07
\.


--
-- Data for Name: import_receipt_items; Type: TABLE DATA; Schema: agri; Owner: postgres
--

COPY agri.import_receipt_items (id, receipt_id, product_id, qty, unit_cost, note) FROM stdin;
0f807ad7-bafa-4b52-8cc3-e3f66e0483da	f2ba3489-8574-43a9-8f0f-25891afa7204	3e148a8d-8bcb-4c43-8a64-4135e4ff6519	100.000	3500.00	\N
7c48e172-676a-4757-aa9f-3d935a10abb6	f2ba3489-8574-43a9-8f0f-25891afa7204	da9d44bd-e815-4664-95db-9f8858c015fe	100.000	5000.00	\N
ba710cbc-4585-402f-8f73-e6fde038abe6	f2ba3489-8574-43a9-8f0f-25891afa7204	5518a2f7-6a2b-4712-8f40-1aa7bc1fb3b5	100.000	2400.00	\N
1d5e638f-61c9-4124-8492-0002d4605f7e	f2ba3489-8574-43a9-8f0f-25891afa7204	355bc2d6-6d28-4ec4-b3ad-46cb867b06e1	1000.000	1000.00	\N
02144c32-59d4-4dc4-a318-f8a56ed2e8e2	f2ba3489-8574-43a9-8f0f-25891afa7204	3d6c9893-f5b4-48d4-b4f0-a96753637366	1000.000	35000.00	\N
691a43ff-c899-4791-8ca2-dcee9a0ea5dc	848cac5e-259e-405b-81a9-7a9abf120d99	9324213d-ee00-4c8b-91bc-e1828086a1a2	1000.000	50000.00	\N
b77f3a03-34a2-457d-ae56-aca86bb73ea9	21e97192-8e44-41da-aa50-8034e35f8750	d725c994-9f10-4c9e-a1d6-45da98d2cd38	150.000	30000.00	\N
f8eefdb0-7162-4a85-b158-a96253a7324f	21e97192-8e44-41da-aa50-8034e35f8750	90bf81b7-0667-4a37-85a3-0f99498380ee	100.000	25000.00	\N
0b4359d9-db5d-491a-9049-b701ddc5d6b0	21e97192-8e44-41da-aa50-8034e35f8750	b31c36c4-5b2f-4000-9781-252cf6942700	111.000	1500.00	\N
fead819d-d664-4152-8fce-e028c6ea478d	21e97192-8e44-41da-aa50-8034e35f8750	3e148a8d-8bcb-4c43-8a64-4135e4ff6519	1100.000	32500.00	\N
7e4f0bc9-0349-4ff1-a6bd-0071f890fbbc	21e97192-8e44-41da-aa50-8034e35f8750	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	11000.000	1256.00	\N
\.


--
-- Data for Name: import_receipts; Type: TABLE DATA; Schema: agri; Owner: postgres
--

COPY agri.import_receipts (id, code, supplier_id, created_by, status, total_qty, total_cost, note, created_at, approved_at) FROM stdin;
f2ba3489-8574-43a9-8f0f-25891afa7204	PN-2025-10-001	f8f33dec-ed46-4354-a1a2-f34ed6198c12	f59b72e8-bbec-4282-bffd-629444f3313b	APPROVED	2300.000	37090000.00	\N	2025-10-24 22:58:36.001348+07	2025-10-24 22:58:36.056448+07
848cac5e-259e-405b-81a9-7a9abf120d99	PN-2025-10-002	f8f33dec-ed46-4354-a1a2-f34ed6198c12	f59b72e8-bbec-4282-bffd-629444f3313b	APPROVED	1000.000	50000000.00	\N	2025-10-25 01:18:35.142687+07	2025-10-25 01:18:35.156558+07
21e97192-8e44-41da-aa50-8034e35f8750	PN-2025-10-003	82a313e7-4fa4-43fa-b6f7-c96b0037fa5a	f59b72e8-bbec-4282-bffd-629444f3313b	APPROVED	12461.000	56732500.00	\N	2025-10-26 20:09:05.36621+07	2025-10-26 20:09:05.42105+07
\.


--
-- Data for Name: inventory; Type: TABLE DATA; Schema: agri; Owner: postgres
--

COPY agri.inventory (product_id, stock_qty, reserved_qty, updated_at) FROM stdin;
2160248e-63e1-4855-a33d-4deb6bcd24ad	200.000	8.000	2025-10-25 10:58:15.935134+07
da9d44bd-e815-4664-95db-9f8858c015fe	200.000	2.000	2025-10-25 10:58:15.935134+07
b31c36c4-5b2f-4000-9781-252cf6942700	222.000	0.000	2025-10-26 20:09:05.42105+07
3e148a8d-8bcb-4c43-8a64-4135e4ff6519	2400.000	1.000	2025-10-26 20:09:05.42105+07
450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	22120.000	18.000	2025-10-26 20:09:05.42105+07
343979d6-e119-4834-be4f-7ce1a2c916f2	151.000	12.000	2025-10-26 20:09:20.045196+07
9324213d-ee00-4c8b-91bc-e1828086a1a2	2000.000	3.000	2025-10-26 20:34:12.471706+07
5518a2f7-6a2b-4712-8f40-1aa7bc1fb3b5	200.000	0.000	2025-10-24 22:58:36.056448+07
355bc2d6-6d28-4ec4-b3ad-46cb867b06e1	2000.000	0.000	2025-10-24 22:58:36.056448+07
3d6c9893-f5b4-48d4-b4f0-a96753637366	2000.000	0.000	2025-10-24 22:58:36.056448+07
d725c994-9f10-4c9e-a1d6-45da98d2cd38	300.000	12.000	2025-10-26 20:53:51.724436+07
90bf81b7-0667-4a37-85a3-0f99498380ee	200.000	5.000	2025-10-26 20:53:51.724436+07
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: agri; Owner: postgres
--

COPY agri.order_items (id, order_id, product_id, qty, unit_price, discount_rate, tax_rate, line_subtotal, line_tax, line_total) FROM stdin;
e71a2158-482f-4456-a807-68489a5af3c8	7230943f-75a8-49b1-87c4-5f3fea242e40	343979d6-e119-4834-be4f-7ce1a2c916f2	1.000	45000.00	0.00	8.00	45000.00	3600.00	48600.00
57c7fae5-e8ef-4be5-a56a-2508eb859bfc	7230943f-75a8-49b1-87c4-5f3fea242e40	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	1.000	65000.00	5.00	8.00	61750.00	4940.00	66690.00
d9f1ecac-b768-4a95-8899-c6f286894c94	7230943f-75a8-49b1-87c4-5f3fea242e40	2160248e-63e1-4855-a33d-4deb6bcd24ad	2.000	25000.00	0.00	5.00	50000.00	2500.00	52500.00
008c229e-ba21-410e-907a-63afad7149bd	33a5b61b-6a28-49e7-b314-870bb29daec0	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	1.000	65000.00	5.00	8.00	61750.00	4940.00	66690.00
49b90765-e473-49ae-9585-aa60f1d02fdb	33a5b61b-6a28-49e7-b314-870bb29daec0	2160248e-63e1-4855-a33d-4deb6bcd24ad	1.000	25000.00	0.00	5.00	25000.00	1250.00	26250.00
cd4da8f3-5c0a-45ab-a955-7e8a7ee28f41	8c1c678b-c16b-4527-97d7-2801c86fe4f1	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	1.000	65000.00	5.00	8.00	61750.00	4940.00	66690.00
ead23b35-6c74-4dee-b8e0-bbb347007a4a	70a4e082-f6b9-4680-bbe5-a25b9a6e202f	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	1.000	65000.00	5.00	8.00	61750.00	4940.00	66690.00
82e4d383-b88e-4dda-9d3e-c58854de5390	78fbdf13-9467-427b-9856-9fbd00116d0a	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	1.000	65000.00	5.00	8.00	61750.00	4940.00	66690.00
a0da61a0-57e3-468b-8ea4-ba6a436b19b1	78fbdf13-9467-427b-9856-9fbd00116d0a	2160248e-63e1-4855-a33d-4deb6bcd24ad	1.000	25000.00	0.00	5.00	25000.00	1250.00	26250.00
78fa6367-1ec7-4dd9-b71b-e26ff289f3a2	32b02562-6cae-4810-92dc-d96e24959243	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	1.000	65000.00	5.00	8.00	61750.00	4940.00	66690.00
4e87ed9f-f40a-494a-b6c2-aa61aab91e1a	32b02562-6cae-4810-92dc-d96e24959243	2160248e-63e1-4855-a33d-4deb6bcd24ad	1.000	25000.00	0.00	5.00	25000.00	1250.00	26250.00
cd38c009-b553-493a-9fa1-80e64bcfa304	c1bc281a-7397-4a78-ab49-bcb7d905f442	343979d6-e119-4834-be4f-7ce1a2c916f2	1.000	45000.00	0.00	8.00	45000.00	3600.00	48600.00
f4cb98de-b39c-4149-8006-95ea3b17a35a	c1bc281a-7397-4a78-ab49-bcb7d905f442	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	1.000	65000.00	5.00	8.00	61750.00	4940.00	66690.00
65d89df1-b917-4cf3-bcf1-a2efecf0e20c	6b5362a6-6b63-4486-8657-39b56efd9f19	343979d6-e119-4834-be4f-7ce1a2c916f2	1.000	45000.00	0.00	8.00	45000.00	3600.00	48600.00
5aab0acc-2c54-4f98-aa5e-e411080ee591	6b5362a6-6b63-4486-8657-39b56efd9f19	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	1.000	65000.00	5.00	8.00	61750.00	4940.00	66690.00
d59c4a53-e969-48d4-a6f9-cf352bf7bf96	fce965e3-3561-44f4-811c-307d27377a56	343979d6-e119-4834-be4f-7ce1a2c916f2	4.000	45000.00	0.00	8.00	180000.00	14400.00	194400.00
3643b6a8-d53f-49b8-aa64-f076f05088a1	fce965e3-3561-44f4-811c-307d27377a56	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	1.000	65000.00	5.00	8.00	61750.00	4940.00	66690.00
feea279c-4dba-4da8-a4ce-425a83fc846d	7c621911-ac0a-495d-a65d-3bf8a1152b9f	343979d6-e119-4834-be4f-7ce1a2c916f2	1.000	45000.00	0.00	8.00	45000.00	3600.00	48600.00
bd909a5a-15b1-412c-8de3-77d84d7bf1d2	7c621911-ac0a-495d-a65d-3bf8a1152b9f	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	1.000	65000.00	5.00	8.00	61750.00	4940.00	66690.00
d1da2d98-e614-4573-a384-663f9bf33fb3	c2358be2-d0f7-4701-900b-8af553eaa17b	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	2.000	65000.00	5.00	8.00	123500.00	9880.00	133380.00
ae2e7bf1-584c-4c85-a09f-cd2c4f1f5c66	f0594fbc-4198-47af-8095-7c8527e9628a	3e148a8d-8bcb-4c43-8a64-4135e4ff6519	1.000	60000.00	0.00	8.00	60000.00	4800.00	64800.00
dc8ddb5e-9b40-4bfe-a014-57c40eb2b60b	f0594fbc-4198-47af-8095-7c8527e9628a	da9d44bd-e815-4664-95db-9f8858c015fe	1.000	38000.00	0.00	5.00	38000.00	1900.00	39900.00
9a5bcec0-8bbe-42e8-ac8a-123cbf48de05	8e8c3aa4-ac6d-447a-b205-9802c0116adb	2160248e-63e1-4855-a33d-4deb6bcd24ad	1.000	25000.00	0.00	8.00	25000.00	2000.00	27000.00
2e2d63df-a369-4130-a038-65f83b051ac1	8e8c3aa4-ac6d-447a-b205-9802c0116adb	343979d6-e119-4834-be4f-7ce1a2c916f2	1.000	45000.00	0.00	8.00	45000.00	3600.00	48600.00
717fa6a0-0349-47a2-a35a-3c24251b3e9f	8e8c3aa4-ac6d-447a-b205-9802c0116adb	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	1.000	65000.00	5.00	8.00	61750.00	4940.00	66690.00
c52c962a-4f1d-4329-a9b5-bcd8d1bc4d87	b79b1849-abed-472a-86b3-9e760aec6cf0	2160248e-63e1-4855-a33d-4deb6bcd24ad	1.000	25000.00	0.00	8.00	25000.00	2000.00	27000.00
c7a0e3f3-0eb0-4f47-aa8b-560e2f5d3e28	b79b1849-abed-472a-86b3-9e760aec6cf0	343979d6-e119-4834-be4f-7ce1a2c916f2	1.000	45000.00	0.00	8.00	45000.00	3600.00	48600.00
cbc58d5b-2c5e-458e-a850-bd1594b56d32	b79b1849-abed-472a-86b3-9e760aec6cf0	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	1.000	65000.00	5.00	8.00	61750.00	4940.00	66690.00
b3e36c41-6cab-427c-aa8b-a0b974bbe4aa	30e0e1f8-5e18-492a-88ea-853c5cb58182	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	1.000	65000.00	5.00	8.00	61750.00	4940.00	66690.00
013bba17-5c7a-4679-9082-5d29d440b8c7	30e0e1f8-5e18-492a-88ea-853c5cb58182	9324213d-ee00-4c8b-91bc-e1828086a1a2	1.000	180000.00	0.00	8.00	180000.00	14400.00	194400.00
33bb9458-7476-4115-b20f-deb0da0c2398	290f3cec-ce68-47b4-b90b-93954a8d9d08	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	1.000	65000.00	5.00	8.00	61750.00	4940.00	66690.00
14329582-1ac7-4797-8bed-cf2b43759615	5ecaf9d5-e884-410b-a211-6136df4e9b24	2160248e-63e1-4855-a33d-4deb6bcd24ad	1.000	25000.00	0.00	8.00	25000.00	2000.00	27000.00
66605526-9064-4a1c-8953-5f39fdcd4613	5ecaf9d5-e884-410b-a211-6136df4e9b24	343979d6-e119-4834-be4f-7ce1a2c916f2	1.000	45000.00	0.00	8.00	45000.00	3600.00	48600.00
a6fa31a8-8e1e-4ed4-a7aa-d74ea32206cc	5ecaf9d5-e884-410b-a211-6136df4e9b24	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	1.000	65000.00	5.00	8.00	61750.00	4940.00	66690.00
0f3c40e1-3716-471d-bf15-4c33e4bd6428	5ecaf9d5-e884-410b-a211-6136df4e9b24	da9d44bd-e815-4664-95db-9f8858c015fe	1.000	38000.00	0.00	5.00	38000.00	1900.00	39900.00
cef00574-2830-4b3a-a415-04d4d215fd7c	3db57b9a-00f4-412a-914b-c520fa4a22d3	343979d6-e119-4834-be4f-7ce1a2c916f2	1.000	45000.00	0.00	8.00	45000.00	3600.00	48600.00
8dfabf1b-34c9-4d09-9c63-8b946e3cf914	3db57b9a-00f4-412a-914b-c520fa4a22d3	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	1.000	65000.00	5.00	8.00	61750.00	4940.00	66690.00
a52e249a-7da0-4237-a61a-bcec3151409e	873c5a1b-8b0c-4a9b-8b62-bcc02ffdcb9f	d725c994-9f10-4c9e-a1d6-45da98d2cd38	1.000	28000.00	0.00	5.00	28000.00	1400.00	29400.00
48a46bf1-c2db-480f-8796-d3c4ab1bc599	873c5a1b-8b0c-4a9b-8b62-bcc02ffdcb9f	90bf81b7-0667-4a37-85a3-0f99498380ee	1.000	32000.00	0.00	5.00	32000.00	1600.00	33600.00
7d071ca2-6e8d-45d5-8c9f-e2e75010d107	873c5a1b-8b0c-4a9b-8b62-bcc02ffdcb9f	9324213d-ee00-4c8b-91bc-e1828086a1a2	1.000	180000.00	0.00	8.00	180000.00	14400.00	194400.00
27a63b55-f649-430e-bd17-548fa95d1331	3f5b00c5-a235-45f4-95a6-fd303abd4f9f	9324213d-ee00-4c8b-91bc-e1828086a1a2	1.000	180000.00	0.00	8.00	180000.00	14400.00	194400.00
f4657c4e-c53a-4be6-bdae-f7aa6caba56f	1cdbbe9f-68fe-46b1-a0ae-bf1e7d5058b6	d725c994-9f10-4c9e-a1d6-45da98d2cd38	1.000	28000.00	0.00	5.00	28000.00	1400.00	29400.00
2c204aeb-72e7-48de-bc52-03e034facd7e	1cdbbe9f-68fe-46b1-a0ae-bf1e7d5058b6	90bf81b7-0667-4a37-85a3-0f99498380ee	1.000	32000.00	0.00	5.00	32000.00	1600.00	33600.00
5fd327b6-8610-4ac4-830f-1e0edef9a1cb	9e192c0d-1662-4b6c-8522-2917a98ebe16	d725c994-9f10-4c9e-a1d6-45da98d2cd38	1.000	28000.00	0.00	5.00	28000.00	1400.00	29400.00
bf166ea9-0d86-4d59-b0a5-7738b81fcadd	9e192c0d-1662-4b6c-8522-2917a98ebe16	90bf81b7-0667-4a37-85a3-0f99498380ee	1.000	32000.00	0.00	5.00	32000.00	1600.00	33600.00
5f0df4c9-e6cf-417f-a0ac-4993eaf3cf22	c1c51ef0-61db-4abe-89ba-d96cd1807313	d725c994-9f10-4c9e-a1d6-45da98d2cd38	1.000	28000.00	0.00	5.00	28000.00	1400.00	29400.00
ec11e772-724b-4398-8486-025bc52c99a2	d76a05b6-7c97-4507-a9c1-83b6c99ab112	d725c994-9f10-4c9e-a1d6-45da98d2cd38	1.000	28000.00	0.00	5.00	28000.00	1400.00	29400.00
8ebdbe68-5070-400d-8e0a-274b2870d685	d76a05b6-7c97-4507-a9c1-83b6c99ab112	90bf81b7-0667-4a37-85a3-0f99498380ee	1.000	32000.00	0.00	5.00	32000.00	1600.00	33600.00
476cad24-5848-4447-b876-25ec3fc18661	32606aac-f632-4f81-8475-f5aa1c418729	d725c994-9f10-4c9e-a1d6-45da98d2cd38	6.000	28000.00	0.00	5.00	168000.00	8400.00	176400.00
e4b65141-02b6-4661-9935-50f672188671	21abdfac-444c-4001-9701-8857c9a0a5c0	d725c994-9f10-4c9e-a1d6-45da98d2cd38	1.000	28000.00	0.00	5.00	28000.00	1400.00	29400.00
2b515c36-e299-4533-a90c-ce51a743ceef	21abdfac-444c-4001-9701-8857c9a0a5c0	90bf81b7-0667-4a37-85a3-0f99498380ee	1.000	32000.00	0.00	5.00	32000.00	1600.00	33600.00
\.


--
-- Data for Name: order_status_history; Type: TABLE DATA; Schema: agri; Owner: postgres
--

COPY agri.order_status_history (id, order_id, old_status, new_status, changed_by, note, created_at) FROM stdin;
001c20c1-e70b-476d-b282-b2e978481533	7230943f-75a8-49b1-87c4-5f3fea242e40	PENDING	SHIPPING	\N	\N	2025-10-23 10:36:11.394092+07
7c105aa3-030f-499e-847f-568997176c0f	7230943f-75a8-49b1-87c4-5f3fea242e40	SHIPPING	DRIVER_ARRIVED	\N	\N	2025-10-23 10:36:18.985117+07
26190b81-1838-4b9c-8659-0b22da36b30a	7230943f-75a8-49b1-87c4-5f3fea242e40	DRIVER_ARRIVED	DELIVERED	\N	\N	2025-10-23 10:36:24.333422+07
e5a2b00b-22af-4eaf-ab94-8b225a81c1de	33a5b61b-6a28-49e7-b314-870bb29daec0	PENDING	SHIPPING	\N	\N	2025-10-23 10:41:21.703239+07
973c2371-ff5f-49a4-902b-fb365179e176	33a5b61b-6a28-49e7-b314-870bb29daec0	SHIPPING	DRIVER_ARRIVED	\N	\N	2025-10-23 10:41:36.492248+07
362a29a6-3fa7-4de8-bb6b-0b410a03b100	33a5b61b-6a28-49e7-b314-870bb29daec0	DRIVER_ARRIVED	FAILED	\N	\N	2025-10-23 10:41:40.686427+07
d3274ac7-833f-454d-a9a0-cbdb039df1ca	8c1c678b-c16b-4527-97d7-2801c86fe4f1	PENDING	SHIPPING	\N	\N	2025-10-23 10:42:29.126682+07
7dc7e05a-8f42-494f-983a-530a2f2c3699	8c1c678b-c16b-4527-97d7-2801c86fe4f1	SHIPPING	DRIVER_ARRIVED	\N	\N	2025-10-23 10:42:37.440425+07
ee2050ec-21b6-4a70-b1b1-c16baddba549	8c1c678b-c16b-4527-97d7-2801c86fe4f1	DRIVER_ARRIVED	DELIVERED	\N	\N	2025-10-23 10:42:48.437215+07
00f9d041-6b8c-4b89-850b-d5356956a0bc	70a4e082-f6b9-4680-bbe5-a25b9a6e202f	PENDING	SHIPPING	\N	\N	2025-10-23 10:45:38.509558+07
fbba99dd-8137-49ca-8ac3-7e8d8b9dda1e	70a4e082-f6b9-4680-bbe5-a25b9a6e202f	SHIPPING	DRIVER_ARRIVED	\N	\N	2025-10-23 10:46:09.892824+07
b135ae93-0320-427c-b0bb-7a945e2dbaf5	70a4e082-f6b9-4680-bbe5-a25b9a6e202f	DRIVER_ARRIVED	DELIVERED	\N	\N	2025-10-24 11:03:27.615129+07
b74851b0-d431-49b7-a11b-24f7d7307958	78fbdf13-9467-427b-9856-9fbd00116d0a	PENDING	SHIPPING	\N	\N	2025-10-24 12:56:48.757947+07
f8571f96-5a73-4cab-a77e-fdb0f5fa2a01	c1bc281a-7397-4a78-ab49-bcb7d905f442	PENDING	SHIPPING	\N	\N	2025-10-24 12:57:03.256417+07
317a3fca-d61c-4536-b1e4-35771e6ae272	6b5362a6-6b63-4486-8657-39b56efd9f19	PENDING	SHIPPING	\N	\N	2025-10-24 12:57:17.342143+07
4ca68286-1ff3-47f1-9cb3-abe167166ba8	6b5362a6-6b63-4486-8657-39b56efd9f19	SHIPPING	DRIVER_ARRIVED	\N	\N	2025-10-24 12:57:25.847248+07
96f1a875-d78a-423f-b9b2-594aa41a7cdc	6b5362a6-6b63-4486-8657-39b56efd9f19	DRIVER_ARRIVED	DELIVERED	\N	\N	2025-10-24 12:57:38.943479+07
5c70051c-815f-4b5d-ba29-7d3579cf7b7c	78fbdf13-9467-427b-9856-9fbd00116d0a	SHIPPING	DRIVER_ARRIVED	\N	\N	2025-10-24 13:37:19.603418+07
e32e6841-5164-43d9-9172-fdf7cd4888c8	78fbdf13-9467-427b-9856-9fbd00116d0a	DRIVER_ARRIVED	DELIVERED	\N	\N	2025-10-24 13:37:22.965196+07
103155af-cdc8-4d12-80d2-c6535f366717	c1bc281a-7397-4a78-ab49-bcb7d905f442	SHIPPING	DRIVER_ARRIVED	\N	\N	2025-10-24 13:37:26.374509+07
3583ce48-c956-43fe-9e41-ffb303c0982d	c1bc281a-7397-4a78-ab49-bcb7d905f442	DRIVER_ARRIVED	DELIVERED	\N	\N	2025-10-24 13:37:28.735947+07
c04d6549-a760-41ac-ad45-045e08438e26	32b02562-6cae-4810-92dc-d96e24959243	PENDING	SHIPPING	\N	\N	2025-10-24 13:37:32.749537+07
fd2ae5a5-882d-44cf-a145-e7778fe41fcb	32b02562-6cae-4810-92dc-d96e24959243	SHIPPING	DRIVER_ARRIVED	\N	\N	2025-10-24 13:56:34.600797+07
07ae203d-d8a0-404f-9e42-fe2261547690	32b02562-6cae-4810-92dc-d96e24959243	DRIVER_ARRIVED	DELIVERED	\N	\N	2025-10-24 14:20:11.953427+07
7d9791e7-365c-44f6-a706-a29236f87733	fce965e3-3561-44f4-811c-307d27377a56	PENDING	SHIPPING	\N	\N	2025-10-24 14:23:23.55708+07
a1f25007-d7c0-4e04-bd63-9db613faf36c	7c621911-ac0a-495d-a65d-3bf8a1152b9f	PENDING	SHIPPING	\N	\N	2025-10-24 15:11:07.091353+07
28f0577e-2dcf-4fa6-9fd7-36420bce0fac	c2358be2-d0f7-4701-900b-8af553eaa17b	PENDING	SHIPPING	\N	\N	2025-10-24 15:11:10.253691+07
fd16706b-2dd7-4ddc-ad9c-2ff112b6bb61	7c621911-ac0a-495d-a65d-3bf8a1152b9f	SHIPPING	DRIVER_ARRIVED	\N	\N	2025-10-24 15:11:18.8701+07
741c9ada-7aaf-494a-86cb-5089e4ee02ed	7c621911-ac0a-495d-a65d-3bf8a1152b9f	DRIVER_ARRIVED	DELIVERED	\N	\N	2025-10-24 15:11:21.783685+07
88691be0-f8bc-46d1-ac10-923158693edb	c2358be2-d0f7-4701-900b-8af553eaa17b	SHIPPING	DRIVER_ARRIVED	\N	\N	2025-10-24 16:05:59.212114+07
b8122626-82fa-42d5-8007-ee967fe5d4e8	fce965e3-3561-44f4-811c-307d27377a56	SHIPPING	DRIVER_ARRIVED	\N	\N	2025-10-24 19:06:02.464577+07
cf12b732-f2f7-46d5-b32b-55ba0e62ff8c	fce965e3-3561-44f4-811c-307d27377a56	DRIVER_ARRIVED	DELIVERED	\N	\N	2025-10-24 19:06:10.67214+07
7d42cd43-1ba6-4e7d-8e85-872daba261b3	c2358be2-d0f7-4701-900b-8af553eaa17b	DRIVER_ARRIVED	DELIVERED	\N	\N	2025-10-24 19:06:20.757763+07
e7b8a908-26af-42a6-81db-6a96ac4d3c4a	f0594fbc-4198-47af-8095-7c8527e9628a	PENDING	SHIPPING	\N	\N	2025-10-25 00:12:07.492779+07
09ee2066-b992-4ac8-92cc-2b25d8e48131	8e8c3aa4-ac6d-447a-b205-9802c0116adb	PENDING	SHIPPING	\N	\N	2025-10-25 00:38:38.252263+07
a10cb4e3-76cc-4328-8f6e-b4c924237e1a	b79b1849-abed-472a-86b3-9e760aec6cf0	PENDING	SHIPPING	\N	\N	2025-10-25 01:14:02.325623+07
9848f41a-9022-494c-834f-ce969de06de3	b79b1849-abed-472a-86b3-9e760aec6cf0	SHIPPING	DRIVER_ARRIVED	\N	\N	2025-10-25 01:14:16.37554+07
6a93e417-81e0-4fdc-be37-03eb32629e76	b79b1849-abed-472a-86b3-9e760aec6cf0	DRIVER_ARRIVED	DELIVERED	\N	\N	2025-10-25 01:14:27.735432+07
ce07ed7e-64b4-432d-8282-08ddedcf9fad	f0594fbc-4198-47af-8095-7c8527e9628a	SHIPPING	DRIVER_ARRIVED	\N	\N	2025-10-25 01:15:24.933423+07
222ef150-eac8-44a6-98e7-f528dde545c3	f0594fbc-4198-47af-8095-7c8527e9628a	DRIVER_ARRIVED	FAILED	\N	\N	2025-10-25 01:15:31.116352+07
1936c1a1-46f9-46b8-b5b9-87338cc80241	8e8c3aa4-ac6d-447a-b205-9802c0116adb	SHIPPING	DRIVER_ARRIVED	\N	\N	2025-10-25 01:16:42.388092+07
0759c21e-cdf3-4b57-991c-390d705d47e5	30e0e1f8-5e18-492a-88ea-853c5cb58182	PENDING	SHIPPING	\N	\N	2025-10-25 01:19:07.93278+07
086c2b4c-d6bf-4872-aa21-e15d0fbcf0dd	30e0e1f8-5e18-492a-88ea-853c5cb58182	SHIPPING	DRIVER_ARRIVED	\N	\N	2025-10-25 01:19:12.517102+07
4eda08d9-1e32-422b-bc93-b8e5802c26cf	30e0e1f8-5e18-492a-88ea-853c5cb58182	DRIVER_ARRIVED	DELIVERED	\N	\N	2025-10-25 01:19:16.530838+07
0d57af13-e886-4ee4-bb9e-aa4af3b2536d	290f3cec-ce68-47b4-b90b-93954a8d9d08	PENDING	SHIPPING	\N	\N	2025-10-25 01:44:44.17415+07
bbecb8b2-d446-4d29-b29f-7562a1edda2c	290f3cec-ce68-47b4-b90b-93954a8d9d08	SHIPPING	DRIVER_ARRIVED	\N	\N	2025-10-25 01:46:21.839096+07
24171a18-971b-4ce3-bb92-0ec94a0682ae	8e8c3aa4-ac6d-447a-b205-9802c0116adb	DRIVER_ARRIVED	DELIVERED	\N	\N	2025-10-25 01:49:20.272122+07
a14aed2c-5e83-458d-87cc-ec0c514255f9	5ecaf9d5-e884-410b-a211-6136df4e9b24	PENDING	SHIPPING	\N	\N	2025-10-25 10:58:41.021389+07
6f0bd59f-7560-4b83-91ff-2dc86f4033e7	5ecaf9d5-e884-410b-a211-6136df4e9b24	SHIPPING	DRIVER_ARRIVED	\N	\N	2025-10-25 10:58:54.805137+07
44869b12-47e0-4400-9121-8bfbf5ede155	5ecaf9d5-e884-410b-a211-6136df4e9b24	DRIVER_ARRIVED	DELIVERED	\N	\N	2025-10-25 10:58:58.49913+07
cc5520e9-7342-4671-b810-66fbde725bdc	290f3cec-ce68-47b4-b90b-93954a8d9d08	DRIVER_ARRIVED	DELIVERED	\N	\N	2025-10-25 20:43:29.384048+07
691eaf94-622f-4d2d-ba0f-5db7c867e797	3db57b9a-00f4-412a-914b-c520fa4a22d3	PENDING	SHIPPING	\N	\N	2025-10-26 13:38:43.294562+07
41c21aaf-871e-45c6-b08d-8e97c30a1939	3db57b9a-00f4-412a-914b-c520fa4a22d3	SHIPPING	DRIVER_ARRIVED	\N	\N	2025-10-26 13:38:50.863687+07
477113be-6933-4886-bba7-8412e10af1d1	3db57b9a-00f4-412a-914b-c520fa4a22d3	DRIVER_ARRIVED	DELIVERED	\N	\N	2025-10-26 13:38:56.76574+07
9b2a697d-ae4f-4afa-a7a3-358d935f707b	873c5a1b-8b0c-4a9b-8b62-bcc02ffdcb9f	PENDING	SHIPPING	\N	\N	2025-10-26 20:21:13.802896+07
e6f2f408-b308-4d62-b95d-253e781720e9	873c5a1b-8b0c-4a9b-8b62-bcc02ffdcb9f	SHIPPING	DRIVER_ARRIVED	\N	\N	2025-10-26 20:21:16.458413+07
c736982f-6a40-4014-a9a0-118d724615b1	873c5a1b-8b0c-4a9b-8b62-bcc02ffdcb9f	DRIVER_ARRIVED	DELIVERED	\N	\N	2025-10-26 20:21:18.816043+07
c12bb7e7-d4a2-4d77-b94c-eb93a63d949b	1cdbbe9f-68fe-46b1-a0ae-bf1e7d5058b6	PENDING	PROCESSING	\N	\N	2025-10-26 20:49:18.871551+07
cedf4b87-876d-47b8-bded-48d32b267216	30c12150-b927-4ddf-80bf-42731b3aabad	PENDING	SHIPPING	\N	\N	2025-10-26 21:04:16.92681+07
30559a9e-5497-4def-be1e-5bfad79fb8f4	30c12150-b927-4ddf-80bf-42731b3aabad	SHIPPING	DRIVER_ARRIVED	\N	\N	2025-10-26 21:04:19.970918+07
18ab5fcb-c2be-435a-8cf5-30b860c36200	30c12150-b927-4ddf-80bf-42731b3aabad	DRIVER_ARRIVED	FAILED	\N	\N	2025-10-26 21:04:22.177924+07
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: agri; Owner: postgres
--

COPY agri.orders (id, order_code, customer_id, shipping_addr_id, status, payment_status, subtotal, tax_total, discount_total, shipping_fee, grand_total, note, created_at, updated_at, shipper_id, payment_method, shipping_phone, shipping_address, shipping_recipient) FROM stdin;
30e0e1f8-5e18-492a-88ea-853c5cb58182	ORD-20251025-8182	f59b72e8-bbec-4282-bffd-629444f3313b	65679bcd-2de1-4b19-a4db-27a2e6ce9509	DELIVERED	PAID	241750.00	19340.00	0.00	0.00	261090.00	\N	2025-10-25 01:18:45.719205+07	2025-10-25 01:19:16.530838+07	6dbef3d6-a414-4889-aaae-58d572159c22	COD	0345433544	60 duong so 1 gv, , 8, gv, hcm	tan huy
7230943f-75a8-49b1-87c4-5f3fea242e40	ORD-20251023-3419	f59b72e8-bbec-4282-bffd-629444f3313b	505240ef-58ea-407f-bc91-340e202c55da	DELIVERED	UNPAID	156750.00	11040.00	0.00	0.00	167790.00	\N	2025-10-23 10:27:20.969236+07	2025-10-23 10:36:24.333422+07	6dbef3d6-a414-4889-aaae-58d572159c22	COD	0914318513	84 phú thọ, 1, 11, tphcm	Admin
8e8c3aa4-ac6d-447a-b205-9802c0116adb	ORD-20251025-7741	f59b72e8-bbec-4282-bffd-629444f3313b	505240ef-58ea-407f-bc91-340e202c55da	DELIVERED	PAID	131750.00	10540.00	0.00	0.00	142290.00	\N	2025-10-25 00:38:25.141359+07	2025-10-25 01:49:20.272122+07	6dbef3d6-a414-4889-aaae-58d572159c22	COD	0914318513	84 phú thọ, 1, 11, tphcm	Admin
33a5b61b-6a28-49e7-b314-870bb29daec0	ORD-20251023-8423	9f23c6c0-f6bb-46eb-8698-a2deb439cb31	0ba22993-a5f4-4c3a-ad39-dbb44abeafa4	FAILED	UNPAID	86750.00	6190.00	0.00	0.00	92940.00	\N	2025-10-23 10:37:50.703681+07	2025-10-23 10:41:40.686427+07	6dbef3d6-a414-4889-aaae-58d572159c22	COD	0901111222	123 Duong A, Phuong 1, Quan 1, TPHCM	Nguyen Van A
5ecaf9d5-e884-410b-a211-6136df4e9b24	ORD-20251025-9217	f59b72e8-bbec-4282-bffd-629444f3313b	505240ef-58ea-407f-bc91-340e202c55da	DELIVERED	PAID	169750.00	12440.00	0.00	0.00	182190.00	\N	2025-10-25 10:58:15.935134+07	2025-10-25 10:58:58.49913+07	6dbef3d6-a414-4889-aaae-58d572159c22	COD	0914318513	84 phú thọ, 1, 11, tphcm	Admin
8c1c678b-c16b-4527-97d7-2801c86fe4f1	ORD-20251023-1064	9f23c6c0-f6bb-46eb-8698-a2deb439cb31	0ba22993-a5f4-4c3a-ad39-dbb44abeafa4	DELIVERED	UNPAID	61750.00	4940.00	0.00	0.00	66690.00	\N	2025-10-23 10:39:45.016913+07	2025-10-23 10:42:48.437215+07	6dbef3d6-a414-4889-aaae-58d572159c22	COD	0901111222	123 Duong A, Phuong 1, Quan 1, TPHCM	Nguyen Van A
290f3cec-ce68-47b4-b90b-93954a8d9d08	ORD-20251025-3272	f59b72e8-bbec-4282-bffd-629444f3313b	505240ef-58ea-407f-bc91-340e202c55da	DELIVERED	PAID	61750.00	4940.00	0.00	0.00	66690.00	\N	2025-10-25 01:39:51.311148+07	2025-10-25 20:43:29.384048+07	6dbef3d6-a414-4889-aaae-58d572159c22	COD	0914318513	84 phú thọ, 1, 11, tphcm	Admin
70a4e082-f6b9-4680-bbe5-a25b9a6e202f	ORD-20251023-0931	9f23c6c0-f6bb-46eb-8698-a2deb439cb31	0ba22993-a5f4-4c3a-ad39-dbb44abeafa4	DELIVERED	UNPAID	61750.00	4940.00	0.00	0.00	66690.00	\N	2025-10-23 10:44:15.29344+07	2025-10-24 11:03:27.615129+07	6dbef3d6-a414-4889-aaae-58d572159c22	COD	0901111222	123 Duong A, Phuong 1, Quan 1, TPHCM	Nguyen Van A
3db57b9a-00f4-412a-914b-c520fa4a22d3	ORD-20251026-6955	f59b72e8-bbec-4282-bffd-629444f3313b	505240ef-58ea-407f-bc91-340e202c55da	DELIVERED	PARTIALLY_REFUNDED	106750.00	8540.00	0.00	0.00	115290.00	\N	2025-10-26 13:38:37.655539+07	2025-10-26 20:09:20.045196+07	6dbef3d6-a414-4889-aaae-58d572159c22	COD	0914318513	84 phú thọ, 1, 11, tphcm	Admin
6b5362a6-6b63-4486-8657-39b56efd9f19	ORD-20251024-5588	f59b72e8-bbec-4282-bffd-629444f3313b	505240ef-58ea-407f-bc91-340e202c55da	DELIVERED	PAID	106750.00	8540.00	0.00	0.00	115290.00	\N	2025-10-24 12:55:30.835209+07	2025-10-24 12:57:38.943479+07	6dbef3d6-a414-4889-aaae-58d572159c22	COD	0914318513	84 phú thọ, 1, 11, tphcm	Admin
78fbdf13-9467-427b-9856-9fbd00116d0a	ORD-20251024-2506	9f23c6c0-f6bb-46eb-8698-a2deb439cb31	0ba22993-a5f4-4c3a-ad39-dbb44abeafa4	DELIVERED	PAID	86750.00	6190.00	0.00	0.00	92940.00	\N	2025-10-24 11:03:51.930346+07	2025-10-24 13:37:22.965196+07	6dbef3d6-a414-4889-aaae-58d572159c22	COD	0901111222	123 Duong A, Phuong 1, Quan 1, TPHCM	Nguyen Van A
c1bc281a-7397-4a78-ab49-bcb7d905f442	ORD-20251024-2505	9f23c6c0-f6bb-46eb-8698-a2deb439cb31	0ba22993-a5f4-4c3a-ad39-dbb44abeafa4	DELIVERED	PAID	106750.00	8540.00	0.00	0.00	115290.00	\N	2025-10-24 12:05:00.735668+07	2025-10-24 13:37:28.735947+07	6dbef3d6-a414-4889-aaae-58d572159c22	COD	0901111222	123 Duong A, Phuong 1, Quan 1, TPHCM	Nguyen Van A
873c5a1b-8b0c-4a9b-8b62-bcc02ffdcb9f	ORD-20251026-6691	f59b72e8-bbec-4282-bffd-629444f3313b	505240ef-58ea-407f-bc91-340e202c55da	DELIVERED	PAID	240000.00	17400.00	0.00	0.00	257400.00	\N	2025-10-26 20:20:55.907478+07	2025-10-26 20:21:18.816043+07	6dbef3d6-a414-4889-aaae-58d572159c22	COD	0914318513	84 phú thọ, 1, 11, tphcm	Admin
32b02562-6cae-4810-92dc-d96e24959243	ORD-20251024-5731	9f23c6c0-f6bb-46eb-8698-a2deb439cb31	0ba22993-a5f4-4c3a-ad39-dbb44abeafa4	DELIVERED	PAID	86750.00	6190.00	0.00	0.00	92940.00	\N	2025-10-24 11:47:17.516993+07	2025-10-24 14:20:11.953427+07	6dbef3d6-a414-4889-aaae-58d572159c22	COD	0901111222	123 Duong A, Phuong 1, Quan 1, TPHCM	Nguyen Van A
3f5b00c5-a235-45f4-95a6-fd303abd4f9f	ORD-20251026-9876	f59b72e8-bbec-4282-bffd-629444f3313b	505240ef-58ea-407f-bc91-340e202c55da	PENDING	UNPAID	180000.00	14400.00	0.00	0.00	194400.00	\N	2025-10-26 20:34:12.471706+07	2025-10-26 20:34:12.471706+07	\N	BANK_TRANSFER	0914318513	84 phú thọ, 1, 11, tphcm	Admin
aa7a68ea-9c3f-4904-91bf-34cc9bff011d	ORD-20251026-1584	f59b72e8-bbec-4282-bffd-629444f3313b	505240ef-58ea-407f-bc91-340e202c55da	PENDING	UNPAID	0.00	0.00	0.00	0.00	0.00	\N	2025-10-26 20:51:25.283446+07	2025-10-26 20:51:25.283446+07	\N	BANK_TRANSFER	0914318513	84 phú thọ, 1, 11, tphcm	Admin
1cdbbe9f-68fe-46b1-a0ae-bf1e7d5058b6	ORD-20251026-5047	f59b72e8-bbec-4282-bffd-629444f3313b	505240ef-58ea-407f-bc91-340e202c55da	PROCESSING	PENDING_CONFIRMATION	60000.00	3000.00	0.00	0.00	63000.00	\N	2025-10-26 20:44:07.568132+07	2025-10-26 20:49:18.871551+07	\N	BANK_TRANSFER	0914318513	84 phú thọ, 1, 11, tphcm	Admin
7c621911-ac0a-495d-a65d-3bf8a1152b9f	ORD-20251024-1857	f59b72e8-bbec-4282-bffd-629444f3313b	505240ef-58ea-407f-bc91-340e202c55da	DELIVERED	PAID	106750.00	8540.00	0.00	0.00	115290.00	\N	2025-10-24 14:31:24.401842+07	2025-10-24 15:11:21.783685+07	6dbef3d6-a414-4889-aaae-58d572159c22	COD	0914318513	84 phú thọ, 1, 11, tphcm	Admin
9e192c0d-1662-4b6c-8522-2917a98ebe16	ORD-20251026-5677	f59b72e8-bbec-4282-bffd-629444f3313b	505240ef-58ea-407f-bc91-340e202c55da	PENDING	UNPAID	60000.00	3000.00	0.00	0.00	63000.00	\N	2025-10-26 20:51:22.830941+07	2025-10-26 20:51:22.830941+07	\N	BANK_TRANSFER	0914318513	84 phú thọ, 1, 11, tphcm	Admin
fce965e3-3561-44f4-811c-307d27377a56	ORD-20251024-9373	f59b72e8-bbec-4282-bffd-629444f3313b	505240ef-58ea-407f-bc91-340e202c55da	DELIVERED	PAID	241750.00	19340.00	0.00	0.00	261090.00	\N	2025-10-24 14:23:12.102222+07	2025-10-24 19:06:10.67214+07	6dbef3d6-a414-4889-aaae-58d572159c22	COD	0914318513	84 phú thọ, 1, 11, tphcm	Admin
c2358be2-d0f7-4701-900b-8af553eaa17b	ORD-20251024-4359	f59b72e8-bbec-4282-bffd-629444f3313b	505240ef-58ea-407f-bc91-340e202c55da	DELIVERED	PAID	123500.00	9880.00	0.00	0.00	133380.00	\N	2025-10-24 15:03:07.11189+07	2025-10-24 19:06:20.757763+07	6dbef3d6-a414-4889-aaae-58d572159c22	COD	0914318513	84 phú thọ, 1, 11, tphcm	Admin
f01b20b4-34f7-4f5a-93ee-04e9d5a29710	ORD-20251026-2098	f59b72e8-bbec-4282-bffd-629444f3313b	505240ef-58ea-407f-bc91-340e202c55da	PENDING	UNPAID	0.00	0.00	0.00	0.00	0.00	\N	2025-10-26 20:51:29.714035+07	2025-10-26 20:51:29.714035+07	\N	BANK_TRANSFER	0914318513	84 phú thọ, 1, 11, tphcm	Admin
c1c51ef0-61db-4abe-89ba-d96cd1807313	ORD-20251026-4551	f59b72e8-bbec-4282-bffd-629444f3313b	505240ef-58ea-407f-bc91-340e202c55da	PENDING	UNPAID	28000.00	1400.00	0.00	0.00	29400.00	\N	2025-10-26 20:51:45.933446+07	2025-10-26 20:51:45.933446+07	\N	BANK_TRANSFER	0914318513	84 phú thọ, 1, 11, tphcm	Admin
30c12150-b927-4ddf-80bf-42731b3aabad	ORD-20251026-7506	f59b72e8-bbec-4282-bffd-629444f3313b	505240ef-58ea-407f-bc91-340e202c55da	FAILED	UNPAID	0.00	0.00	0.00	0.00	0.00	\N	2025-10-26 20:52:01.126011+07	2025-10-26 21:04:22.177924+07	6dbef3d6-a414-4889-aaae-58d572159c22	BANK_TRANSFER	0914318513	84 phú thọ, 1, 11, tphcm	Admin
d76a05b6-7c97-4507-a9c1-83b6c99ab112	ORD-20251026-1480	f59b72e8-bbec-4282-bffd-629444f3313b	505240ef-58ea-407f-bc91-340e202c55da	PENDING	UNPAID	60000.00	3000.00	0.00	0.00	63000.00	\N	2025-10-26 20:52:13.067616+07	2025-10-26 20:52:13.067616+07	\N	BANK_TRANSFER	0914318513	84 phú thọ, 1, 11, tphcm	Admin
32606aac-f632-4f81-8475-f5aa1c418729	ORD-20251026-0564	f59b72e8-bbec-4282-bffd-629444f3313b	505240ef-58ea-407f-bc91-340e202c55da	PENDING	UNPAID	168000.00	8400.00	0.00	0.00	176400.00	\N	2025-10-26 20:52:29.940668+07	2025-10-26 20:52:29.940668+07	\N	BANK_TRANSFER	0914318513	84 phú thọ, 1, 11, tphcm	Admin
21abdfac-444c-4001-9701-8857c9a0a5c0	ORD-20251026-0255	f59b72e8-bbec-4282-bffd-629444f3313b	505240ef-58ea-407f-bc91-340e202c55da	PENDING	PAID	60000.00	3000.00	0.00	0.00	63000.00	[Admin xác nhận thanh toán: Admin xác nhận đã nhận tiền]	2025-10-26 20:53:51.724436+07	2025-10-26 21:02:31.530905+07	\N	BANK_TRANSFER	0914318513	84 phú thọ, 1, 11, tphcm	Admin
b79b1849-abed-472a-86b3-9e760aec6cf0	ORD-20251025-2067	f59b72e8-bbec-4282-bffd-629444f3313b	505240ef-58ea-407f-bc91-340e202c55da	DELIVERED	PAID	131750.00	10540.00	0.00	0.00	142290.00	\N	2025-10-25 01:13:39.782602+07	2025-10-25 01:14:27.735432+07	6dbef3d6-a414-4889-aaae-58d572159c22	COD	0914318513	84 phú thọ, 1, 11, tphcm	Admin
f0594fbc-4198-47af-8095-7c8527e9628a	ORD-20251024-6163	f59b72e8-bbec-4282-bffd-629444f3313b	505240ef-58ea-407f-bc91-340e202c55da	FAILED	UNPAID	98000.00	6700.00	0.00	0.00	104700.00	\N	2025-10-24 23:28:15.452602+07	2025-10-25 01:15:31.116352+07	6dbef3d6-a414-4889-aaae-58d572159c22	BANK_TRANSFER	0914318513	84 phú thọ, 1, 11, tphcm	Admin
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: agri; Owner: postgres
--

COPY agri.payments (id, order_id, method, amount, paid_at, txn_ref, created_at) FROM stdin;
f50176b1-e7ef-4c4b-9070-92098591ed01	21abdfac-444c-4001-9701-8857c9a0a5c0	BANK_TRANSFER	63000.00	2025-10-26 21:02:31.530905+07	\N	2025-10-26 21:02:31.530905+07
\.


--
-- Data for Name: product_images; Type: TABLE DATA; Schema: agri; Owner: postgres
--

COPY agri.product_images (id, product_id, url, is_main, sort_order) FROM stdin;
30ded283-293a-45d8-8119-d445f2df3f58	2160248e-63e1-4855-a33d-4deb6bcd24ad	https://www.btaskee.com/wp-content/uploads/2021/09/buoc-1-nhat-rau-muong-sach-1.jpg	t	4
1bce306a-8b02-4391-a870-780c36713273	343979d6-e119-4834-be4f-7ce1a2c916f2	https://lamnongxanh.com/wp-content/uploads/2021/11/cam-sanh-g25129a878_1280.jpg	t	1
272033d6-a288-4bae-aa80-f71ad942fe41	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	https://cdn.tgdd.vn/2020/10/content/8-800x500-2.jpg	t	1
9dd38abc-3d08-42a7-8c95-345754ec601c	c52d57cb-0388-437f-a2c6-d1d71fa45b87	https://cdn.tgdd.vn/2022/02/CookDishThumb/cach-chon-dua-leo-ngon-khong-bi-dang-va-cach-bao-quan-dua-leo-thumb-620x620.jpg	t	1
10feb916-7569-44a1-a59d-3744d6c90ee9	e7682692-ecaa-4401-a373-11b16d2132e7	https://www.lottemart.vn/media/catalog/product/cache/0x0/2/2/2276710000007-1.jpg.webp	t	1
e4a1677f-796e-45b7-8a5e-3ecfffa22128	0a816138-6821-4f0e-b2a0-540f9db5d538	https://product.hstatic.net/1000354044/product/brocoli__2__1a0bfc548bbf43ab8435a1724f7833f6_master.jpg	t	1
08194800-791e-492c-afda-d3de03dcaaae	b31c36c4-5b2f-4000-9781-252cf6942700	https://product.hstatic.net/200000423303/product/bap-cai-huu-co_203a09f5391b4cb59bbad82f94c1cd7d.jpg	t	1
aa064cbf-17c3-4541-bccd-fc84c7fa42c9	3e148a8d-8bcb-4c43-8a64-4135e4ff6519	https://bizweb.dktcdn.net/100/390/808/products/20190405141327hat-giong-cai-bo-xoi.jpg?v=1593856342497	t	1
b81da5d8-bb25-46d5-8499-2998ded8dd18	da9d44bd-e815-4664-95db-9f8858c015fe	https://hongngochospital.vn/wp-content/uploads/2020/02/dinh-duong-tu-khoai-tay.jpg	t	1
4ebe8424-f27c-4de4-b1a7-14946fb8e26d	5518a2f7-6a2b-4712-8f40-1aa7bc1fb3b5	https://suckhoedoisong.qltns.mediacdn.vn/324455921873985536/2025/3/28/photo-1743152190848-174315219178138778371.jpeg	t	1
616bf94d-fe1c-4657-910e-fa64aba9f7a3	355bc2d6-6d28-4ec4-b3ad-46cb867b06e1	https://medlatec.vn/media/10355/content/20210706_dau-xanh-giup-cung-cap-nhung-thanh-phan-dinh-duong-can-thiet-cho-co-the-1.jpg	t	1
cce46775-373d-4444-86f8-1f0c07152998	3d6c9893-f5b4-48d4-b4f0-a96753637366	https://bizweb.dktcdn.net/thumb/1024x1024/100/390/808/products/thuong-thuc-dau-nanh-theo-phong-cach-singapore-1.jpg?v=1592987555860	t	1
8322e370-3675-438f-8909-9f32a9958a0b	e06a3539-eb40-4be1-be21-df27f28a0c47	https://cdn2.tuoitre.vn/thumb_w/480/471584752817336320/2024/3/7/bi-do1-17097757685131285490179.jpg	t	1
46918a36-b4ab-4e3f-9525-055e3efcaa12	f4a53f49-af14-45b7-a580-c0c2d0648eb7	https://product.hstatic.net/200000157781/product/quyt_vang_da_lat_a04b07b4a7b04964bed40423fcd37e67.png	t	1
93ad86c1-56d2-4469-a544-8e53f3fb215d	35025dec-0c2b-43f9-a51a-adcb04f9b8bd	https://hoithankinhhocvietnam.com.vn/vnna-media/24/6/6/4-cach-chua-mat-ngu-bang-toi-vo-cung-don-gian--de.jpg	t	1
7cb65ac3-687c-40ef-aa4f-071cd95f8043	51b9e58c-4419-4b9b-99cb-8402b6a8c509	https://media.vov.vn/sites/default/files/styles/large/public/2023-07/loi_ich_cua_qua_thanh_long.jpeg	t	1
03eb21a9-6198-4b1c-be61-93323e7e597e	a26d6429-b4ab-441a-8720-e7f8a33d15cd	https://cdn.tgdd.vn/Files/2020/12/12/1313297/nam-kim-cham-la-gi-loi-ich-cua-nam-kim-cham-nam-kim-cham-nau-gi-ngon-202012121617538700.jpg	t	1
119d41ad-3bcb-4058-a0a6-a10e72a0fc6e	23f1e8cd-0159-48ff-bc07-99c66b91e1e7	https://product.hstatic.net/200000157781/product/dsc_7673_copy_21112823a1ce471d895c58e3ea2bf8e8_1024x1024.jpg	t	1
b2d749d0-c269-4668-9e24-991817d40867	9466f1ef-2be8-4106-a23e-38cd380783bf	https://cdnphoto.dantri.com.vn/t4VIhNMU7lBZiea3HjdUjV6TzQk=/zoom/1200_630/2024/09/20/hanhtim-crop-1726840472215.jpeg	t	1
a47d880c-2fc2-4751-9c53-6db547e865e4	95a4d02d-8615-41ce-9d33-673b6195910c	https://medlatec.vn/media/27576/content/image001-964.jpg	t	1
6dc8db56-d565-430d-b73a-24502826ad38	a4b52989-5deb-4a52-b5e8-e0fdaac51f08	https://thiensafoods.com/upload/product/buoi-da-xanh-ruot-do-5018.jpg	t	1
ccfb1258-f397-43d3-82fa-230aa5b45e56	77494413-e728-4d33-9ba6-84536d5f3948	https://product.hstatic.net/1000354044/product/rau_den_6bd19d23672f443db1437721f5979bc6_master.jpg	t	1
a21a252b-8299-4e56-86bc-2bf8b1f05b07	236c5e08-edb3-477b-8527-985b50a236df	https://vuagaovn.com/upload/1/products/l_1906676030_go_thm_lai.png	t	1
87a37eb1-2e57-4e55-8b8e-37eb0d976717	de2e7b44-ca11-4626-8c84-9d0f6b58d0cc	https://nhatminhfoods.com/media/product/60-pepper.jpg	t	1
16f8358b-6915-4eba-a756-850879b38dbf	9324213d-ee00-4c8b-91bc-e1828086a1a2	https://product.hstatic.net/200000325223/product/sau_rieng_new-01_63392fbb5c3d449e913faebc332ae80f_master.png	t	1
387d5ba0-e556-4445-8147-6014e3533bb6	d725c994-9f10-4c9e-a1d6-45da98d2cd38	https://bizweb.dktcdn.net/thumb/1024x1024/100/390/808/products/417703-aadd29cc34ac4e77ad0a253a570c41fd-large.jpg?v=1592815671443	t	1
4b0315c0-f751-4bbb-b5da-2218161fcbf6	4b4158a9-5a49-46d6-a241-0f522e3c9740	https://cdnphoto.dantri.com.vn/ampkLLVFN5Y7T56gUVBIxdwv6ww=/thumb_w/1020/2025/08/07/dua-hau-1754523539998.jpg	t	1
3d4a11ab-45db-4a8d-a766-3e8a283f6bc9	42486696-e03b-4aee-8cdc-4494d3b22f83	https://cdn.tgdd.vn/Files/2021/02/26/1330795/nam-bao-ngu-la-gi-loi-ich-va-gia-thanh-cua-nam-bao-ngu-xam-202202151453017964.jpg	t	1
0d03b37c-132b-4017-ae07-2892c5bcd3f3	6124a16e-95d3-4d4c-9a87-84fda6fbeaf9	https://cdn.hellobacsi.com/wp-content/uploads/2022/04/cach-che-bien-nam-bao-ngu_1746641741.jpg?w=828&q=100	t	1
a15e7206-ebea-4b77-815e-5d5402f5d19c	76f1caf0-a436-44ad-9b10-36c85494a198	https://namxanh.vn/wp-content/uploads/2020/03/nam-huong-tuoi-nam-dong-co-tuoi-1.jpg	t	1
c82435bb-63f9-42ec-9111-0216b9169928	90bf81b7-0667-4a37-85a3-0f99498380ee	https://suckhoedoisong.qltns.mediacdn.vn/324455921873985536/2021/9/25/tac-dung-cua-ca-chua-doi-voi-suc-khoe-1-1632310636-831-width640height427-1632567723926-16325677242441321628137.jpg	t	1
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: agri; Owner: postgres
--

COPY agri.products (id, sku, name, slug, category_id, brand_id, unit, price, cost_price, tax_rate, discount_rate, weight_gram, short_desc, description, is_active, created_at, updated_at, search_tsv, image_url, main_image) FROM stdin;
c52d57cb-0388-437f-a2c6-d1d71fa45b87	AGR-RC-DUA-LEO	Dưa leo	dua-leo	20658ecf-8c34-48d8-815b-d0b958f36ec4	1c219abb-1425-4c2f-ae77-285e98f32a3b	KG	24000.00	18000.00	5.00	0.00	\N	Dưa leo giòn	Trồng theo VietGAP	t	2025-10-24 20:26:13.960968+07	2025-10-24 20:26:13.960968+07	'dua':1,3 'gion':5 'leo':2,4 'theo':7 'trong':6 'vietgap':8	https://cdn.tgdd.vn/2022/02/CookDishThumb/cach-chon-dua-leo-ngon-khong-bi-dang-va-cach-bao-quan-dua-leo-thumb-620x620.jpg	\N
450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	CF-OR-XOAI	Xoai cat	xoai-cat	6297981d-a59d-4959-8a23-e436f1bce3ca	1c219abb-1425-4c2f-ae77-285e98f32a3b	KG	65000.00	1256.00	8.00	5.00	\N	Xoai cat chin vua, ngot		t	2025-10-22 06:33:24.943388+07	2025-10-26 20:09:05.42105+07	'cat':2,4 'chin':5 'ngot':7 'vua':6 'xoai':1,3	https://cdn.tgdd.vn/2020/10/content/8-800x500-2.jpg	\N
6124a16e-95d3-4d4c-9a87-84fda6fbeaf9	AGR-RC-XA-LACH	Xà lách	xa-lach	20658ecf-8c34-48d8-815b-d0b958f36ec4	1c219abb-1425-4c2f-ae77-285e98f32a3b	KG	35000.00	27000.00	5.00	0.00	\N	Xà lách thủy canh	Lá xanh mướt, giòn	t	2025-10-24 20:26:13.960968+07	2025-10-24 20:26:13.960968+07	'canh':6 'gion':10 'la':7 'lach':2,4 'muot':9 'thuy':5 'xa':1,3 'xanh':8	https://cdn.hellobacsi.com/wp-content/uploads/2022/04/cach-che-bien-nam-bao-ngu_1746641741.jpg?w=828&q=100	\N
77494413-e728-4d33-9ba6-84536d5f3948	AGR-RC-RAU-DEN	Rau dền	rau-den	20658ecf-8c34-48d8-815b-d0b958f36ec4	974a450b-5fcd-4c0f-9ed4-1994da37b92c	KG	26000.00	0.00	8.00	0.00	\N	Rau dền non		f	2025-10-24 20:26:13.960968+07	2025-10-25 09:10:17.301675+07	'den':2,4 'non':5 'rau':1,3	https://product.hstatic.net/1000354044/product/rau_den_6bd19d23672f443db1437721f5979bc6_master.jpg	\N
d725c994-9f10-4c9e-a1d6-45da98d2cd38	AGR-RC-CAI-XANH	Cải xanh	cai-xanh	20658ecf-8c34-48d8-815b-d0b958f36ec4	74d31649-6ab1-484c-bb73-1b6af60ab513	KG	28000.00	30000.00	5.00	0.00	\N	Cải xanh tươi, giòn	Thu hoạch trong ngày, rửa sạch	t	2025-10-24 20:26:13.960968+07	2025-10-26 20:09:05.42105+07	'cai':1,3 'gion':6 'hoach':8 'ngay':10 'rua':11 'sach':12 'thu':7 'trong':9 'tuoi':5 'xanh':2,4	https://bizweb.dktcdn.net/thumb/1024x1024/100/390/808/products/417703-aadd29cc34ac4e77ad0a253a570c41fd-large.jpg?v=1592815671443	\N
90bf81b7-0667-4a37-85a3-0f99498380ee	AGR-RC-CA-CHUA	Cà chua	ca-chua	20658ecf-8c34-48d8-815b-d0b958f36ec4	974a450b-5fcd-4c0f-9ed4-1994da37b92c	KG	32000.00	25000.00	5.00	0.00	\N	Cà chua chín mọng	Dùng salad, nấu ăn	t	2025-10-24 20:26:13.960968+07	2025-10-26 20:09:05.42105+07	'an':10 'ca':1,3 'chin':5 'chua':2,4 'dung':7 'mong':6 'nau':9 'salad':8	https://suckhoedoisong.qltns.mediacdn.vn/324455921873985536/2021/9/25/tac-dung-cua-ca-chua-doi-voi-suc-khoe-1-1632310636-831-width640height427-1632567723926-16325677242441321628137.jpg	\N
2160248e-63e1-4855-a33d-4deb6bcd24ad	CF-OR-RAU-MUONG	Rau muong	rau-muong	20658ecf-8c34-48d8-815b-d0b958f36ec4	74d31649-6ab1-484c-bb73-1b6af60ab513	KG	25000.00	0.00	8.00	0.00	\N	Rau muong tuoi		t	2025-10-22 06:33:24.943388+07	2025-10-24 14:08:38.343783+07	'muong':2,4 'rau':1,3 'tuoi':5	https://www.btaskee.com/wp-content/uploads/2021/09/buoc-1-nhat-rau-muong-sach-1.jpg	\N
343979d6-e119-4834-be4f-7ce1a2c916f2	CF-OR-CAM	Cam sanh huu co	cam-sanh-huu-co	6297981d-a59d-4959-8a23-e436f1bce3ca	974a450b-5fcd-4c0f-9ed4-1994da37b92c	KG	45000.00	0.00	8.00	0.00	\N	Cam sanh tuoi ngon, huu co		t	2025-10-22 06:33:24.943388+07	2025-10-24 14:18:26.259992+07	'cam':1,5 'co':4,10 'huu':3,9 'ngon':8 'sanh':2,6 'tuoi':7	https://lamnongxanh.com/wp-content/uploads/2021/11/cam-sanh-g25129a878_1280.jpg	\N
0a816138-6821-4f0e-b2a0-540f9db5d538	AGR-RC-SUP-LO	Súp lơ xanh	sup-lo-xanh	20658ecf-8c34-48d8-815b-d0b958f36ec4	74d31649-6ab1-484c-bb73-1b6af60ab513	KG	52000.00	0.00	8.00	0.00	\N	Bông cải xanh		t	2025-10-24 20:26:13.960968+07	2025-10-24 23:02:06.683275+07	'bong':4 'cai':5 'lo':2 'sup':1 'xanh':3,6	https://product.hstatic.net/1000354044/product/brocoli__2__1a0bfc548bbf43ab8435a1724f7833f6_master.jpg	\N
e7682692-ecaa-4401-a373-11b16d2132e7	AGR-TC-TAO-GALA	Táo gala	tao-gala	6297981d-a59d-4959-8a23-e436f1bce3ca	974a450b-5fcd-4c0f-9ed4-1994da37b92c	KG	85000.00	0.00	8.00	0.00	\N	Táo ngọt giòn		t	2025-10-24 20:26:13.960968+07	2025-10-24 23:01:02.798462+07	'gala':2 'gion':5 'ngot':4 'tao':1,3	https://www.lottemart.vn/media/catalog/product/cache/0x0/2/2/2276710000007-1.jpg.webp	\N
e06a3539-eb40-4be1-be21-df27f28a0c47	AGR-RC-BI-DO	Bí đỏ	bi-do	20658ecf-8c34-48d8-815b-d0b958f36ec4	1c219abb-1425-4c2f-ae77-285e98f32a3b	KG	26000.00	19000.00	5.00	0.00	\N	Bí đỏ hồ lô	Ngọt bùi	t	2025-10-24 20:26:13.960968+07	2025-10-24 20:26:13.960968+07	'bi':1,3 'bui':8 'do':2,4 'ho':5 'lo':6 'ngot':7	https://cdn2.tuoitre.vn/thumb_w/480/471584752817336320/2024/3/7/bi-do1-17097757685131285490179.jpg	\N
35025dec-0c2b-43f9-a51a-adcb04f9b8bd	AGR-RC-TOI	Tỏi ta	toi-ta	20658ecf-8c34-48d8-815b-d0b958f36ec4	1c219abb-1425-4c2f-ae77-285e98f32a3b	KG	98000.00	82000.00	5.00	0.00	\N	Tỏi ta Lý Sơn	Tép nhỏ, thơm	t	2025-10-24 20:26:13.960968+07	2025-10-24 20:26:13.960968+07	'ly':5 'nho':8 'son':6 'ta':2,4 'tep':7 'thom':9 'toi':1,3	https://hoithankinhhocvietnam.com.vn/vnna-media/24/6/6/4-cach-chua-mat-ngu-bang-toi-vo-cung-don-gian--de.jpg	\N
f4a53f49-af14-45b7-a580-c0c2d0648eb7	AGR-TC-QUYT	Quýt đường	quyt-duong	6297981d-a59d-4959-8a23-e436f1bce3ca	74d31649-6ab1-484c-bb73-1b6af60ab513	KG	48000.00	0.00	8.00	0.00	\N	Vỏ mỏng, mọng nước		t	2025-10-24 20:26:13.960968+07	2025-10-24 23:12:22.610014+07	'duong':2 'mong':4,5 'nuoc':6 'quyt':1 'vo':3	https://product.hstatic.net/200000157781/product/quyt_vang_da_lat_a04b07b4a7b04964bed40423fcd37e67.png	\N
51b9e58c-4419-4b9b-99cb-8402b6a8c509	AGR-TC-THANH-LONG	Thanh long ruột đỏ	thanh-long-ruot-do	6297981d-a59d-4959-8a23-e436f1bce3ca	74d31649-6ab1-484c-bb73-1b6af60ab513	KG	32000.00	25000.00	8.00	0.00	\N	Đẹp mã, ruột đỏ	Bình Thuận	t	2025-10-24 20:26:13.960968+07	2025-10-24 20:26:13.960968+07	'binh':9 'dep':5 'do':4,8 'long':2 'ma':6 'ruot':3,7 'thanh':1 'thuan':10	https://media.vov.vn/sites/default/files/styles/large/public/2023-07/loi_ich_cua_qua_thanh_long.jpeg	\N
a26d6429-b4ab-441a-8720-e7f8a33d15cd	AGR-NM-KIM-CHAM	Nấm kim châm	nam-kim-cham	588035c1-f0dd-43cc-a94d-7e8fcc6beb4c	1c219abb-1425-4c2f-ae77-285e98f32a3b	KG	95000.00	78000.00	5.00	0.00	\N	Nấm kim châm Hàn	Đóng gói lạnh	t	2025-10-24 20:26:13.960968+07	2025-10-24 20:26:13.960968+07	'cham':3,6 'dong':8 'goi':9 'han':7 'kim':2,5 'lanh':10 'nam':1,4	https://cdn.tgdd.vn/Files/2020/12/12/1313297/nam-kim-cham-la-gi-loi-ich-cua-nam-kim-cham-nam-kim-cham-nau-gi-ngon-202012121617538700.jpg	\N
23f1e8cd-0159-48ff-bc07-99c66b91e1e7	AGR-TC-CHUOI-GIA	Chuối già	chuoi-gia	6297981d-a59d-4959-8a23-e436f1bce3ca	74d31649-6ab1-484c-bb73-1b6af60ab513	KG	28000.00	22000.00	8.00	0.00	\N	Chuối chín tự nhiên	Miền Tây	t	2025-10-24 20:26:13.960968+07	2025-10-24 20:26:13.960968+07	'chin':4 'chuoi':1,3 'gia':2 'mien':7 'nhien':6 'tay':8 'tu':5	https://product.hstatic.net/200000157781/product/dsc_7673_copy_21112823a1ce471d895c58e3ea2bf8e8_1024x1024.jpg	\N
9466f1ef-2be8-4106-a23e-38cd380783bf	AGR-RC-HANH-TIM	Hành tím	hanh-tim	20658ecf-8c34-48d8-815b-d0b958f36ec4	74d31649-6ab1-484c-bb73-1b6af60ab513	KG	52000.00	42000.00	5.00	0.00	\N	Hành tím Vĩnh Châu	Khô ráo, thơm	t	2025-10-24 20:26:13.960968+07	2025-10-24 20:26:13.960968+07	'chau':6 'hanh':1,3 'kho':7 'rao':8 'thom':9 'tim':2,4 'vinh':5	https://cdnphoto.dantri.com.vn/t4VIhNMU7lBZiea3HjdUjV6TzQk=/zoom/1200_630/2024/09/20/hanhtim-crop-1726840472215.jpeg	\N
de2e7b44-ca11-4626-8c84-9d0f6b58d0cc	AGR-RC-OT-CHUONG	Ớt chuông	ot-chuong	20658ecf-8c34-48d8-815b-d0b958f36ec4	974a450b-5fcd-4c0f-9ed4-1994da37b92c	KG	78000.00	64000.00	5.00	0.00	\N	Ớt chuông mix màu	Giòn ngọt	t	2025-10-24 20:26:13.960968+07	2025-10-24 20:26:13.960968+07	'chuong':2,4 'gion':7 'mau':6 'mix':5 'ngot':8 'ot':1,3	https://nhatminhfoods.com/media/product/60-pepper.jpg	\N
95a4d02d-8615-41ce-9d33-673b6195910c	AGR-NM-NAM-ROM	Nấm rơm	nam-rom	588035c1-f0dd-43cc-a94d-7e8fcc6beb4c	74d31649-6ab1-484c-bb73-1b6af60ab513	KG	90000.00	0.00	8.00	0.00	\N	Nấm rơm tươi		t	2025-10-24 20:26:13.960968+07	2025-10-24 23:20:44.94526+07	'nam':1,3 'rom':2,4 'tuoi':5	https://medlatec.vn/media/27576/content/image001-964.jpg	\N
a4b52989-5deb-4a52-b5e8-e0fdaac51f08	AGR-TC-BUOI-DX	Bưởi da xanh	buoi-da-xanh	6297981d-a59d-4959-8a23-e436f1bce3ca	1c219abb-1425-4c2f-ae77-285e98f32a3b	KG	65000.00	52000.00	8.00	0.00	\N	Cùi dày, ít hạt	Vỏ xanh đẹp	t	2025-10-24 20:26:13.960968+07	2025-10-24 20:26:13.960968+07	'buoi':1 'cui':4 'da':2 'day':5 'dep':10 'hat':7 'it':6 'vo':8 'xanh':3,9	https://thiensafoods.com/upload/product/buoi-da-xanh-ruot-do-5018.jpg	\N
236c5e08-edb3-477b-8527-985b50a236df	AGR-HN-GAO-JSM	Gạo Jasmine	gao-jasmine	4f0c9bad-3dd4-48c0-8a83-ba70ffa8400a	1c219abb-1425-4c2f-ae77-285e98f32a3b	KG	24000.00	20000.00	5.00	0.00	\N	Gạo thơm dẻo	Bao 5kg đóng kín	t	2025-10-24 20:26:13.960968+07	2025-10-24 20:26:13.960968+07	'5kg':7 'bao':6 'deo':5 'dong':8 'gao':1,3 'jasmine':2 'kin':9 'thom':4	https://vuagaovn.com/upload/1/products/l_1906676030_go_thm_lai.png	\N
42486696-e03b-4aee-8cdc-4494d3b22f83	AGR-NM-BAO-NGU	Nấm bào ngư	nam-bao-ngu	588035c1-f0dd-43cc-a94d-7e8fcc6beb4c	1c219abb-1425-4c2f-ae77-285e98f32a3b	KG	80000.00	65000.00	5.00	0.00	\N	Nấm bào ngư trắng	Sạch, giòn	t	2025-10-24 20:26:13.960968+07	2025-10-24 20:26:13.960968+07	'bao':2,5 'gion':9 'nam':1,4 'ngu':3,6 'sach':8 'trang':7	https://cdn.tgdd.vn/Files/2021/02/26/1330795/nam-bao-ngu-la-gi-loi-ich-va-gia-thanh-cua-nam-bao-ngu-xam-202202151453017964.jpg	\N
4b4158a9-5a49-46d6-a241-0f522e3c9740	AGR-TC-DUA-HAU	Dưa hấu	dua-hau	6297981d-a59d-4959-8a23-e436f1bce3ca	974a450b-5fcd-4c0f-9ed4-1994da37b92c	KG	22000.00	17000.00	8.00	0.00	\N	Ngọt mát	Ruột đỏ	t	2025-10-24 20:26:13.960968+07	2025-10-24 20:26:13.960968+07	'do':6 'dua':1 'hau':2 'mat':4 'ngot':3 'ruot':5	https://cdnphoto.dantri.com.vn/ampkLLVFN5Y7T56gUVBIxdwv6ww=/thumb_w/1020/2025/08/07/dua-hau-1754523539998.jpg	\N
76f1caf0-a436-44ad-9b10-36c85494a198	AGR-NM-DONG-CO	Nấm đông cô	nam-dong-co	588035c1-f0dd-43cc-a94d-7e8fcc6beb4c	974a450b-5fcd-4c0f-9ed4-1994da37b92c	KG	120000.00	98000.00	5.00	0.00	\N	Nấm đông cô tươi	Hương thơm	t	2025-10-24 20:26:13.960968+07	2025-10-24 20:26:13.960968+07	'co':3,6 'dong':2,5 'huong':8 'nam':1,4 'thom':9 'tuoi':7	https://namxanh.vn/wp-content/uploads/2020/03/nam-huong-tuoi-nam-dong-co-tuoi-1.jpg	\N
9324213d-ee00-4c8b-91bc-e1828086a1a2	AGR-TC-SAU-RIENG	Sầu riêng Ri6	sau-rieng-ri6	6297981d-a59d-4959-8a23-e436f1bce3ca	1c219abb-1425-4c2f-ae77-285e98f32a3b	KG	180000.00	50000.00	8.00	0.00	\N	Cơm vàng béo		t	2025-10-24 20:26:13.960968+07	2025-10-25 01:18:35.156558+07	'beo':6 'com':4 'ri6':3 'rieng':2 'sau':1 'vang':5	https://product.hstatic.net/200000325223/product/sau_rieng_new-01_63392fbb5c3d449e913faebc332ae80f_master.png	\N
b31c36c4-5b2f-4000-9781-252cf6942700	AGR-RC-BAP-CAI	Bắp cải	bap-cai	20658ecf-8c34-48d8-815b-d0b958f36ec4	974a450b-5fcd-4c0f-9ed4-1994da37b92c	KG	21000.00	1500.00	8.00	0.00	\N	Bắp cải tròn		t	2025-10-24 20:26:13.960968+07	2025-10-26 20:09:05.42105+07	'bap':1,3 'cai':2,4 'tron':5	https://product.hstatic.net/200000423303/product/bap-cai-huu-co_203a09f5391b4cb59bbad82f94c1cd7d.jpg	\N
3e148a8d-8bcb-4c43-8a64-4135e4ff6519	AGR-RC-CAI-BO-XOI	Cải bó xôi	cai-bo-xoi	20658ecf-8c34-48d8-815b-d0b958f36ec4	1c219abb-1425-4c2f-ae77-285e98f32a3b	KG	60000.00	32500.00	8.00	0.00	\N	Spinach tươi		t	2025-10-24 20:26:13.960968+07	2025-10-26 20:09:05.42105+07	'bo':2 'cai':1 'spinach':4 'tuoi':5 'xoi':3	https://bizweb.dktcdn.net/100/390/808/products/20190405141327hat-giong-cai-bo-xoi.jpg?v=1593856342497	\N
da9d44bd-e815-4664-95db-9f8858c015fe	AGR-RC-KHOAI-TAY	Khoai tây	khoai-tay	20658ecf-8c34-48d8-815b-d0b958f36ec4	74d31649-6ab1-484c-bb73-1b6af60ab513	KG	38000.00	5000.00	5.00	0.00	\N	Khoai tây Đà Lạt	Vỏ vàng, ít bở	t	2025-10-24 20:26:13.960968+07	2025-10-24 22:58:36.056448+07	'bo':10 'da':5 'it':9 'khoai':1,3 'lat':6 'tay':2,4 'vang':8 'vo':7	https://hongngochospital.vn/wp-content/uploads/2020/02/dinh-duong-tu-khoai-tay.jpg	\N
5518a2f7-6a2b-4712-8f40-1aa7bc1fb3b5	AGR-RC-KHOAI-LANG	Khoai lang	khoai-lang	20658ecf-8c34-48d8-815b-d0b958f36ec4	974a450b-5fcd-4c0f-9ed4-1994da37b92c	KG	28000.00	0.00	8.00	0.00	\N	Khoai lang mật		t	2025-10-24 20:26:13.960968+07	2025-10-24 23:11:12.673904+07	'khoai':1,3 'lang':2,4 'mat':5	https://suckhoedoisong.qltns.mediacdn.vn/324455921873985536/2025/3/28/photo-1743152190848-174315219178138778371.jpeg	\N
355bc2d6-6d28-4ec4-b3ad-46cb867b06e1	AGR-HN-DAU-XANH	Đậu xanh	dau-xanh	4f0c9bad-3dd4-48c0-8a83-ba70ffa8400a	974a450b-5fcd-4c0f-9ed4-1994da37b92c	KG	52000.00	0.00	8.00	0.00	\N	Đậu xanh hạt tuyển		t	2025-10-24 20:26:13.960968+07	2025-10-24 23:11:22.881391+07	'dau':1,3 'hat':5 'tuyen':6 'xanh':2,4	https://medlatec.vn/media/10355/content/20210706_dau-xanh-giup-cung-cap-nhung-thanh-phan-dinh-duong-can-thiet-cho-co-the-1.jpg	\N
3d6c9893-f5b4-48d4-b4f0-a96753637366	AGR-HN-DAU-NANH	Đậu nành	dau-nanh	4f0c9bad-3dd4-48c0-8a83-ba70ffa8400a	74d31649-6ab1-484c-bb73-1b6af60ab513	KG	38000.00	0.00	8.00	0.00	\N	Đậu nành vàng		t	2025-10-24 20:26:13.960968+07	2025-10-24 23:11:45.537364+07	'dau':1,3 'nanh':2,4 'vang':5	https://bizweb.dktcdn.net/thumb/1024x1024/100/390/808/products/thuong-thuc-dau-nanh-theo-phong-cach-singapore-1.jpg?v=1592987555860	\N
\.


--
-- Data for Name: return_items; Type: TABLE DATA; Schema: agri; Owner: postgres
--

COPY agri.return_items (id, return_id, order_item_id, qty, refund_line) FROM stdin;
40148288-ed1f-440f-a778-75e2420ae3a9	3919b1db-a62f-4f1d-9002-00fcbf94f06f	feea279c-4dba-4da8-a4ce-425a83fc846d	1.000	48600.00
bc6f7728-69e3-4ec1-93bf-86b4839db12e	3919b1db-a62f-4f1d-9002-00fcbf94f06f	bd909a5a-15b1-412c-8de3-77d84d7bf1d2	1.000	70200.00
0f1cb746-ef42-482c-bc22-a3745601c127	28ba7531-2975-4097-868d-b66cf3a20a63	d1da2d98-e614-4573-a384-663f9bf33fb3	2.000	140400.00
59cdbb2b-dbc9-4977-99fb-8390b68e01d0	a34bf507-05dd-4522-baa8-f3bb6d7fd296	d1da2d98-e614-4573-a384-663f9bf33fb3	2.000	140400.00
e88c0043-5cbb-4942-960a-56d515032132	bf70213a-1107-46b8-9769-8a99f8861603	c52c962a-4f1d-4329-a9b5-bcd8d1bc4d87	1.000	27000.00
0f42a21a-debc-4366-b92d-eb5a421e9289	bf70213a-1107-46b8-9769-8a99f8861603	c7a0e3f3-0eb0-4f47-aa8b-560e2f5d3e28	1.000	48600.00
9bafcc10-a50a-408e-99f7-5c1b3c74736f	bf70213a-1107-46b8-9769-8a99f8861603	cbc58d5b-2c5e-458e-a850-bd1594b56d32	1.000	70200.00
f59db879-040e-4193-a242-360b1fbead87	4977f881-07b0-461f-9647-aa0bb10adec2	013bba17-5c7a-4679-9082-5d29d440b8c7	1.000	194400.00
8a44f0bf-00dd-43c5-ba92-06ef4696fd80	a3905592-1157-4382-a703-971cb7f6f971	14329582-1ac7-4797-8bed-cf2b43759615	1.000	27000.00
a8c1f14b-2035-4983-9a93-baacf42293d2	a3905592-1157-4382-a703-971cb7f6f971	66605526-9064-4a1c-8953-5f39fdcd4613	1.000	48600.00
2e2d3ad8-f1db-481a-9a88-1b8b8e9fe723	a3905592-1157-4382-a703-971cb7f6f971	a6fa31a8-8e1e-4ed4-a7aa-d74ea32206cc	1.000	70200.00
5dffd93f-071a-4a92-8ac9-15321f4fb48c	a3905592-1157-4382-a703-971cb7f6f971	0f3c40e1-3716-471d-bf15-4c33e4bd6428	1.000	39900.00
96d2d071-040e-44c5-8745-2555db3af379	3c74991f-7a71-4ee2-85c5-706b6c66f119	14329582-1ac7-4797-8bed-cf2b43759615	1.000	27000.00
fba2a9fd-2604-4585-af67-fbdd39a388f7	5b9ea06c-e403-426e-a664-b35b2f538fcb	cef00574-2830-4b3a-a415-04d4d215fd7c	1.000	48600.00
\.


--
-- Data for Name: returns; Type: TABLE DATA; Schema: agri; Owner: postgres
--

COPY agri.returns (id, order_id, request_by, status, reason, refund_amount, created_at, updated_at) FROM stdin;
3919b1db-a62f-4f1d-9002-00fcbf94f06f	7c621911-ac0a-495d-a65d-3bf8a1152b9f	f59b72e8-bbec-4282-bffd-629444f3313b	REJECTED	cam thúi	118800.00	2025-10-24 15:29:36.440684+07	2025-10-24 15:30:21.732513+07
28ba7531-2975-4097-868d-b66cf3a20a63	c2358be2-d0f7-4701-900b-8af553eaa17b	f59b72e8-bbec-4282-bffd-629444f3313b	REQUESTED	xoài thúi	140400.00	2025-10-24 20:33:35.351825+07	2025-10-24 20:33:35.351825+07
a34bf507-05dd-4522-baa8-f3bb6d7fd296	c2358be2-d0f7-4701-900b-8af553eaa17b	f59b72e8-bbec-4282-bffd-629444f3313b	REQUESTED	xoài thúi quắc\n	140400.00	2025-10-24 22:55:50.255653+07	2025-10-24 22:55:50.255653+07
bf70213a-1107-46b8-9769-8a99f8861603	b79b1849-abed-472a-86b3-9e760aec6cf0	f59b72e8-bbec-4282-bffd-629444f3313b	REJECTED	đồ thúi\n	145800.00	2025-10-25 01:14:49.114469+07	2025-10-25 01:15:02.602277+07
4977f881-07b0-461f-9647-aa0bb10adec2	30e0e1f8-5e18-492a-88ea-853c5cb58182	f59b72e8-bbec-4282-bffd-629444f3313b	REQUESTED	sầu riêng thúi	194400.00	2025-10-25 01:19:30.767198+07	2025-10-25 01:19:30.767198+07
a3905592-1157-4382-a703-971cb7f6f971	5ecaf9d5-e884-410b-a211-6136df4e9b24	f59b72e8-bbec-4282-bffd-629444f3313b	REQUESTED	lam an ki cuc giao do thui moc	185700.00	2025-10-25 10:59:32.684584+07	2025-10-25 10:59:32.684584+07
3c74991f-7a71-4ee2-85c5-706b6c66f119	5ecaf9d5-e884-410b-a211-6136df4e9b24	f59b72e8-bbec-4282-bffd-629444f3313b	REQUESTED	rau muong thui	27000.00	2025-10-25 20:44:49.403995+07	2025-10-25 20:44:49.403995+07
5b9ea06c-e403-426e-a664-b35b2f538fcb	3db57b9a-00f4-412a-914b-c520fa4a22d3	f59b72e8-bbec-4282-bffd-629444f3313b	COMPLETED	asdasds	48600.00	2025-10-26 13:39:05.712292+07	2025-10-26 20:09:20.045196+07
\.


--
-- Data for Name: revenue_records; Type: TABLE DATA; Schema: agri; Owner: postgres
--

COPY agri.revenue_records (id, order_id, amount, confirmed_by, confirmed_at, note) FROM stdin;
\.


--
-- Data for Name: stock_movements; Type: TABLE DATA; Schema: agri; Owner: postgres
--

COPY agri.stock_movements (id, product_id, change_qty, reason, ref_id, created_at) FROM stdin;
c9d6e287-1bc9-45a0-af33-77523c6ea9a7	343979d6-e119-4834-be4f-7ce1a2c916f2	150.000	MANUAL_IN	\N	2025-10-22 06:33:24.943388+07
aedc41b7-9b7d-4504-865b-2b0d0a25d4d0	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	120.000	MANUAL_IN	\N	2025-10-22 06:33:24.943388+07
7ef84a01-de1d-445c-a6ec-67a217e759cc	2160248e-63e1-4855-a33d-4deb6bcd24ad	200.000	MANUAL_IN	\N	2025-10-22 06:33:24.943388+07
95aaed0e-431f-4f12-902e-f8b225a002d6	343979d6-e119-4834-be4f-7ce1a2c916f2	-1.000	ORDER	7230943f-75a8-49b1-87c4-5f3fea242e40	2025-10-23 10:27:20.969236+07
e9707abe-bc70-4d42-8a1c-648fb3d7be62	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	-1.000	ORDER	7230943f-75a8-49b1-87c4-5f3fea242e40	2025-10-23 10:27:20.969236+07
dcc60ec0-1e6c-4a00-b163-4dcd5bd4867d	2160248e-63e1-4855-a33d-4deb6bcd24ad	-2.000	ORDER	7230943f-75a8-49b1-87c4-5f3fea242e40	2025-10-23 10:27:20.969236+07
d01f9bd9-86ab-4b2b-9e70-d5e140ce680d	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	-1.000	ORDER	33a5b61b-6a28-49e7-b314-870bb29daec0	2025-10-23 10:37:50.703681+07
00521ef7-0ea5-4c7f-9ef0-33e0d6ce4c26	2160248e-63e1-4855-a33d-4deb6bcd24ad	-1.000	ORDER	33a5b61b-6a28-49e7-b314-870bb29daec0	2025-10-23 10:37:50.703681+07
080c16c4-53a4-47ba-8ca6-787b6dd5851f	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	-1.000	ORDER	8c1c678b-c16b-4527-97d7-2801c86fe4f1	2025-10-23 10:39:45.016913+07
20fc9744-28fe-42d7-b9bb-ac98e87f22bb	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	-1.000	ORDER	70a4e082-f6b9-4680-bbe5-a25b9a6e202f	2025-10-23 10:44:15.29344+07
e57755f2-157e-47ec-8c3a-4835e54d9a68	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	-1.000	ORDER	78fbdf13-9467-427b-9856-9fbd00116d0a	2025-10-24 11:03:51.930346+07
23092d75-ffb6-4e75-bf61-6b9181c3b132	2160248e-63e1-4855-a33d-4deb6bcd24ad	-1.000	ORDER	78fbdf13-9467-427b-9856-9fbd00116d0a	2025-10-24 11:03:51.930346+07
fdf36aeb-e4b8-4f25-bd37-a864fa2f8044	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	-1.000	ORDER	32b02562-6cae-4810-92dc-d96e24959243	2025-10-24 11:47:17.516993+07
7b977d19-a73e-41e8-a1bf-097da8f118f6	2160248e-63e1-4855-a33d-4deb6bcd24ad	-1.000	ORDER	32b02562-6cae-4810-92dc-d96e24959243	2025-10-24 11:47:17.516993+07
ace5d35f-b34f-481c-bfe8-52451ee9a9b2	343979d6-e119-4834-be4f-7ce1a2c916f2	-1.000	ORDER	c1bc281a-7397-4a78-ab49-bcb7d905f442	2025-10-24 12:05:00.735668+07
155febe9-78d0-47cc-9dce-c0aa10f9e5d3	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	-1.000	ORDER	c1bc281a-7397-4a78-ab49-bcb7d905f442	2025-10-24 12:05:00.735668+07
9c6b1bac-7536-4b33-975a-d01e9bef0fbc	343979d6-e119-4834-be4f-7ce1a2c916f2	-1.000	ORDER	6b5362a6-6b63-4486-8657-39b56efd9f19	2025-10-24 12:55:30.835209+07
1f925b56-72ae-4075-aa40-8fdcd5143a10	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	-1.000	ORDER	6b5362a6-6b63-4486-8657-39b56efd9f19	2025-10-24 12:55:30.835209+07
61926d11-7878-4b10-8915-af02e7408119	343979d6-e119-4834-be4f-7ce1a2c916f2	-4.000	ORDER	fce965e3-3561-44f4-811c-307d27377a56	2025-10-24 14:23:12.102222+07
eb228706-b121-48a9-bd3f-bc8094e04d7b	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	-1.000	ORDER	fce965e3-3561-44f4-811c-307d27377a56	2025-10-24 14:23:12.102222+07
d835e1af-ca61-4e73-9993-9b5a1fdcb0e8	343979d6-e119-4834-be4f-7ce1a2c916f2	-1.000	ORDER	7c621911-ac0a-495d-a65d-3bf8a1152b9f	2025-10-24 14:31:24.401842+07
598721e7-6139-42c0-b495-1928a3ac7435	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	-1.000	ORDER	7c621911-ac0a-495d-a65d-3bf8a1152b9f	2025-10-24 14:31:24.401842+07
b0bcef1c-d3d7-432b-ba26-643e378a250b	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	-2.000	ORDER	c2358be2-d0f7-4701-900b-8af553eaa17b	2025-10-24 15:03:07.11189+07
f416e9d0-eb27-44b2-a6db-f9655b631007	3e148a8d-8bcb-4c43-8a64-4135e4ff6519	100.000	IMPORT	f2ba3489-8574-43a9-8f0f-25891afa7204	2025-10-24 22:58:36.056448+07
067d3d2e-64f7-4834-be5f-dcd4df593be3	da9d44bd-e815-4664-95db-9f8858c015fe	100.000	IMPORT	f2ba3489-8574-43a9-8f0f-25891afa7204	2025-10-24 22:58:36.056448+07
b16eba06-a4cb-469c-b6a7-7122c8f0e759	5518a2f7-6a2b-4712-8f40-1aa7bc1fb3b5	100.000	IMPORT	f2ba3489-8574-43a9-8f0f-25891afa7204	2025-10-24 22:58:36.056448+07
6161435b-4f23-406b-bcd3-3572786600a6	355bc2d6-6d28-4ec4-b3ad-46cb867b06e1	1000.000	IMPORT	f2ba3489-8574-43a9-8f0f-25891afa7204	2025-10-24 22:58:36.056448+07
028ec9ce-94dc-4bce-857d-e2ac2c063af0	3d6c9893-f5b4-48d4-b4f0-a96753637366	1000.000	IMPORT	f2ba3489-8574-43a9-8f0f-25891afa7204	2025-10-24 22:58:36.056448+07
5f8163e9-bcdb-4e3f-9020-d6b3ea831af4	3e148a8d-8bcb-4c43-8a64-4135e4ff6519	100.000	IMPORT	f2ba3489-8574-43a9-8f0f-25891afa7204	2025-10-24 22:58:36.056448+07
e64bbf59-bb11-4c17-aff0-9921cf9b8bef	da9d44bd-e815-4664-95db-9f8858c015fe	100.000	IMPORT	f2ba3489-8574-43a9-8f0f-25891afa7204	2025-10-24 22:58:36.056448+07
c7cb99e9-06ae-47b7-9441-6ac85a525548	5518a2f7-6a2b-4712-8f40-1aa7bc1fb3b5	100.000	IMPORT	f2ba3489-8574-43a9-8f0f-25891afa7204	2025-10-24 22:58:36.056448+07
5c574fa1-8d54-4fa3-a084-24587353853d	355bc2d6-6d28-4ec4-b3ad-46cb867b06e1	1000.000	IMPORT	f2ba3489-8574-43a9-8f0f-25891afa7204	2025-10-24 22:58:36.056448+07
85fe01de-8a3a-46a9-8ad7-b3bbe5bed6c2	3d6c9893-f5b4-48d4-b4f0-a96753637366	1000.000	IMPORT	f2ba3489-8574-43a9-8f0f-25891afa7204	2025-10-24 22:58:36.056448+07
c54efada-40f6-40a0-a72f-c38d8214e56f	3e148a8d-8bcb-4c43-8a64-4135e4ff6519	-1.000	ORDER	f0594fbc-4198-47af-8095-7c8527e9628a	2025-10-24 23:28:15.452602+07
a32a0c91-2c11-41ad-90bb-4b61bbad1397	da9d44bd-e815-4664-95db-9f8858c015fe	-1.000	ORDER	f0594fbc-4198-47af-8095-7c8527e9628a	2025-10-24 23:28:15.452602+07
873b4976-8806-4d5c-809b-e415a9680626	2160248e-63e1-4855-a33d-4deb6bcd24ad	-1.000	ORDER	8e8c3aa4-ac6d-447a-b205-9802c0116adb	2025-10-25 00:38:25.141359+07
6838f34e-d4e5-4cfb-8115-66fa18a6d84e	343979d6-e119-4834-be4f-7ce1a2c916f2	-1.000	ORDER	8e8c3aa4-ac6d-447a-b205-9802c0116adb	2025-10-25 00:38:25.141359+07
d2f1e45c-d5e1-4be0-aebe-648853441948	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	-1.000	ORDER	8e8c3aa4-ac6d-447a-b205-9802c0116adb	2025-10-25 00:38:25.141359+07
b62c7a97-4ac5-4e5f-84a6-60bfc5e99b35	2160248e-63e1-4855-a33d-4deb6bcd24ad	-1.000	ORDER	b79b1849-abed-472a-86b3-9e760aec6cf0	2025-10-25 01:13:39.782602+07
24bef8e9-cd14-463b-8203-f9329a38e122	343979d6-e119-4834-be4f-7ce1a2c916f2	-1.000	ORDER	b79b1849-abed-472a-86b3-9e760aec6cf0	2025-10-25 01:13:39.782602+07
626adfb0-a1de-4d2b-942f-d70d6aad603c	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	-1.000	ORDER	b79b1849-abed-472a-86b3-9e760aec6cf0	2025-10-25 01:13:39.782602+07
967d7603-ccc0-4ec2-9ab4-83eb636c1a7e	9324213d-ee00-4c8b-91bc-e1828086a1a2	1000.000	IMPORT	848cac5e-259e-405b-81a9-7a9abf120d99	2025-10-25 01:18:35.156558+07
9fdd605e-4b42-445f-b596-bfcc79ed4711	9324213d-ee00-4c8b-91bc-e1828086a1a2	1000.000	IMPORT	848cac5e-259e-405b-81a9-7a9abf120d99	2025-10-25 01:18:35.156558+07
35a5b1c2-89c8-40d2-a8e6-4dffa6a9d413	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	-1.000	ORDER	30e0e1f8-5e18-492a-88ea-853c5cb58182	2025-10-25 01:18:45.719205+07
f6703282-39f2-4166-a88d-a19689ecebb8	9324213d-ee00-4c8b-91bc-e1828086a1a2	-1.000	ORDER	30e0e1f8-5e18-492a-88ea-853c5cb58182	2025-10-25 01:18:45.719205+07
30019243-9147-4676-8d6f-feaf847e200b	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	-1.000	ORDER	290f3cec-ce68-47b4-b90b-93954a8d9d08	2025-10-25 01:39:51.311148+07
43f1f164-d796-4808-bc13-c96ede32c27d	2160248e-63e1-4855-a33d-4deb6bcd24ad	-1.000	ORDER	5ecaf9d5-e884-410b-a211-6136df4e9b24	2025-10-25 10:58:15.935134+07
1482167f-574e-478e-b661-c5e55fd866fe	343979d6-e119-4834-be4f-7ce1a2c916f2	-1.000	ORDER	5ecaf9d5-e884-410b-a211-6136df4e9b24	2025-10-25 10:58:15.935134+07
e04f6594-af58-4289-8493-9bff40374a8c	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	-1.000	ORDER	5ecaf9d5-e884-410b-a211-6136df4e9b24	2025-10-25 10:58:15.935134+07
ecb36d92-f1cb-40b8-89ec-5ee936823129	da9d44bd-e815-4664-95db-9f8858c015fe	-1.000	ORDER	5ecaf9d5-e884-410b-a211-6136df4e9b24	2025-10-25 10:58:15.935134+07
0aa33270-76da-4410-910b-9ff1e305dd40	343979d6-e119-4834-be4f-7ce1a2c916f2	-1.000	ORDER	3db57b9a-00f4-412a-914b-c520fa4a22d3	2025-10-26 13:38:37.655539+07
a8ba9423-b5b6-4f96-ae7f-3886997ffb23	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	-1.000	ORDER	3db57b9a-00f4-412a-914b-c520fa4a22d3	2025-10-26 13:38:37.655539+07
8a696175-b526-4a01-8b8c-672459c2de25	d725c994-9f10-4c9e-a1d6-45da98d2cd38	150.000	IMPORT	21e97192-8e44-41da-aa50-8034e35f8750	2025-10-26 20:09:05.42105+07
02a5e7bf-0c8a-4793-b44b-239dae73fba5	90bf81b7-0667-4a37-85a3-0f99498380ee	100.000	IMPORT	21e97192-8e44-41da-aa50-8034e35f8750	2025-10-26 20:09:05.42105+07
dc47d1e3-6f36-4748-a3ec-ec2c25d24d5a	b31c36c4-5b2f-4000-9781-252cf6942700	111.000	IMPORT	21e97192-8e44-41da-aa50-8034e35f8750	2025-10-26 20:09:05.42105+07
1159752b-0626-456e-8d80-1ef2da889b26	3e148a8d-8bcb-4c43-8a64-4135e4ff6519	1100.000	IMPORT	21e97192-8e44-41da-aa50-8034e35f8750	2025-10-26 20:09:05.42105+07
17440959-542f-4774-aea6-2d2079a0549e	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	11000.000	IMPORT	21e97192-8e44-41da-aa50-8034e35f8750	2025-10-26 20:09:05.42105+07
d44954d4-f3a9-48e0-b421-30b59b806f0d	d725c994-9f10-4c9e-a1d6-45da98d2cd38	150.000	IMPORT	21e97192-8e44-41da-aa50-8034e35f8750	2025-10-26 20:09:05.42105+07
7b329974-7d8a-408a-9017-353854e9295b	90bf81b7-0667-4a37-85a3-0f99498380ee	100.000	IMPORT	21e97192-8e44-41da-aa50-8034e35f8750	2025-10-26 20:09:05.42105+07
0ab3ce4a-cca6-426c-afe2-6158ccd08e4d	b31c36c4-5b2f-4000-9781-252cf6942700	111.000	IMPORT	21e97192-8e44-41da-aa50-8034e35f8750	2025-10-26 20:09:05.42105+07
2eb47fb8-04bf-452a-bfd2-8bffb6d46515	3e148a8d-8bcb-4c43-8a64-4135e4ff6519	1100.000	IMPORT	21e97192-8e44-41da-aa50-8034e35f8750	2025-10-26 20:09:05.42105+07
abd73f85-5f8c-4d37-b91a-8e2a50beb696	450b7e26-8266-4ab3-bbe3-ae7d0d5584b6	11000.000	IMPORT	21e97192-8e44-41da-aa50-8034e35f8750	2025-10-26 20:09:05.42105+07
5c3bd6e0-c149-49c4-a3b0-f5986b32e4ca	343979d6-e119-4834-be4f-7ce1a2c916f2	1.000	RETURN	5b9ea06c-e403-426e-a664-b35b2f538fcb	2025-10-26 20:09:20.045196+07
caee7b91-8d39-4693-b343-bff5c03f18df	d725c994-9f10-4c9e-a1d6-45da98d2cd38	-1.000	ORDER	873c5a1b-8b0c-4a9b-8b62-bcc02ffdcb9f	2025-10-26 20:20:55.907478+07
502b57a1-e080-43f1-8577-b104e9cca8dd	90bf81b7-0667-4a37-85a3-0f99498380ee	-1.000	ORDER	873c5a1b-8b0c-4a9b-8b62-bcc02ffdcb9f	2025-10-26 20:20:55.907478+07
88dcb555-6032-4a90-83a1-b290851531a9	9324213d-ee00-4c8b-91bc-e1828086a1a2	-1.000	ORDER	873c5a1b-8b0c-4a9b-8b62-bcc02ffdcb9f	2025-10-26 20:20:55.907478+07
20f98979-b3d9-4cfe-bee0-708f87f6e3fd	9324213d-ee00-4c8b-91bc-e1828086a1a2	-1.000	ORDER	3f5b00c5-a235-45f4-95a6-fd303abd4f9f	2025-10-26 20:34:12.471706+07
3b4203b4-6200-45bb-99b7-0668c9af12ba	d725c994-9f10-4c9e-a1d6-45da98d2cd38	-1.000	ORDER	1cdbbe9f-68fe-46b1-a0ae-bf1e7d5058b6	2025-10-26 20:44:07.568132+07
ee21bf8f-b512-430c-9c3b-396f0565a1e5	90bf81b7-0667-4a37-85a3-0f99498380ee	-1.000	ORDER	1cdbbe9f-68fe-46b1-a0ae-bf1e7d5058b6	2025-10-26 20:44:07.568132+07
7b570def-b8e0-442a-be37-626c656be384	d725c994-9f10-4c9e-a1d6-45da98d2cd38	-1.000	ORDER	9e192c0d-1662-4b6c-8522-2917a98ebe16	2025-10-26 20:51:22.830941+07
e7c66b56-3d6c-4ea9-97f6-0aa72757e255	90bf81b7-0667-4a37-85a3-0f99498380ee	-1.000	ORDER	9e192c0d-1662-4b6c-8522-2917a98ebe16	2025-10-26 20:51:22.830941+07
f883f650-f58f-4699-9f28-670d50af1150	d725c994-9f10-4c9e-a1d6-45da98d2cd38	-1.000	ORDER	c1c51ef0-61db-4abe-89ba-d96cd1807313	2025-10-26 20:51:45.933446+07
0437b91f-6f60-4b6c-b338-db10dc8fcc8c	d725c994-9f10-4c9e-a1d6-45da98d2cd38	-1.000	ORDER	d76a05b6-7c97-4507-a9c1-83b6c99ab112	2025-10-26 20:52:13.067616+07
5c6d8a79-cf47-475f-83e1-36e89612ac7f	90bf81b7-0667-4a37-85a3-0f99498380ee	-1.000	ORDER	d76a05b6-7c97-4507-a9c1-83b6c99ab112	2025-10-26 20:52:13.067616+07
962e0bc5-7ad2-4fae-9b88-07e22f4dba90	d725c994-9f10-4c9e-a1d6-45da98d2cd38	-6.000	ORDER	32606aac-f632-4f81-8475-f5aa1c418729	2025-10-26 20:52:29.940668+07
5b5d2741-5eb1-4a8d-b3c4-031ca043c70a	d725c994-9f10-4c9e-a1d6-45da98d2cd38	-1.000	ORDER	21abdfac-444c-4001-9701-8857c9a0a5c0	2025-10-26 20:53:51.724436+07
e4f844b7-f855-41e0-93e3-509c07a58e23	90bf81b7-0667-4a37-85a3-0f99498380ee	-1.000	ORDER	21abdfac-444c-4001-9701-8857c9a0a5c0	2025-10-26 20:53:51.724436+07
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: agri; Owner: postgres
--

COPY agri.suppliers (id, name, contact_name, phone, email, address, note, created_at, updated_at) FROM stdin;
f8f33dec-ed46-4354-a1a2-f34ed6198c12	Cty TNHH Nông Sản An Thịnh	Nguyễn Văn Minh	0901234567	contact@anthinh.vn	KCN Tân Bình, TP.HCM	Chuyên rau củ sạch miền Đông	2025-10-24 20:26:13.960968+07	2025-10-24 20:26:13.960968+07
82a313e7-4fa4-43fa-b6f7-c96b0037fa5a	HTX Rau Sạch Đà Lạt Xanh	Trần Thị Hồng	0932123456	sales@dalatxanh.vn	Phường 9, TP. Đà Lạt, Lâm Đồng	Đối tác rau lá, củ quả cao nguyên	2025-10-24 20:26:13.960968+07	2025-10-24 20:26:13.960968+07
9e9ff102-5397-4909-98eb-047d59d798c1	Nông Trại Sông Hậu	Lê Quốc Bảo	0918899777	info@songhaufarm.vn	Cái Răng, Cần Thơ	Trái cây miền Tây	2025-10-24 20:26:13.960968+07	2025-10-24 20:26:13.960968+07
2b0a6f52-cfbd-46e6-bd00-f2de554f2d1f	Cty CP Thực Phẩm Miền Nam	Phạm Hoài Nam	0909001122	mkt@thucphammiennam.vn	Q.7, TP.HCM	Nhà phân phối tổng hợp	2025-10-24 20:26:13.960968+07	2025-10-24 20:26:13.960968+07
e4b0e3e6-8f48-454d-969a-3380edbb0dae	Trang Trại Hữu Cơ Phú Thọ	Vũ Thu Trang	0988111222	organic@phutho.farm	TX. Phú Thọ, Phú Thọ	Sản phẩm hữu cơ có chứng nhận	2025-10-24 20:26:13.960968+07	2025-10-24 20:26:13.960968+07
c837026b-e674-4b4d-bfb3-2e6c37a91707	Cty TNHH GreenSeed	Đặng Đức Long	0907788996	hello@greenseed.vn	Q. Bình Thạnh, TP.HCM	Hạt - ngũ cốc chất lượng	2025-10-24 20:26:13.960968+07	2025-10-24 20:26:13.960968+07
64d1f864-da4e-4e80-a3b1-8b7eaa39173d	HTX Nấm Sạch Việt	Ngô Thanh Tùng	0977333666	nam@htxviet.vn	Văn Giang, Hưng Yên	Chuyên nấm các loại	2025-10-24 20:26:13.960968+07	2025-10-24 20:26:13.960968+07
ffdf4349-5c40-4978-bf3e-06393398bb50	Cty CP Trái Cây Miền Nhiệt Đới	Bùi Kim Oanh	0912666888	fruit@nhietdoi.vn	Thủ Dầu Một, Bình Dương	Trái cây tươi quanh năm	2025-10-24 20:26:13.960968+07	2025-10-24 20:26:13.960968+07
8e96583a-595c-4f26-8202-b0d96a84d022	Nông Trại Sông Lam	Hoàng Anh Tuấn	0935666777	contact@songlamfarm.vn	Diễn Châu, Nghệ An	Rau củ vụ đông - hè	2025-10-24 20:26:13.960968+07	2025-10-24 20:26:13.960968+07
a28de13d-10d8-48eb-add9-c890760b26cf	Cty Phân Phối Thảo Nguyên	Lâm Thị Yến	0903456789	cs@thaonguyenfoods.vn	TP. Quy Nhơn, Bình Định	Đối tác logistics miền Trung	2025-10-24 20:26:13.960968+07	2025-10-24 20:26:13.960968+07
\.


--
-- Data for Name: user_phones; Type: TABLE DATA; Schema: agri; Owner: postgres
--

COPY agri.user_phones (id, account_id, phone, label, is_default, created_at, updated_at) FROM stdin;
061e76cd-bf82-4a0a-8f0d-df9bef84b046	f59b72e8-bbec-4282-bffd-629444f3313b	0914318513		f	2025-10-23 10:21:27.110154+07	2025-10-23 10:21:33.129219+07
\.


--
-- Name: accounts accounts_email_key; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.accounts
    ADD CONSTRAINT accounts_email_key UNIQUE (email);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: brands brands_name_key; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.brands
    ADD CONSTRAINT brands_name_key UNIQUE (name);


--
-- Name: brands brands_pkey; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);


--
-- Name: brands brands_slug_key; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.brands
    ADD CONSTRAINT brands_slug_key UNIQUE (slug);


--
-- Name: cart_items cart_items_cart_id_product_id_key; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.cart_items
    ADD CONSTRAINT cart_items_cart_id_product_id_key UNIQUE (cart_id, product_id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: carts carts_customer_id_key; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.carts
    ADD CONSTRAINT carts_customer_id_key UNIQUE (customer_id);


--
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: import_receipt_items import_receipt_items_pkey; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.import_receipt_items
    ADD CONSTRAINT import_receipt_items_pkey PRIMARY KEY (id);


--
-- Name: import_receipts import_receipts_code_key; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.import_receipts
    ADD CONSTRAINT import_receipts_code_key UNIQUE (code);


--
-- Name: import_receipts import_receipts_pkey; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.import_receipts
    ADD CONSTRAINT import_receipts_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (product_id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_status_history order_status_history_pkey; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.order_status_history
    ADD CONSTRAINT order_status_history_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_code_key; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.orders
    ADD CONSTRAINT orders_order_code_key UNIQUE (order_code);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_sku_key; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.products
    ADD CONSTRAINT products_sku_key UNIQUE (sku);


--
-- Name: products products_slug_key; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);


--
-- Name: return_items return_items_pkey; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.return_items
    ADD CONSTRAINT return_items_pkey PRIMARY KEY (id);


--
-- Name: returns returns_pkey; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.returns
    ADD CONSTRAINT returns_pkey PRIMARY KEY (id);


--
-- Name: revenue_records revenue_records_pkey; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.revenue_records
    ADD CONSTRAINT revenue_records_pkey PRIMARY KEY (id);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: user_phones user_phones_pkey; Type: CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.user_phones
    ADD CONSTRAINT user_phones_pkey PRIMARY KEY (id);


--
-- Name: idx_addresses_account; Type: INDEX; Schema: agri; Owner: postgres
--

CREATE INDEX idx_addresses_account ON agri.addresses USING btree (account_id);


--
-- Name: idx_cart_items_cart; Type: INDEX; Schema: agri; Owner: postgres
--

CREATE INDEX idx_cart_items_cart ON agri.cart_items USING btree (cart_id);


--
-- Name: idx_order_history_created; Type: INDEX; Schema: agri; Owner: postgres
--

CREATE INDEX idx_order_history_created ON agri.order_status_history USING btree (created_at DESC);


--
-- Name: idx_order_history_order; Type: INDEX; Schema: agri; Owner: postgres
--

CREATE INDEX idx_order_history_order ON agri.order_status_history USING btree (order_id);


--
-- Name: idx_order_items_order; Type: INDEX; Schema: agri; Owner: postgres
--

CREATE INDEX idx_order_items_order ON agri.order_items USING btree (order_id);


--
-- Name: idx_orders_customer; Type: INDEX; Schema: agri; Owner: postgres
--

CREATE INDEX idx_orders_customer ON agri.orders USING btree (customer_id);


--
-- Name: idx_orders_shipper; Type: INDEX; Schema: agri; Owner: postgres
--

CREATE INDEX idx_orders_shipper ON agri.orders USING btree (shipper_id);


--
-- Name: idx_orders_status; Type: INDEX; Schema: agri; Owner: postgres
--

CREATE INDEX idx_orders_status ON agri.orders USING btree (status);


--
-- Name: idx_payments_order; Type: INDEX; Schema: agri; Owner: postgres
--

CREATE INDEX idx_payments_order ON agri.payments USING btree (order_id);


--
-- Name: idx_pimgs_product; Type: INDEX; Schema: agri; Owner: postgres
--

CREATE INDEX idx_pimgs_product ON agri.product_images USING btree (product_id);


--
-- Name: idx_products_active; Type: INDEX; Schema: agri; Owner: postgres
--

CREATE INDEX idx_products_active ON agri.products USING btree (is_active);


--
-- Name: idx_products_brand; Type: INDEX; Schema: agri; Owner: postgres
--

CREATE INDEX idx_products_brand ON agri.products USING btree (brand_id);


--
-- Name: idx_products_category; Type: INDEX; Schema: agri; Owner: postgres
--

CREATE INDEX idx_products_category ON agri.products USING btree (category_id);


--
-- Name: idx_products_tsv; Type: INDEX; Schema: agri; Owner: postgres
--

CREATE INDEX idx_products_tsv ON agri.products USING gin (search_tsv);


--
-- Name: idx_return_items_return; Type: INDEX; Schema: agri; Owner: postgres
--

CREATE INDEX idx_return_items_return ON agri.return_items USING btree (return_id);


--
-- Name: idx_revenue_confirmed_at; Type: INDEX; Schema: agri; Owner: postgres
--

CREATE INDEX idx_revenue_confirmed_at ON agri.revenue_records USING btree (confirmed_at DESC);


--
-- Name: idx_revenue_order; Type: INDEX; Schema: agri; Owner: postgres
--

CREATE INDEX idx_revenue_order ON agri.revenue_records USING btree (order_id);


--
-- Name: idx_stockmov_product; Type: INDEX; Schema: agri; Owner: postgres
--

CREATE INDEX idx_stockmov_product ON agri.stock_movements USING btree (product_id);


--
-- Name: idx_user_phones_account; Type: INDEX; Schema: agri; Owner: postgres
--

CREATE INDEX idx_user_phones_account ON agri.user_phones USING btree (account_id);


--
-- Name: import_receipts tr_on_import_receipt_approved; Type: TRIGGER; Schema: agri; Owner: postgres
--

CREATE TRIGGER tr_on_import_receipt_approved AFTER UPDATE OF status ON agri.import_receipts FOR EACH ROW EXECUTE FUNCTION agri.trigger_approve_import_receipt();


--
-- Name: accounts trg_accounts_updated; Type: TRIGGER; Schema: agri; Owner: postgres
--

CREATE TRIGGER trg_accounts_updated BEFORE UPDATE ON agri.accounts FOR EACH ROW EXECUTE FUNCTION agri.tg_set_updated_at();


--
-- Name: addresses trg_addresses_updated; Type: TRIGGER; Schema: agri; Owner: postgres
--

CREATE TRIGGER trg_addresses_updated BEFORE UPDATE ON agri.addresses FOR EACH ROW EXECUTE FUNCTION agri.tg_set_updated_at();


--
-- Name: brands trg_brands_updated; Type: TRIGGER; Schema: agri; Owner: postgres
--

CREATE TRIGGER trg_brands_updated BEFORE UPDATE ON agri.brands FOR EACH ROW EXECUTE FUNCTION agri.tg_set_updated_at();


--
-- Name: carts trg_carts_updated; Type: TRIGGER; Schema: agri; Owner: postgres
--

CREATE TRIGGER trg_carts_updated BEFORE UPDATE ON agri.carts FOR EACH ROW EXECUTE FUNCTION agri.tg_set_updated_at();


--
-- Name: categories trg_categories_updated; Type: TRIGGER; Schema: agri; Owner: postgres
--

CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON agri.categories FOR EACH ROW EXECUTE FUNCTION agri.tg_set_updated_at();


--
-- Name: orders trg_orders_new_order; Type: TRIGGER; Schema: agri; Owner: postgres
--

CREATE TRIGGER trg_orders_new_order AFTER INSERT ON agri.orders FOR EACH ROW EXECUTE FUNCTION agri.tg_notify_new_order();


--
-- Name: orders trg_orders_status_change; Type: TRIGGER; Schema: agri; Owner: postgres
--

CREATE TRIGGER trg_orders_status_change AFTER UPDATE OF status ON agri.orders FOR EACH ROW EXECUTE FUNCTION agri.tg_log_order_status_change();


--
-- Name: orders trg_orders_updated; Type: TRIGGER; Schema: agri; Owner: postgres
--

CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON agri.orders FOR EACH ROW EXECUTE FUNCTION agri.tg_set_updated_at();


--
-- Name: products trg_products_tsv; Type: TRIGGER; Schema: agri; Owner: postgres
--

CREATE TRIGGER trg_products_tsv BEFORE INSERT OR UPDATE OF name, short_desc, description ON agri.products FOR EACH ROW EXECUTE FUNCTION agri.tg_products_tsv();


--
-- Name: returns trg_returns_updated; Type: TRIGGER; Schema: agri; Owner: postgres
--

CREATE TRIGGER trg_returns_updated BEFORE UPDATE ON agri.returns FOR EACH ROW EXECUTE FUNCTION agri.tg_set_updated_at();


--
-- Name: user_phones trg_user_phones_updated; Type: TRIGGER; Schema: agri; Owner: postgres
--

CREATE TRIGGER trg_user_phones_updated BEFORE UPDATE ON agri.user_phones FOR EACH ROW EXECUTE FUNCTION agri.tg_set_updated_at();


--
-- Name: addresses addresses_account_id_fkey; Type: FK CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.addresses
    ADD CONSTRAINT addresses_account_id_fkey FOREIGN KEY (account_id) REFERENCES agri.accounts(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.cart_items
    ADD CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES agri.carts(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES agri.products(id) ON DELETE RESTRICT;


--
-- Name: carts carts_customer_id_fkey; Type: FK CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.carts
    ADD CONSTRAINT carts_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES agri.accounts(id) ON DELETE CASCADE;


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES agri.categories(id) ON DELETE SET NULL;


--
-- Name: import_receipt_items import_receipt_items_product_id_fkey; Type: FK CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.import_receipt_items
    ADD CONSTRAINT import_receipt_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES agri.products(id);


--
-- Name: import_receipt_items import_receipt_items_receipt_id_fkey; Type: FK CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.import_receipt_items
    ADD CONSTRAINT import_receipt_items_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES agri.import_receipts(id) ON DELETE CASCADE;


--
-- Name: import_receipts import_receipts_created_by_fkey; Type: FK CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.import_receipts
    ADD CONSTRAINT import_receipts_created_by_fkey FOREIGN KEY (created_by) REFERENCES agri.accounts(id);


--
-- Name: import_receipts import_receipts_supplier_id_fkey; Type: FK CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.import_receipts
    ADD CONSTRAINT import_receipts_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES agri.suppliers(id);


--
-- Name: inventory inventory_product_id_fkey; Type: FK CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.inventory
    ADD CONSTRAINT inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES agri.products(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES agri.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES agri.products(id) ON DELETE RESTRICT;


--
-- Name: order_status_history order_status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.order_status_history
    ADD CONSTRAINT order_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES agri.accounts(id) ON DELETE SET NULL;


--
-- Name: order_status_history order_status_history_order_id_fkey; Type: FK CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.order_status_history
    ADD CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES agri.orders(id) ON DELETE CASCADE;


--
-- Name: orders orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES agri.accounts(id) ON DELETE RESTRICT;


--
-- Name: orders orders_shipper_id_fkey; Type: FK CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.orders
    ADD CONSTRAINT orders_shipper_id_fkey FOREIGN KEY (shipper_id) REFERENCES agri.accounts(id) ON DELETE SET NULL;


--
-- Name: orders orders_shipping_addr_id_fkey; Type: FK CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.orders
    ADD CONSTRAINT orders_shipping_addr_id_fkey FOREIGN KEY (shipping_addr_id) REFERENCES agri.addresses(id) ON DELETE SET NULL;


--
-- Name: payments payments_order_id_fkey; Type: FK CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES agri.orders(id) ON DELETE CASCADE;


--
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES agri.products(id) ON DELETE CASCADE;


--
-- Name: products products_brand_id_fkey; Type: FK CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.products
    ADD CONSTRAINT products_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES agri.brands(id) ON DELETE SET NULL;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES agri.categories(id) ON DELETE SET NULL;


--
-- Name: return_items return_items_order_item_id_fkey; Type: FK CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.return_items
    ADD CONSTRAINT return_items_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES agri.order_items(id) ON DELETE RESTRICT;


--
-- Name: return_items return_items_return_id_fkey; Type: FK CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.return_items
    ADD CONSTRAINT return_items_return_id_fkey FOREIGN KEY (return_id) REFERENCES agri.returns(id) ON DELETE CASCADE;


--
-- Name: returns returns_order_id_fkey; Type: FK CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.returns
    ADD CONSTRAINT returns_order_id_fkey FOREIGN KEY (order_id) REFERENCES agri.orders(id) ON DELETE CASCADE;


--
-- Name: returns returns_request_by_fkey; Type: FK CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.returns
    ADD CONSTRAINT returns_request_by_fkey FOREIGN KEY (request_by) REFERENCES agri.accounts(id);


--
-- Name: revenue_records revenue_records_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.revenue_records
    ADD CONSTRAINT revenue_records_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES agri.accounts(id) ON DELETE SET NULL;


--
-- Name: revenue_records revenue_records_order_id_fkey; Type: FK CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.revenue_records
    ADD CONSTRAINT revenue_records_order_id_fkey FOREIGN KEY (order_id) REFERENCES agri.orders(id) ON DELETE RESTRICT;


--
-- Name: stock_movements stock_movements_product_id_fkey; Type: FK CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.stock_movements
    ADD CONSTRAINT stock_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES agri.products(id) ON DELETE CASCADE;


--
-- Name: user_phones user_phones_account_id_fkey; Type: FK CONSTRAINT; Schema: agri; Owner: postgres
--

ALTER TABLE ONLY agri.user_phones
    ADD CONSTRAINT user_phones_account_id_fkey FOREIGN KEY (account_id) REFERENCES agri.accounts(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict lj8W7JOJwhAR39vRtcLcDZOaCpCzQWZ2RmBlkADegGPNEoQQ1m5bXGQVNdNdzD4

