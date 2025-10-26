# 🧪 HƯỚNG DẪN TEST TOÀN DIỆN - NONGSAN

## 🚀 CHUẨN BỊ TRƯỚC KHI TEST

### 1. Start Backend
```bash
cd backend
npm install  # Nếu chưa install
npm run dev

# Backend chạy tại: http://localhost:5000
# WebSocket: ws://localhost:5000/ws
```

### 2. Start Frontend
```bash
cd frontend
npm install  # Nếu chưa install
npm run dev

# Frontend chạy tại: http://localhost:5173
```

### 3. Mở DevTools Console
- Press F12
- Chuyển sang tab "Console"
- Theo dõi WebSocket logs và API calls

---

## 📝 TEST CASES CHI TIẾT

### ✅ TEST 1: PRODUCT MANAGEMENT (Admin)

**Mục tiêu:** Kiểm tra thêm/sửa/xóa sản phẩm và refresh danh sách

**Bước thực hiện:**

1. **Login as Admin:**
   ```
   Email: admin@example.com
   Password: (password của admin)
   ```

2. **Vào Product Management:**
   - URL: http://localhost:5173/admin/products
   - Kiểm tra: Danh sách sản phẩm hiển thị (3 sản phẩm như trong ảnh)

3. **Thêm sản phẩm mới:**
   - Click "Thêm sản phẩm mới"
   - Điền form:
     * SKU: `TEST-001`
     * Tên: `Sản phẩm test`
     * Slug: `san-pham-test` (hoặc để trống, auto-generate)
     * Đơn vị: `KG`
     * Giá bán: `50000`
     * Giá vốn: `40000`
     * Thuế: `8`
     * Giảm giá: `0`
   - Click "Tạo sản phẩm"

4. **✅ Kiểm tra:**
   - [ ] Alert "Tạo sản phẩm thành công!"
   - [ ] Modal đóng lại
   - [ ] **Danh sách tự động refresh** - Sản phẩm mới xuất hiện
   - [ ] Console không có error

5. **Upload ảnh:**
   - Click "Sửa" sản phẩm vừa tạo
   - Scroll xuống "Quản lý hình ảnh"
   - **Test A: Upload từ máy**
     * Click "Upload ảnh từ máy"
     * Chọn file JPG/PNG < 5MB
     * Kiểm tra: Ảnh hiển thị trong grid
   - **Test B: Nhập URL**
     * Nhập URL: `https://picsum.photos/400/300`
     * Check "Đặt làm ảnh chính"
     * Click "Thêm URL"
     * Kiểm tra: Ảnh hiển thị với star icon "Chính"

6. **Xóa sản phẩm:**
   - Click icon "Trash" trên sản phẩm test
   - Confirm
   - **✅ Kiểm tra:** Sản phẩm biến mất khỏi danh sách

---

### ✅ TEST 2: ORDER MANAGEMENT (Admin)

**Mục tiêu:** Kiểm tra hiển thị danh sách và thay đổi trạng thái đơn hàng

**Bước thực hiện:**

1. **Login as Admin** (nếu chưa)

2. **Vào Order Management:**
   - URL: http://localhost:5173/admin/orders
   - **✅ Kiểm tra trước:**
     * [ ] Danh sách hiển thị đơn hàng (KHÔNG phải "Không có đơn hàng nào")
     * [ ] Hiển thị: Mã đơn, Khách hàng, Tổng tiền, Trạng thái, Thanh toán, Ngày tạo
     * [ ] WebSocket indicator hiển thị "Realtime" (màu xanh)

3. **Test Filter:**
   - Click dropdown filter
   - Chọn "PENDING" → Chỉ hiển thị đơn chờ xử lý
   - Chọn "SHIPPING" → Chỉ hiển thị đơn đang giao
   - Chọn "Tất cả trạng thái" → Hiển thị tất cả

4. **Xem chi tiết đơn hàng:**
   - Click icon "Eye" trên bất kỳ đơn hàng nào
   - **✅ Kiểm tra Modal:**
     * [ ] Thông tin khách hàng: Tên, Email, SĐT
     * [ ] Địa chỉ giao hàng đầy đủ
     * [ ] Danh sách sản phẩm với qty + giá
     * [ ] Tổng cộng: Subtotal, Phí ship, Thuế, Giảm giá, Grand Total
     * [ ] Nút "Thay đổi trạng thái" (nếu có transitions)

5. **Thay đổi trạng thái:**
   - Nếu đơn hàng có status = PENDING:
     * Click "Thay đổi trạng thái"
     * Chọn "PROCESSING"
     * Confirm
     * **✅ Kiểm tra:**
       - [ ] Alert "Cập nhật thành công"
       - [ ] Danh sách refresh
       - [ ] Status badge đổi màu
       - [ ] Console không có error

---

### ✅ TEST 3: SHIPPER DASHBOARD

**Mục tiêu:** Kiểm tra logic "Nhận đơn" và chuyển tab

**Bước thực hiện:**

1. **Logout Admin, Login as Shipper:**
   ```
   Email: shipper@example.com
   Password: (password của shipper)
   ```

2. **Vào Shipper Dashboard:**
   - URL: http://localhost:5173/shipper
   - **✅ Kiểm tra:**
     * [ ] Stats cards: Đang giao, Đã giao, Thất bại, Tổng thu
     * [ ] Tab "Đơn hàng mới" (1) - Hiển thị đơn PENDING chưa có shipper
     * [ ] Tab "Đơn đang giao" (1) - Hiển thị đơn shipper đã nhận
     * [ ] WebSocket: "Realtime Active" (màu xanh)

3. **Test "Nhận đơn":**
   - Tab "Đơn hàng mới"
   - Click "Nhận đơn" trên một đơn hàng
   - Confirm "Bạn muốn nhận đơn hàng này?"
   - **✅ Kiểm tra (QUAN TRỌNG):**
     * [ ] Alert "Đã nhận đơn hàng thành công!"
     * [ ] Đơn hàng **BIẾN MẤT** khỏi tab "Đơn hàng mới"
     * [ ] Đơn hàng **XUẤT HIỆN** trong tab "Đơn đang giao"
     * [ ] Console: `✅ WebSocket authenticated`, không có error

4. **Test trong tab "Đơn đang giao":**
   - Click "Chi tiết" → Modal hiển thị đầy đủ thông tin
   - Click "Đã đến nơi"
   - **✅ Kiểm tra:**
     * [ ] Dropdown hiển thị: "Giao thành công", "Giao thất bại"
   
5. **Test "Giao thành công":**
   - Chọn "Giao thành công" từ dropdown
   - Confirm
   - **✅ Kiểm tra:**
     * [ ] Alert "Cập nhật thành công"
     * [ ] Đơn chuyển sang "Lịch sử"
     * [ ] Check database: `payment_status = 'PAID'`

---

### ✅ TEST 4: CUSTOMER ORDER FLOW

**Mục tiêu:** Test toàn bộ luồng từ đặt hàng → nhận hàng → đổi trả

**Bước thực hiện:**

1. **Logout, Login as Customer:**
   ```
   Email: customer@example.com
   Password: (password)
   ```

2. **Đặt hàng mới:**
   - Vào /products → Chọn sản phẩm → Add to cart
   - Vào /cart → Click "Thanh toán"
   - Điền địa chỉ giao hàng (hoặc chọn có sẵn)
   - Click "Đặt hàng"
   - **✅ Kiểm tra:**
     * [ ] Alert "Đặt hàng thành công"
     * [ ] Redirect về /orders
     * [ ] Đơn mới xuất hiện trong danh sách

3. **Kiểm tra WebSocket realtime:**
   - **Mở 2 trình duyệt:**
     * Browser 1: Login as Shipper
     * Browser 2: Login as Customer (vừa đặt hàng)
   
   - Browser 1 (Shipper):
     * Vào Dashboard
     * **✅ Kiểm tra:** Toast notification "Có đơn hàng mới!" xuất hiện
     * **✅ Kiểm tra:** Đơn mới hiển thị trong "Đơn hàng mới"
   
   - Browser 2 (Customer):
     * Vào /orders
     * **✅ Kiểm tra:** WebSocket "Realtime" màu xanh

4. **Test realtime update status:**
   - Browser 1 (Shipper): Click "Nhận đơn"
   - Browser 2 (Customer): 
     * **✅ Kiểm tra:** 
       - [ ] Trang tự động refresh (không cần F5)
       - [ ] Notification "Đơn hàng đã được cập nhật"
       - [ ] Progress bar update
       - [ ] Status badge thay đổi

5. **Test Return Request:**
   - Browser 1 (Shipper): Chuyển đơn sang "DELIVERED"
   - Browser 2 (Customer):
     * Click vào đơn hàng → OrderDetail
     * **✅ Kiểm tra:** Nút "Đổi trả hàng" xuất hiện
     * Click "Đổi trả hàng"
     * Chọn sản phẩm cần đổi
     * Nhập lý do: "Hàng bị lỗi"
     * Click "Gửi yêu cầu"
     * **✅ Kiểm tra:**
       - [ ] Alert "Yêu cầu đổi trả đã được gửi thành công"
       - [ ] Modal đóng
       - [ ] Console không có error `/orders/undefined/api/returns`

6. **Test Admin nhận return request:**
   - Browser 3: Login as Admin
   - Vào /admin/returns
   - **✅ Kiểm tra:**
     * [ ] Yêu cầu đổi trả mới xuất hiện (realtime)
     * [ ] Hiển thị: Mã đơn, Khách hàng, Lý do, Số tiền hoàn
     * [ ] Nút "Duyệt" và "Từ chối"

---

### ✅ TEST 5: WEBSOCKET STABILITY

**Mục tiêu:** Đảm bảo WebSocket không disconnect liên tục

**Bước thực hiện:**

1. **Login bất kỳ role nào**

2. **Mở Console (F12)**

3. **Kiểm tra logs:**
   - **✅ ĐÚNG:**
     ```
     🔌 Connecting to WebSocket...
     ✅ WebSocket connected
     ✅ WebSocket authenticated: {...}
     ```
   
   - **❌ SAI (bug cũ):**
     ```
     Disconnecting WebSocket...
     Disconnecting WebSocket...
     Disconnecting WebSocket...
     (lặp lại 50+ lần)
     ```

4. **Test reconnect:**
   - Stop backend (Ctrl+C)
   - **✅ Kiểm tra:**
     * [ ] Console: "🔌 WebSocket disconnected"
     * [ ] UI: WebSocket indicator chuyển sang "Offline" (màu xám)
   
   - Start backend lại (`npm run dev`)
   - **✅ Kiểm tra:**
     * [ ] Console: "Reconnecting in 3s..."
     * [ ] Console: "✅ WebSocket connected"
     * [ ] UI: "Realtime" (màu xanh)

---

## 🔍 DEBUG CHECKLIST

### Nếu Order Management không hiển thị data:

```javascript
// 1. Check API response
// Browser Console → Network tab
// GET /api/orders
// Response: { success: true, data: [...] }

// 2. Check service method exists
console.log(checkoutService.getOrders); // Should be function

// 3. Check frontend calls correctly
// File: frontend/src/pages/admin/OrderManagement.jsx
// Line 36: const response = await checkoutService.getOrders(params);
// Line 37: setOrders(response.data || []);
```

### Nếu WebSocket disconnect liên tục:

```javascript
// 1. Check useWebSocket dependencies
// File: frontend/src/hooks/useWebSocket.js
// Line 128: }, [token, user]); // ✅ ĐÚNG - Chỉ có token và user
// }, [token, user, connect, disconnect]); // ❌ SAI - Gây vòng lặp

// 2. Check token valid
console.log(localStorage.getItem('token')); // Should be JWT string

// 3. Check backend WebSocket
// Backend console should show:
// "✅ Client authenticated: user_id"
// NOT: "❌ WebSocket closed: 1006 - ..."
```

### Nếu Shipper "Nhận đơn" không chuyển tab:

```javascript
// 1. Check API response
// POST /api/shipper/start-delivery
// Response: { success: true, data: {...} }

// 2. Check frontend filter logic
// File: frontend/src/pages/shipper/ShipperDashboard.jsx
// Line 111: const availableOrders = orders.filter(o => !o.shipper_id || ...);
// Line 112: const myActiveOrders = orders.filter(o => o.status === 'SHIPPING' || ...);

// 3. Check database
SELECT id, shipper_id, status FROM agri.orders WHERE id = 'order_id';
// Trước: shipper_id = NULL, status = 'PENDING'
// Sau: shipper_id = 'shipper_id', status = 'SHIPPING'
```

### Nếu Return Request lỗi 404:

```javascript
// 1. Check service import
// File: frontend/src/pages/customer/OrderDetail.jsx
// Line 5: import { returnService } from '../../services/returnService';

// 2. Check API call
// Line 95: await returnService.createReturn(returnData);
// NOT: await fetch(`...`) // ❌ SAI

// 3. Check URL
// Should be: POST https://your-domain/api/returns
// NOT: POST http://localhost:5173/orders/undefined/api/returns
```

---

## 📊 EXPECTED RESULTS SUMMARY

| Test Case | Expected Result | Status |
|-----------|----------------|--------|
| Product - Add new | ✅ Danh sách refresh tự động | ✅ |
| Product - Upload image | ✅ Ảnh hiển thị trong grid | ✅ |
| Order Management - List | ✅ Hiển thị danh sách đơn | ✅ |
| Order Management - Detail | ✅ Modal đầy đủ thông tin | ✅ |
| Order Management - Change status | ✅ Update thành công, refresh | ✅ |
| Shipper - View new orders | ✅ Tab "Đơn hàng mới" có data | ✅ |
| Shipper - Accept order | ✅ Chuyển sang "Đơn đang giao" | ✅ |
| Shipper - Update status | ✅ payment_status auto-update | ✅ |
| Customer - Place order | ✅ Shipper nhận notification realtime | ✅ |
| Customer - View order | ✅ Realtime refresh khi status thay đổi | ✅ |
| Customer - Return request | ✅ Admin nhận notification realtime | ✅ |
| WebSocket - Connection | ✅ Không disconnect liên tục | ✅ |
| WebSocket - Reconnect | ✅ Auto reconnect sau 3s | ✅ |

---

## 🎯 TEST COMPLETION CHECKLIST

- [ ] Tất cả Product Management features hoạt động
- [ ] Admin Order Management hiển thị data và thay đổi status
- [ ] Shipper nhận đơn thành công và chuyển tab
- [ ] Customer đặt hàng → Shipper nhận realtime
- [ ] Customer return request → Admin nhận realtime
- [ ] WebSocket stable, không disconnect spam
- [ ] Tất cả API trả về đúng format
- [ ] Console không có error 404/500
- [ ] Database cập nhật đúng sau mỗi action

---

## 📝 BÁO CÁO BUG (Nếu có)

Nếu phát hiện bug, báo cáo theo format:

```markdown
### Bug: [Tiêu đề ngắn gọn]

**Môi trường:**
- Browser: Chrome 131
- OS: Windows 11
- Backend: Running on localhost:5000
- Frontend: Running on localhost:5173

**Bước tái hiện:**
1. Login as Admin
2. Vào /admin/orders
3. Click "Eye" icon
4. ...

**Kết quả thực tế:**
- Modal không mở
- Console error: "Cannot read property 'id' of undefined"

**Kết quả mong đợi:**
- Modal mở và hiển thị đầy đủ thông tin

**Screenshots:**
[Attach ảnh console error]

**Code liên quan:**
File: frontend/src/pages/admin/OrderManagement.jsx
Line: 50
```

---

## 🎉 KẾT LUẬN

Sau khi hoàn thành tất cả test cases trên:
- ✅ Hệ thống hoạt động đầy đủ
- ✅ Realtime updates ổn định
- ✅ Tất cả APIs trả về đúng
- ✅ UI/UX mượt mà

**Ứng dụng đã sẵn sàng để demo hoặc deploy!** 🚀
