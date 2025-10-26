# 🔧 FIX - TAB "ĐƠN ĐANG GIAO" EMPTY

## ❌ VẤN ĐỀ

Tab "Đơn đang giao" hiển thị "Không có đơn hàng đang giao" dù có orders.

![Empty State](screenshot)

---

## 🔍 NGUYÊN NHÂN

### Backend API thiếu field `shipper_id`

**File:** `backend/src/services/shipperService.js`

**Function:** `getShipperOrders()`

**Vấn đề:**
```javascript
// ❌ TRƯỚC - Thiếu shipper_id
SELECT 
  o.id,
  o.order_code,
  o.customer_id,
  // ❌ THIẾU: o.shipper_id
  o.status,
  o.grand_total,
  ...
FROM agri.orders o
```

**Frontend filter:**
```javascript
// Frontend cần shipper_id để filter
const myActiveOrders = orders.filter(o => 
  (o.status === 'PROCESSING' || o.status === 'SHIPPING' || o.status === 'DRIVER_ARRIVED') 
  && o.shipper_id === user?.id  // ❌ shipper_id = undefined → filter fails
);
```

**Kết quả:** 
- Backend không trả về `shipper_id`
- Frontend filter theo `shipper_id === user?.id` 
- Tất cả orders bị filter out
- Tab "Đơn đang giao" empty

---

## ✅ GIẢI PHÁP

### 1. Backend - Thêm shipper_id vào SELECT

**File:** `backend/src/services/shipperService.js` - Line 10

```javascript
// ✅ SAU - Đã thêm shipper_id
SELECT 
  o.id,
  o.order_code,
  o.customer_id,
  o.shipper_id,          // ✅ THÊM FIELD NÀY
  o.status,
  o.grand_total,
  o.shipping_recipient,
  o.shipping_phone,
  o.shipping_address,
  o.payment_method,
  o.created_at,
  o.updated_at,
  acc.full_name as customer_name
FROM agri.orders o
```

### 2. Frontend - Thêm Debug Logs

**File:** `frontend/src/pages/shipper/ShipperDashboard.jsx` - Line 136-153

```javascript
// ✅ DEBUG: Log để kiểm tra
console.log('🔍 DEBUG Filter:');
console.log('Total orders:', orders.length);
console.log('Current user ID:', user?.id);
console.log('Orders data:', orders);

const myActiveOrders = orders.filter(o => {
  const isCorrectStatus = (o.status === 'PROCESSING' || o.status === 'SHIPPING' || o.status === 'DRIVER_ARRIVED');
  const isMyOrder = o.shipper_id === user?.id;
  
  console.log(`Order ${o.order_code}: status=${o.status}, shipper_id=${o.shipper_id}, user.id=${user?.id}, match=${isCorrectStatus && isMyOrder}`);
  
  return isCorrectStatus && isMyOrder;
});

console.log('My active orders:', myActiveOrders.length);
```

---

## 🚀 CÁCH TRIỂN KHAI

### BƯỚC 1: Restart Backend ⭐ BẮT BUỘC

```bash
cd c:\NONGSAN\backend
# Ctrl+C để stop backend
npm run dev
```

**Chờ logs:**
```
✅ Server running on port 5000
✅ Database connection successful
```

### BƯỚC 2: Restart Frontend

```bash
cd c:\NONGSAN\frontend
# Ctrl+C để stop frontend
npm run dev
```

### BƯỚC 3: Test & Check Console

1. Login shipper: `http://localhost:5173/shipper/login`
2. Vào Dashboard
3. Mở Browser Console (F12)
4. Xem debug logs:

**Expected logs:**
```javascript
🔍 DEBUG Filter:
Total orders: X
Current user ID: "uuid-abc-123"
Orders data: [{...}, {...}]

Order ORD-2025xxx: status=SHIPPING, shipper_id=uuid-abc-123, user.id=uuid-abc-123, match=true ✅
Order ORD-2025yyy: status=PENDING, shipper_id=null, user.id=uuid-abc-123, match=false

My active orders: 1
```

---

## ✅ VERIFY

### Test Case 1: Tab "Đơn hàng mới"
1. Xem tab "Đơn hàng mới"
2. Check console logs

**Expected:**
```
Available orders (PENDING): X
// Chỉ orders với status=PENDING và shipper_id=null
```

### Test Case 2: Tab "Đơn đang giao"
1. Click tab "Đơn đang giao"
2. Check console logs

**Expected:**
```
My active orders: X
// Orders với status=PROCESSING/SHIPPING/DRIVER_ARRIVED và shipper_id=current_user
```

### Test Case 3: Nhận đơn
1. Tab "Đơn hàng mới" → Click "Nhận đơn"
2. Confirm
3. Check console logs

**Expected:**
```
🔍 DEBUG Filter:
Total orders: X
Order ORD-xxx: status=PROCESSING, shipper_id=your-id, user.id=your-id, match=true ✅
My active orders: 1

✅ Toast: "Đã nhận đơn hàng"
✅ Auto switch to "Đơn đang giao" tab
✅ Order appears in list
```

---

## 🐛 TROUBLESHOOTING

### Vấn đề 1: Console log "user.id=undefined"

**Nguyên nhân:** Redux store chưa có user data

**Fix:**
```javascript
// Check Redux state
console.log('Redux auth state:', useSelector(state => state.auth));

// Nếu user = null → chưa login hoặc token expired
// Solution: Logout → Login lại
```

---

### Vấn đề 2: Console log "shipper_id=undefined"

**Nguyên nhân:** Backend chưa restart

**Fix:**
```bash
# Restart backend
cd c:\NONGSAN\backend
npm run dev
```

---

### Vấn đề 3: Console log "match=false" cho tất cả orders

**Nguyên nhân:** shipper_id không khớp với user.id

**Debug:**
```javascript
console.log('Order shipper_id type:', typeof o.shipper_id);
console.log('User ID type:', typeof user?.id);
console.log('Are equal?', o.shipper_id === user?.id);

// Có thể một bên là string, bên kia là UUID
// Fix: So sánh string
return isCorrectStatus && String(o.shipper_id) === String(user?.id);
```

---

### Vấn đề 4: Vẫn empty sau khi restart

**Check database:**
```sql
-- Check có orders với shipper_id không
SELECT 
  order_code, 
  status, 
  shipper_id,
  (SELECT full_name FROM agri.accounts WHERE id = shipper_id) as shipper_name
FROM agri.orders 
WHERE status IN ('PROCESSING', 'SHIPPING', 'DRIVER_ARRIVED')
  AND shipper_id IS NOT NULL;

-- Nếu empty → chưa có shipper nhận đơn nào
-- Solution: Nhận đơn mới từ tab "Đơn hàng mới"
```

---

## 📊 DATA FLOW

### 1. Login Shipper
```
Frontend → Redux store user = {id: "uuid-123", ...}
```

### 2. Load Dashboard
```
Frontend → GET /api/shipper/orders
Backend → SELECT ... o.shipper_id ... FROM orders
Backend → Return [{shipper_id: "uuid-123", ...}]
Frontend → Filter orders
```

### 3. Filter Logic
```javascript
// Tab "Đơn hàng mới"
orders.filter(o => 
  o.status === 'PENDING' && !o.shipper_id
)

// Tab "Đơn đang giao"  
orders.filter(o => 
  (o.status === 'PROCESSING' || o.status === 'SHIPPING' || o.status === 'DRIVER_ARRIVED')
  && o.shipper_id === user?.id
)
```

### 4. Kết quả
```
Tab "Đơn hàng mới": PENDING orders (shipper_id = null)
Tab "Đơn đang giao": PROCESSING/SHIPPING/DRIVER_ARRIVED orders (shipper_id = current user)
```

---

## 📝 SUMMARY

### Root Cause
- ❌ Backend không select `shipper_id` field
- ❌ Frontend filter fail vì `shipper_id = undefined`

### Fix
- ✅ Thêm `o.shipper_id` vào backend SELECT
- ✅ Thêm debug logs để verify

### Action Required
- ⚡ **RESTART BACKEND** (bắt buộc)
- ⚡ **RESTART FRONTEND** 
- ✅ Check console logs
- ✅ Test nhận đơn → chuyển tab

---

## 🎯 EXPECTED RESULT

Sau khi restart:

✅ **Tab "Đơn hàng mới":**
- Hiển thị orders PENDING
- shipper_id = null

✅ **Tab "Đơn đang giao":**
- Hiển thị orders PROCESSING/SHIPPING/DRIVER_ARRIVED
- shipper_id = current user ID
- Không còn empty state

✅ **Console logs:**
- user.id có giá trị
- shipper_id có giá trị (không undefined)
- Filter match = true cho đúng orders

✅ **Nhận đơn:**
- Chuyển tab tự động
- Order xuất hiện ngay
- Console log match = true

---

**RESTART BACKEND NGAY!** 🚀
