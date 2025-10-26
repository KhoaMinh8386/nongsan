# 🚀 RESTART & TEST - HƯỚNG DẪN NHANH

## ✅ CODE ĐÃ ĐƯỢC APPLY TỰ ĐỘNG

Tất cả code từ `FINAL_FIX_SUMMARY.md` đã được apply vào các files:

### Backend (6 files)
- ✅ `backend/src/index.js` - Đã register category routes
- ✅ `backend/src/services/categoryService.js` - **MỚI**
- ✅ `backend/src/controllers/categoryController.js` - **MỚI**
- ✅ `backend/src/routes/category.routes.js` - **MỚI**
- ✅ `backend/src/services/shipperService.js` - Đã fix
- ✅ `backend/src/services/productService.js` - Đã fix search

### Frontend (3 files)
- ✅ `frontend/src/pages/shipper/ShipperDashboard.jsx` - Đã fix
- ✅ `frontend/src/pages/customer/ProductList.jsx` - Đã fix search
- ✅ `frontend/src/pages/admin/ProductManagement.jsx` - Đã thêm detail & dropdowns

### Database
- ✅ `database/fix_return_approval.sql` - **CẦN CHẠY**

---

## 🎯 3 BƯỚC BẮT BUỘC

### BƯỚC 1: RUN SQL FIX ⭐ QUAN TRỌNG

```bash
# Mở Command Prompt hoặc PowerShell
cd c:\NONGSAN\database

# Chạy SQL file
psql -U postgres -d nongsan -f fix_return_approval.sql
```

**Expected output:**
```
DROP FUNCTION
CREATE FUNCTION
GRANT
```

**Nếu lỗi "psql not found":**
```bash
# Thêm PostgreSQL vào PATH hoặc dùng full path
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d nongsan -f fix_return_approval.sql
```

---

### BƯỚC 2: RESTART BACKEND

```bash
# Terminal 1: Stop backend (Ctrl+C nếu đang chạy)
cd c:\NONGSAN\backend
npm run dev
```

**Chờ thấy logs:**
```
✅ Database connection successful
✅ Server running on port 5000
✅ WebSocket server initialized
```

**Check category routes:**
```bash
# Terminal khác hoặc browser
curl http://localhost:5000/api/categories

# Expected: JSON response với list categories
```

---

### BƯỚC 3: RESTART FRONTEND

```bash
# Terminal 2: Stop frontend (Ctrl+C nếu đang chạy)
cd c:\NONGSAN\frontend
npm run dev
```

**Chờ thấy:**
```
✅ VITE ready in xxx ms
✅ Local: http://localhost:5173
```

**Clear browser cache:**
- `Ctrl+Shift+R` (hard refresh)
- Hoặc F12 → Application → Clear storage

---

## ✅ TESTING - 5 SCENARIOS

### 1️⃣ TEST ĐỔI TRẢ (Quan trọng nhất)

**Steps:**
1. Login admin: `http://localhost:5173/admin/login`
2. Vào "Quản lý đổi trả"
3. Tìm return request status "Chờ xử lý"
4. Click "Duyệt"

**Expected:**
- ✅ Thông báo "Đã duyệt yêu cầu"
- ✅ Status chuyển thành "Hoàn thành"
- ✅ Không có lỗi 500

**Verify inventory:**
```sql
-- Check trong psql
SELECT p.name, i.stock_qty 
FROM agri.inventory i
JOIN agri.products p ON p.id = i.product_id
WHERE p.id = 'product-id-đã-trả';
-- Stock_qty phải tăng
```

---

### 2️⃣ TEST SHIPPER NHẬN ĐƠN

**Steps:**
1. Login tài xế: `http://localhost:5173/shipper/login`
2. Vào Dashboard Shipper
3. Tab "Đơn hàng mới" - thấy đơn available
4. Click "Nhận đơn"

**Expected:**
- ✅ Thông báo "Đã nhận đơn hàng"
- ✅ Đơn **biến mất** khỏi tab "Đơn hàng mới"
- ✅ Đơn **xuất hiện** ở tab "Đơn đang giao"
- ✅ Stats cập nhật (Đang giao +1, Đơn hàng mới -1)

**Debug nếu không chuyển tab:**
```javascript
// Check browser console (F12)
// Phải thấy:
console.log('Orders before:', X);
console.log('Orders after:', X-1);
```

---

### 3️⃣ TEST TÌM KIẾM SẢN PHẨM

**Steps:**
1. Vào trang sản phẩm: `http://localhost:5173/products`
2. Gõ "rau" vào ô tìm kiếm
3. Click "Tìm kiếm" hoặc Enter

**Expected:**
- ✅ Hiển thị sản phẩm có "rau" trong tên
- ✅ Hiển thị sản phẩm thuộc danh mục "Rau củ"
- ✅ Không hiển thị sản phẩm khác

**Test khác:**
- Search "trái cây" → thấy category Trái cây
- Search "farm" → thấy brand Farm Fresh
- Search "nấm" → thấy products thuộc Nấm

---

### 4️⃣ TEST CHI TIẾT SẢN PHẨM

**Steps:**
1. Login admin
2. Vào "Quản lý sản phẩm"
3. Click icon **mắt** (Eye) ở bất kỳ sản phẩm nào

**Expected:**
Modal hiển thị:
- ✅ Hình ảnh sản phẩm (nếu có)
- ✅ Thông tin: SKU, tên, danh mục, thương hiệu, đơn vị
- ✅ Giá bán, giá vốn, giảm giá
- ✅ Tồn kho (màu xanh/vàng/đỏ)
- ✅ Mô tả ngắn & chi tiết

---

### 5️⃣ TEST DROPDOWNS DANH MỤC/THƯƠNG HIỆU

**Steps:**
1. Login admin
2. Vào "Quản lý sản phẩm"
3. Click "Sửa" một sản phẩm

**Expected:**
- ✅ Dropdown "Danh mục" có data:
  - Rau củ
  - Trái cây
  - Nấm
  - Hạt - Ngũ cốc
- ✅ Dropdown "Thương hiệu" có data:
  - Farm Fresh
  - Green Valley
  - Organic Home

**Test update:**
4. Chọn danh mục mới
5. Chọn thương hiệu mới
6. Click "Cập nhật"

**Expected:**
- ✅ Thông báo "Cập nhật thành công"
- ✅ Reload page → data đã thay đổi

---

## 🎯 API TESTS (Optional)

### Category API
```bash
# List categories
curl http://localhost:5000/api/categories

# Get category detail
curl http://localhost:5000/api/categories/{category-id}

# Get products in category
curl http://localhost:5000/api/categories/{category-id}/products
```

### Search API
```bash
# Search products
curl "http://localhost:5000/api/products?search=rau"

# Expected: Products với "rau" trong tên/danh mục
```

---

## 🐛 TROUBLESHOOTING

### Lỗi: psql command not found
```bash
# Windows: Thêm PostgreSQL vào PATH
# Hoặc dùng full path:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d nongsan -f fix_return_approval.sql
```

### Lỗi: Port 5000 already in use
```bash
# Windows: Kill process
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Hoặc đổi port trong backend/.env
PORT=5001
```

### Lỗi: Categories dropdown empty
```bash
# Check API response
curl http://localhost:5000/api/categories

# Nếu empty → Check database
psql -U postgres -d nongsan -c "SELECT * FROM agri.categories;"

# Nếu no data → Insert sample:
psql -U postgres -d nongsan -c "
INSERT INTO agri.categories (name, slug) VALUES 
('Rau củ', 'rau-cu'),
('Trái cây', 'trai-cay');
"
```

### Lỗi: Shipper không refresh
```javascript
// Check ShipperDashboard.jsx line 111-124
// Function handleAcceptOrder phải có:
await fetchNewOrders();
await fetchDeliveringOrders();
await fetchStats();

// Nếu thiếu → đã được apply rồi, restart frontend
```

### Lỗi: Search không hoạt động
```javascript
// Backend check:
// services/productService.js line 44-54
// Phải có ILIKE query

// Frontend check:
// ProductList.jsx line 73-77
// handleSearch phải là async
```

---

## 📊 VERIFY CHECKLIST

- [ ] SQL fix đã chạy (no errors)
- [ ] Backend restart thành công (port 5000)
- [ ] Frontend restart thành công (port 5173)
- [ ] API /categories trả về data
- [ ] Đổi trả hoạt động (không 500)
- [ ] Shipper nhận đơn chuyển tab
- [ ] Search sản phẩm hoạt động
- [ ] Chi tiết sản phẩm hiển thị
- [ ] Dropdowns có data
- [ ] Browser cache đã clear

---

## 📚 TÀI LIỆU THAM KHẢO

### Chi tiết fixes:
- **COMPLETED_FIXES.md** - Tổng kết đầy đủ
- **FINAL_FIX_SUMMARY.md** - Code samples
- **SYSTEM_FIXES_CHECKLIST.md** - Checklist tổng quan

### Debug guides:
- **URGENT_FIXES_GUIDE.md** - Debug tips
- **FIX_SQL_COLUMN_ERROR.md** - SQL errors
- **FIX_TOP_PRODUCTS.md** - Dashboard errors

---

## 🎉 SUCCESS CRITERIA

Hệ thống hoạt động tốt khi:

✅ **Đổi trả:**
- Duyệt return request thành công
- Không còn 500 error
- Inventory được cập nhật

✅ **Shipper:**
- Nhận đơn → chuyển tab ngay lập tức
- Stats cập nhật real-time

✅ **Search:**
- Gõ từ khóa → hiển thị kết quả đúng
- Không lag, không lỗi

✅ **Product Management:**
- Chi tiết sản phẩm đầy đủ
- Dropdowns load được data
- Cập nhật sản phẩm thành công

✅ **APIs:**
- /categories trả về data
- /products?search=... hoạt động

---

## 🚀 NEXT STEPS (Optional)

Sau khi test xong, có thể làm thêm:

### 1. Category Management Frontend
Tạo page để CRUD categories:
- `frontend/src/pages/admin/CategoryManagement.jsx`
- Tương tự ProductManagement
- APIs đã có sẵn

### 2. WebSocket Real-time
Shipper nhận đơn → notify admin real-time:
- Sử dụng Socket.IO đã setup
- Emit 'order_assigned' event

### 3. Dashboard Enhancements
- Date range picker
- Export reports
- More charts

---

## 📞 SUPPORT

Nếu gặp lỗi:
1. Check backend logs (terminal)
2. Check browser console (F12)
3. Check database (psql)
4. Xem debug tips trong COMPLETED_FIXES.md

---

**BẮT ĐẦU NGAY:**
1. **Chạy SQL** → `psql -U postgres -d nongsan -f database/fix_return_approval.sql`
2. **Restart Backend** → `npm run dev`
3. **Restart Frontend** → `npm run dev`
4. **Test 5 scenarios** ở trên

**GOOD LUCK!** 🚀
