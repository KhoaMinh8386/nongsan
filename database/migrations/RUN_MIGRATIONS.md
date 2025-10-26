# 🔄 Run Database Migrations

## Prerequisites
- PostgreSQL installed
- Database `nong_san_db` exists
- Connected to database

## Method 1: Using psql Command Line

```bash
# Navigate to migrations folder
cd c:\NONGSAN\database\migrations

# Run migration 001
psql -U postgres -d nong_san_db -f 001_add_user_phones_and_updated_order_status.sql

# Run migration 002
psql -U postgres -d nong_san_db -f 002_add_helper_functions.sql
```

## Method 2: Using pgAdmin Query Tool

1. Open pgAdmin
2. Connect to `nong_san_db`
3. Open Query Tool (Tools → Query Tool)
4. Open file `001_add_user_phones_and_updated_order_status.sql`
5. Click Execute (F5)
6. Repeat for `002_add_helper_functions.sql`

## Method 3: Using Node.js Script (Auto)

```bash
cd c:\NONGSAN\backend
node run-migrations.js
```

## Verification

After running migrations, verify with these queries:

```sql
-- Check if tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'agri' 
  AND table_name IN ('user_phones', 'order_status_history', 'revenue_records');

-- Check if new order statuses exist
SELECT unnest(enum_range(NULL::agri.order_status));

-- Check if SHIPPER role exists
SELECT unnest(enum_range(NULL::agri.user_role));

-- Check if functions created
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'agri' 
  AND routine_name LIKE '%order%' 
  OR routine_name LIKE '%user%';
```

## Expected Results

✅ Tables created:
- `agri.user_phones`
- `agri.order_status_history`
- `agri.revenue_records`

✅ Order statuses:
- PENDING
- PROCESSING
- SHIPPING
- DRIVER_ARRIVED
- DELIVERED
- FAILED
- CANCELLED
- RETURN_REQUESTED
- RETURNED

✅ User roles:
- ADMIN
- STAFF
- SHIPPER
- CUSTOMER

✅ Functions created:
- `get_user_default_address()`
- `get_user_default_phone()`
- `create_order_from_cart()`
- `assign_shipper_to_order()`
- `update_order_status()`
- `confirm_order_revenue()`

✅ Triggers created:
- `tg_log_order_status_change` - Logs status changes
- `tg_notify_new_order` - Notifies shippers of new orders

## Troubleshooting

### Error: type "order_status" already exists
This is OK - the migration handles this by renaming and recreating.

### Error: column already exists
Run this to check existing columns:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'agri' AND table_name = 'orders';
```

### Start Fresh (DANGER - Will delete data!)
```sql
-- Only if you want to completely reset
DROP SCHEMA agri CASCADE;
-- Then run nong_san_full.sql and migrations again
```
