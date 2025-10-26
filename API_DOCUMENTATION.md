# API DOCUMENTATION - NÔNG SẢN SẠCH

## 📋 Base URL
```
Development: http://localhost:5000/api
Production: https://api.nongsansach.com/api
```

## 🔐 Authentication
Hầu hết endpoints yêu cầu JWT token trong header:
```
Authorization: Bearer <token>
```

---

## 1️⃣ AUTHENTICATION ENDPOINTS

### 1.1 Register
**POST** `/auth/register`

**Body:**
```json
{
  "email": "user@example.com",
  "password": "123456",
  "full_name": "Nguyen Van A",
  "phone": "0901234567"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "Nguyen Van A",
    "role": "CUSTOMER"
  }
}
```

**PostgreSQL Query:**
```sql
INSERT INTO agri.accounts (email, password_hash, full_name, phone, role)
VALUES ($1, $2, $3, $4, 'CUSTOMER')
RETURNING id, email, full_name, role;
```

---

### 1.2 Login
**POST** `/auth/login`

**Body:**
```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "Nguyen Van A",
      "role": "CUSTOMER"
    }
  }
}
```

**PostgreSQL Query:**
```sql
SELECT id, email, full_name, password_hash, role, is_active
FROM agri.accounts
WHERE email = $1;
```

---

### 1.3 Get Current User
**GET** `/auth/me`  
🔒 Requires: Authentication

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "Nguyen Van A",
    "phone": "0901234567",
    "role": "CUSTOMER"
  }
}
```

---

## 2️⃣ PRODUCT ENDPOINTS

### 2.1 Get Products List
**GET** `/products`

**Query Parameters:**
- `category_id` (UUID, optional): Filter by category
- `brand_id` (UUID, optional): Filter by brand
- `min_price` (number, optional): Minimum price
- `max_price` (number, optional): Maximum price
- `search` (string, optional): Full-text search
- `page` (number, default: 1): Page number
- `limit` (number, default: 12): Items per page
- `sort` (string, default: 'created_at'): Sort field
- `order` (string, default: 'desc'): Sort order (asc/desc)

**Example:** `/products?category_id=xxx&min_price=10000&max_price=50000&search=cam&page=1&limit=12`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "uuid",
        "sku": "CF-OR-CAM",
        "name": "Cam sanh huu co",
        "slug": "cam-sanh-huu-co",
        "category": {
          "id": "uuid",
          "name": "Trai cay"
        },
        "brand": {
          "id": "uuid",
          "name": "Farm Fresh"
        },
        "price": 45000,
        "discount_rate": 0,
        "final_price": 45000,
        "unit": "KG",
        "short_desc": "Cam sanh tuoi ngon",
        "main_image": "url",
        "stock_qty": 150,
        "is_active": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 12,
      "total": 50,
      "total_pages": 5
    }
  }
}
```

**PostgreSQL Query:**
```sql
SELECT 
  p.id, p.sku, p.name, p.slug, p.price, p.discount_rate, p.unit, p.short_desc, p.is_active,
  c.id as category_id, c.name as category_name,
  b.id as brand_id, b.name as brand_name,
  i.stock_qty,
  (SELECT url FROM agri.product_images WHERE product_id = p.id AND is_main = true LIMIT 1) as main_image
FROM agri.products p
LEFT JOIN agri.categories c ON c.id = p.category_id
LEFT JOIN agri.brands b ON b.id = p.brand_id
LEFT JOIN agri.inventory i ON i.product_id = p.id
WHERE p.is_active = true
  AND ($1::uuid IS NULL OR p.category_id = $1)
  AND ($2::uuid IS NULL OR p.brand_id = $2)
  AND ($3::numeric IS NULL OR p.price >= $3)
  AND ($4::numeric IS NULL OR p.price <= $4)
  AND ($5::text IS NULL OR p.search_tsv @@ to_tsquery('simple', $5))
ORDER BY p.created_at DESC
LIMIT $6 OFFSET $7;
```

---

### 2.2 Get Product Detail
**GET** `/products/:id`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sku": "CF-OR-CAM",
    "name": "Cam sanh huu co",
    "slug": "cam-sanh-huu-co",
    "category": { "id": "uuid", "name": "Trai cay" },
    "brand": { "id": "uuid", "name": "Farm Fresh" },
    "price": 45000,
    "cost_price": 30000,
    "tax_rate": 8,
    "discount_rate": 0,
    "final_price": 45000,
    "unit": "KG",
    "weight_gram": 1000,
    "short_desc": "Cam sanh tuoi ngon",
    "description": "Mo ta chi tiet...",
    "images": [
      { "id": "uuid", "url": "url1", "is_main": true },
      { "id": "uuid", "url": "url2", "is_main": false }
    ],
    "stock_qty": 150,
    "reserved_qty": 10,
    "is_active": true
  }
}
```

**PostgreSQL Query:**
```sql
SELECT 
  p.*,
  c.id as category_id, c.name as category_name,
  b.id as brand_id, b.name as brand_name,
  i.stock_qty, i.reserved_qty,
  jsonb_agg(
    jsonb_build_object('id', pi.id, 'url', pi.url, 'is_main', pi.is_main)
    ORDER BY pi.is_main DESC, pi.sort_order
  ) FILTER (WHERE pi.id IS NOT NULL) as images
FROM agri.products p
LEFT JOIN agri.categories c ON c.id = p.category_id
LEFT JOIN agri.brands b ON b.id = p.brand_id
LEFT JOIN agri.inventory i ON i.product_id = p.id
LEFT JOIN agri.product_images pi ON pi.product_id = p.id
WHERE p.id = $1
GROUP BY p.id, c.id, c.name, b.id, b.name, i.stock_qty, i.reserved_qty;
```

---

### 2.3 Create Product (ADMIN)
**POST** `/products`  
🔒 Requires: ADMIN role

**Body:**
```json
{
  "sku": "CF-OR-OI",
  "name": "Oi xanh",
  "slug": "oi-xanh",
  "category_id": "uuid",
  "brand_id": "uuid",
  "unit": "KG",
  "price": 35000,
  "cost_price": 20000,
  "tax_rate": 5,
  "discount_rate": 0,
  "weight_gram": 500,
  "short_desc": "Oi xanh tuoi",
  "description": "Mo ta...",
  "initial_stock": 100
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Oi xanh"
  }
}
```

**PostgreSQL Queries:**
```sql
-- Insert product
INSERT INTO agri.products (...) VALUES (...) RETURNING *;

-- Initialize inventory
SELECT agri.kho_khoi_tao($product_id, $initial_stock);
```

---

### 2.4 Update Product (ADMIN)
**PUT** `/products/:id`  
🔒 Requires: ADMIN role

---

### 2.5 Delete Product (ADMIN)
**DELETE** `/products/:id`  
🔒 Requires: ADMIN role

---

## 3️⃣ CART ENDPOINTS

### 3.1 Get Cart
**GET** `/cart`  
🔒 Requires: Authentication

**Response 200:**
```json
{
  "success": true,
  "data": {
    "cart_id": "uuid",
    "items": [
      {
        "product_id": "uuid",
        "name": "Cam sanh huu co",
        "price": 45000,
        "discount_rate": 0,
        "unit": "KG",
        "qty": 2,
        "line_total": 90000,
        "image": "url"
      }
    ],
    "total_items": 2,
    "subtotal": 90000
  }
}
```

**PostgreSQL Query:**
```sql
SELECT 
  c.id as cart_id,
  ci.product_id, p.name, p.price, p.discount_rate, p.unit, ci.qty,
  (p.price * (1 - p.discount_rate / 100.0) * ci.qty) as line_total,
  (SELECT url FROM agri.product_images WHERE product_id = p.id AND is_main = true LIMIT 1) as image
FROM agri.carts c
JOIN agri.cart_items ci ON ci.cart_id = c.id
JOIN agri.products p ON p.id = ci.product_id
WHERE c.customer_id = $1;
```

---

### 3.2 Update Cart
**POST** `/cart`  
🔒 Requires: Authentication

**Body:**
```json
{
  "items": [
    { "product_id": "uuid", "qty": 2 },
    { "product_id": "uuid", "qty": 1 }
  ]
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Cart updated successfully"
}
```

**PostgreSQL Function:**
```sql
SELECT agri.cap_nhat_gio_hang($customer_id, $items_jsonb);
```

---

## 4️⃣ ORDER ENDPOINTS

### 4.1 Create Order
**POST** `/orders`  
🔒 Requires: Authentication

**Body:**
```json
{
  "shipping_address_id": "uuid",
  "items": [
    { "product_id": "uuid", "qty": 2 },
    { "product_id": "uuid", "qty": 1 }
  ],
  "shipping_fee": 30000,
  "discount_total": 0,
  "note": "Ghi chu..."
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "order_id": "uuid",
    "order_code": "AGRI-20241022-abc123",
    "grand_total": 120000
  }
}
```

**PostgreSQL Function:**
```sql
SELECT agri.tao_don_hang(
  $customer_id, 
  $shipping_addr_id, 
  $items_jsonb, 
  $shipping_fee, 
  $discount_total
) as order_id;
```

---

### 4.2 Get Orders List
**GET** `/orders`  
🔒 Requires: Authentication

**Query Parameters:**
- `status` (optional): Filter by status
- `page`, `limit`: Pagination

**Response 200:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "uuid",
        "order_code": "AGRI-20241022-abc123",
        "status": "PENDING",
        "payment_status": "UNPAID",
        "grand_total": 120000,
        "created_at": "2024-10-22T10:00:00Z"
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 5 }
  }
}
```

**PostgreSQL Query:**
```sql
-- For CUSTOMER: only their orders
-- For ADMIN: all orders
SELECT id, order_code, status, payment_status, grand_total, created_at
FROM agri.orders
WHERE ($role = 'ADMIN' OR customer_id = $user_id)
  AND ($status IS NULL OR status = $status)
ORDER BY created_at DESC
LIMIT $limit OFFSET $offset;
```

---

### 4.3 Get Order Detail
**GET** `/orders/:id`  
🔒 Requires: Authentication

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "order_code": "AGRI-20241022-abc123",
    "status": "PENDING",
    "payment_status": "UNPAID",
    "customer": {
      "id": "uuid",
      "full_name": "Nguyen Van A",
      "email": "user@example.com",
      "phone": "0901234567"
    },
    "shipping_address": {
      "recipient": "Nguyen Van A",
      "phone": "0901234567",
      "address": "123 Duong A, Phuong 1, Quan 1, TPHCM"
    },
    "items": [
      {
        "product_id": "uuid",
        "name": "Cam sanh huu co",
        "qty": 2,
        "unit_price": 45000,
        "discount_rate": 0,
        "tax_rate": 8,
        "line_total": 97200
      }
    ],
    "subtotal": 90000,
    "tax_total": 7200,
    "shipping_fee": 30000,
    "discount_total": 0,
    "grand_total": 127200,
    "created_at": "2024-10-22T10:00:00Z"
  }
}
```

**PostgreSQL Function:**
```sql
SELECT * FROM agri.don_hang_chi_tiet($order_id);
```

---

### 4.4 Update Order Status (ADMIN)
**PUT** `/orders/:id/status`  
🔒 Requires: ADMIN/STAFF role

**Body:**
```json
{
  "status": "CONFIRMED"
}
```

**Valid Statuses:**
`PENDING` → `CONFIRMED` → `PACKED` → `SHIPPING` → `DELIVERED`  
`PENDING` → `CANCELLED`

**Response 200:**
```json
{
  "success": true,
  "message": "Order status updated to CONFIRMED"
}
```

**PostgreSQL Function:**
```sql
SELECT agri.cap_nhat_trang_thai_don($order_id, $new_status::agri.order_status);
```

---

### 4.5 Mark Order as Paid (ADMIN)
**POST** `/orders/:id/payment`  
🔒 Requires: ADMIN/STAFF role

**Body:**
```json
{
  "amount": 120000,
  "method": "BANK_TRANSFER",
  "txn_ref": "TXN123456"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Payment recorded successfully"
}
```

**PostgreSQL Function:**
```sql
SELECT agri.danh_dau_thanh_toan($order_id, $amount, $method, $txn_ref);
```

---

## 5️⃣ RETURN ENDPOINTS

### 5.1 Create Return Request
**POST** `/returns`  
🔒 Requires: Authentication

**Body:**
```json
{
  "order_id": "uuid",
  "reason": "San pham bi hong",
  "items": [
    {
      "order_item_id": "uuid",
      "qty": 1
    }
  ]
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "return_id": "uuid",
    "status": "REQUESTED",
    "refund_amount": 45000
  }
}
```

**PostgreSQL Function:**
```sql
SELECT agri.tao_yeu_cau_doi_tra($order_id, $user_id, $reason, $items_jsonb) as return_id;
```

---

### 5.2 Get Returns List
**GET** `/returns`  
🔒 Requires: Authentication

**Response 200:**
```json
{
  "success": true,
  "data": {
    "returns": [
      {
        "id": "uuid",
        "order_id": "uuid",
        "order_code": "AGRI-20241022-abc123",
        "status": "REQUESTED",
        "reason": "San pham bi hong",
        "refund_amount": 45000,
        "created_at": "2024-10-22T15:00:00Z"
      }
    ]
  }
}
```

**PostgreSQL Query:**
```sql
SELECT r.*, o.order_code
FROM agri.returns r
JOIN agri.orders o ON o.id = r.order_id
WHERE ($role = 'ADMIN' OR r.request_by = $user_id)
ORDER BY r.created_at DESC;
```

---

### 5.3 Approve Return (ADMIN)
**PUT** `/returns/:id/approve`  
🔒 Requires: ADMIN role

**Response 200:**
```json
{
  "success": true,
  "message": "Return approved and stock updated"
}
```

**PostgreSQL Function:**
```sql
SELECT agri.duyet_doi_tra($return_id);
```

---

### 5.4 Reject Return (ADMIN)
**PUT** `/returns/:id/reject`  
🔒 Requires: ADMIN role

**Response 200:**
```json
{
  "success": true,
  "message": "Return rejected"
}
```

**PostgreSQL Query:**
```sql
UPDATE agri.returns
SET status = 'REJECTED', updated_at = NOW()
WHERE id = $return_id;
```

---

## 6️⃣ DASHBOARD ENDPOINTS (ADMIN)

### 6.1 Dashboard Overview
**GET** `/dashboard/overview`  
🔒 Requires: ADMIN/STAFF role

**Query Parameters:**
- `start_date` (date, required): e.g. 2024-10-01
- `end_date` (date, required): e.g. 2024-10-31

**Response 200:**
```json
{
  "success": true,
  "data": {
    "total_orders": 150,
    "total_revenue": 45000000,
    "delivered": 120,
    "cancelled": 10,
    "returning_count": 5
  }
}
```

**PostgreSQL Function:**
```sql
SELECT * FROM agri.tong_quan_dashboard($start_date, $end_date);
```

---

### 6.2 Revenue Report
**GET** `/dashboard/revenue`  
🔒 Requires: ADMIN/STAFF role

**Query Parameters:**
- `start_date` (date)
- `end_date` (date)

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-10-01",
      "orders_count": 15,
      "gross": 3500000,
      "shipping": 300000,
      "discount": 50000,
      "tax": 280000,
      "net": 4030000
    },
    {
      "date": "2024-10-02",
      "orders_count": 12,
      "gross": 2800000,
      "shipping": 240000,
      "discount": 0,
      "tax": 224000,
      "net": 3264000
    }
  ]
}
```

**PostgreSQL Function:**
```sql
SELECT * FROM agri.thong_ke_doanh_thu($start_date, $end_date);
```

---

### 6.3 Top Products
**GET** `/dashboard/top-products`  
🔒 Requires: ADMIN/STAFF role

**Query Parameters:**
- `start_date` (date)
- `end_date` (date)
- `limit` (number, default: 10)

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "product_id": "uuid",
      "name": "Cam sanh huu co",
      "total_qty": 150,
      "revenue": 6750000
    },
    {
      "product_id": "uuid",
      "name": "Xoai cat",
      "total_qty": 80,
      "revenue": 5200000
    }
  ]
}
```

**PostgreSQL Function:**
```sql
SELECT * FROM agri.top_san_pham_theo_doanh_thu($start_date, $end_date, $limit);
```

---

## 7️⃣ CATEGORY & BRAND ENDPOINTS

### 7.1 Get Categories
**GET** `/categories`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Rau cu",
      "slug": "rau-cu",
      "parent_id": null
    },
    {
      "id": "uuid",
      "name": "Trai cay",
      "slug": "trai-cay",
      "parent_id": null
    }
  ]
}
```

---

### 7.2 Get Brands
**GET** `/brands`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Farm Fresh",
      "slug": "farm-fresh"
    }
  ]
}
```

---

## 8️⃣ USER ADDRESS ENDPOINTS

### 8.1 Get Addresses
**GET** `/addresses`  
🔒 Requires: Authentication

---

### 8.2 Create Address
**POST** `/addresses`  
🔒 Requires: Authentication

**Body:**
```json
{
  "label": "Nha",
  "recipient": "Nguyen Van A",
  "phone": "0901234567",
  "line1": "123 Duong A",
  "ward": "Phuong 1",
  "district": "Quan 1",
  "city": "TPHCM",
  "is_default": true
}
```

---

## 📊 ERROR RESPONSES

### Standard Error Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

### Common Error Codes
| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid input data |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Duplicate resource (e.g. email exists) |
| 500 | INTERNAL_ERROR | Server error |

---

## 🔄 Rate Limiting
- **General**: 100 requests/15 minutes per IP
- **Auth endpoints**: 5 requests/15 minutes per IP
- **Admin endpoints**: 200 requests/15 minutes

---

## 📝 NOTES
1. Tất cả dates sử dụng ISO 8601 format: `2024-10-22T10:30:00Z`
2. Tất cả amounts là số nguyên (VND), không có decimal
3. Pagination mặc định: page=1, limit=20, max_limit=100
4. Full-text search sử dụng PostgreSQL `tsvector`, hỗ trợ tiếng Việt không dấu
