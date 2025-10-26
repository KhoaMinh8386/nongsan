# Database Migration Guide

## Quick Start - Apply Return Approval Fix

### Option 1: Using psql Command Line

```bash
# Windows Command Prompt or PowerShell
psql -U postgres -d nongsan_db -f "c:\NONGSAN\database\migrations\fix_duyet_doi_tra_function.sql"
```

### Option 2: Using pgAdmin

1. Open **pgAdmin**
2. Connect to your database server
3. Navigate to: **Servers** → **PostgreSQL** → **Databases** → **nongsan_db**
4. Click **Tools** → **Query Tool**
5. Open file: `c:\NONGSAN\database\migrations\fix_duyet_doi_tra_function.sql`
6. Click **Execute** (F5)

### Option 3: Copy-Paste SQL

Open your database tool and run this SQL directly:

```sql
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
```

## Verify Migration Success

After running the migration, verify it worked:

```sql
-- Check function exists and has correct definition
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'agri' 
  AND p.proname = 'duyet_doi_tra';
```

Look for the line containing:
```
'REFUNDED'::agri.payment_status
```

If you see the `::agri.payment_status` cast, the migration was successful! ✅

## Test the Fix

### Test Return Approval Flow:

1. Create a test return request (as customer)
2. Login as admin
3. Go to admin returns management
4. Approve a return request
5. Check for errors - should see: ✅ Success message
6. Verify inventory was updated:

```sql
-- Check stock was restored
SELECT 
  p.name,
  i.stock_qty,
  sm.change_qty,
  sm.reason,
  sm.created_at
FROM agri.stock_movements sm
JOIN agri.products p ON p.id = sm.product_id
JOIN agri.inventory i ON i.product_id = p.id
WHERE sm.reason = 'RETURN'
ORDER BY sm.created_at DESC
LIMIT 5;
```

## Rollback (If Needed)

If you need to rollback (revert to old version):

```sql
-- WARNING: This will restore the buggy version
-- Only use if absolutely necessary

CREATE OR REPLACE FUNCTION agri.duyet_doi_tra(p_return_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_order UUID;
  v_amt NUMERIC;
  r RECORD;
BEGIN
  SELECT order_id, refund_amount 
  INTO v_order, v_amt
  FROM agri.returns 
  WHERE id = p_return_id 
  FOR UPDATE;

  UPDATE agri.returns 
  SET status = 'COMPLETED', updated_at = NOW() 
  WHERE id = p_return_id;

  FOR r IN
    SELECT oi.product_id, ri.qty
    FROM agri.return_items ri
    JOIN agri.order_items oi ON oi.id = ri.order_item_id
    WHERE ri.return_id = p_return_id
  LOOP
    INSERT INTO agri.inventory (product_id, stock_qty, reserved_qty, updated_at)
    VALUES (r.product_id, r.qty, 0, NOW())
    ON CONFLICT (product_id) DO UPDATE
    SET 
      stock_qty = agri.inventory.stock_qty + EXCLUDED.stock_qty,
      updated_at = NOW();

    INSERT INTO agri.stock_movements(product_id, change_qty, reason, ref_id)
    VALUES (r.product_id, r.qty, 'RETURN', p_return_id);
  END LOOP;

  -- BUG: Missing type cast will cause SQL Error 42804
  IF v_amt > 0 THEN
    UPDATE agri.orders
    SET payment_status = CASE
      WHEN v_amt >= grand_total THEN 'REFUNDED'
      ELSE 'PARTIALLY_REFUNDED'
    END,
    updated_at = NOW()
    WHERE id = v_order;
  END IF;

  PERFORM pg_notify('return_approved', 
    json_build_object(
      'return_id', p_return_id,
      'order_id', v_order,
      'refund_amount', v_amt
    )::text
  );
END$$;
```

## Common Issues

### Issue 1: Permission Denied
**Error:** `ERROR: permission denied for schema agri`

**Solution:**
```sql
-- Grant permissions to your user
GRANT USAGE ON SCHEMA agri TO your_username;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA agri TO your_username;
```

### Issue 2: Function Already Exists
This is expected! `CREATE OR REPLACE` will update the existing function.

### Issue 3: Database Connection Failed
Check your connection string and ensure PostgreSQL is running:
```bash
# Check if PostgreSQL is running (Windows)
sc query postgresql-x64-17

# Start if not running
net start postgresql-x64-17
```

## Summary

✅ **What Changed:**
- Fixed SQL Error 42804 in `duyet_doi_tra()` function
- Added type casting for payment_status enum values

✅ **Impact:**
- Return approval now works without errors
- Inventory properly restored when returns are approved
- Payment status correctly updated

✅ **Next Steps:**
1. Run the migration script
2. Test return approval in admin panel
3. Verify inventory updates correctly
4. Check error logs are clear

---

**Questions?** Check `CHANGES_2025_10_26.md` for full implementation details.
