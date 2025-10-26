# 🚀 Hướng dẫn Setup Ngrok + Realtime WebSocket

## ✅ Đã cấu hình

### Backend
- ✅ `.env` đã cập nhật `FRONTEND_URL=https://khloe-milanaise-un.ngrok-free.dev`
- ✅ WebSocket service đã LISTEN cho `new_order_created` và `order_status_changed`
- ✅ Database triggers đã được định nghĩa trong migration

### Frontend
- ✅ API URL: `https://khloe-milanaise-un.ngrok-free.dev/api`
- ✅ WebSocket URL: `wss://khloe-milanaise-un.ngrok-free.dev/ws`
- ✅ Header `ngrok-skip-browser-warning: true` đã được thêm
- ✅ ShipperDashboard đã dùng WebSocket hook

## 📋 Các bước khởi chạy

### 1. Chạy Database Migrations (QUAN TRỌNG!)

```bash
cd backend
node test-triggers.js
```

Nếu triggers chưa có, chạy:
```bash
node run-migrations.js
```

### 2. Khởi động Backend với Ngrok

```bash
cd backend
npm run dev
```

Backend sẽ chạy trên port 5000.

### 3. Chạy Ngrok

```bash
ngrok http 5000 --domain=khloe-milanaise-un.ngrok-free.dev
```

Hoặc nếu chưa có domain cố định:
```bash
ngrok http 5000
```

**Lưu ý:** Nếu ngrok URL thay đổi, cần cập nhật:
- `backend/.env` → `FRONTEND_URL`
- `frontend/src/services/api.js` → `baseURL`
- `frontend/src/hooks/useWebSocket.js` → `WS_URL`

### 4. Test API Connection

```bash
cd frontend
node test-api-connection.js
```

Kết quả mong đợi:
```
✅ Health Check: { status: 'OK', message: 'Server is running' }
✅ Products API Response:
  - Success: true
  - Products Count: X
  - Pagination: { page: 1, limit: 12, total: X, total_pages: Y }
```

### 5. Khởi động Frontend

```bash
cd frontend
npm run dev
```

Frontend sẽ chạy trên `http://localhost:5173`

## 🔍 Kiểm tra từng chức năng

### A. Kiểm tra Products không hiển thị

**Nguyên nhân có thể:**

1. **Database không có sản phẩm**
   ```bash
   cd backend
   node test-triggers.js
   ```
   → Nếu `Active Products: 0`, cần thêm sản phẩm qua Admin panel

2. **CORS Error**
   - Mở DevTools (F12) → Console
   - Nếu thấy lỗi CORS: Backend chưa restart sau khi đổi `.env`
   - Fix: Restart backend server

3. **Ngrok Warning Page**
   - Header `ngrok-skip-browser-warning: true` đã được thêm
   - Nếu vẫn bị: Clear browser cache (Ctrl+Shift+Delete)

4. **API Response sai format**
   - Test API trực tiếp: https://khloe-milanaise-un.ngrok-free.dev/api/products
   - Hoặc dùng test script: `node frontend/test-api-connection.js`

### B. Kiểm tra Realtime Notification cho Shipper

**Flow hoạt động:**

1. Customer đặt hàng → Trigger `tg_notify_new_order()` → NOTIFY 'new_order_created'
2. Backend WebSocket LISTEN → Nhận notification
3. Backend gửi message qua WebSocket → Shipper clients
4. ShipperDashboard nhận message → Hiển thị notification

**Test realtime:**

1. Mở trang Shipper Dashboard
2. Kiểm tra connection status: Phải hiển thị **"Realtime Active"** (màu xanh)
3. Từ trang Customer, đặt một đơn hàng mới
4. Shipper Dashboard sẽ:
   - Hiển thị popup notification: **"Có đơn hàng mới!"**
   - Tự động refresh danh sách đơn hàng (không cần F5)

**Nếu không hoạt động:**

1. **Kiểm tra WebSocket connection**
   - Mở DevTools (F12) → Console
   - Tìm log: `✅ WebSocket authenticated: {userId} ({role})`
   - Nếu không thấy → Check token có hợp lệ không

2. **Kiểm tra triggers đã được tạo**
   ```bash
   cd backend
   node test-triggers.js
   ```
   
3. **Kiểm tra Backend WebSocket Service**
   - Check backend console có log: `📡 PostgreSQL LISTEN client connected`
   - Khi có đơn mới, phải thấy: `🆕 New order created: {order_code}`

4. **Kiểm tra user role**
   - Shipper phải đăng nhập bằng account có role = 'SHIPPER'
   - Check: `SELECT email, role FROM agri.accounts WHERE role = 'SHIPPER'`

## 🐛 Troubleshooting

### Lỗi CORS

```
Access to XMLHttpRequest at 'https://...' from origin 'http://localhost:5173' 
has been blocked by CORS policy
```

**Fix:**
1. Check `backend/.env` có `FRONTEND_URL=https://khloe-milanaise-un.ngrok-free.dev`
2. Restart backend: Ctrl+C → `npm run dev`

### WebSocket không connect

```
WebSocket connection to 'wss://...' failed
```

**Fix:**
1. Check ngrok có đang chạy không
2. Check backend server có đang chạy không
3. Check URL trong `frontend/src/hooks/useWebSocket.js` có đúng không
4. Try: Clear cookies & localStorage → Login lại

### Products trống

```
Hiện chưa có sản phẩm nào.
```

**Fix:**
1. Login as Admin
2. Vào Product Management
3. Thêm sản phẩm mới
4. Hoặc check database: `SELECT * FROM agri.products WHERE is_active = true`

### Database triggers không có

```
❌ No triggers found!
```

**Fix:**
```bash
cd backend
node run-migrations.js
```

## 📊 Testing Checklist

- [ ] Backend đang chạy trên port 5000
- [ ] Ngrok đang forward port 5000
- [ ] Database triggers đã được tạo (`node test-triggers.js`)
- [ ] Database có sản phẩm active
- [ ] Frontend API test pass (`node test-api-connection.js`)
- [ ] CORS không có lỗi (check DevTools Console)
- [ ] WebSocket connect thành công (xem "Realtime Active" trên Shipper Dashboard)
- [ ] Đặt hàng test → Shipper nhận notification realtime

## 🎯 Expected Result

Khi hoàn thành setup:

1. **ProductList:** Hiển thị danh sách sản phẩm từ database
2. **ShipperDashboard:** 
   - Connection status: "Realtime Active" (xanh lá)
   - Khi có đơn mới → Notification popup
   - Danh sách đơn tự động refresh (không cần F5)
3. **No errors** trong browser console

---

**Lưu ý quan trọng:**
- Mỗi lần ngrok restart, URL có thể thay đổi → Cần cập nhật lại config
- Frontend phải clear cache sau khi đổi API URL
- Backend phải restart sau khi đổi `.env`
