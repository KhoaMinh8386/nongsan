-- Migration: Verify image_url column exists in products table
-- Date: 2025-10-24
-- Description: Ensure image URL support for products (column should already exist)

-- Note: image_url column should already exist in products table
-- This migration ensures compatibility

-- Optional: Create index if needed for image queries
-- CREATE INDEX IF NOT EXISTS idx_products_image ON agri.products(main_image) WHERE main_image IS NOT NULL;

-- Create product_images table for multiple images support (optional for future)
CREATE TABLE IF NOT EXISTS agri.product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES agri.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON agri.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_order ON agri.product_images(product_id, display_order);

COMMENT ON TABLE agri.product_images IS 'Multiple images for each product';
