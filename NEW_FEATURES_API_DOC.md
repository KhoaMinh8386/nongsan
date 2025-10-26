# Tài liệu API - Các tính năng mới

## 🔐 Authentication
Tất cả API yêu cầu header: `Authorization: Bearer <token>`

---

## 1️⃣ QUẢN LÝ TÀI KHOẢN (ADMIN)

### GET /api/user/accounts
**Mô tả**: Lấy danh sách tất cả tài khoản (chỉ ADMIN)

**Query Parameters**:
- `search` (string, optional): Tìm kiếm theo email hoặc tên
- `role` (string, optional): ADMIN | STAFF | SHIPPER | CUSTOMER
- `is_active` (boolean, optional): true | false
- `page` (number, default: 1)
- `limit` (number, default: 20)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "Nguyen Van A",
      "phone": "0901234567",
      "role": "CUSTOMER",
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

### PUT /api/user/accounts/:id
**Mô tả**: Cập nhật vai trò và trạng thái tài khoản

**Request Body**:
```json
{
  "role": "SHIPPER",
  "is_active": false
}
```

**Response**:
```json
{
  "success": true,
  "message": "Account updated successfully",
  "data": { /* account object */ }
}
```

---

## 2️⃣ QUẢN LÝ NHÀ CUNG CẤP

### GET /api/suppliers
**Query Parameters**:
- `search` (string): Tìm theo tên, người đại diện, SĐT
- `page`, `limit`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Công ty TNHH ABC",
      "contact_name": "Nguyen Van B",
      "phone": "0912345678",
      "email": "abc@company.com",
      "address": "123 Main St, Ho Chi Minh",
      "note": "Nhà cung cấp uy tín",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": { /* pagination object */ }
}
```

### GET /api/suppliers/:id
**Response**:
```json
{
  "success": true,
  "data": { /* supplier object */ }
}
```

### POST /api/suppliers
**Request Body**:
```json
{
  "name": "Công ty TNHH ABC",
  "contact_name": "Nguyen Van B",
  "phone": "0912345678",
  "email": "abc@company.com",
  "address": "123 Main St",
  "note": "Ghi chú"
}
```
*Chỉ `name` là bắt buộc*

### PUT /api/suppliers/:id
**Request Body**: Tương tự POST (chỉ gửi fields cần update)

### DELETE /api/suppliers/:id
**Lưu ý**: Không thể xóa NCC đã có phiếu nhập hàng

---

## 3️⃣ QUẢN LÝ PHIẾU NHẬP HÀNG

### GET /api/import-receipts
**Query Parameters**:
- `supplier_id` (uuid)
- `status` (string): DRAFT | APPROVED | CANCELLED
- `date_from` (date): YYYY-MM-DD
- `date_to` (date): YYYY-MM-DD
- `page`, `limit`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "PN-2025-01-001",
      "supplier_id": "uuid",
      "supplier_name": "Công ty ABC",
      "created_by": "uuid",
      "created_by_name": "Admin",
      "status": "DRAFT",
      "total_qty": 150,
      "total_cost": 5000000,
      "note": "Nhập hàng tháng 1",
      "items_count": 5,
      "created_at": "2025-01-15T10:00:00Z",
      "approved_at": null
    }
  ],
  "pagination": { /* pagination */ }
}
```

### GET /api/import-receipts/:id
**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "code": "PN-2025-01-001",
    "supplier_id": "uuid",
    "supplier_name": "Công ty ABC",
    "contact_name": "Nguyen Van B",
    "supplier_phone": "0912345678",
    "created_by": "uuid",
    "created_by_name": "Admin",
    "status": "DRAFT",
    "total_qty": 150,
    "total_cost": 5000000,
    "note": "Nhập hàng tháng 1",
    "created_at": "2025-01-15T10:00:00Z",
    "approved_at": null,
    "items": [
      {
        "id": "uuid",
        "product_id": "uuid",
        "product_name": "Cà chua Đà Lạt",
        "sku": "CT001",
        "unit": "KG",
        "qty": 50,
        "unit_cost": 25000,
        "line_total": 1250000,
        "note": ""
      }
    ]
  }
}
```

### POST /api/import-receipts
**Mô tả**: Tạo phiếu nhập mới (trạng thái DRAFT)

**Request Body**:
```json
{
  "supplier_id": "uuid",
  "note": "Nhập hàng định kỳ",
  "items": [
    {
      "product_id": "uuid",
      "qty": 50,
      "unit_cost": 25000,
      "note": ""
    },
    {
      "product_id": "uuid",
      "qty": 100,
      "unit_cost": 15000
    }
  ]
}
```
*`supplier_id` và `items` (≥1 item) là bắt buộc*

**Response**: 201 Created với đối tượng receipt đầy đủ

### PUT /api/import-receipts/:id
**Mô tả**: Cập nhật phiếu nhập (chỉ DRAFT)

**Request Body**: Tương tự POST

### POST /api/import-receipts/:id/approve
**Mô tả**: Duyệt phiếu nhập và cập nhật tồn kho

**Quy trình tự động**:
1. Chuyển status → APPROVED
2. Cập nhật `inventory.stock_qty` += qty cho từng sản phẩm
3. Ghi log vào `stock_movements` (reason='IMPORT')
4. Cập nhật `products.cost_price` = unit_cost mới nhất
5. Đặt `approved_at` = NOW()

**Response**:
```json
{
  "success": true,
  "message": "Import receipt approved and stock updated successfully",
  "data": { /* receipt object with updated status */ }
}
```

**Lỗi phổ biến**:
- 400: "Can only update DRAFT receipts" (nếu đã duyệt)
- 404: "Import receipt not found"

### POST /api/import-receipts/:id/cancel
**Mô tả**: Hủy phiếu nhập (chỉ DRAFT)

### DELETE /api/import-receipts/:id
**Mô tả**: Xóa phiếu nhập (chỉ DRAFT)

---

## 4️⃣ SẢN PHẨM (CẬP NHẬT)

### GET /api/products - Tìm kiếm nâng cao
**Query Parameters (đã hỗ trợ)**:
- `category_id` (uuid): Lọc theo danh mục
- `brand_id` (uuid): Lọc theo thương hiệu
- `min_price` (number): Giá tối thiểu
- `max_price` (number): Giá tối đa
- `search` (string): Tìm theo tên, mô tả (full-text search)
- `sort` (string): created_at | price | name
- `order` (string): asc | desc
- `page`, `limit`

**Response bao gồm**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Cà chua Đà Lạt",
      "sku": "CT001",
      "price": 30000,
      "discount_rate": 10,
      "final_price": 27000,
      "unit": "KG",
      "stock_qty": 150,
      "category": { "id": "uuid", "name": "Rau củ" },
      "brand": { "id": "uuid", "name": "Đà Lạt Farm" },
      "main_image": "/uploads/products/image.jpg"
    }
  ],
  "pagination": { /* pagination */ }
}
```

### POST /api/products - Tạo sản phẩm với tồn kho ban đầu
**Request Body**:
```json
{
  "name": "Cà chua Đà Lạt",
  "slug": "ca-chua-da-lat",
  "sku": "CT001",
  "category_id": "uuid",
  "brand_id": "uuid",
  "unit": "KG",
  "price": 30000,
  "cost_price": 20000,
  "tax_rate": 0,
  "discount_rate": 10,
  "weight_gram": 1000,
  "short_desc": "Cà chua tươi ngon từ Đà Lạt",
  "description": "Mô tả chi tiết...",
  "initial_stock": 100
}
```

*`initial_stock` sẽ tự động khởi tạo inventory record*

---

## 🔒 PHÂN QUYỀN

| Endpoint | ADMIN | STAFF | SHIPPER | CUSTOMER |
|----------|-------|-------|---------|----------|
| GET /api/user/accounts | ✅ | ❌ | ❌ | ❌ |
| PUT /api/user/accounts/:id | ✅ | ❌ | ❌ | ❌ |
| /api/suppliers/* | ✅ | ❌ | ❌ | ❌ |
| /api/import-receipts/* | ✅ | ❌ | ❌ | ❌ |
| GET /api/products | ✅ | ✅ | ✅ | ✅ |
| POST/PUT/DELETE /api/products | ✅ | ❌ | ❌ | ❌ |

---

## 📊 DATABASE SCHEMA (Liên quan)

### accounts
- id, email, phone, full_name, password_hash
- **role**: ENUM (ADMIN, STAFF, SHIPPER, CUSTOMER)
- **is_active**: BOOLEAN
- created_at, updated_at

### suppliers
- id, name, contact_name, phone, email, address, note
- created_at, updated_at

### import_receipts
- id, **code** (tự sinh), supplier_id, created_by
- **status** (DRAFT/APPROVED/CANCELLED)
- total_qty, total_cost, note
- created_at, approved_at

### import_receipt_items
- id, receipt_id, product_id
- qty, unit_cost, **line_total** (computed)
- note

### inventory
- product_id (PK)
- **stock_qty**, reserved_qty
- updated_at

### stock_movements
- id, product_id, change_qty
- **reason** (IMPORT, ORDER, RETURN, MANUAL_IN, etc.)
- ref_id (reference to receipt/order id)
- created_at

---

## 🧪 TEST EXAMPLES

### 1. Tạo phiếu nhập và duyệt
```bash
# 1. Tạo NCC
POST /api/suppliers
{
  "name": "Nông sản Đà Lạt",
  "contact_name": "Nguyễn Văn A",
  "phone": "0901234567"
}
# → supplier_id: abc-123

# 2. Tạo phiếu nhập
POST /api/import-receipts
{
  "supplier_id": "abc-123",
  "items": [
    { "product_id": "prod-1", "qty": 50, "unit_cost": 25000 },
    { "product_id": "prod-2", "qty": 100, "unit_cost": 15000 }
  ]
}
# → receipt_id: receipt-456, status: DRAFT

# 3. Duyệt phiếu
POST /api/import-receipts/receipt-456/approve
# → stock_qty của prod-1 tăng 50, prod-2 tăng 100
# → cost_price cập nhật
# → status: APPROVED
```

### 2. Tìm kiếm sản phẩm nâng cao
```bash
GET /api/products?category_id=cat-1&min_price=10000&max_price=50000&search=cà%20chua&page=1&limit=12
```

### 3. Quản lý tài khoản
```bash
# Lấy danh sách shipper
GET /api/user/accounts?role=SHIPPER&is_active=true

# Khóa tài khoản
PUT /api/user/accounts/user-123
{ "is_active": false }

# Thay đổi vai trò
PUT /api/user/accounts/user-456
{ "role": "STAFF" }
```

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **Transaction Safety**: API approve phiếu nhập sử dụng transaction, rollback nếu có lỗi
2. **Mã phiếu tự động**: Format `PN-YYYY-MM-XXX` (XXX tăng dần theo tháng)
3. **Không thể sửa/xóa phiếu đã duyệt**: Chỉ DRAFT mới edit/delete được
4. **Stock movements log**: Mọi thay đổi tồn kho đều được log
5. **Cost price update**: Mỗi lần nhập sẽ cập nhật cost_price mới nhất

---

**Version**: 1.0  
**Last Updated**: 2025-01-24  
**Contact**: Backend Team
