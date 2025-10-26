-- =============================================================
-- MIGRATION 001: Add User Phones & Updated Order Status
-- Database: nong_san_db
-- Run this script directly in PostgreSQL
-- =============================================================

\c nong_san_db
SET search_path TO agri, public;

-- =============================================================
-- 1) CREATE USER_PHONES TABLE (Multiple phones per user)
-- =============================================================

CREATE TABLE IF NOT EXISTS agri.user_phones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES agri.accounts(id) ON DELETE CASCADE,
  phone VARCHAR(20) NOT NULL,
  label TEXT,  -- 'Home', 'Work', 'Mobile', etc.
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_phones_account ON agri.user_phones(account_id);

CREATE TRIGGER trg_user_phones_updated
BEFORE UPDATE ON agri.user_phones
FOR EACH ROW EXECUTE FUNCTION agri.tg_set_updated_at();

-- =============================================================
-- 2) UPDATE ORDER_STATUS ENUM for Shipper Workflow
-- =============================================================

-- Drop default constraint first to avoid casting issues
ALTER TABLE agri.orders 
  ALTER COLUMN status DROP DEFAULT;

-- Rename old enum and create new one
ALTER TYPE agri.order_status RENAME TO order_status_old;

CREATE TYPE agri.order_status AS ENUM (
  'PENDING',           -- Chờ xử lý (user vừa đặt)
  'PROCESSING',        -- Đang xử lý (admin đã xác nhận)
  'SHIPPING',          -- Đang giao hàng (shipper đã nhận)
  'DRIVER_ARRIVED',    -- Tài xế đã đến
  'DELIVERED',         -- Giao hàng thành công
  'FAILED',            -- Giao hàng thất bại
  'CANCELLED',         -- Đã hủy
  'RETURN_REQUESTED',  -- Yêu cầu đổi trả
  'RETURNED'           -- Đã đổi trả
);

-- Update orders table to use new enum
ALTER TABLE agri.orders 
  ALTER COLUMN status TYPE agri.order_status 
  USING status::text::agri.order_status;

-- Set default back
ALTER TABLE agri.orders 
  ALTER COLUMN status SET DEFAULT 'PENDING';

-- Drop old enum (CASCADE to drop dependent functions)
DROP TYPE agri.order_status_old CASCADE;

-- =============================================================
-- 3) ADD PAYMENT_METHOD ENUM
-- =============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE agri.payment_method AS ENUM ('COD', 'BANK_TRANSFER');
  END IF;
END$$;

-- =============================================================
-- 4) UPDATE ORDERS TABLE - Add shipper and payment method
-- =============================================================

ALTER TABLE agri.orders 
  ADD COLUMN IF NOT EXISTS shipper_id UUID REFERENCES agri.accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_method agri.payment_method DEFAULT 'COD',
  ADD COLUMN IF NOT EXISTS shipping_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS shipping_address TEXT,
  ADD COLUMN IF NOT EXISTS shipping_recipient TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_shipper ON agri.orders(shipper_id);

-- =============================================================
-- 5) CREATE ORDER_STATUS_HISTORY TABLE (Track status changes)
-- =============================================================

CREATE TABLE IF NOT EXISTS agri.order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES agri.orders(id) ON DELETE CASCADE,
  old_status agri.order_status,
  new_status agri.order_status NOT NULL,
  changed_by UUID REFERENCES agri.accounts(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_history_order ON agri.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_history_created ON agri.order_status_history(created_at DESC);

-- =============================================================
-- 6) CREATE FUNCTION TO LOG STATUS CHANGES
-- =============================================================

CREATE OR REPLACE FUNCTION agri.tg_log_order_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
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

CREATE TRIGGER trg_orders_status_change
AFTER UPDATE OF status ON agri.orders
FOR EACH ROW EXECUTE FUNCTION agri.tg_log_order_status_change();

-- =============================================================
-- 7) CREATE FUNCTION TO NOTIFY NEW ORDERS
-- =============================================================

CREATE OR REPLACE FUNCTION agri.tg_notify_new_order()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
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

CREATE TRIGGER trg_orders_new_order
AFTER INSERT ON agri.orders
FOR EACH ROW EXECUTE FUNCTION agri.tg_notify_new_order();

-- =============================================================
-- 8) UPDATE USER_ROLE ENUM to include SHIPPER
-- =============================================================

-- Drop default constraint first
ALTER TABLE agri.accounts 
  ALTER COLUMN role DROP DEFAULT;

-- Rename old enum and create new one
ALTER TYPE agri.user_role RENAME TO user_role_old;

CREATE TYPE agri.user_role AS ENUM ('ADMIN', 'STAFF', 'SHIPPER', 'CUSTOMER');

ALTER TABLE agri.accounts 
  ALTER COLUMN role TYPE agri.user_role 
  USING role::text::agri.user_role;

-- Set default back
ALTER TABLE agri.accounts 
  ALTER COLUMN role SET DEFAULT 'CUSTOMER';

-- Drop old enum (CASCADE to drop dependent functions)
DROP TYPE agri.user_role_old CASCADE;

-- =============================================================
-- 9) CREATE REVENUE TRACKING TABLE
-- =============================================================

CREATE TABLE IF NOT EXISTS agri.revenue_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES agri.orders(id) ON DELETE RESTRICT,
  amount NUMERIC(14,2) NOT NULL,
  confirmed_by UUID REFERENCES agri.accounts(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_revenue_order ON agri.revenue_records(order_id);
CREATE INDEX IF NOT EXISTS idx_revenue_confirmed_at ON agri.revenue_records(confirmed_at DESC);

-- =============================================================
-- 10) RECREATE DROPPED FUNCTIONS (from CASCADE)
-- =============================================================

-- Recreate cap_nhat_trang_thai_don function with new enum
CREATE OR REPLACE FUNCTION agri.cap_nhat_trang_thai_don(
  p_order_id UUID,
  p_status agri.order_status
)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE agri.orders
  SET status = p_status, updated_at = NOW()
  WHERE id = p_order_id;
END$$;

-- Recreate don_hang_chi_tiet function with new enum
CREATE OR REPLACE FUNCTION agri.don_hang_chi_tiet(p_order_id UUID)
RETURNS TABLE (
  id UUID,
  order_code TEXT,
  status agri.order_status,
  payment_status agri.payment_status,
  grand_total NUMERIC,
  created_at TIMESTAMPTZ
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT o.id, o.order_code, o.status, o.payment_status, o.grand_total, o.created_at
  FROM agri.orders o
  WHERE o.id = p_order_id;
END$$;

-- =============================================================
-- MIGRATION COMPLETE
-- =============================================================

COMMENT ON TABLE agri.user_phones IS 'Stores multiple phone numbers per user account';
COMMENT ON TABLE agri.order_status_history IS 'Tracks all status changes for orders';
COMMENT ON TABLE agri.revenue_records IS 'Tracks confirmed revenue from completed orders';
COMMENT ON COLUMN agri.orders.shipper_id IS 'Shipper assigned to deliver this order';
COMMENT ON COLUMN agri.orders.payment_method IS 'Payment method: COD or BANK_TRANSFER';
