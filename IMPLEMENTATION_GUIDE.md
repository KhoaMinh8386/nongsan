# Hướng dẫn triển khai các trang còn lại

## ✅ ĐÃ HOÀN THÀNH

### Backend (100%)
- ✅ API quản lý tài khoản (GET /api/user/accounts, PUT /api/user/accounts/:id)
- ✅ API nhà cung cấp (CRUD /api/suppliers)
- ✅ API phiếu nhập hàng (CRUD /api/import-receipts + approve)
- ✅ API sản phẩm đã hỗ trợ tìm kiếm nâng cao

### Frontend
- ✅ Service APIs (supplierService, importReceiptService, userService updated)
- ✅ Trang AccountManagement (/admin/accounts)
- ✅ Routes và navigation đã cập nhật

## 🔨 CẦN HOÀN THIỆN

### 1. SupplierManagement.jsx (Copy pattern từ AccountManagement.jsx)

```jsx
import { useState, useEffect } from 'react';
import { supplierService } from '../../services/supplierService';
import { toast } from 'react-hot-toast';

const SupplierManagement = () => {
  // States: suppliers, loading, searchTerm, pagination, showModal, editingSupplier
  // fetchSuppliers() - load data
  // handleCreate() - tạo mới
  // handleUpdate() - cập nhật
  // handleDelete() - xóa với confirm
  
  // UI: 
  // - Search bar
  // - Table: name, contact_name, phone, email, address, actions
  // - Modal form: name*, contact_name, phone, email, address, note
  // - Pagination
  
  return (/* JSX tương tự AccountManagement */);
};

export default SupplierManagement;
```

**Thêm route vào App.jsx**:
```jsx
import SupplierManagement from './pages/admin/SupplierManagement';
// Trong admin routes:
<Route path="suppliers" element={<SupplierManagement />} />
```

### 2. ImportReceiptManagement.jsx (Phức tạp hơn)

**Cấu trúc gồm 3 trang**:

#### a) ImportReceiptList.jsx - Danh sách phiếu nhập
```jsx
// States: receipts, suppliers (dropdown filter), status filter, date filter
// fetchReceipts()
// Hiển thị: code, supplier_name, created_at, total_qty, total_cost, status, actions
// Actions: View Detail, Approve (nếu DRAFT), Delete (nếu DRAFT)
```

#### b) ImportReceiptForm.jsx - Tạo/Sửa phiếu nhập
```jsx
// Form:
// - Select Supplier (có button "+ Thêm NCC mới" mở mini modal)
// - Note
// - Bảng items:
//   + Search sản phẩm (dropdown autocomplete)
//   + Qty, Unit Cost
//   + Line total auto-calc
//   + Button Thêm dòng, Xóa dòng
// - Footer: Tổng số mặt hàng, Tổng SL, Tổng tiền
// - Actions: Lưu nháp / Duyệt ngay

// Functions:
// - searchProducts() - realtime search
// - addItem(), removeItem()
// - calculateTotals()
// - saveDraft()
// - saveAndApprove()
```

#### c) ImportReceiptDetail.jsx - Chi tiết phiếu
```jsx
// Hiển thị:
// - Header info: code, supplier, created_by, created_at, status
// - Items table: product_name, qty, unit_cost, line_total
// - Totals
// - Actions: Duyệt (nếu DRAFT), Hủy

// Function approveReceipt() gọi API approve
```

**Routes**:
```jsx
<Route path="import-receipts" element={<ImportReceiptList />} />
<Route path="import-receipts/create" element={<ImportReceiptForm />} />
<Route path="import-receipts/:id" element={<ImportReceiptDetail />} />
<Route path="import-receipts/:id/edit" element={<ImportReceiptForm />} />
```

### 3. Cập nhật ProductManagement.jsx

**Thêm hiển thị tồn kho**:
```jsx
// Trong table, thêm cột:
<th>Tồn kho</th>

// Trong body:
<td>{product.stock_qty || 0} {product.unit}</td>

// Trong form create/edit, thêm field:
<input
  type="number"
  name="initial_stock"
  placeholder="Tồn kho ban đầu"
  min="0"
/>
```

### 4. Cập nhật ProductList.jsx (Customer)

**Thêm bộ lọc nâng cao**:
```jsx
// States:
const [filters, setFilters] = useState({
  category_id: '',
  brand_id: '',
  min_price: '',
  max_price: '',
  search: '',
  page: 1
});

// UI: Thêm dropdown Category, Brand, input price range
// fetchProducts() gọi với filters
```

## 📋 TÀI LIỆU API

### Account Management
```
GET /api/user/accounts?search=&role=&is_active=&page=1&limit=20
PUT /api/user/accounts/:id
Body: { role: "ADMIN|STAFF|SHIPPER|CUSTOMER", is_active: true|false }
```

### Suppliers
```
GET /api/suppliers?search=&page=1&limit=20
GET /api/suppliers/:id
POST /api/suppliers
Body: { name*, contact_name, phone, email, address, note }
PUT /api/suppliers/:id
DELETE /api/suppliers/:id
```

### Import Receipts
```
GET /api/import-receipts?supplier_id=&status=&date_from=&date_to=&page=1
GET /api/import-receipts/:id
POST /api/import-receipts
Body: {
  supplier_id*,
  note,
  items*: [{ product_id*, qty*, unit_cost*, note }]
}
PUT /api/import-receipts/:id (chỉ DRAFT)
POST /api/import-receipts/:id/approve
POST /api/import-receipts/:id/cancel
DELETE /api/import-receipts/:id (chỉ DRAFT)
```

### Products (đã có sẵn, cập nhật filters)
```
GET /api/products?category_id=&brand_id=&min_price=&max_price=&search=&page=1&limit=12
POST /api/products
Body: { ..., initial_stock: 100 }
PUT /api/products/:id
Body: { ..., stock_qty: 150 } // Nếu muốn cập nhật tồn kho trực tiếp
```

## 🚀 CHẠY HỆ THỐNG

### Backend:
```bash
cd backend
npm install
npm run dev
```

### Frontend:
```bash
cd frontend
npm install
npm run dev
```

## ✨ TÍNH NĂNG ĐÃ TRIỂN KHAI

✅ Quản lý tài khoản đầy đủ (search, filter, update role/status, toggle lock)
✅ Backend API hoàn chỉnh cho Suppliers và Import Receipts
✅ Transaction đảm bảo consistency khi duyệt phiếu nhập
✅ Tự động cập nhật tồn kho, stock_movements, cost_price
✅ Validation đầy đủ
✅ Phân trang và filter cho tất cả API
✅ API sản phẩm hỗ trợ tìm kiếm nâng cao

## 📝 LƯU Ý

- Database đã có đầy đủ tables và functions
- Import receipts sử dụng function `approve_import_receipt()` trong database
- Product service đã hỗ trợ initial_stock khi tạo sản phẩm mới
- Tất cả API đã test qua controller logic

Các trang frontend còn lại chỉ cần copy pattern từ AccountManagement.jsx và điều chỉnh theo data model tương ứng.
