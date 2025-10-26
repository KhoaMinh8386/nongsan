# 🔧 HỆ THỐNG NÔNG SẢN - RÀ SOÁT & SỬA LỖI

## ✅ 1. ĐỔI TRẢ (RETURNS) - HOÀN THÀNH

### ❌ Vấn đề:
- Duyệt yêu cầu đổi trả bị lỗi 500
- Stored procedure `duyet_doi_tra` fails khi UPDATE inventory

### ✅ Nguyên nhân:
- Function chỉ UPDATE inventory nhưng không INSERT nếu chưa có record
- Một số products chưa có record trong bảng `inventory`

### ✅ Giải pháp:
**File:** `database/fix_return_approval.sql`

```sql
-- Dùng UPSERT (INSERT ON CONFLICT)
INSERT INTO agri.inventory (product_id, stock_qty, reserved_qty, updated_at)
VALUES (r.product_id, r.qty, 0, NOW())
ON CONFLICT (product_id) DO UPDATE
SET 
  stock_qty = agri.inventory.stock_qty + EXCLUDED.stock_qty,
  updated_at = NOW();
```

### ✅ Cách chạy:
```bash
psql -U postgres -d nongsan -f c:\NONGSAN\database\fix_return_approval.sql
```

### ✅ Verify:
```sql
-- Test function
SELECT agri.duyet_doi_tra('return-id-here');

-- Check inventory updated
SELECT * FROM agri.inventory WHERE product_id = 'product-id';
```

---

## 🔄 2. QUẢN LÝ SẢN PHẨM (ADMIN) - CẦN SỬA

### Yêu cầu:
1. ✅ Thêm nút "Chi tiết sản phẩm"
2. ✅ Dropdown danh mục từ backend (real data)
3. ✅ Dropdown thương hiệu từ backend (real data)
4. ✅ Cập nhật DB đúng khi sửa

### Files cần sửa:
- `frontend/src/pages/admin/ProductManagement.jsx` - Thêm chi tiết & dropdowns
- `frontend/src/services/productService.js` - Thêm API get categories/brands
- `backend/src/controllers/productController.js` - Thêm categories/brands endpoints

### API cần thêm:
```javascript
GET /api/products/:id/detail  // Chi tiết đầy đủ
GET /api/categories            // List categories
GET /api/brands                // List brands (suppliers)
PUT /api/products/:id          // Update với category_id, supplier_id
```

---

## 🔍 3. TÌM KIẾM SẢN PHẨM (KHÁCH HÀNG) - CẦN SỬA

### Yêu cầu:
- Thanh tìm kiếm sản phẩm chưa hoạt động
- Tìm theo: tên sản phẩm, thương hiệu, danh mục

### Files cần sửa:
- `frontend/src/pages/customer/Products.jsx` hoặc `Shop.jsx`
- `backend/src/services/productService.js` - Thêm search logic

### API cần update:
```javascript
GET /api/products?search=query
// Backend query:
WHERE (p.name ILIKE '%query%' 
   OR c.name ILIKE '%query%' 
   OR s.name ILIKE '%query%')
```

---

## ➕ 4. QUẢN LÝ DANH MỤC (ADMIN) - CẦN TẠO MỚI

### Yêu cầu:
- Trang quản lý danh mục: CRUD operations
- Chi tiết danh mục → hiển thị products thuộc danh mục

### Files cần tạo:
```
frontend/src/pages/admin/CategoryManagement.jsx  (NEW)
backend/src/routes/category.routes.js             (NEW)
backend/src/controllers/categoryController.js     (NEW)
backend/src/services/categoryService.js           (NEW)
```

### APIs cần tạo:
```javascript
GET    /api/categories              // List all
POST   /api/categories              // Create
GET    /api/categories/:id          // Get detail
PUT    /api/categories/:id          // Update
DELETE /api/categories/:id          // Delete
GET    /api/categories/:id/products // Products trong category
```

### Database:
```sql
-- Table đã có
CREATE TABLE agri.categories (
    id uuid PRIMARY KEY,
    name VARCHAR(100),
    slug VARCHAR(120),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);
```

---

## 🚚 5. DASHBOARD SHIPPER - CẦN SỬA

### ❌ Vấn đề:
- Bấm "Nhận đơn" nhưng đơn không chuyển tab
- Đơn không biến mất khỏi "Đơn hàng mới"
- Không update real-time

### ✅ Files cần check:
- `frontend/src/pages/shipper/ShipperDashboard.jsx`
- `backend/src/services/shipperService.js` - Function `startDelivery`
- `backend/src/controllers/shipperController.js`

### Logic đúng:
```javascript
// Frontend: Gọi API nhận đơn
POST /api/shipper/orders/:orderId/accept

// Backend: startDelivery
1. Assign shipper to order
2. Update order.status = 'SHIPPING'
3. Update order.shipper_id = shipperId
4. Emit WebSocket event 'order_assigned'
5. Return updated order

// Frontend: 
1. Remove order from "Đơn hàng mới"
2. Add order to "Đơn đang giao"
3. Refresh stats
```

### WebSocket check:
```javascript
// Socket event listener
socket.on('order_assigned', (data) => {
  // Update UI
  // Move order between tabs
});
```

---

## 📋 EXECUTION PLAN

### Phase 1: Critical Fixes (Ưu tiên cao)
1. ✅ Fix đổi trả stored procedure → Chạy SQL
2. 🔄 Fix shipper nhận đơn → Check logic & WebSocket
3. 🔄 Fix tìm kiếm sản phẩm → Update query

### Phase 2: Feature Enhancements
4. 🔄 Quản lý sản phẩm → Thêm chi tiết & dropdowns
5. 🔄 Tạo quản lý danh mục → New page + APIs

---

## 🚀 CÁCH TRIỂN KHAI

### Bước 1: Run Database Fix
```bash
cd c:\NONGSAN\database
psql -U postgres -d nongsan -f fix_return_approval.sql
```

### Bước 2: Restart Backend
```bash
cd c:\NONGSAN\backend
npm run dev
```

### Bước 3: Test Đổi Trả
- Login admin
- Vào "Quản lý đổi trả"
- Duyệt một return request
- Verify: Status = COMPLETED, inventory updated

### Bước 4: Fix Shipper (Tiếp theo)
- Check file ShipperDashboard.jsx
- Verify API call
- Check WebSocket connection
- Test nhận đơn

### Bước 5: Implement Features
- Product management enhancements
- Category management
- Search functionality

---

## 📊 PROGRESS TRACKING

- [x] 1. Đổi trả - Fix stored procedure
- [ ] 2. Quản lý sản phẩm - Chi tiết & dropdowns
- [ ] 3. Tìm kiếm sản phẩm - Enable search
- [ ] 4. Quản lý danh mục - Create new page
- [ ] 5. Dashboard shipper - Fix nhận đơn

---

## 🐛 DEBUGGING TIPS

### Đổi trả 500 error:
```sql
-- Check inventory có record không
SELECT p.id, p.name, i.stock_qty
FROM agri.products p
LEFT JOIN agri.inventory i ON i.product_id = p.id
WHERE i.product_id IS NULL;

-- Nếu missing → tạo records
INSERT INTO agri.inventory (product_id, stock_qty, reserved_qty)
SELECT id, 0, 0 FROM agri.products
WHERE id NOT IN (SELECT product_id FROM agri.inventory);
```

### Shipper không nhận được đơn:
```javascript
// Check API response
console.log('Accept order response:', response);

// Check WebSocket connected
console.log('Socket connected:', socket.connected);

// Check order moved
console.log('New orders:', newOrders);
console.log('Delivering orders:', deliveringOrders);
```

### Search không hoạt động:
```javascript
// Check query params
console.log('Search term:', searchTerm);
console.log('API URL:', `/api/products?search=${searchTerm}`);

// Backend: Check SQL query
console.log('Search query:', query);
```

---

**🎯 BẮT ĐẦU VỚI FIX ĐỔI TRẢ - CHẠY SQL FILE NGAY!**
