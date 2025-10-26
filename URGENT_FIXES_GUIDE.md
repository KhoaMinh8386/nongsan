# 🚨 HƯỚNG DẪN SỬA LỖI KHẨN CẤP

## ✅ FIX #1: ĐỔI TRẢ - 500 ERROR (HOÀN THÀNH)

### Chạy SQL fix:
```bash
psql -U postgres -d nongsan -f c:\NONGSAN\database\fix_return_approval.sql
```

**Sau khi chạy:**
- Restart backend
- Test duyệt đổi trả trong admin
- Verify inventory được cập nhật

---

## 🚚 FIX #2: SHIPPER NHẬN ĐƠN

### Vấn đề:
- Bấm "Nhận đơn" không chuyển tab
- Đơn không biến mất khỏi "Đơn hàng mới"

### Files cần check:

**1. Backend Service:**
```javascript
// backend/src/services/shipperService.js
export const startDelivery = async (shipperId, orderId) => {
  // ✅ PHẢI: 
  // - Assign shipper_id to order
  // - Update status to 'SHIPPING'
  // - Return updated order
  
  // ❌ KHÔNG: chỉ update mà không return
}
```

**2. Backend Controller:**
```javascript
// backend/src/controllers/shipperController.js
export const acceptOrder = async (req, res, next) => {
  const { orderId } = req.params;
  const shipperId = req.user.id;
  
  // Call startDelivery
  const order = await shipperService.startDelivery(shipperId, orderId);
  
  // ✅ Emit WebSocket event
  req.io.emit('order_assigned', {
    orderId,
    shipperId,
    status: 'SHIPPING'
  });
  
  return successResponse(res, order);
}
```

**3. Frontend:**
```javascript
// frontend/src/pages/shipper/ShipperDashboard.jsx

const handleAcceptOrder = async (orderId) => {
  try {
    await shipperService.acceptOrder(orderId);
    
    // ✅ QUAN TRỌNG: Refresh data ngay
    fetchOrders(); // Reload danh sách
    
    toast.success('Đã nhận đơn hàng');
  } catch (error) {
    toast.error('Không thể nhận đơn');
  }
};
```

**4. WebSocket Listener:**
```javascript
// In useEffect
useEffect(() => {
  if (!socket) return;
  
  socket.on('order_assigned', (data) => {
    // Refresh orders khi có đơn được assign
    fetchOrders();
  });
  
  return () => socket.off('order_assigned');
}, [socket]);
```

---

## 🔍 FIX #3: TÌM KIẾM SẢN PHẨM

### Backend:
```javascript
// backend/src/services/productService.js
export const getProducts = async (filters) => {
  const { search, ...otherFilters } = filters;
  
  let whereConditions = ['p.is_active = TRUE'];
  const params = [];
  let paramIndex = 1;
  
  // ✅ THÊM: Search condition
  if (search) {
    whereConditions.push(`(
      p.name ILIKE $${paramIndex} 
      OR p.short_desc ILIKE $${paramIndex}
      OR c.name ILIKE $${paramIndex}
    )`);
    params.push(`%${search}%`);
    paramIndex++;
  }
  
  const whereClause = whereConditions.length > 0 
    ? 'WHERE ' + whereConditions.join(' AND ') 
    : '';
  
  // ... rest of query
};
```

### Frontend:
```javascript
// frontend/src/pages/customer/Shop.jsx
const [searchTerm, setSearchTerm] = useState('');

const handleSearch = async () => {
  try {
    const response = await productService.getProducts({ 
      search: searchTerm,
      page: 1,
      limit: 12
    });
    setProducts(response.products);
  } catch (error) {
    console.error('Search error:', error);
  }
};

// JSX
<input 
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
  placeholder="Tìm sản phẩm, danh mục..."
/>
<button onClick={handleSearch}>
  <Search />
</button>
```

---

## 📦 FIX #4: QUẢN LÝ SẢN PHẨM

### Thêm nút "Chi tiết":
```javascript
// frontend/src/pages/admin/ProductManagement.jsx

const [showDetailModal, setShowDetailModal] = useState(false);
const [detailProduct, setDetailProduct] = useState(null);

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
<button onClick={() => openDetailModal(product)}>
  Chi tiết
</button>
```

### Dropdowns danh mục & thương hiệu:
```javascript
const [categories, setCategories] = useState([]);
const [suppliers, setSuppliers] = useState([]);

useEffect(() => {
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

// In form
<select 
  value={formData.category_id} 
  onChange={handleInputChange}
  name="category_id"
>
  <option value="">Chọn danh mục</option>
  {categories.map(cat => (
    <option key={cat.id} value={cat.id}>
      {cat.name}
    </option>
  ))}
</select>

<select 
  value={formData.supplier_id} 
  onChange={handleInputChange}
  name="supplier_id"
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

## ➕ FIX #5: TẠO QUẢN LÝ DANH MỤC

### Tạo file mới:
```bash
# Frontend
c:\NONGSAN\frontend\src\pages\admin\CategoryManagement.jsx

# Backend
c:\NONGSAN\backend\src\routes\category.routes.js
c:\NONGSAN\backend\src\controllers\categoryController.js
c:\NONGSAN\backend\src\services\categoryService.js
```

### Backend Service:
```javascript
// backend/src/services/categoryService.js
import pool from '../config/db.js';

export const getCategories = async () => {
  const result = await pool.query(
    'SELECT * FROM agri.categories WHERE is_active = TRUE ORDER BY name'
  );
  return result.rows;
};

export const createCategory = async (data) => {
  const { name, slug, description } = data;
  const result = await pool.query(
    `INSERT INTO agri.categories (name, slug, description) 
     VALUES ($1, $2, $3) RETURNING *`,
    [name, slug, description]
  );
  return result.rows[0];
};

export const updateCategory = async (id, data) => {
  const { name, slug, description, is_active } = data;
  const result = await pool.query(
    `UPDATE agri.categories 
     SET name = $1, slug = $2, description = $3, is_active = $4
     WHERE id = $5 RETURNING *`,
    [name, slug, description, is_active, id]
  );
  return result.rows[0];
};

export const deleteCategory = async (id) => {
  await pool.query('DELETE FROM agri.categories WHERE id = $1', [id]);
};

export const getCategoryProducts = async (categoryId) => {
  const result = await pool.query(
    `SELECT p.id, p.name, p.price, p.unit, i.stock_qty
     FROM agri.products p
     LEFT JOIN agri.inventory i ON i.product_id = p.id
     WHERE p.category_id = $1 AND p.is_active = TRUE`,
    [categoryId]
  );
  return result.rows;
};
```

### Backend Routes:
```javascript
// backend/src/routes/category.routes.js
import express from 'express';
import * as categoryController from '../controllers/categoryController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', categoryController.getCategories);
router.post('/', authenticate, authorize('ADMIN'), categoryController.createCategory);
router.get('/:id', categoryController.getCategoryById);
router.put('/:id', authenticate, authorize('ADMIN'), categoryController.updateCategory);
router.delete('/:id', authenticate, authorize('ADMIN'), categoryController.deleteCategory);
router.get('/:id/products', categoryController.getCategoryProducts);

export default router;
```

### Register routes:
```javascript
// backend/src/index.js
import categoryRoutes from './routes/category.routes.js';

app.use('/api/categories', categoryRoutes);
```

---

## 📋 CHECKLIST SỬA LỖI

### Bước 1: Database Fix
- [x] Chạy `fix_return_approval.sql`
- [ ] Verify: Test duyệt đổi trả

### Bước 2: Backend Fixes
- [ ] Check `shipperService.js` - startDelivery function
- [ ] Check `productService.js` - thêm search
- [ ] Tạo `categoryService.js`
- [ ] Tạo `categoryController.js`
- [ ] Tạo `category.routes.js`
- [ ] Register routes trong `index.js`

### Bước 3: Frontend Fixes
- [ ] Fix `ShipperDashboard.jsx` - refresh sau khi nhận đơn
- [ ] Fix `Shop.jsx` - enable search
- [ ] Fix `ProductManagement.jsx` - chi tiết & dropdowns
- [ ] Tạo `CategoryManagement.jsx`

### Bước 4: Testing
- [ ] Test đổi trả works
- [ ] Test shipper nhận đơn → chuyển tab
- [ ] Test search sản phẩm
- [ ] Test CRUD danh mục
- [ ] Test edit sản phẩm với dropdowns

---

## 🚀 THỨ TỰ THỰC HIỆN

1. **NGAY LẬP TỨC:** Chạy SQL fix đổi trả
2. **Ưu tiên cao:** Fix shipper nhận đơn (có screenshot)
3. **Quan trọng:** Enable search sản phẩm
4. **Enhancement:** Thêm chi tiết & dropdowns sản phẩm
5. **New feature:** Tạo quản lý danh mục

---

## 📞 HỖ TRỢ DEBUG

### Đổi trả lỗi:
```sql
-- Check inventory missing
SELECT COUNT(*) FROM agri.products p
LEFT JOIN agri.inventory i ON i.product_id = p.id
WHERE i.product_id IS NULL;
```

### Shipper không refresh:
```javascript
// Thêm log
console.log('Before accept:', newOrders.length);
await acceptOrder(orderId);
await fetchOrders();
console.log('After accept:', newOrders.length);
```

### Search không hoạt động:
```javascript
// Backend log
console.log('Search term:', search);
console.log('Query:', query);
console.log('Results:', result.rows.length);
```

---

**🎯 BẮT ĐẦU: CHẠY SQL FIX ĐỔI TRẢ + FIX SHIPPER!**
