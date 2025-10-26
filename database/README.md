# Database Setup

## File SQL Đầy Đủ

File **nong_san_full.sql** chứa toàn bộ:
- Database schema (tables, indexes)
- Custom types (ENUM)
- Functions (plpgsql)
- Triggers
- Seed data (admin, customer, products, categories, brands)

## Cách Import

```bash
# Method 1: Using psql command
psql -U postgres -f nong_san_full.sql

# Method 2: Using pgAdmin
# 1. Mở pgAdmin
# 2. Right-click vào Databases > Create > Database: nong_san_db
# 3. Right-click vào nong_san_db > Restore hoặc Query Tool
# 4. Chạy nội dung file SQL

# Method 3: Từ PostgreSQL prompt
psql -U postgres
\i /path/to/nong_san_full.sql
```

## Nội Dung File SQL

File SQL được cung cấp trong yêu cầu ban đầu của bạn.  
**Vui lòng copy toàn bộ nội dung SQL từ prompt của bạn vào file:**  
`database/nong_san_full.sql`

File bao gồm:
1. CREATE DATABASE nong_san_db
2. Extensions: uuid-ossp, pg_trgm, unaccent, citext
3. Schema: agri
4. Custom Types: user_role, order_status, payment_status, return_status, unit_type
5. Tables: 15 bảng chính
6. Triggers: Auto-update timestamps, TSV search
7. Functions: 15+ functions xử lý business logic
8. Seed Data: Admin, customer demo, 3 sản phẩm mẫu

## Kết Nối Database

Sau khi import, cấu hình trong **backend/.env**:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nong_san_db
DB_USER=postgres
DB_PASSWORD=your_password
```

## Verify Import

Kiểm tra database đã import thành công:

```sql
-- Connect to database
\c nong_san_db

-- Check tables
\dt agri.*

-- Check functions
\df agri.*

-- Test query
SELECT * FROM agri.accounts;
SELECT * FROM agri.products;
```

## Database Schema Overview

```
agri.accounts          → User accounts
agri.addresses         → Shipping addresses  
agri.categories        → Product categories
agri.brands            → Product brands
agri.products          → Products
agri.product_images    → Product images
agri.inventory         → Stock inventory
agri.stock_movements   → Stock movement logs
agri.carts             → Shopping carts
agri.cart_items        → Cart items
agri.orders            → Orders
agri.order_items       → Order items
agri.payments          → Payment records
agri.returns           → Return requests
agri.return_items      → Return items
```

## Demo Accounts

Được tạo tự động khi chạy SQL:

**Admin:**
- Email: admin@example.com
- Password: 123456 (hash: $2b$10$hL4cPoV2uukd5uE6x1L8ku3J8P8oYJ7uTWV1xCVuH0OtXJm0RorxG)

**Customer:**
- Email: khach@example.com
- Password: 123456 (hash: $2b$10$hL4cPoV2uukd5uE6x1L8ku3J8P8oYJ7uTWV1xCVuH0OtXJm0RorxG)

## Troubleshooting

**Error: database "nong_san_db" already exists**
```sql
DROP DATABASE IF EXISTS nong_san_db;
-- Then re-import
```

**Error: permission denied**
```sql
-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE nong_san_db TO postgres;
```

**Connection refused**
- Check PostgreSQL service is running
- Verify pg_hba.conf allows local connections
- Check firewall settings
