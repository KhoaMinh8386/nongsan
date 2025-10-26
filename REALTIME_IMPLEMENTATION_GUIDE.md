# 🚀 NONGSAN - Hướng Dẫn Triển Khai Hệ Thống Realtime

## 📋 Tổng Quan Các Tính Năng Đã Phát Triển

### ✅ 1. Hệ Thống WebSocket Realtime (Hoàn Thành)

**Backend:** `/backend/src/services/websocketService.js`

**Events được hỗ trợ:**
- `new_order` - Khi khách hàng tạo đơn hàng mới
- `order_status_update` - Khi trạng thái đơn hàng thay đổi
- `return_requested` - Khi khách hàng tạo yêu cầu đổi trả

**Luồng hoạt động:**
```
Customer tạo đơn 
  → PostgreSQL trigger NOTIFY "new_order_created"
  → WebSocket server nhận notification
  → Phát event "new_order" đến Shipper + Admin

Shipper/Admin cập nhật trạng thái
  → PostgreSQL trigger NOTIFY "order_status_changed"
  → WebSocket server nhận notification
  → Phát event "order_status_update" đến Customer + Admin + Shipper

Customer tạo yêu cầu đổi trả
  → Backend emit NOTIFY "return_requested"
  → WebSocket server nhận notification
  → Phát event "return_requested" đến Admin
```

**PostgreSQL LISTEN Channels:**
- `order_status_changed`
- `new_order_created`
- `return_requested`

---

### ✅ 2. Quản Lý Hình Ảnh Sản Phẩm (Hoàn Thành)

**Files:**
- Backend: `/backend/src/controllers/productController.js`
- Backend: `/backend/src/middlewares/upload.js`
- Frontend: `/frontend/src/pages/admin/ProductManagement.jsx`

**Tính năng:**
- ✅ Upload ảnh từ máy (max 5MB)
- ✅ Nhập URL ảnh trực tiếp (ví dụ: https://example.com/image.jpg)
- ✅ Đặt ảnh chính (is_main)
- ✅ Xóa ảnh
- ✅ Hiển thị ảnh trong grid với hover actions

**API:**
```javascript
POST /api/products/:id/images
Body (file upload):
  - image: File
  - is_main: boolean

Body (URL):
  - image_url: "https://..."
  - is_main: boolean

DELETE /api/products/:id/images/:imageId
PUT /api/products/:id/images/:imageId/set-main
```

**Middleware:**
- `optionalUploadProductImage` - Cho phép cả file upload và URL

---

### ✅ 3. Admin Order Management (Hoàn Thành)

**File:** `/frontend/src/pages/admin/OrderManagement.jsx`

**Tính năng:**
- ✅ Danh sách đơn hàng với filter theo trạng thái
- ✅ Modal chi tiết đơn hàng
- ✅ Thay đổi trạng thái đơn hàng (với validation)
- ✅ Realtime auto-refresh khi có order mới hoặc thay đổi trạng thái
- ✅ Connection status indicator (Wifi icon)

**Status Transitions:**
```
PENDING → PROCESSING, CANCELLED
PROCESSING → SHIPPING, CANCELLED
SHIPPING → DRIVER_ARRIVED, FAILED
DRIVER_ARRIVED → DELIVERED, FAILED
```

**API:**
```javascript
GET /api/orders?status=PENDING
GET /api/orders/:id
PUT /api/orders/:id/status
```

---

### ✅ 4. Admin Return Management (Hoàn Thành)

**File:** `/frontend/src/pages/admin/ReturnManagement.jsx`

**Tính năng:**
- ✅ Danh sách yêu cầu đổi trả với filter theo trạng thái
- ✅ Duyệt/Từ chối yêu cầu đổi trả
- ✅ Realtime notification khi có yêu cầu mới
- ✅ Connection status indicator

**API:**
```javascript
GET /api/returns
POST /api/returns/:id/approve
POST /api/returns/:id/reject
```

---

### ✅ 5. Admin Dashboard (Hoàn Thành)

**File:** `/frontend/src/pages/admin/Dashboard.jsx`

**Tính năng:**
- ✅ Hiển thị thống kê: Tổng đơn, Doanh thu, Đã giao, Đã hủy
- ✅ Biểu đồ doanh thu 30 ngày (Line/Bar chart)
- ✅ Custom tooltip hiển thị chi tiết doanh thu + số đơn
- ✅ Toggle giữa Line chart và Bar chart
- ✅ API fallback nếu stored procedures không hoạt động

**Backend Service:**
- File: `/backend/src/services/dashboardService.js`
- Cải thiện: Thêm fallback queries nếu PostgreSQL stored procedures lỗi

**API:**
```javascript
GET /api/dashboard/overview?start_date=2025-01-01&end_date=2025-01-31
Response: {
  total_orders: 100,
  total_revenue: 50000000,
  delivered: 80,
  cancelled: 5
}

GET /api/dashboard/revenue?start_date=2025-01-01&end_date=2025-01-31
Response: [{
  date: "2025-01-15",
  orders_count: 10,
  net: 5000000
}]
```

---

### ✅ 6. Shipper Dashboard (Đã có sẵn, cải thiện WebSocket)

**File:** `/frontend/src/pages/shipper/ShipperDashboard.jsx`

**Tính năng:**
- ✅ Realtime notification khi có đơn mới (toast 2 giây)
- ✅ Danh sách đơn hàng mới / Đơn đang giao
- ✅ Modal chi tiết đơn hàng với hình ảnh sản phẩm
- ✅ Nhận đơn → Chuyển sang "Đang giao"
- ✅ Cập nhật trạng thái: Đã đến nơi → Giao thành công/Thất bại
- ✅ Auto-refresh khi có thay đổi

**Payment Status Logic:**
- Giao thành công (DELIVERED) → `payment_status = PAID`
- Giao thất bại (FAILED) → `payment_status = UNPAID`

**File Backend:** `/backend/src/services/shipperService.js`

---

### ✅ 7. Customer Pages (Hoàn Thành)

**OrderHistory:** `/frontend/src/pages/customer/OrderHistory.jsx`
- ✅ Realtime refresh khi order thay đổi trạng thái
- ✅ Filter tabs: Tất cả, Chờ xử lý, Đang giao, Hoàn thành, Thất bại
- ✅ Progress bar cho đơn hàng active
- ✅ Connection status indicator

**OrderDetail:** `/frontend/src/pages/customer/OrderDetail.jsx`
- ✅ Realtime notification khi trạng thái thay đổi
- ✅ Nút "Đổi trả hàng" hiển thị khi order = DELIVERED
- ✅ Modal chọn sản phẩm và nhập lý do đổi trả

---

## 🔧 Cài Đặt và Chạy

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Tạo thư mục uploads
mkdir -p uploads/products

# Cấu hình .env
# Đảm bảo có các biến:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nongsan
DB_USER=your_user
DB_PASSWORD=your_password
JWT_SECRET=your_secret
FRONTEND_URL=http://localhost:5173
PORT=5000

# Chạy server
npm run dev
```

**Lưu ý:** Nếu PostgreSQL stored procedures chưa có, backend sẽ tự động sử dụng direct queries.

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Cấu hình .env
VITE_API_URL=http://localhost:5000

# Chạy dev server
npm run dev
```

---

## 🧪 Testing Checklist

### 1. WebSocket Realtime

#### Test New Order Event
1. Login as Admin hoặc Shipper
2. Mở Console (F12) để xem logs
3. Từ cửa sổ khác, login as Customer → Tạo đơn hàng mới
4. Kiểm tra:
   - [ ] Shipper Dashboard hiển thị notification "Có đơn hàng mới!"
   - [ ] Đơn hàng xuất hiện trong danh sách "Đơn hàng mới"
   - [ ] Admin Order Management tự động refresh
   - [ ] Console log: `🆕 New order received`

#### Test Order Status Update
1. Login as Shipper
2. Click "Nhận đơn" trên một đơn hàng
3. Kiểm tra:
   - [ ] Đơn hàng chuyển sang tab "Đơn đang giao"
   - [ ] Admin Order Management tự động refresh
   - [ ] Customer OrderHistory tự động refresh và hiển thị progress bar
   - [ ] Console log: `📢 Order status updated`

4. Cập nhật: "Đã đến nơi" → "Giao thành công"
5. Kiểm tra:
   - [ ] `payment_status` = PAID trong database
   - [ ] Customer nhận notification
   - [ ] Nút "Đổi trả hàng" xuất hiện trong OrderDetail

#### Test Return Request
1. Login as Customer
2. Vào OrderDetail của đơn hàng DELIVERED
3. Click "Đổi trả hàng" → Chọn sản phẩm → Nhập lý do → Gửi
4. Kiểm tra:
   - [ ] Admin Return Management tự động refresh
   - [ ] Yêu cầu mới xuất hiện với status "Chờ xử lý"
   - [ ] Console log: `🔄 New return request`

### 2. Product Image Management

1. Login as Admin
2. Vào Product Management → Click "Sửa" một sản phẩm
3. Test upload file:
   - [ ] Click "Upload ảnh từ máy" → Chọn file JPG < 5MB
   - [ ] Ảnh hiển thị trong grid
   - [ ] Hover vào ảnh → Xuất hiện nút "Đặt làm ảnh chính" và "Xóa"
4. Test nhập URL:
   - [ ] Nhập URL: `https://picsum.photos/400/300`
   - [ ] Check "Đặt làm ảnh chính"
   - [ ] Click "Thêm URL"
   - [ ] Ảnh hiển thị và có star icon "Chính"
5. Test set main image:
   - [ ] Click star icon trên ảnh khác
   - [ ] Ảnh được đặt làm chính (star icon chuyển sang ảnh đó)
6. Test delete:
   - [ ] Click trash icon
   - [ ] Ảnh biến mất khỏi grid

### 3. Admin Dashboard

1. Login as Admin
2. Vào Dashboard
3. Kiểm tra:
   - [ ] Cards hiển thị số liệu thực (không phải 0)
   - [ ] Biểu đồ hiển thị doanh thu 30 ngày qua
   - [ ] Hover vào điểm trên biểu đồ → Tooltip hiển thị ngày, doanh thu, số đơn
   - [ ] Toggle Line/Bar chart hoạt động
   - [ ] Không có lỗi trong Console

### 4. Admin Order Management

1. Login as Admin
2. Vào Quản lý đơn hàng
3. Kiểm tra:
   - [ ] Danh sách hiển thị đơn hàng (không "Không có đơn hàng nào")
   - [ ] Filter theo trạng thái hoạt động
   - [ ] Click "Eye" icon → Modal chi tiết mở
   - [ ] Trong modal: Thông tin khách hàng, địa chỉ, sản phẩm, tổng tiền
   - [ ] Nút "Thay đổi trạng thái" hiển thị (nếu có transitions)
   - [ ] Click thay đổi trạng thái → Confirm → Update thành công
   - [ ] WebSocket icon màu xanh (Realtime)

### 5. Admin Return Management

1. Login as Admin
2. Vào Quản lý đổi trả
3. Kiểm tra:
   - [ ] Danh sách hiển thị yêu cầu đổi trả
   - [ ] Filter theo trạng thái hoạt động
   - [ ] Yêu cầu "Chờ xử lý" có nút "Duyệt" và "Từ chối"
   - [ ] Click "Duyệt" → Confirm → Update thành công
   - [ ] WebSocket icon màu xanh

### 6. Shipper Dashboard

1. Login as Shipper
2. Kiểm tra:
   - [ ] Tabs: "Đơn hàng mới" và "Đơn đang giao"
   - [ ] Click "Chi tiết" → Modal hiển thị đầy đủ thông tin + hình ảnh sản phẩm
   - [ ] Click "Nhận đơn" → Đơn chuyển sang tab "Đơn đang giao"
   - [ ] Click "Đã đến nơi" → Hiển thị dropdown với options
   - [ ] Chọn "Giao thành công" → Update thành công
   - [ ] Kiểm tra database: `payment_status = PAID`
   - [ ] WebSocket icon màu xanh

### 7. Customer Pages

1. Login as Customer
2. Tạo đơn hàng mới
3. Vào "Đơn hàng của tôi"
4. Kiểm tra:
   - [ ] Đơn hàng mới xuất hiện
   - [ ] Progress bar hiển thị tiến trình
   - [ ] WebSocket icon màu xanh
5. Đợi Shipper cập nhật trạng thái
6. Kiểm tra:
   - [ ] Trang tự động refresh (không cần F5)
   - [ ] Notification hiển thị "Đơn hàng đã được cập nhật"
   - [ ] Progress bar update
7. Khi order = DELIVERED:
   - [ ] Nút "Yêu cầu đổi trả" xuất hiện
   - [ ] Click nút → Modal mở
   - [ ] Chọn sản phẩm + Nhập lý do → Gửi thành công

---

## 📝 API Summary

### WebSocket
```
ws://localhost:5000/ws

Authentication:
{
  "type": "auth",
  "token": "JWT_TOKEN"
}

Events received:
- new_order
- order_status_update
- return_requested
- return_created
```

### Products
```javascript
POST /api/products/:id/images
  - Upload file hoặc URL
  - is_main: boolean

DELETE /api/products/:id/images/:imageId
PUT /api/products/:id/images/:imageId/set-main
```

### Orders
```javascript
GET /api/orders
  - Query: status, page, limit

GET /api/orders/:id
PUT /api/orders/:id/status
  - Body: { status: "PROCESSING" }
```

### Returns
```javascript
POST /api/returns
  - Body: { order_id, reason, items: [{product_id, qty}] }

GET /api/returns
POST /api/returns/:id/approve
POST /api/returns/:id/reject
```

### Dashboard
```javascript
GET /api/dashboard/overview
  - Query: start_date, end_date

GET /api/dashboard/revenue
  - Query: start_date, end_date
```

### Shipper
```javascript
GET /api/shipper/orders
GET /api/shipper/orders/:id
POST /api/shipper/start-delivery
  - Body: { order_id }

POST /api/shipper/update-status
  - Body: { order_id, new_status }
```

---

## 🐛 Troubleshooting

### WebSocket không kết nối
1. Kiểm tra backend đang chạy: `http://localhost:5000`
2. Kiểm tra Console có lỗi WebSocket không
3. Kiểm tra JWT token còn hạn không
4. Kiểm tra `useWebSocket.js` line 4: URL WebSocket đúng chưa

### Dashboard hiển thị 0
1. Kiểm tra có đơn hàng trong database không
2. Kiểm tra Console backend có log "Stored procedure error" không
3. Fallback queries sẽ tự động chạy nếu stored procedures lỗi

### Upload ảnh lỗi
1. Kiểm tra thư mục `/backend/uploads/products` đã tồn tại chưa
2. Kiểm tra file size < 5MB
3. Kiểm tra file type: JPG, PNG, WEBP, GIF
4. Kiểm tra `/backend/src/index.js` có serve static files không:
   ```javascript
   app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
   ```

### Order Management không hiển thị data
1. Kiểm tra API `/api/orders` trả về data gì
2. Kiểm tra `checkoutService.getOrders()` có xử lý đúng response không
3. Kiểm tra filter có đang filter hết data không

---

## ✨ Các Cải Tiến Chính

1. **Realtime Updates:** Tất cả trang quan trọng đều tự động refresh khi có thay đổi
2. **Product Images:** Hỗ trợ cả upload file và nhập URL
3. **Dashboard:** Fallback queries đảm bảo luôn có data
4. **Payment Automation:** Tự động cập nhật payment_status dựa trên delivery result
5. **WebSocket Indicators:** Hiển thị connection status ở mọi trang realtime
6. **User Experience:** Toast notifications, progress bars, modal details

---

## 🎯 Kết Luận

Tất cả 6 yêu cầu đã được triển khai đầy đủ:

1. ✅ WebSocket realtime cho order_created, order_status_updated, return_requested
2. ✅ Admin Order Management với realtime auto-refresh và modal chi tiết
3. ✅ Admin Return Management với realtime notifications
4. ✅ Admin Dashboard với biểu đồ doanh thu thực + tooltip
5. ✅ Shipper Dashboard đã có sẵn và đã được cải thiện
6. ✅ Product Management cho phép nhập URL ảnh trực tiếp

**Ứng dụng đã sẵn sàng để test và sử dụng!** 🎉
