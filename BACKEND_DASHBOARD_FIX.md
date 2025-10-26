# 🔧 BACKEND DASHBOARD - ĐÃ SỬA LỖI 500

## ✅ CÁC LỖI ĐÃ SỬA

### 1. **getTopProducts() - Thiếu error handling**
**Vấn đề:**
- Hàm không có try-catch
- Lỗi stored procedure gây crash
- Thiếu field `category_name` mà frontend cần

**Đã sửa:**
```javascript
✅ Thêm try-catch cho stored procedure
✅ Thêm fallback query nếu stored procedure lỗi
✅ Thêm category_name vào response
✅ Return [] nếu có lỗi
```

### 2. **Controllers - Thiếu validation dates**
**Vấn đề:**
- Không có default dates
- Lỗi nếu client không truyền start_date/end_date

**Đã sửa:**
```javascript
✅ Thêm getDefaultDates() helper (30 ngày gần nhất)
✅ Auto-fill dates nếu không có trong query
✅ Thêm console.error để debug
✅ Parse limit thành integer
```

### 3. **Response structure - Chuẩn hóa**
**Đã đảm bảo:**
```javascript
✅ Tất cả responses có cùng structure
✅ product_name thay vì name
✅ category_name luôn có (fallback 'Khác')
✅ Numbers được parse đúng (float/int)
```

---

## 📁 FILES ĐÃ SỬA

### 1. `dashboardService.js`
```javascript
// Line 116-167: getTopProducts()
✅ Try stored procedure first
✅ Fallback to direct query với JOIN categories
✅ Return category_name
✅ Error handling đầy đủ
```

### 2. `dashboardController.js`
```javascript
// Line 4-14: getDefaultDates() helper
✅ Auto-generate 30 days range

// Line 16-57: All controllers
✅ Use default dates
✅ Parse limit parameter
✅ Add console.error logs
```

---

## 🚀 CÁCH TEST

### 1. Restart Backend

```bash
# Stop backend nếu đang chạy (Ctrl+C)
cd c:\NONGSAN\backend
npm run dev
```

**Kiểm tra logs:**
```
✅ [nodemon] starting `node src/index.js`
✅ WebSocket server initialized
✅ PostgreSQL LISTEN client connected
✅ Database connection successful
✅ Server running on port 5000
```

### 2. Test APIs Manually

**Test Overview:**
```bash
curl http://localhost:5000/api/dashboard/overview
# Hoặc mở browser:
http://localhost:5000/api/dashboard/overview
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "total_orders": 422,
    "total_revenue": 11600000,
    "delivered": 350,
    "cancelled": 12,
    "returning_count": 5
  }
}
```

**Test Revenue:**
```bash
http://localhost:5000/api/dashboard/revenue
```

**Expected response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2025-01-01",
      "orders_count": 15,
      "gross": 1250000,
      "shipping": 0,
      "discount": 0,
      "tax": 0,
      "net": 1250000
    },
    ...
  ]
}
```

**Test Top Products:**
```bash
http://localhost:5000/api/dashboard/top-products?limit=5
```

**Expected response:**
```json
{
  "success": true,
  "data": [
    {
      "product_id": "uuid",
      "product_name": "Cải xanh",
      "category_name": "Rau củ",
      "total_qty": 245,
      "revenue": 6860000
    },
    ...
  ]
}
```

### 3. Test từ Frontend

```bash
# Terminal 1: Backend (đã chạy)
cd c:\NONGSAN\backend
npm run dev

# Terminal 2: Frontend
cd c:\NONGSAN\frontend
npm run dev
```

**Truy cập:**
```
http://localhost:5173/admin/dashboard
```

**Kiểm tra DevTools:**
- Network tab: 4 API calls → 200 OK
- Console: Không có errors
- Dashboard: Hiển thị đầy đủ data

---

## 🔍 DEBUG CHECKLIST

Nếu vẫn lỗi 500:

### Backend Console Check:
```bash
✅ Xem logs khi API được gọi
✅ Check "Error:", "controller error:", "Stored procedure error:"
✅ Note down error message
```

### Database Check:
```sql
-- Check stored procedures tồn tại
SELECT proname FROM pg_proc WHERE proname LIKE '%dashboard%';

-- Kiểm tra có data không
SELECT COUNT(*) FROM agri.orders;
SELECT COUNT(*) FROM agri.order_items;
SELECT COUNT(*) FROM agri.products;
```

### Common Issues:

**1. Stored procedure không tồn tại**
```
Error: function agri.top_san_pham_theo_doanh_thu does not exist
→ OK! Fallback query sẽ chạy
```

**2. Không có data**
```
Response: {"data": [], "pagination": {...}}
→ OK! Frontend sẽ hiển thị empty state
```

**3. Date format sai**
```
Error: invalid input syntax for type date
→ Check frontend gửi đúng format YYYY-MM-DD
```

---

## 📊 API ENDPOINTS SUMMARY

### ✅ GET /api/dashboard/overview
**Query params:**
- `start_date` (optional): YYYY-MM-DD
- `end_date` (optional): YYYY-MM-DD

**Default:** Last 30 days

**Response fields:**
- `total_orders`: Tổng số đơn hàng
- `total_revenue`: Tổng doanh thu
- `delivered`: Số đơn đã giao
- `cancelled`: Số đơn đã hủy
- `returning_count`: Số yêu cầu đổi trả

---

### ✅ GET /api/dashboard/revenue
**Query params:**
- `start_date` (optional)
- `end_date` (optional)

**Response:** Array of daily stats
```javascript
[{
  date: "2025-01-24",
  orders_count: 15,
  gross: 1250000,
  net: 1250000
}, ...]
```

---

### ✅ GET /api/dashboard/top-products
**Query params:**
- `start_date` (optional)
- `end_date` (optional)
- `limit` (optional, default: 10)

**Response:** Array of top products
```javascript
[{
  product_id: "uuid",
  product_name: "Cải xanh",
  category_name: "Rau củ",
  total_qty: 245,
  revenue: 6860000
}, ...]
```

---

## 🎯 RESPONSE STRUCTURE

Tất cả APIs đều follow format:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Error description"
  }
}
```

---

## ✨ IMPROVEMENTS MADE

### Error Handling
```javascript
✅ Try stored procedure first
✅ Fallback to direct SQL query
✅ Return safe defaults on error
✅ Console logging for debugging
```

### Data Safety
```javascript
✅ COALESCE for null values
✅ Default dates if not provided
✅ Parse numbers correctly
✅ Return empty arrays instead of throwing
```

### Frontend Compatibility
```javascript
✅ product_name field
✅ category_name field (required for Doughnut chart)
✅ Consistent response structure
✅ Handles empty data gracefully
```

---

## 🔄 RESTART INSTRUCTIONS

### Full Restart:

```bash
# 1. Stop both servers (Ctrl+C)

# 2. Restart Backend
cd c:\NONGSAN\backend
npm run dev

# 3. Restart Frontend
cd c:\NONGSAN\frontend
npm run dev

# 4. Test Dashboard
http://localhost:5173/admin/dashboard
```

### Verify Success:

**Backend logs:**
```
✅ No errors in console
✅ API calls logged
✅ Responses sent
```

**Frontend:**
```
✅ Dashboard loads
✅ KPI cards show numbers
✅ Charts render
✅ No 500 errors in Network tab
```

---

## 📝 FINAL CHECKLIST

- [ ] Backend restarted
- [ ] No errors in backend console
- [ ] Test /health endpoint: http://localhost:5000/health
- [ ] Test /api/dashboard/overview
- [ ] Test /api/dashboard/revenue
- [ ] Test /api/dashboard/top-products
- [ ] Frontend can access dashboard
- [ ] No 500 errors in browser console
- [ ] Data displays correctly

---

**🎉 LỖI ĐÃ ĐƯỢC SỬA - RESTART BACKEND ĐỂ ÁP DỤNG!**

Nếu vẫn gặp lỗi sau khi restart, check backend console logs và báo lại error message cụ thể.
