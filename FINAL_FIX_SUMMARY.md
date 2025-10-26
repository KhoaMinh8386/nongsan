# ✅ TÓM TẮT SỬA LỖI HỆ THỐNG - NÔNG SẢN SẠCH

## 📋 ĐÃ HOÀN THÀNH

### 1. ✅ FIX ĐỔI TRẢ - 500 ERROR
**File:** `database/fix_return_approval.sql`

**Vấn đề:** Stored procedure `duyet_doi_tra` fails khi product chưa có record trong `inventory`

**Giải pháp:** Dùng UPSERT (INSERT ON CONFLICT)

**Chạy ngay:**
```bash
psql -U postgres -d nongsan -f c:\NONGSAN\database\fix_return_approval.sql
```

---

### 2. ✅ TẠO QUẢN LÝ DANH MỤC (CATEGORY MANAGEMENT)
**Files mới:**
- `backend/src/services/categoryService.js` ✅
- `backend/src/controllers/categoryController.js` ✅  
- `backend/src/routes/category.routes.js` ✅

**APIs:**
```
GET    /api/categories              - List all
POST   /api/categories              - Create (Admin)
GET    /api/categories/:id          - Get detail
PUT    /api/categories/:id          - Update (Admin)
DELETE /api/categories/:id          - Delete (Admin)
GET    /api/categories/:id/products - Products in category
GET    /api/categories/:id/stats    - Category statistics
```

**Register routes:**
```javascript
// backend/src/index.js - Thêm dòng này
import categoryRoutes from './routes/category.routes.js';
app.use('/api/categories', categoryRoutes);
```

---

## 🔧 CẦN SỬA

### 3. 🔄 SHIPPER NHẬN ĐƠN

**Vấn đề:** Bấm "Nhận đơn" không chuyển tab

**Files cần check:**
1. `backend/src/services/shipperService.js`
2. `backend/src/controllers/shipperController.js`
3. `frontend/src/pages/shipper/ShipperDashboard.jsx`

**Fix Backend:**
```javascript
// backend/src/services/shipperService.js
export const startDelivery = async (shipperId, orderId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Call stored procedure
    await client.query(
      'SELECT agri.assign_shipper_to_order($1, $2)',
      [orderId, shipperId]
    );
    
    // Get updated order
    const result = await client.query(
      `SELECT o.*, a.full_name as customer_name
       FROM agri.orders o
       JOIN agri.accounts a ON a.id = o.customer_id
       WHERE o.id = $1`,
      [orderId]
    );
    
    await client.query('COMMIT');
    return result.rows[0]; // ✅ QUAN TRỌNG: Return order
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
```

**Fix Frontend:**
```javascript
// frontend/src/pages/shipper/ShipperDashboard.jsx
const handleAcceptOrder = async (orderId) => {
  try {
    await shipperService.acceptOrder(orderId);
    
    // ✅ QUAN TRỌNG: Refresh data
    await fetchNewOrders();
    await fetchDeliveringOrders();
    await fetchStats();
    
    toast.success('Đã nhận đơn hàng');
  } catch (error) {
    console.error('Accept order error:', error);
    toast.error('Không thể nhận đơn');
  }
};
```

---

### 4. 🔄 TÌM KIẾM SẢN PHẨM

**File:** `backend/src/services/productService.js`

**Thêm vào function getProducts:**
```javascript
export const getProducts = async (filters = {}) => {
  const { 
    search,  // ✅ THÊM
    page = 1, 
    limit = 12,
    category_id,
    is_active = true 
  } = filters;

  let whereConditions = [];
  const params = [];
  let paramIndex = 1;

  if (is_active !== undefined) {
    whereConditions.push(`p.is_active = $${paramIndex++}`);
    params.push(is_active);
  }

  if (category_id) {
    whereConditions.push(`p.category_id = $${paramIndex++}`);
    params.push(category_id);
  }

  // ✅ THÊM: Search condition
  if (search && search.trim()) {
    whereConditions.push(`(
      p.name ILIKE $${paramIndex} 
      OR p.short_desc ILIKE $${paramIndex}
      OR c.name ILIKE $${paramIndex}
      OR s.name ILIKE $${paramIndex}
    )`);
    params.push(`%${search.trim()}%`);
    paramIndex++;
  }

  const whereClause = whereConditions.length > 0 
    ? 'WHERE ' + whereConditions.join(' AND ') 
    : '';

  // ... rest of query with LEFT JOIN categories c, suppliers s
};
```

**Frontend:**
```javascript
// frontend/src/pages/customer/Shop.jsx
const [searchTerm, setSearchTerm] = useState('');

const handleSearch = async () => {
  setLoading(true);
  try {
    const response = await productService.getProducts({ 
      search: searchTerm,
      page: 1,
      limit: 12
    });
    setProducts(response.products || []);
  } catch (error) {
    console.error('Search error:', error);
  } finally {
    setLoading(false);
  }
};

// In JSX
<input 
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
  placeholder="Tìm sản phẩm..."
/>
<button onClick={handleSearch}>
  <Search />
</button>
```

---

### 5. 🔄 QUẢN LÝ SẢN PHẨM - CHI TIẾT & DROPDOWNS

**File:** `frontend/src/pages/admin/ProductManagement.jsx`

**Thêm states:**
```javascript
const [categories, setCategories] = useState([]);
const [suppliers, setSuppliers] = useState([]);
const [showDetailModal, setShowDetailModal] = useState(false);
const [detailProduct, setDetailProduct] = useState(null);
```

**Fetch dropdowns:**
```javascript
useEffect(() => {
  fetchProducts();
  fetchCategoriesAndSuppliers();
}, []);

const fetchCategoriesAndSuppliers = async () => {
  try {
    const [catRes, supRes] = await Promise.all([
      api.get('/categories'),
      api.get('/suppliers')
    ]);
    setCategories(catRes.data.data || []);
    setSuppliers(supRes.data.data || []);
  } catch (error) {
    console.error('Error loading dropdowns:', error);
  }
};
```

**Chi tiết sản phẩm:**
```javascript
const openDetailModal = async (product) => {
  try {
    const detail = await productService.getProductById(product.id);
    setDetailProduct(detail);
    setShowDetailModal(true);
  } catch (error) {
    toast.error('Không thể tải chi tiết');
  }
};

// In table
<button 
  onClick={() => openDetailModal(product)}
  className="text-blue-600 hover:text-blue-800"
>
  <Eye className="w-4 h-4" />
  Chi tiết
</button>
```

**Dropdowns in form:**
```javascript
{/* Danh mục */}
<select 
  name="category_id"
  value={formData.category_id || ''} 
  onChange={handleInputChange}
  className="w-full border rounded p-2"
>
  <option value="">Chọn danh mục</option>
  {categories.map(cat => (
    <option key={cat.id} value={cat.id}>
      {cat.name}
    </option>
  ))}
</select>

{/* Thương hiệu */}
<select 
  name="supplier_id"
  value={formData.supplier_id || ''} 
  onChange={handleInputChange}
  className="w-full border rounded p-2"
>
  <option value="">Chọn thương hiệu</option>
  {suppliers.map(sup => (
    <option key={sup.id} value={sup.id}>
      {sup.name}
    </option>
  ))}
</select>
```

---

## 🚀 HƯỚNG DẪN TRIỂN KHAI

### BƯỚC 1: Database Fix (Bắt buộc)
```bash
cd c:\NONGSAN\database
psql -U postgres -d nongsan -f fix_return_approval.sql
```

### BƯỚC 2: Register Category Routes
```javascript
// backend/src/index.js
import categoryRoutes from './routes/category.routes.js';

// Thêm sau dòng app.use('/api/dashboard', dashboardRoutes);
app.use('/api/categories', categoryRoutes);
```

### BƯỚC 3: Restart Backend
```bash
cd c:\NONGSAN\backend
# Ctrl+C để stop
npm run dev
```

### BƯỚC 4: Test APIs
```bash
# Test categories
curl http://localhost:5000/api/categories

# Test create (cần auth token)
curl -X POST http://localhost:5000/api/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"Test Category","slug":"test-category"}'
```

### BƯỚC 5: Fix Frontend Files
1. Fix `ShipperDashboard.jsx` - thêm refresh sau accept
2. Fix `Shop.jsx` - enable search
3. Fix `ProductManagement.jsx` - chi tiết & dropdowns

### BƯỚC 6: Restart Frontend
```bash
cd c:\NONGSAN\frontend
# Ctrl+C để stop
npm run dev
```

---

## ✅ TESTING CHECKLIST

### 1. Đổi Trả
- [ ] Login admin
- [ ] Vào "Quản lý đổi trả"
- [ ] Duyệt một return request
- [ ] Verify: Status = COMPLETED
- [ ] Check inventory updated

### 2. Shipper
- [ ] Login tài xế
- [ ] Vào dashboard
- [ ] Bấm "Nhận đơn" ở tab "Đơn hàng mới"
- [ ] Verify: Đơn chuyển sang "Đơn đang giao"
- [ ] Verify: Đơn biến mất khỏi "Đơn hàng mới"

### 3. Tìm Kiếm
- [ ] Vào trang sản phẩm (customer)
- [ ] Gõ tên sản phẩm vào search
- [ ] Enter hoặc click Search
- [ ] Verify: Hiển thị kết quả đúng

### 4. Quản Lý Sản Phẩm
- [ ] Login admin
- [ ] Vào "Quản lý sản phẩm"
- [ ] Click "Chi tiết" một sản phẩm
- [ ] Verify: Modal hiển thị đầy đủ thông tin
- [ ] Click "Sửa" một sản phẩm
- [ ] Verify: Dropdown danh mục có data
- [ ] Verify: Dropdown thương hiệu có data
- [ ] Chọn danh mục/thương hiệu mới
- [ ] Save
- [ ] Verify: Cập nhật thành công

### 5. Quản Lý Danh Mục
- [ ] Login admin
- [ ] Vào "Quản lý danh mục" (cần tạo page)
- [ ] Tạo danh mục mới
- [ ] Sửa danh mục
- [ ] Click "Chi tiết" → xem products
- [ ] Xóa danh mục (không có products)

---

## 📊 PROGRESS

| Task | Status | Priority |
|------|--------|----------|
| 1. Fix đổi trả | ✅ DONE | 🔴 Critical |
| 2. Category Management Backend | ✅ DONE | 🟡 High |
| 3. Fix Shipper nhận đơn | 🔄 TO DO | 🔴 Critical |
| 4. Enable Search | 🔄 TO DO | 🟡 High |
| 5. Product Detail & Dropdowns | 🔄 TO DO | 🟢 Medium |
| 6. Category Management Frontend | 🔄 TO DO | 🟢 Medium |

---

## 📞 DEBUG TIPS

### Lỗi đổi trả:
```bash
# Check logs
tail -f backend/logs/app.log | grep "duyet_doi_tra"
```

### Shipper không refresh:
```javascript
// Thêm vào handleAcceptOrder
console.log('Orders before:', newOrders.length);
await acceptOrder(orderId);
console.log('Orders after:', newOrders.length);
```

### Search không hoạt động:
```javascript
// Backend
console.log('Search query:', search);
console.log('SQL:', query);
console.log('Results:', result.rows.length);
```

---

## 🎯 NEXT STEPS

1. **NGAY:** Chạy SQL fix đổi trả
2. **NGAY:** Register category routes + restart backend
3. **Ưu tiên:** Fix shipper nhận đơn
4. **Sau đó:** Enable search
5. **Cuối cùng:** Product management enhancements + Category frontend

---

**🚀 BẮT ĐẦU: CHẠY SQL + REGISTER ROUTES + RESTART!**
