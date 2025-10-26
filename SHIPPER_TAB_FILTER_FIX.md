# ✅ FIX - SHIPPER TAB FILTER LOGIC

## 🎯 YÊU CẦU

### Tab "Đơn hàng mới"
- ✅ Chỉ hiển thị orders với status = **PENDING**
- ✅ Chỉ hiển thị orders **chưa có shipper_id**

### Tab "Đơn đang giao"
- ✅ Hiển thị orders với status = **PROCESSING**, **SHIPPING**, hoặc **DRIVER_ARRIVED**
- ✅ Chỉ hiển thị orders **của shipper hiện tại** (shipper_id = current user)

---

## ✅ ĐÃ SỬA

### File: `frontend/src/pages/shipper/ShipperDashboard.jsx`

#### 1. Thêm import useSelector
```javascript
import { useSelector } from 'react-redux';
```

#### 2. Lấy user info từ Redux store
```javascript
function ShipperDashboard() {
  // ✅ Lấy user info từ Redux store
  const { user } = useSelector((state) => state.auth);
  
  // ... rest of code
}
```

#### 3. Sửa filter logic (Line 128-135)

**TRƯỚC (SAI):**
```javascript
const availableOrders = orders.filter(o => !o.shipper_id || o.status === 'PROCESSING');
const myActiveOrders = orders.filter(o => o.status === 'SHIPPING' || o.status === 'DRIVER_ARRIVED');
```

**SAU (ĐÚNG):**
```javascript
// ✅ Tab "Đơn hàng mới": Chỉ PENDING và chưa có shipper
const availableOrders = orders.filter(o => 
  o.status === 'PENDING' && !o.shipper_id
);

// ✅ Tab "Đơn đang giao": PROCESSING, SHIPPING, DRIVER_ARRIVED của shipper này
const myActiveOrders = orders.filter(o => 
  (o.status === 'PROCESSING' || o.status === 'SHIPPING' || o.status === 'DRIVER_ARRIVED') 
  && o.shipper_id === user?.id
);
```

---

## 📊 LOGIC FLOW

### Khi đơn hàng được tạo
```
Status: PENDING
Shipper_id: NULL
→ Hiển thị ở tab "Đơn hàng mới"
```

### Khi shipper bấm "Nhận đơn"
```
Status: PENDING → PROCESSING (hoặc SHIPPING)
Shipper_id: NULL → shipper_id
→ Biến mất khỏi tab "Đơn hàng mới"
→ Xuất hiện ở tab "Đơn đang giao"
```

### Khi shipper đang giao
```
Status: SHIPPING
Shipper_id: current_shipper_id
→ Hiển thị ở tab "Đơn đang giao"
```

### Khi shipper đến nơi
```
Status: DRIVER_ARRIVED
Shipper_id: current_shipper_id
→ Vẫn ở tab "Đơn đang giao"
```

### Khi hoàn thành
```
Status: COMPLETED
→ Chuyển sang tab "Lịch sử"
```

---

## 🔍 SO SÁNH

| Trạng thái | Tab hiển thị | Điều kiện |
|------------|-------------|-----------|
| PENDING | Đơn hàng mới | `!shipper_id` |
| PROCESSING | Đơn đang giao | `shipper_id === current_user` |
| SHIPPING | Đơn đang giao | `shipper_id === current_user` |
| DRIVER_ARRIVED | Đơn đang giao | `shipper_id === current_user` |
| COMPLETED | Lịch sử | `shipper_id === current_user` |
| CANCELLED | Lịch sử | - |

---

## ✅ VERIFY

### Test Case 1: Tab "Đơn hàng mới"
1. Login shipper
2. Vào Dashboard
3. Tab "Đơn hàng mới"

**Expected:**
- ✅ Chỉ thấy đơn status = PENDING
- ✅ Không có shipper_id
- ✅ Badge hiển thị "Chờ xử lý"

### Test Case 2: Nhận đơn
1. Click "Nhận đơn" ở một đơn PENDING
2. Confirm

**Expected:**
- ✅ Đơn biến mất khỏi tab "Đơn hàng mới"
- ✅ Tự động chuyển sang tab "Đơn đang giao"
- ✅ Đơn xuất hiện ở tab "Đơn đang giao"
- ✅ Status chuyển thành PROCESSING hoặc SHIPPING

### Test Case 3: Tab "Đơn đang giao"
1. Click tab "Đơn đang giao"

**Expected:**
- ✅ Thấy đơn status = PROCESSING/SHIPPING/DRIVER_ARRIVED
- ✅ Tất cả đều có shipper_id = current user
- ✅ Không thấy đơn PENDING
- ✅ Không thấy đơn của shipper khác

### Test Case 4: Multi-shipper
1. Login shipper A → nhận đơn #1
2. Logout, login shipper B
3. Vào Dashboard

**Expected:**
- ✅ Shipper B KHÔNG thấy đơn #1 ở tab "Đơn đang giao"
- ✅ Shipper B chỉ thấy đơn của mình

---

## 🐛 TROUBLESHOOTING

### Vấn đề 1: Tab "Đơn hàng mới" vẫn hiển thị đơn PROCESSING
**Nguyên nhân:** Filter sai logic

**Fix:** Đã sửa thành `o.status === 'PENDING' && !o.shipper_id`

---

### Vấn đề 2: Tab "Đơn đang giao" hiển thị đơn của shipper khác
**Nguyên nhân:** Không filter theo shipper_id

**Fix:** Thêm condition `&& o.shipper_id === user?.id`

---

### Vấn đề 3: Sau khi nhận đơn, phải refresh mới thấy
**Nguyên nhân:** Không refresh data

**Fix:** Đã có trong `handleAcceptOrder`:
```javascript
await fetchNewOrders();
await fetchDeliveringOrders();
await fetchStats();
setActiveTab('myOrders'); // Tự động chuyển tab
```

---

### Vấn đề 4: user?.id undefined
**Nguyên nhân:** Chưa import useSelector

**Fix:** Đã thêm:
```javascript
import { useSelector } from 'react-redux';
const { user } = useSelector((state) => state.auth);
```

---

## 🎯 KẾT QUẢ

Sau khi fix:

✅ **Tab "Đơn hàng mới":**
- Chỉ PENDING
- Chưa có shipper

✅ **Tab "Đơn đang giao":**
- PROCESSING/SHIPPING/DRIVER_ARRIVED
- Của shipper hiện tại

✅ **Nhận đơn:**
- Chuyển tab tự động
- Refresh data ngay

✅ **Multi-shipper:**
- Mỗi shipper chỉ thấy đơn của mình

---

## 📝 BACKEND STATUS FLOW

Khi shipper nhận đơn, backend stored procedure `assign_shipper_to_order` sẽ:

```sql
-- Pseudo code
UPDATE orders 
SET 
  shipper_id = $shipper_id,
  status = 'PROCESSING' (hoặc 'SHIPPING'),
  updated_at = NOW()
WHERE id = $order_id;
```

**→ Đơn tự động chuyển từ PENDING sang PROCESSING/SHIPPING**

---

## 🚀 TESTING

### Quick Test
```bash
# Terminal 1: Backend
cd c:\NONGSAN\backend
npm run dev

# Terminal 2: Frontend
cd c:\NONGSAN\frontend
npm run dev

# Browser: http://localhost:5173/shipper/login
```

### Test Scenarios
1. ✅ Login shipper → tab "Đơn hàng mới" chỉ có PENDING
2. ✅ Nhận đơn → chuyển tab tự động
3. ✅ Tab "Đơn đang giao" chỉ có đơn của mình
4. ✅ Logout → login shipper khác → không thấy đơn cũ

---

**HOÀN THÀNH!** ✅
