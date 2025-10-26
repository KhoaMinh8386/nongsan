# 🚀 HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG REALTIME - WEBSITE NÔNG SẢN

## 📋 Tổng Quan

Hệ thống đã được nâng cấp với các tính năng:
- ✅ Quản lý User Profile (phones, addresses)
- ✅ Checkout với lựa chọn địa chỉ và payment method
- ✅ Shipper Interface với realtime order tracking
- ✅ Order Tracking với Stepper UI
- ✅ Realtime Updates qua WebSocket + PostgreSQL NOTIFY
- ✅ Admin Revenue Management

---

## 🗄️ BƯỚC 1: CẬP NHẬT DATABASE

### Chạy Migrations

**Option 1: Tự động (Recommended)**
```bash
cd c:\NONGSAN\backend
npm install ws
node run-migrations.js
```

**Option 2: Thủ công**
```bash
cd c:\NONGSAN\database\migrations

# Run với psql
psql -U postgres -d nong_san_db -f 001_add_user_phones_and_updated_order_status.sql
psql -U postgres -d nong_san_db -f 002_add_helper_functions.sql
```

**Option 3: pgAdmin**
1. Mở pgAdmin
2. Connect to `nong_san_db`
3. Open Query Tool
4. Copy/paste nội dung từ file SQL
5. Execute (F5)

### Verify Migrations

```sql
-- Check tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'agri' 
  AND table_name IN ('user_phones', 'order_status_history', 'revenue_records');

-- Check SHIPPER role exists
SELECT unnest(enum_range(NULL::agri.user_role));

-- Should show: ADMIN, STAFF, SHIPPER, CUSTOMER

-- Check new order statuses
SELECT unnest(enum_range(NULL::agri.order_status));

-- Should show: PENDING, PROCESSING, SHIPPING, DRIVER_ARRIVED, DELIVERED, FAILED, etc.
```

---

## 🔧 BƯỚC 2: CÀI ĐẶT DEPENDENCIES

### Backend

```bash
cd c:\NONGSAN\backend
npm install ws
npm install
```

### Frontend

```bash
cd c:\NONGSAN\frontend
npm install
```

---

## 🎯 BƯỚC 3: TẠO TÀI KHOẢN SHIPPER (QUAN TRỌNG!)

Để test được tính năng shipper, cần tạo tài khoản có role SHIPPER:

```sql
-- Run trong pgAdmin hoặc psql
INSERT INTO agri.accounts (email, phone, full_name, password_hash, role)
VALUES (
  'shipper@example.com',
  '0912345678',
  'Shipper Nguyen Van A',
  '$2a$10$K./q9BXadvOC86OxIhGAbO3x6Wjqzs0pftITCgeUjjN09mQeA7ia2',  -- password: 123456
  'SHIPPER'
);
```

---

## 🚀 BƯỚC 4: KHỞI ĐỘNG HỆ THỐNG

### Terminal 1 - Backend
```bash
cd c:\NONGSAN\backend
npm run dev
```

**Kiểm tra log phải thấy:**
```
✅ Database connection successful
🚀 Server is running on port 5000
📡 API available at http://localhost:5000/api
🔌 WebSocket available at ws://localhost:5000/ws
🔌 WebSocket server initialized
📡 PostgreSQL LISTEN client connected
```

### Terminal 2 - Frontend
```bash
cd c:\NONGSAN\frontend
npm run dev
```

---

## 📊 BACKEND APIs ĐÃ IMPLEMENT

### 1️⃣ User Profile Management

#### Get Profile
```http
GET /api/user/profile
Authorization: Bearer <token>
```

#### Update Profile
```http
PUT /api/user/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "full_name": "Nguyen Van A",
  "phone": "0909123456"
}
```

### 2️⃣ User Phones Management

#### Get All Phones
```http
GET /api/user/phones
Authorization: Bearer <token>
```

#### Add Phone
```http
POST /api/user/phones
Authorization: Bearer <token>
Content-Type: application/json

{
  "phone": "0909123456",
  "label": "Home",
  "is_default": true
}
```

#### Update Phone
```http
PUT /api/user/phones/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "phone": "0909999999",
  "label": "Work",
  "is_default": false
}
```

#### Delete Phone
```http
DELETE /api/user/phones/:id
Authorization: Bearer <token>
```

### 3️⃣ User Addresses Management

#### Get All Addresses
```http
GET /api/user/addresses
Authorization: Bearer <token>
```

#### Add Address
```http
POST /api/user/addresses
Authorization: Bearer <token>
Content-Type: application/json

{
  "label": "Home",
  "recipient": "Nguyen Van A",
  "phone": "0909123456",
  "line1": "123 Nguyen Trai",
  "line2": "Apartment 4B",
  "ward": "Ward 1",
  "district": "District 5",
  "city": "Ho Chi Minh",
  "country": "VN",
  "is_default": true
}
```

#### Update Address
```http
PUT /api/user/addresses/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "label": "Office",
  "recipient": "Nguyen Van A",
  ...
}
```

#### Delete Address
```http
DELETE /api/user/addresses/:id
Authorization: Bearer <token>
```

### 4️⃣ Checkout & Order Creation

#### Create Order from Cart
```http
POST /api/checkout
Authorization: Bearer <token>
Content-Type: application/json

{
  "address_id": "uuid-of-address",
  "payment_method": "COD",  // or "BANK_TRANSFER"
  "note": "Giao giờ hành chính"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "order-uuid",
    "order_code": "ORD-20251023-1234",
    "status": "PENDING",
    "payment_status": "UNPAID",
    "payment_method": "COD",
    "grand_total": 500000,
    "shipping_recipient": "Nguyen Van A",
    "shipping_phone": "0909123456",
    "shipping_address": "123 Nguyen Trai, Ward 1, District 5, Ho Chi Minh",
    "items": [...]
  }
}
```

#### Get Order Detail
```http
GET /api/checkout/:order_id
Authorization: Bearer <token>
```

### 5️⃣ Shipper APIs

#### Get Available Orders (for shipper)
```http
GET /api/shipper/orders
Authorization: Bearer <shipper-token>
```

#### Start Delivery
```http
POST /api/shipper/start-delivery
Authorization: Bearer <shipper-token>
Content-Type: application/json

{
  "order_id": "uuid-of-order"
}
```

**This will:**
- Assign order to shipper
- Change status to `SHIPPING`
- Trigger realtime notification to customer

#### Update Order Status
```http
POST /api/shipper/update-status
Authorization: Bearer <shipper-token>
Content-Type: application/json

{
  "order_id": "uuid-of-order",
  "status": "DRIVER_ARRIVED"  // or "DELIVERED", "FAILED"
}
```

**Valid transitions:**
- `SHIPPING` → `DRIVER_ARRIVED` or `FAILED`
- `DRIVER_ARRIVED` → `DELIVERED` or `FAILED`

#### Get Delivery History
```http
GET /api/shipper/history
Authorization: Bearer <shipper-token>
```

#### Get Statistics
```http
GET /api/shipper/stats
Authorization: Bearer <shipper-token>
```

---

## 🔌 WEBSOCKET REALTIME

### Connect to WebSocket

```javascript
const ws = new WebSocket('ws://localhost:5000/ws');

// Authenticate
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: '<your-jwt-token>'
  }));
};

// Receive messages
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'auth_success') {
    console.log('Authenticated!');
  }
  
  if (message.type === 'order_status_update') {
    console.log('Order status changed:', message.data);
    // Update UI here
  }
  
  if (message.type === 'new_order') {
    console.log('New order created:', message.data);
    // Show notification to shipper
  }
};
```

### Message Types

**1. Authentication Success**
```json
{
  "type": "auth_success",
  "message": "Authenticated",
  "userId": "user-uuid",
  "role": "CUSTOMER"
}
```

**2. Order Status Update**
```json
{
  "type": "order_status_update",
  "data": {
    "order_id": "uuid",
    "order_code": "ORD-20251023-1234",
    "old_status": "SHIPPING",
    "new_status": "DRIVER_ARRIVED",
    "timestamp": "2025-10-23T09:30:00Z"
  }
}
```

**3. New Order (for shippers)**
```json
{
  "type": "new_order",
  "data": {
    "order_id": "uuid",
    "order_code": "ORD-20251023-1234",
    "status": "PENDING",
    "grand_total": 500000,
    "timestamp": "2025-10-23T09:30:00Z"
  }
}
```

---

## 📱 FRONTEND COMPONENTS CẦN IMPLEMENT

### Priority 1: MUST HAVE

1. **User Profile Page** (`frontend/src/pages/customer/Profile.jsx`)
   - Edit name, phone
   - Manage multiple phones (list, add, edit, delete)
   - Manage multiple addresses (list, add, edit, delete)
   - Set default phone/address

2. **Checkout Page** (`frontend/src/pages/customer/Checkout.jsx`)
   - Display cart items
   - Select shipping address from saved addresses
   - Select payment method (COD / Bank Transfer)
   - Add order note
   - Submit order

3. **Order Tracking Page** (`frontend/src/pages/customer/OrderTracking.jsx`)
   - Display order with Stepper UI
   - Statuses: Pending → Processing → Shipping → Driver Arrived → Delivered
   - Realtime updates via WebSocket
   - Show status history

4. **Shipper Dashboard** (`frontend/src/pages/shipper/Dashboard.jsx`)
   - List available orders
   - Swipe to start delivery
   - Button: "Đã đến nơi" → Update to DRIVER_ARRIVED
   - Button: "Giao thành công" → Update to DELIVERED
   - Button: "Hủy" → Update to FAILED
   - Realtime new orders notification

### Priority 2: NICE TO HAVE

5. **Admin Revenue Management**
6. **Shipper Statistics Dashboard**
7. **Push Notifications**

---

## 🎨 UI COMPONENTS NEEDED

### Stepper Component (Order Status)
```jsx
const steps = [
  { label: 'Đặt hàng thành công', status: 'PENDING' },
  { label: 'Đang xử lý', status: 'PROCESSING' },
  { label: 'Đang giao hàng', status: 'SHIPPING' },
  { label: 'Tài xế đã đến', status: 'DRIVER_ARRIVED' },
  { label: 'Giao thành công', status: 'DELIVERED' }
];
```

### Swipe Component (Shipper)
```jsx
<SwipeableCard
  onSwipeRight={() => startDelivery(order.id)}
  rightAction="Bắt đầu giao"
>
  <OrderCard order={order} />
</SwipeableCard>
```

---

## 🧪 TESTING WORKFLOW

### Test Case 1: User Profile Management

1. Login as customer: `khach@example.com / 123456`
2. Navigate to Profile
3. Add new phone: `0909111222` with label "Home"
4. Add new address with full details
5. Set as default
6. Verify saved in database

### Test Case 2: Checkout Flow

1. Login as customer
2. Add products to cart
3. Go to Checkout
4. Select saved address
5. Select payment method: COD
6. Add note: "Giao buổi chiều"
7. Submit order
8. **Check:** Order status = PENDING
9. **Check:** WebSocket notifies Admin & Shippers

### Test Case 3: Shipper Workflow

1. Login as shipper: `shipper@example.com / 123456`
2. See new order in realtime (no F5 needed)
3. Swipe right to start delivery
4. **Check:** Order status → SHIPPING
5. **Check:** Customer receives realtime update
6. Click "Đã đến nơi"
7. **Check:** Order status → DRIVER_ARRIVED
8. Click "Giao thành công"
9. **Check:** Order status → DELIVERED

### Test Case 4: Realtime Updates

1. Open 3 browsers:
   - Browser A: Customer logged in
   - Browser B: Shipper logged in
   - Browser C: Admin logged in
2. Customer creates order in Browser A
3. **Verify:** Browser B (shipper) sees new order instantly
4. **Verify:** Browser C (admin) sees new order instantly
5. Shipper updates status in Browser B
6. **Verify:** Browser A (customer) sees status update instantly
7. **Verify:** Browser C (admin) sees status update instantly

---

## 🐛 TROUBLESHOOTING

### WebSocket không connect?

**Check backend log:**
```
🔌 WebSocket server initialized
📡 PostgreSQL LISTEN client connected
```

**Test WebSocket:**
```bash
# Dùng wscat (install: npm install -g wscat)
wscat -c ws://localhost:5000/ws

# Send auth message
{"type":"auth","token":"<your-token>"}
```

### Database triggers không hoạt động?

**Check triggers exist:**
```sql
SELECT tgname, tgtype 
FROM pg_trigger 
WHERE tgrelid = 'agri.orders'::regclass;
```

**Test manual trigger:**
```sql
-- Update order status manually
UPDATE agri.orders 
SET status = 'SHIPPING' 
WHERE order_code = 'ORD-20251023-1234';

-- Should see notification in backend log
```

### Order status không update?

**Check function exists:**
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'agri' 
  AND routine_name = 'update_order_status';
```

**Test function:**
```sql
SELECT agri.update_order_status(
  '<order-id>'::uuid,
  'SHIPPING'::agri.order_status,
  '<user-id>'::uuid
);
```

---

## 📚 DATABASE SCHEMA REFERENCE

### New Tables

**`agri.user_phones`**
- Stores multiple phones per user
- Has `is_default` flag

**`agri.order_status_history`**
- Tracks all status changes
- Includes `changed_by` user reference

**`agri.revenue_records`**
- Tracks confirmed revenue
- Linked to delivered orders

### Updated Tables

**`agri.orders`**
- Added: `shipper_id`
- Added: `payment_method`
- Added: `shipping_phone`, `shipping_address`, `shipping_recipient`

### New Enums

**`agri.order_status`**
- PENDING, PROCESSING, SHIPPING, DRIVER_ARRIVED, DELIVERED, FAILED, CANCELLED, RETURN_REQUESTED, RETURNED

**`agri.user_role`**
- ADMIN, STAFF, SHIPPER, CUSTOMER

**`agri.payment_method`**
- COD, BANK_TRANSFER

### PostgreSQL Functions

- `agri.create_order_from_cart()` - Creates order from cart
- `agri.assign_shipper_to_order()` - Assigns shipper
- `agri.update_order_status()` - Updates status with validation
- `agri.confirm_order_revenue()` - Confirms revenue (admin)

---

## ✅ CHECKLIST HOÀN THÀNH

### Backend
- [x] Database migrations
- [x] User profile APIs
- [x] Checkout APIs
- [x] Shipper APIs
- [x] WebSocket server
- [x] PostgreSQL NOTIFY/LISTEN
- [x] Realtime order tracking

### Frontend (CẦN IMPLEMENT)
- [ ] User Profile page
- [ ] Checkout page
- [ ] Order Tracking với Stepper UI
- [ ] Shipper Dashboard
- [ ] WebSocket client connection
- [ ] Realtime UI updates

### Database
- [x] User phones table
- [x] Order status history
- [x] Revenue records
- [x] Updated order statuses
- [x] SHIPPER role
- [x] Triggers & Functions

---

## 🎯 NEXT STEPS

1. **Run migrations** (QUAN TRỌNG!)
2. **Create shipper account**
3. **Install `ws` package** in backend
4. **Test backend APIs** with Postman
5. **Implement frontend components**
6. **Test realtime updates**

**Backend đã sẵn sàng 100%! Frontend cần implement theo hướng dẫn trên.**

---

## 📞 Support

Nếu gặp vấn đề:
1. Check backend log
2. Check database with queries ở trên
3. Test APIs với Postman
4. Check WebSocket connection với wscat

**Chúc bạn triển khai thành công! 🚀**
