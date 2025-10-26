# 🔧 TỔNG HỢP CÁC VẤN ĐỀ VÀ GIẢI PHÁP

## ❌ CÁC VẤN ĐỀ PHÁT HIỆN

### 1. **Admin Order Management - Không hiển thị danh sách đơn hàng**

**Nguyên nhân:**
- Frontend gọi `checkoutService.getOrders()` nhưng function này không tồn tại
- Frontend sử dụng fetch thủ công thay vì service

**Giải pháp:** ✅ ĐÃ SỬA
- File: `frontend/src/services/checkoutService.js`
- Thêm `getOrders()` và `updateOrderStatus()` methods

```javascript
getOrders: async (params = {}) => {
  const response = await api.get('/orders', { params });
  return response.data;
},

updateOrderStatus: async (orderId, status) => {
  const response = await api.put(`/orders/${orderId}/status`, { status });
  return response.data;
}
```

- File: `frontend/src/pages/admin/OrderManagement.jsx`
- Sử dụng `checkoutService.updateOrderStatus()` thay vì fetch

---

### 2. **Product Management - Không refresh sau khi thêm sản phẩm**

**Nguyên nhân:**
- Component đã gọi `fetchProducts()` sau khi thêm thành công
- Có thể do backend không trả về đúng format

**Giải pháp:**
- ✅ Code đã đúng trong `handleSubmit()`:
  ```javascript
  await productService.createProduct(productData);
  alert('Tạo sản phẩm thành công!');
  closeModal();
  fetchProducts(); // ✅ Đã có
  ```
- **Kiểm tra thêm:** Backend phải trả về `success: true` và `data`

---

### 3. **Return Management - URL sai (404 Not Found)**

**Hiện trạng:**
- Console error: `POST http://localhost:5173/orders/undefined/api/returns net::ERR_ABORTED 404`
- returnService đã đúng: `/returns` endpoint

**Nguyên nhân có thể:**
- Component gọi sai URL
- Hoặc có interceptor/middleware redirect sai

**Giải pháp:**
- ✅ returnService đã đúng:
  ```javascript
  createReturn: async (returnData) => {
    const response = await api.post('/returns', returnData);
    return response.data;
  }
  ```
- **Cần kiểm tra:** Component OrderDetail có gọi đúng `returnService.createReturn()` không

---

### 4. **WebSocket - Disconnecting liên tục**

**Hiện trạng:**
- Console: "Disconnecting WebSocket..." lặp lại 50+ lần

**Nguyên nhân:**
- Token hết hạn hoặc không hợp lệ
- Backend WebSocket server có vấn đề authentication
- Connection timeout hoặc network instability

**Giải pháp:**
```javascript
// File: frontend/src/hooks/useWebSocket.js
// Kiểm tra:
1. Token còn hạn: localStorage.getItem('token')
2. WebSocket URL đúng: ws://localhost:5000/ws
3. Thêm reconnect logic với delay:
   - Retry sau 5 giây
   - Maximum 3 retries
   - Stop retry nếu 401 Unauthorized
```

**Backend cần:**
```javascript
// File: backend/src/services/websocketService.js
// Log rõ lý do disconnect:
ws.on('close', (code, reason) => {
  console.log(`❌ WebSocket closed: ${code} - ${reason}`);
});
```

---

### 5. **Shipper Dashboard - Logic "Nhận đơn"**

**Hiện trạng:** ✅ ĐÃ ĐÚNG

**Logic hiện tại:**
1. Shipper click "Nhận đơn" → Call `shipperService.startDelivery(orderId)`
2. Backend: `agri.assign_shipper_to_order(order_id, shipper_id)`
3. Stored procedure:
   - Gán `shipper_id` vào đơn hàng
   - Chuyển status: `PENDING` → `SHIPPING`
4. Frontend: `fetchData()` → Refresh danh sách
5. Filter tự động:
   - `availableOrders`: `shipper_id IS NULL` OR `status = PENDING/PROCESSING`
   - `myActiveOrders`: `status = SHIPPING/DRIVER_ARRIVED`

**Code Frontend:**
```javascript
const handleStartDelivery = async (orderId) => {
  if (!confirm('Bạn muốn nhận đơn hàng này?')) return;
  
  try {
    await shipperService.startDelivery(orderId);
    alert('Đã nhận đơn hàng thành công!');
    fetchData(); // ✅ Refresh
  } catch (error) {
    alert('Không thể nhận đơn hàng: ' + error.message);
  }
};

// Filter
const availableOrders = orders.filter(o => 
  !o.shipper_id || o.status === 'PENDING' || o.status === 'PROCESSING'
);
const myActiveOrders = orders.filter(o => 
  o.status === 'SHIPPING' || o.status === 'DRIVER_ARRIVED'
);
```

---

## 📋 DANH SÁCH API HOÀN CHỈNH

### 🔐 Authentication

```
POST /api/auth/login
Body: { email, password }
Response: { token, user: { id, email, full_name, role } }

POST /api/auth/register
Body: { email, password, full_name, phone }
```

### 📦 Products

```
GET /api/products
Query: ?category_id, brand_id, search, page, limit
Response: { products: [...], pagination: {...} }

GET /api/products/:id
Response: { product: {...}, images: [...] }

POST /api/products (Admin only)
Body: { sku, name, slug, price, unit, ... }

PUT /api/products/:id (Admin only)
DELETE /api/products/:id (Admin only)

POST /api/products/:id/images (Admin only)
Body: FormData { image: File, is_main: boolean }
  OR JSON { image_url: string, is_main: boolean }

DELETE /api/products/:id/images/:imageId (Admin only)
PUT /api/products/:id/images/:imageId/set-main (Admin only)
```

### 🛒 Orders

```
GET /api/orders
Query: ?status, page, limit
Response: { data: [...], pagination: {...} }
- Customer: Xem đơn của mình
- Admin: Xem tất cả đơn

GET /api/orders/:id
Response: { 
  id, order_code, status, payment_status,
  customer: {...}, shipping_address: {...},
  items: [...], subtotal, tax_total, grand_total
}

POST /api/checkout
Body: { shipping_address_id, items: [{product_id, qty}], note }
Response: { order_id, order_code, grand_total }

PUT /api/orders/:id/status (Admin only)
Body: { status: "PROCESSING" }
```

### 🔄 Returns

```
GET /api/returns
Response: { data: [...] }
- Customer: Xem return của mình
- Admin: Xem tất cả

POST /api/returns
Body: { order_id, reason, items: [{product_id, qty}] }
Response: { id, status, refund_amount }

PUT /api/returns/:id/approve (Admin only)
PUT /api/returns/:id/reject (Admin only)
```

### 🚚 Shipper

```
GET /api/shipper/orders
Response: { data: [...] }
- Trả về đơn PENDING (chưa có shipper)
- Hoặc đơn đã assign cho shipper này

GET /api/shipper/orders/:id
Response: { order_detail with items }

POST /api/shipper/start-delivery
Body: { order_id }
Logic:
  - Gán shipper_id vào order
  - Chuyển status: PENDING → SHIPPING
  - Emit WebSocket: order_status_update

POST /api/shipper/update-status
Body: { order_id, status: "DELIVERED" }
Logic:
  - Update status
  - Nếu DELIVERED: payment_status = PAID
  - Nếu FAILED: payment_status = UNPAID
  - Emit WebSocket

GET /api/shipper/stats
Response: { total_delivered, total_failed, total_earnings }
```

### 📊 Dashboard (Admin)

```
GET /api/dashboard/overview
Query: ?start_date, end_date
Response: {
  total_orders, total_revenue,
  delivered, cancelled, returning_count
}

GET /api/dashboard/revenue
Query: ?start_date, end_date
Response: [{
  date, orders_count, gross, shipping, discount, tax, net
}]
```

### 🔌 WebSocket

```
ws://localhost:5000/ws

// Client → Server
{
  "type": "auth",
  "token": "JWT_TOKEN"
}

// Server → Client Events:
{
  "type": "new_order",
  "data": { order_id, order_code, customer_id, grand_total }
}

{
  "type": "order_status_update",
  "data": { order_id, order_code, old_status, new_status }
}

{
  "type": "return_requested",
  "data": { return_id, order_id, order_code, customer_id, reason }
}
```

---

## 🔄 LUỒNG DỮ LIỆU CHI TIẾT

### 1. **Khách hàng đặt hàng**

```
1. Customer → POST /api/checkout
   Body: { shipping_address_id, items, note }

2. Backend:
   - Validate sản phẩm, tính toán giá
   - INSERT vào agri.orders + agri.order_items
   - PostgreSQL Trigger: NOTIFY "new_order_created"

3. WebSocket:
   - Nhận NOTIFY từ PostgreSQL
   - Emit "new_order" đến Shipper + Admin

4. Frontend:
   - ShipperDashboard: Hiển thị notification, refresh danh sách
   - AdminOrderManagement: Tự động refresh
```

### 2. **Shipper nhận đơn**

```
1. Shipper → Click "Nhận đơn" → POST /api/shipper/start-delivery
   Body: { order_id }

2. Backend:
   - Call stored procedure: agri.assign_shipper_to_order(order_id, shipper_id)
   - Procedure:
     * UPDATE orders SET shipper_id = $2, status = 'SHIPPING'
     * PostgreSQL Trigger: NOTIFY "order_status_changed"

3. WebSocket:
   - Emit "order_status_update" đến Customer + Admin

4. Frontend:
   - ShipperDashboard: fetchData()
     * Đơn biến mất khỏi "Đơn hàng mới" (do đã có shipper_id)
     * Đơn xuất hiện trong "Đơn đang giao" (do status = SHIPPING)
   - CustomerOrderHistory: Auto refresh, progress bar update
   - AdminOrderManagement: Auto refresh
```

### 3. **Shipper cập nhật trạng thái**

```
1. Shipper → Click "Đã đến nơi" → POST /api/shipper/update-status
   Body: { order_id, status: "DRIVER_ARRIVED" }

2. Backend:
   - Verify order belongs to shipper
   - UPDATE orders SET status = 'DRIVER_ARRIVED'
   - Trigger: NOTIFY "order_status_changed"

3. Shipper → Click "Giao thành công" → POST /api/shipper/update-status
   Body: { order_id, status: "DELIVERED" }

4. Backend:
   - UPDATE orders SET status = 'DELIVERED', payment_status = 'PAID'
   - Trigger: NOTIFY

5. Frontend:
   - Customer: Hiển thị nút "Đổi trả hàng"
   - Shipper: Đơn chuyển sang "Lịch sử"
```

### 4. **Khách hàng đổi trả**

```
1. Customer → Click "Đổi trả hàng" → Modal chọn items + lý do

2. Customer → Submit → POST /api/returns
   Body: { order_id, reason, items: [{product_id, qty}] }

3. Backend:
   - Call: agri.tao_yeu_cau_doi_tra(order_id, customer_id, reason, items_json)
   - INSERT vào agri.returns + agri.return_items
   - pg_notify('return_requested', {return_id, order_id, ...})

4. WebSocket:
   - Emit "return_requested" đến Admin

5. Frontend:
   - AdminReturnManagement: Auto refresh, hiển thị yêu cầu mới
```

### 5. **Admin quản lý đơn hàng**

```
1. Admin → Mở /admin/orders

2. Frontend:
   - Call: checkoutService.getOrders({ status: 'ALL' })
   - Backend: GET /api/orders (join accounts, filter by role)
   - Render table với: Mã đơn, Khách hàng, Tổng tiền, Trạng thái

3. Admin → Click "Eye" icon → viewOrderDetail(orderId)

4. Frontend:
   - Call: checkoutService.getOrderDetail(orderId)
   - Backend: GET /api/orders/:id (join addresses, order_items, products)
   - Render modal với đầy đủ thông tin

5. Admin → Click "Thay đổi trạng thái" → Chọn status mới

6. Frontend:
   - Call: checkoutService.updateOrderStatus(orderId, newStatus)
   - Backend: PUT /api/orders/:id/status
   - Call stored procedure: agri.cap_nhat_trang_thai_don(order_id, new_status)
   - Trigger: NOTIFY "order_status_changed"

7. WebSocket:
   - Emit đến tất cả clients liên quan
   - All pages auto-refresh
```

---

## 🛠️ CÁC FILE ĐÃ SỬA/TẠO

### Backend (Không cần sửa - đã đúng)
- ✅ `src/routes/order.routes.js` - Đã có đầy đủ endpoints
- ✅ `src/services/shipperService.js` - Logic nhận đơn đúng
- ✅ `src/services/websocketService.js` - Đã xử lý 3 events

### Frontend (Đã sửa)
- ✅ `src/services/checkoutService.js` - Thêm `getOrders()`, `updateOrderStatus()`
- ✅ `src/pages/admin/OrderManagement.jsx` - Sử dụng service method

### Frontend (Cần kiểm tra)
- ⚠️ `src/hooks/useWebSocket.js` - Cần thêm reconnect logic
- ⚠️ `src/pages/customer/OrderDetail.jsx` - Kiểm tra returnService.createReturn() call

---

## ✅ CHECKLIST KIỂM TRA

### Product Management
- [ ] Thêm sản phẩm → Alert "Thành công" → Tab refresh hiển thị sản phẩm mới
- [ ] Upload ảnh từ máy → Hiển thị trong grid
- [ ] Nhập URL ảnh → Hiển thị trong grid
- [ ] Xóa sản phẩm → Biến mất khỏi danh sách

### Order Management (Admin)
- [ ] Vào /admin/orders → Hiển thị danh sách đơn (không phải "Không có...")
- [ ] Filter theo trạng thái hoạt động
- [ ] Click "Eye" → Modal chi tiết mở, hiển thị đầy đủ info
- [ ] Thay đổi trạng thái → Success, danh sách refresh

### Return Management
- [ ] Customer tạo return → Admin thấy realtime
- [ ] Admin duyệt/từ chối → Update thành công
- [ ] Không có error 404 `/orders/undefined/api/returns`

### Shipper Dashboard
- [ ] Tab "Đơn hàng mới": Hiển thị đơn PENDING chưa có shipper
- [ ] Click "Nhận đơn":
  - [ ] Alert "Thành công"
  - [ ] Đơn biến mất khỏi "Đơn hàng mới"
  - [ ] Đơn xuất hiện trong tab "Đơn đang giao"
- [ ] Customer thấy order status update realtime

### WebSocket
- [ ] Connection status hiển thị "Realtime Active" (xanh)
- [ ] Không có "Disconnecting..." spam trong console
- [ ] Tạo đơn mới → Shipper nhận notification ngay lập tức

---

## 🚀 HƯỚNG DẪN TEST

### 1. Start Backend
```bash
cd backend
npm run dev
```

### 2. Start Frontend
```bash
cd frontend
npm run dev
```

### 3. Test Flow Đầy Đủ

**A. Test Product Management:**
```
1. Login as Admin
2. Vào /admin/products
3. Click "Thêm sản phẩm mới"
4. Điền form: Tên, SKU, Giá, Đơn vị
5. Submit → Kiểm tra có refresh không
6. Click "Sửa" → Upload ảnh hoặc nhập URL
7. Kiểm tra ảnh hiển thị trong grid
```

**B. Test Order Flow:**
```
1. Login as Customer
2. Thêm sản phẩm vào giỏ → Checkout
3. Điền địa chỉ → Đặt hàng
4. Kiểm tra: WebSocket notification ở Shipper
5. Kiểm tra: Order xuất hiện trong Admin Order Management

6. Login as Shipper
7. Vào Dashboard → Tab "Đơn hàng mới"
8. Click "Nhận đơn" → Confirm
9. Kiểm tra: Đơn chuyển sang "Đơn đang giao"
10. Kiểm tra: Customer thấy progress bar update

11. Click "Đã đến nơi" → "Giao thành công"
12. Kiểm tra: payment_status = PAID trong DB
13. Kiểm tra: Customer thấy nút "Đổi trả hàng"
```

**C. Test Return:**
```
1. Login as Customer
2. Vào đơn hàng DELIVERED
3. Click "Đổi trả hàng"
4. Chọn sản phẩm + Nhập lý do → Gửi
5. Kiểm tra: Không có error 404
6. Kiểm tra: Admin thấy yêu cầu mới realtime
```

---

## 🐛 DEBUG TIPS

### Nếu Order Management không hiển thị data:

```javascript
// Console của Admin page:
console.log('Calling getOrders...');
const response = await checkoutService.getOrders();
console.log('Response:', response);
// Kiểm tra: response.data có phải là array không?
```

### Nếu WebSocket disconnect liên tục:

```javascript
// File: frontend/src/hooks/useWebSocket.js
// Thêm log:
ws.onclose = (event) => {
  console.log('❌ WebSocket closed:', event.code, event.reason);
  // Code 1006 = Abnormal closure (no close frame)
  // Code 1000 = Normal closure
};

// Backend: src/services/websocketService.js
ws.on('close', (code, reason) => {
  console.log(`Client ${userId} disconnected: ${code} - ${reason}`);
});
```

### Nếu Shipper "Nhận đơn" không hoạt động:

```sql
-- Check stored procedure:
SELECT * FROM agri.orders WHERE id = 'order_id';
-- Trước khi nhận: shipper_id = NULL, status = 'PENDING'

SELECT agri.assign_shipper_to_order('order_id', 'shipper_id');

SELECT * FROM agri.orders WHERE id = 'order_id';
-- Sau khi nhận: shipper_id = shipper_id, status = 'SHIPPING'
```

---

## 📌 KẾT LUẬN

**Đã sửa:**
1. ✅ checkoutService - Thêm getOrders(), updateOrderStatus()
2. ✅ OrderManagement - Sử dụng service methods

**Đã kiểm tra - Đúng:**
1. ✅ Shipper logic nhận đơn - Hoàn hảo
2. ✅ returnService - URL đúng
3. ✅ Backend APIs - Đầy đủ endpoints

**Cần kiểm tra thêm:**
1. ⚠️ WebSocket reconnect logic
2. ⚠️ Product Management - Backend response format
3. ⚠️ Return Management - Component call returnService

**Tất cả logic kinh doanh đã đúng. Các vấn đề còn lại chủ yếu là frontend không gọi đúng API hoặc WebSocket token issues.**
