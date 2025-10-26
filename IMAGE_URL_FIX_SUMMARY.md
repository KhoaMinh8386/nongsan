# Fix: Cập Nhật Logic Sử Dụng image_url Thay Vì main_image

**Date:** 2025-10-24  
**Issue:** Backend queries đang tìm column `main_image` nhưng database có column `image_url`

## ✅ Các File Đã Sửa

### Backend Services

#### 1. **orderService.js**
```javascript
// OLD: p.main_image
// NEW: p.image_url

// Query items
SELECT oi.id, oi.product_id, p.name as product_name, p.unit, p.image_url, ...

// Mapping
image: item.image_url  // Thay vì item.main_image
```

#### 2. **checkoutService.js**
```javascript
// OLD: p.main_image as image
// NEW: p.image_url as image

SELECT ... p.image_url as image ...
```

#### 3. **productService.js**
```javascript
// getProducts() - Sử dụng trực tiếp column
p.image_url as main_image

// getProductById() - Trả về cả 2 field
{
  image_url: row.image_url,
  main_image: row.image_url,  // Alias cho compatibility
  images: row.images || []     // Từ product_images table
}
```

## 📊 Database Schema

### Table: agri.products
```sql
-- Column đang tồn tại
image_url TEXT  -- URL hoặc path của hình ảnh chính
```

### Table: agri.product_images (Optional)
```sql
-- Dùng cho multiple images trong tương lai
CREATE TABLE agri.product_images (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES agri.products(id),
  url TEXT NOT NULL,
  alt_text TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔄 Logic Hiện Tại

### Single Image (Main)
- **Storage:** Column `image_url` trong table `products`
- **Usage:** Direct query từ products table
- **Frontend:** Nhận field `image` trong order items

### Multiple Images (Future)
- **Storage:** Table `product_images` với foreign key
- **Usage:** JSONB aggregation trong getProductById
- **Frontend:** Nhận array `images` trong product detail

## ✅ Verification

### Test Order Detail API
```bash
GET /api/orders/:id

Response:
{
  "items": [
    {
      "id": "...",
      "product_name": "...",
      "image": "https://...",  // ✅ Từ products.image_url
      "qty": 2,
      ...
    }
  ]
}
```

### Test Product List API
```bash
GET /api/products

Response:
{
  "data": [
    {
      "id": "...",
      "name": "...",
      "main_image": "https://...",  // ✅ Từ products.image_url
      ...
    }
  ]
}
```

## 🎯 Next Steps

1. ✅ Tất cả queries đã update sử dụng `image_url`
2. ✅ Response mapping đã consistent
3. ⏳ Test frontend hiển thị hình ảnh
4. ⏳ Optional: Implement multiple images upload

## 📝 Notes

- Column `image_url` đã tồn tại trong database từ trước
- Không cần chạy migration mới
- Code đã tương thích với cả single và multiple images
- Frontend nhận field `image` cho order items và `main_image` cho product list
