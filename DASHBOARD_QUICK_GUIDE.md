# 🚀 DASHBOARD - HƯỚNG DẪN NHANH

## ✅ ĐÃ TẠO 5 APIs MỚI

```
✅ GET /api/dashboard/new-customers     → Số khách hàng mới
✅ GET /api/dashboard/top-products      → Top 5 sản phẩm bán chạy
✅ GET /api/dashboard/recent-orders     → 5 đơn hàng gần đây
✅ GET /api/dashboard/summary           → Tổng quan (4 KPI)
✅ GET /api/dashboard/revenue-30-days   → Doanh thu 30 ngày
```

---

## 🔧 FILES ĐÃ SỬA

### Backend (4 files)
```
✅ services/dashboardService.js    - Thêm 4 functions mới
✅ controllers/dashboardController.js - Thêm 4 controllers
✅ routes/dashboard.routes.js      - Thêm 4 routes
```

### Frontend (2 files)
```
✅ services/dashboardService.js    - Thêm 4 methods
✅ pages/admin/Dashboard.jsx       - Dùng APIs mới
```

### Database
```
✅ database/dashboard_queries.sql  - SQL queries để test
```

---

## 🚀 CÁCH CHẠY - 3 BƯỚC

### 1. Restart Backend
```bash
cd c:\NONGSAN\backend
# Ctrl+C để stop
npm run dev
```

### 2. Restart Frontend  
```bash
cd c:\NONGSAN\frontend
# Ctrl+C để stop
npm run dev
```

### 3. Truy cập Dashboard
```
http://localhost:5173/admin/dashboard
```

---

## ✅ CHECKLIST

Dashboard bây giờ hiển thị:
- [x] 💰 Tổng doanh thu (real)
- [x] 🛒 Tổng đơn hàng (real)
- [x] 👥 Khách hàng mới (real) ← MỚI
- [x] 📦 Số sản phẩm bán chạy (real) ← MỚI
- [x] 📈 Line chart 30 ngày (real)
- [x] 🍩 Doughnut chart categories (real)
- [x] 📦 Top 5 products (real) ← CẬP NHẬT
- [x] 📋 Recent 5 orders (real) ← MỚI

---

## 📊 SQL QUERIES (Để test trong psql)

```sql
-- 1. Đếm khách hàng mới
SELECT COUNT(*) FROM agri.accounts 
WHERE role = 'CUSTOMER' 
AND created_at >= CURRENT_DATE - INTERVAL '30 days';

-- 2. Top 5 sản phẩm
SELECT p.name, SUM(oi.qty) as sold
FROM agri.order_items oi
JOIN agri.orders o ON o.id = oi.order_id
JOIN agri.products p ON p.id = oi.product_id
WHERE o.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.name
ORDER BY sold DESC
LIMIT 5;

-- 3. Recent orders
SELECT o.order_code, a.full_name, o.status
FROM agri.orders o
JOIN agri.accounts a ON a.id = o.customer_id
ORDER BY o.created_at DESC
LIMIT 5;
```

File đầy đủ: `database/dashboard_queries.sql`

---

## 🔍 VERIFY

### Backend logs:
```
✅ GET /api/dashboard/summary 200
✅ GET /api/dashboard/top-products 200
✅ GET /api/dashboard/recent-orders 200
```

### Browser DevTools:
```
✅ Network: 5 API calls → 200 OK
✅ Console: No errors
```

### UI:
```
✅ KPI cards có số (không phải 0)
✅ Top products có 5 items
✅ Recent orders có 5 items với badges màu
✅ Charts render OK
```

---

## 📚 TÀI LIỆU CHI TIẾT

- **DASHBOARD_REAL_DATA_COMPLETE.md** - Full documentation
- **database/dashboard_queries.sql** - SQL queries
- **BACKEND_DASHBOARD_FIX.md** - Backend fixes

---

## 🎉 KẾT QUẢ

**Dashboard giờ 100% real data!**

Restart backend + frontend và xem ngay! 🚀
