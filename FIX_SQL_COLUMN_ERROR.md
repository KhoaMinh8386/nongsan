# 🔧 FIX - LỖI SQL: column oi.price does not exist

## ❌ LỖI GỐC

```sql
ERROR:  column oi.price does not exist
LINE 6:   COALESCE(SUM(oi.qty * oi.price), 0) as total_revenue
HINT:  Perhaps you meant to reference the column "p.price".
```

## ✅ NGUYÊN NHÂN

Table **`agri.order_items`** KHÔNG có column `price`.

**Schema đúng:**
```sql
CREATE TABLE agri.order_items (
    id uuid,
    order_id uuid,
    product_id uuid,
    qty numeric(14,3),
    unit_price numeric(12,2),      -- ✅ Đây mới đúng
    discount_rate numeric(5,2),
    tax_rate numeric(5,2),
    line_subtotal numeric(14,2),
    line_tax numeric(14,2),
    line_total numeric(14,2)        -- ✅ Đã tính sẵn!
);
```

**Đúng:**
- `unit_price` - Giá đơn vị
- `line_total` - Tổng tiền dòng (đã tính tax + discount)

**Sai:**
- ~~`price`~~ ❌ KHÔNG TỒN TẠI

---

## ✅ ĐÃ SỬA - 3 FILES

### 1. Backend Service
**File:** `backend/src/services/dashboardService.js`

```javascript
// TRƯỚC (SAI):
COALESCE(SUM(oi.qty * oi.price), 0) as total_revenue

// SAU (ĐÚNG):
COALESCE(SUM(oi.line_total), 0) as total_revenue
```

**Lines đã sửa:**
- Line 144: Query 30 ngày
- Line 166: Query all-time fallback

---

### 2. Check Top Products SQL
**File:** `database/check_top_products.sql`

```sql
-- Query 4: Top products (30 ngày) - Line 32
COALESCE(SUM(oi.line_total), 0) as total_revenue

-- Query 5: Top products (all time) - Line 50
COALESCE(SUM(oi.line_total), 0) as total_revenue

-- Query 6: Order items detail - Line 68
oi.unit_price,
oi.line_total
```

---

### 3. Dashboard Queries SQL
**File:** `database/dashboard_queries.sql`

```sql
-- Query 2: Top products - Line 21
COALESCE(SUM(oi.line_total), 0) as total_revenue

-- Query 6: Category breakdown - Line 80
COALESCE(SUM(oi.line_total), 0) as revenue
```

---

## 🚀 CÁCH CHẠY - 2 BƯỚC

### BƯỚC 1: RESTART BACKEND ⭐ BẮT BUỘC

```bash
cd c:\NONGSAN\backend
# Ctrl+C để stop
npm run dev
```

**Chờ logs:**
```
✅ Server running on port 5000
✅ No SQL errors
```

### BƯỚC 2: TEST SQL QUERIES

```bash
# Mở PostgreSQL
psql -U postgres -d nongsan

# Chạy query test
SELECT 
  p.name,
  SUM(oi.qty) as sold,
  SUM(oi.line_total) as revenue
FROM agri.order_items oi
JOIN agri.orders o ON o.id = oi.order_id
JOIN agri.products p ON p.id = oi.product_id
WHERE o.status NOT IN ('CANCELLED', 'FAILED')
GROUP BY p.name
ORDER BY sold DESC
LIMIT 5;
```

**Expected:** Query chạy thành công, không lỗi!

---

## ✅ VERIFY SUCCESS

### Backend Console:
```
✅ GET /api/dashboard/top-products 200
✅ No column errors
```

### PostgreSQL:
```sql
-- Query không lỗi
✅ column oi.line_total exists
✅ Returns data (nếu có orders)
```

### Frontend Dashboard:
```
✅ "Sản phẩm bán chạy" hiển thị data
✅ Hoặc empty state nếu không có orders
✅ No console errors
```

---

## 📊 SCHEMA REFERENCE

### order_items Table Columns:
```
✅ id              uuid
✅ order_id        uuid
✅ product_id      uuid
✅ qty             numeric(14,3)
✅ unit_price      numeric(12,2)    ← Giá đơn vị
✅ discount_rate   numeric(5,2)
✅ tax_rate        numeric(5,2)
✅ line_subtotal   numeric(14,2)
✅ line_tax        numeric(14,2)
✅ line_total      numeric(14,2)    ← Tổng tiền (đã có sẵn)
```

### Calculated Fields:
```sql
line_subtotal = qty * unit_price
line_tax = line_subtotal * tax_rate
line_total = line_subtotal + line_tax - (discount...)
```

**→ Nên dùng `line_total` thay vì tính lại!**

---

## 🎯 SUMMARY

**Lỗi:** `oi.price` không tồn tại  
**Sửa:** Dùng `oi.line_total`  
**Files:** 3 files đã sửa  
**Cần làm:** Restart backend

**RESTART BACKEND NGAY ĐỂ ÁP DỤNG FIX!** 🚀
