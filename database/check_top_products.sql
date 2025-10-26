-- ================================================
-- CHECK TOP PRODUCTS DATA - DEBUG SCRIPT
-- ================================================

-- 1. CHECK: Có orders không?
SELECT 
  COUNT(*) as total_orders,
  COUNT(CASE WHEN status NOT IN ('CANCELLED', 'FAILED') THEN 1 END) as valid_orders
FROM agri.orders;

-- 2. CHECK: Có order_items không?
SELECT COUNT(*) as total_order_items
FROM agri.order_items;

-- 3. CHECK: Orders có items không?
SELECT 
  o.id,
  o.order_code,
  o.status,
  o.created_at,
  (SELECT COUNT(*) FROM agri.order_items oi WHERE oi.order_id = o.id) as items_count
FROM agri.orders o
ORDER BY o.created_at DESC
LIMIT 10;

-- 4. CHECK: Top products query (30 ngày)
SELECT 
  p.id as product_id,
  p.name as product_name,
  COALESCE(c.name, 'Khác') as category_name,
  COALESCE(SUM(oi.qty), 0) as total_sold,
  COALESCE(SUM(oi.line_total), 0) as total_revenue
FROM agri.order_items oi
JOIN agri.orders o ON o.id = oi.order_id
JOIN agri.products p ON p.id = oi.product_id
LEFT JOIN agri.categories c ON c.id = p.category_id
WHERE o.created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND o.created_at <= CURRENT_DATE
  AND o.status NOT IN ('CANCELLED', 'FAILED')
GROUP BY p.id, p.name, c.name
ORDER BY total_sold DESC
LIMIT 5;

-- 5. CHECK: Top products query (ALL TIME - no date filter)
SELECT 
  p.id as product_id,
  p.name as product_name,
  COALESCE(c.name, 'Khác') as category_name,
  COALESCE(SUM(oi.qty), 0) as total_sold,
  COALESCE(SUM(oi.line_total), 0) as total_revenue
FROM agri.order_items oi
JOIN agri.orders o ON o.id = oi.order_id
JOIN agri.products p ON p.id = oi.product_id
LEFT JOIN agri.categories c ON c.id = p.category_id
WHERE o.status NOT IN ('CANCELLED', 'FAILED')
GROUP BY p.id, p.name, c.name
ORDER BY total_sold DESC
LIMIT 5;

-- 6. CHECK: Order items chi tiết
SELECT 
  oi.id,
  o.order_code,
  o.status,
  o.created_at,
  p.name as product_name,
  oi.qty,
  oi.unit_price,
  oi.line_total
FROM agri.order_items oi
JOIN agri.orders o ON o.id = oi.order_id
JOIN agri.products p ON p.id = oi.product_id
WHERE o.status NOT IN ('CANCELLED', 'FAILED')
ORDER BY o.created_at DESC
LIMIT 20;

-- ================================================
-- TROUBLESHOOTING
-- ================================================

-- Nếu total_order_items = 0:
-- → CHƯA CÓ ORDER ITEMS TRONG DATABASE
-- → Cần tạo orders với items

-- Nếu valid_orders = 0:
-- → TẤT CẢ ORDERS BỊ CANCELLED
-- → Cần tạo orders mới hoặc update status

-- Nếu query trả về empty:
-- → Check date filter (30 ngày có thể không có data)
-- → Thử query ALL TIME (không filter date)
