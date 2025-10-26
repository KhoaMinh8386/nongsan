# 🚀 NONGSAN Application - Deployment Guide

## ✅ Các Tính Năng Đã Phát Triển

### 1. 🛵 Shipper Dashboard (✓ Hoàn thành)
**File:** `/frontend/src/pages/shipper/ShipperDashboard.jsx`

**Tính năng:**
- ✅ Realtime notifications khi có đơn hàng mới (toast hiển thị 2 giây)
- ✅ Danh sách đơn hàng mới tự động cập nhật qua WebSocket
- ✅ Modal chi tiết đơn hàng với đầy đủ thông tin:
  - Danh sách sản phẩm, số lượng, hình ảnh
  - Tổng tiền, địa chỉ giao hàng
  - Thông tin khách hàng
- ✅ Chức năng nhận đơn (chuyển sang trạng thái "Đang giao")
- ✅ Cập nhật trạng thái: Đã đến nơi → Giao thành công/Thất bại

**Backend API:**
- `GET /api/shipper/orders` - Lấy danh sách đơn hàng
- `GET /api/shipper/orders/:id` - Chi tiết đơn hàng
- `POST /api/shipper/start-delivery` - Nhận đơn
- `POST /api/shipper/update-status` - Cập nhật trạng thái

---

### 2. 📦 Quản Lý Hình Ảnh Sản Phẩm (✓ Hoàn thành)
**Backend:** 
- `/backend/src/middlewares/upload.js` - Multer config
- `/backend/src/services/productService.js` - Image management

**Frontend:**
- `/frontend/src/pages/admin/ProductManagement.jsx`

**Tính năng:**
- ✅ Upload hình ảnh sản phẩm (tối đa 5MB: JPG, PNG, WEBP, GIF)
- ✅ Quản lý nhiều ảnh cho một sản phẩm
- ✅ Đặt ảnh chính (main image)
- ✅ Xóa ảnh
- ✅ Hiển thị ảnh trong danh sách sản phẩm
- ✅ Hiển thị ảnh trong giỏ hàng và đơn hàng

**Backend API:**
- `POST /api/products/:id/images` - Upload ảnh
- `DELETE /api/products/:id/images/:imageId` - Xóa ảnh
- `PUT /api/products/:id/images/:imageId/set-main` - Đặt ảnh chính

**Static files:** `/uploads` directory được serve qua Express

---

### 3. 👤 Quản Lý Đổi Trả Hàng (✓ Hoàn thành)
**Frontend:**
- `/frontend/src/pages/customer/OrderDetail.jsx`

**Backend:**
- Đã có sẵn API trong `returnService.js`

**Tính năng:**
- ✅ Nút "Đổi trả hàng" hiển thị khi đơn hàng = DELIVERED
- ✅ Modal chọn sản phẩm cần đổi trả
- ✅ Nhập lý do đổi trả
- ✅ API tạo yêu cầu đổi trả

**Backend API:**
- `POST /api/returns` - Tạo yêu cầu đổi trả
- `GET /api/returns` - Danh sách yêu cầu đổi trả

---

### 4. 💰 Logic Thanh Toán Tự Động (✓ Hoàn thành)
**File:** `/backend/src/services/shipperService.js`

**Logic:**
- ✅ Giao hàng thành công (DELIVERED) → `payment_status = PAID`
- ✅ Giao hàng thất bại (FAILED) → `payment_status = UNPAID`
- ✅ Tự động cập nhật trong transaction khi shipper thay đổi trạng thái

---

### 5. 📊 Admin Dashboard với Biểu Đồ (✓ Hoàn thành)
**File:** `/frontend/src/pages/admin/Dashboard.jsx`

**Tính năng:**
- ✅ Biểu đồ doanh thu 30 ngày qua (dữ liệu thực từ database)
- ✅ Chuyển đổi giữa biểu đồ đường (Line) và cột (Bar)
- ✅ Tooltip hiển thị chi tiết:
  - Doanh thu (VNĐ)
  - Số đơn hàng
- ✅ Trục Y kép: Doanh thu (trái) & Số đơn hàng (phải)
- ✅ Cards thống kê: Tổng đơn, Doanh thu, Đã giao, Đã hủy

**Backend API:**
- `GET /api/dashboard/overview` - Tổng quan
- `GET /api/dashboard/revenue` - Doanh thu chi tiết theo ngày

---

### 6. 🎯 Admin Order Management (✓ Hoàn thành)
**File:** `/frontend/src/pages/admin/OrderManagement.jsx`

**Tính năng:**
- ✅ Danh sách đơn hàng với filter theo trạng thái
- ✅ Hiển thị đầy đủ thông tin: Mã đơn, Khách hàng, Tổng tiền, Trạng thái, Thanh toán
- ✅ Modal chi tiết đơn hàng:
  - Thông tin khách hàng
  - Địa chỉ giao hàng
  - Danh sách sản phẩm
  - Tổng kết đơn hàng
- ✅ Thay đổi trạng thái đơn hàng (với validation):
  - PENDING → PROCESSING, CANCELLED
  - PROCESSING → SHIPPING, CANCELLED
  - SHIPPING → DRIVER_ARRIVED, FAILED
  - DRIVER_ARRIVED → DELIVERED, FAILED

**Backend API:**
- `GET /api/orders` - Danh sách đơn hàng (có filter)
- `GET /api/orders/:id` - Chi tiết đơn hàng
- `PUT /api/orders/:id/status` - Cập nhật trạng thái (Admin only)

---

### 7. 🔌 WebSocket Realtime (✓ Đã tối ưu)
**File:** `/backend/src/services/websocketService.js`

**Luồng hoạt động:**
1. User checkout → Trigger `new_order_created` → Shipper nhận notification
2. Shipper/Admin thay đổi trạng thái → Trigger `order_status_changed` → Customer + Admin nhận notification
3. Authentication qua JWT token
4. Keep-alive với ping/pong mechanism
5. Auto-reconnect khi mất kết nối

**Events:**
- `new_order` - Đơn hàng mới (gửi đến Shipper + Admin)
- `order_status_update` - Trạng thái thay đổi (gửi đến Customer + Shipper + Admin)

---

## 📝 Hướng Dẫn Cài Đặt

### Backend Setup

```bash
cd backend

# Install dependencies (nếu chưa có)
npm install

# Đảm bảo multer đã được cài
npm install multer

# Tạo thư mục uploads
mkdir -p uploads/products

# Chạy migrations (nếu cần)
npm run migrate

# Start server
npm run dev
```

### Frontend Setup

```bash
cd frontend

# Install dependencies (đã có recharts)
npm install

# Start dev server
npm run dev
```

---

## 🗄️ Database Triggers (Đã có sẵn)

Các trigger PostgreSQL đã được setup để tự động emit WebSocket events:

1. **new_order_trigger** - Khi tạo đơn hàng mới
2. **order_status_change_trigger** - Khi thay đổi trạng thái đơn hàng

---

## 🔐 Environment Variables

Backend `.env` cần có:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nongsan
DB_USER=your_user
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5173
PORT=5000
```

Frontend `.env`:
```
VITE_API_URL=http://localhost:5000
```

---

## ✨ Các Cải Tiến Đã Thực Hiện

### UI/UX
- ✅ Toast notifications với animation
- ✅ Modal responsive với sticky header/footer
- ✅ Loading states cho tất cả operations
- ✅ Error handling với user-friendly messages
- ✅ Realtime connection status indicator

### Performance
- ✅ Optimistic UI updates
- ✅ WebSocket auto-reconnect
- ✅ Efficient image compression handling
- ✅ Transaction-based database operations

### Security
- ✅ JWT authentication cho WebSocket
- ✅ Role-based authorization
- ✅ File upload validation (type + size)
- ✅ SQL injection prevention với parameterized queries

---

## 🚦 Testing Checklist

### Shipper Flow
- [ ] Login as Shipper
- [ ] Tạo đơn hàng mới từ Customer → Kiểm tra notification
- [ ] Click "Chi tiết" → Xem thông tin đơn hàng
- [ ] Click "Nhận đơn" → Chuyển sang tab "Đơn đang giao"
- [ ] "Đã đến nơi" → "Giao thành công" → Kiểm tra payment_status = PAID
- [ ] "Đã đến nơi" → "Giao thất bại" → Kiểm tra payment_status = UNPAID

### Admin Flow
- [ ] Login as Admin
- [ ] Vào Dashboard → Xem biểu đồ doanh thu
- [ ] Toggle Line/Bar chart
- [ ] Hover tooltip xem chi tiết
- [ ] Vào Product Management
- [ ] Tạo sản phẩm mới
- [ ] Upload hình ảnh (thử nhiều ảnh)
- [ ] Đặt ảnh chính
- [ ] Xóa ảnh
- [ ] Vào Order Management
- [ ] Filter theo trạng thái
- [ ] Xem chi tiết đơn hàng
- [ ] Thay đổi trạng thái

### Customer Flow
- [ ] Login as Customer
- [ ] Đặt hàng
- [ ] Vào Order Detail
- [ ] Đợi đơn hàng DELIVERED
- [ ] Click "Đổi trả hàng"
- [ ] Chọn sản phẩm, nhập lý do
- [ ] Submit yêu cầu

---

## 🐛 Known Issues & Notes

1. **WebSocket URL**: Hiện tại hardcode trong `useWebSocket.js` line 4. Nên dùng environment variable.

2. **Image Storage**: Hiện tại lưu local disk. Nên migrate sang cloud storage (S3, Cloudinary) cho production.

3. **Database Triggers**: Đảm bảo PostgreSQL triggers đã được tạo đúng (check trong migrations).

4. **CORS**: Nếu deploy riêng backend/frontend, cần cấu hình CORS đúng.

---

## 📚 API Documentation Summary

### Shipper APIs
- `GET /api/shipper/orders` - Danh sách đơn
- `GET /api/shipper/orders/:id` - Chi tiết
- `POST /api/shipper/start-delivery` - Nhận đơn
- `POST /api/shipper/update-status` - Cập nhật
- `GET /api/shipper/stats` - Thống kê

### Product APIs
- `GET /api/products` - List products
- `GET /api/products/:id` - Detail
- `POST /api/products` - Create (Admin)
- `PUT /api/products/:id` - Update (Admin)
- `DELETE /api/products/:id` - Delete (Admin)
- `POST /api/products/:id/images` - Upload image (Admin)
- `DELETE /api/products/:id/images/:imageId` - Delete image (Admin)
- `PUT /api/products/:id/images/:imageId/set-main` - Set main (Admin)

### Order APIs
- `GET /api/orders` - List orders
- `GET /api/orders/:id` - Detail
- `PUT /api/orders/:id/status` - Update status (Admin)

### Dashboard APIs
- `GET /api/dashboard/overview` - Overview stats
- `GET /api/dashboard/revenue` - Revenue report

### Return APIs
- `POST /api/returns` - Create return request
- `GET /api/returns` - List returns

---

## 🎉 Hoàn Thành!

Tất cả 8 yêu cầu đã được phát triển đầy đủ:
1. ✅ Shipper Dashboard với realtime + modal
2. ✅ Product image upload
3. ✅ Product Management với images
4. ✅ User Return Management
5. ✅ Admin Dashboard với charts
6. ✅ Admin Order Management
7. ✅ Payment status automation
8. ✅ WebSocket optimization

Ứng dụng sẵn sàng để test và deploy!
