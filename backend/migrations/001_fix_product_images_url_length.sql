-- Migration: Fix product_images.url column length
-- Vấn đề: Column url có thể bị giới hạn VARCHAR(255), không đủ chứa URL dài
-- Giải pháp: Chuyển sang TEXT để lưu URL không giới hạn độ dài

-- Kiểm tra và sửa column url trong bảng product_images
ALTER TABLE agri.product_images 
ALTER COLUMN url TYPE TEXT;

-- Tương tự cho bảng products (nếu có)
ALTER TABLE agri.products 
ALTER COLUMN image_url TYPE TEXT;

-- Comment
COMMENT ON COLUMN agri.product_images.url IS 'Full image URL (local path or external URL) - no length limit';
COMMENT ON COLUMN agri.products.image_url IS 'Main product image URL - no length limit';

-- Verify
SELECT 
    table_name, 
    column_name, 
    data_type, 
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'agri' 
  AND table_name IN ('product_images', 'products')
  AND column_name IN ('url', 'image_url');
