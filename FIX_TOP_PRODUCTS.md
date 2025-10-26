# 🔧 FIX - SẢN PHẨM BÁN CHẠY KHÔNG HIỂN THỊ

## ✅ ĐÃ SỬA

### 1. Thêm Fallback Query
Backend giờ sẽ query **all-time** nếu không có data trong 30 ngày.

```javascript
// Backend: dashboardService.js
if (result.rows.length === 0) {
  // Try all-time data
  result = await pool.query(
    `SELECT ... FROM order_items ... (NO DATE FILTER)`
  );
}
```

### 2. Thêm Debug Logs
Frontend giờ sẽ log response để debug.

```javascript
// Frontend: Dashboard.jsx
console.log('Top Products Response:', topProductsRes);
console.log('Top Products Data:', topProductsRes.data);
```

---

## 🔍 CÁCH KIỂM TRA VẤN ĐỀ

### BƯỚC 1: Check Database Có Data Không

**Mở PostgreSQL:**
```bash
psql -U postgres -d nongsan
```

**Chạy queries kiểm tra:**
```sql
-- 1. Check có orders không?
SELECT COUNT(*) FROM agri.orders;

-- 2. Check có order_items không?
SELECT COUNT(*) FROM agri.order_items;

-- 3. Check orders có items không?
SELECT 
  o.order_code,
  (SELECT COUNT(*) FROM agri.order_items oi WHERE oi.order_id = o.id) as items
FROM agri.orders o
LIMIT 10;

-- 4. Check top products
SELECT 
  p.name,
  SUM(oi.qty) as total_sold
FROM agri.order_items oi
JOIN agri.orders o ON o.id = oi.order_id
JOIN agri.products p ON p.id = oi.product_id
WHERE o.status NOT IN ('CANCELLED', 'FAILED')
GROUP BY p.name
ORDER BY total_sold DESC
LIMIT 5;
```

**Hoặc chạy file:**
```bash
psql -U postgres -d nongsan -f c:\NONGSAN\database\check_top_products.sql
```

---

## 🚀 CÁCH FIX - 3 BƯỚC

### BƯỚC 1: RESTART BACKEND ⭐
```bash
cd c:\NONGSAN\backend
# Ctrl+C để stop
npm run dev
```

**Chờ logs:**
```
✅ Server running on port 5000
```

### BƯỚC 2: CLEAR CACHE & REFRESH FRONTEND
```bash
# Trong browser:
F5 hoặc Ctrl+R

# Hoặc hard refresh:
Ctrl+Shift+R
```

### BƯỚC 3: CHECK CONSOLE LOGS

**Mở DevTools (F12) → Console:**

Tìm logs:
```
Top Products Response: {...}
Top Products Data: [...]
```

**Nếu data = []:**
- Check backend logs
- Check database có order_items không

**Nếu data có array:**
- Check length > 0
- Check fields: product_name, total_sold, total_revenue

---

## 🐛 TROUBLESHOOTING

### Case 1: Database Không Có Order Items

**Triệu chứng:**
```sql
SELECT COUNT(*) FROM agri.order_items;
-- Kết quả: 0
```

**Fix:** Cần tạo orders với items

**Tạm thời:** Backend sẽ return [] và hiển thị empty state

---

### Case 2: Tất Cả Orders Bị Cancelled

**Triệu chứng:**
```sql
SELECT COUNT(*) FROM agri.orders WHERE status NOT IN ('CANCELLED', 'FAILED');
-- Kết quả: 0
```

**Fix:** Cần tạo orders mới hoặc update status

---

### Case 3: Orders Không Có Items

**Triệu chứng:**
- Có orders nhưng không có order_items
- Foreign key không match

**Fix:**
```sql
-- Check orders nào không có items
SELECT o.id, o.order_code,
  (SELECT COUNT(*) FROM agri.order_items WHERE order_id = o.id) as items_count
FROM agri.orders o
WHERE (SELECT COUNT(*) FROM agri.order_items WHERE order_id = o.id) = 0;
```

---

### Case 4: API Response Structure Sai

**Check trong DevTools Console:**
```javascript
// Nếu thấy:
Top Products Data: undefined
// → API response structure sai

// Expected structure:
{
  success: true,
  data: [
    {
      product_id: "uuid",
      product_name: "Cải xanh",
      total_sold: 245,
      total_revenue: 6860000,
      percent_change: 0
    }
  ]
}
```

---

## 📊 TEST QUERIES

File: `c:\NONGSAN\database\check_top_products.sql`

### Quick Test

```sql
-- Test 1: Có data không?
SELECT 
  COUNT(*) as total_orders,
  (SELECT COUNT(*) FROM agri.order_items) as total_items
FROM agri.orders;

-- Test 2: Top products (all time)
SELECT 
  p.name,
  SUM(oi.qty) as sold,
  SUM(oi.qty * oi.price) as revenue
FROM agri.order_items oi
JOIN agri.orders o ON o.id = oi.order_id
JOIN agri.products p ON p.id = oi.product_id
WHERE o.status NOT IN ('CANCELLED', 'FAILED')
GROUP BY p.name
ORDER BY sold DESC
LIMIT 5;
```

---

## ✅ EXPECTED RESULT

Sau khi fix:

### Backend Logs:
```
✅ GET /api/dashboard/top-products?limit=5 200
✅ Query returned 5 products
```

Hoặc nếu không có data trong 30 ngày:
```
⚠️ No data in date range, querying all-time top products
✅ Query returned X products
```

### Frontend Console:
```javascript
Top Products Response: {success: true, data: [{...}, {...}]}
Top Products Data: [{product_name: "...", total_sold: 123}, ...]
```

### Dashboard UI:
```
✅ Section "Sản phẩm bán chạy" hiển thị 5 items
✅ Mỗi item có:
   - Icon box xanh
   - Tên sản phẩm
   - "Đã bán: 245"
   - Doanh thu: "6,860,000₫"
   - % change: "↑ 0%"
```

---

## 🔄 BACKUP PLAN

Nếu vẫn không có data sau khi fix:

### Option 1: Tạo Sample Data

```sql
-- Tạo sample order với items
-- (Cần có customer_id, product_ids)
-- See: database/dashboard_queries.sql
```

### Option 2: Import Test Data

```sql
-- Import từ backup hoặc seed data
-- psql -U postgres -d nongsan -f backup.sql
```

### Option 3: Frontend Fallback

```javascript
// Dashboard.jsx - Tạm thời
const mockTopProducts = [
  { product_name: 'Cải xanh', total_sold: 245, total_revenue: 6860000 },
  { product_name: 'Đậu xanh', total_sold: 189, total_revenue: 5240000 },
  // ...
];

setTopProducts(topProductsRes.data?.length > 0 ? topProductsRes.data : mockTopProducts);
```

---

## 📝 SUMMARY

**Đã sửa:**
- ✅ Backend: Fallback all-time query
- ✅ Frontend: Debug logs
- ✅ SQL: Check queries

**Cần làm:**
1. Restart backend
2. Refresh frontend
3. Check console logs
4. Verify database có data

**Nếu vẫn empty:**
- Check database queries
- Verify order_items tồn tại
- Consider adding sample data

---

**🎯 RESTART BACKEND + REFRESH BROWSER NGAY!**
