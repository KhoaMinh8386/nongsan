-- ============================================
-- DASHBOARD QUERIES - NÔNG SẢN SẠCH
-- ============================================

-- 1. ĐẾM KHÁCH HÀNG MỚI TRONG 30 NGÀY
-- ============================================
SELECT COUNT(*) as new_customers
FROM agri.accounts
WHERE role = 'CUSTOMER'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND created_at <= CURRENT_DATE;


-- 2. TOP 5 SẢN PHẨM BÁN CHẠY NHẤT (Theo số lượng)
-- ============================================
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


-- 3. TOP 5 ĐƠN HÀNG GẦN ĐÂY NHẤT
-- ============================================
SELECT 
  o.id as order_id,
  o.order_code,
  o.status,
  o.grand_total as total_price,
  o.created_at,
  a.full_name as customer_name,
  (SELECT COUNT(*) FROM agri.order_items oi WHERE oi.order_id = o.id) as total_items
FROM agri.orders o
JOIN agri.accounts a ON a.id = o.customer_id
ORDER BY o.created_at DESC
LIMIT 5;


-- 4. TỔNG QUAN DASHBOARD (30 NGÀY)
-- ============================================
SELECT 
  COUNT(*) as total_orders,
  COALESCE(SUM(grand_total), 0) as total_revenue,
  COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END) as delivered,
  COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled
FROM agri.orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND created_at <= CURRENT_DATE;


-- 5. DOANH THU THEO TỪNG NGÀY (30 NGÀY)
-- ============================================
SELECT 
  DATE(created_at) as date,
  COUNT(*) as orders_count,
  COALESCE(SUM(grand_total), 0) as net
FROM agri.orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND created_at <= CURRENT_DATE
  AND status NOT IN ('CANCELLED', 'FAILED')
GROUP BY DATE(created_at)
ORDER BY date ASC;


-- 6. DOANH THU THEO DANH MỤC (30 NGÀY)
-- ============================================
SELECT 
  COALESCE(c.name, 'Khác') as category_name,
  COALESCE(SUM(oi.line_total), 0) as revenue
FROM agri.order_items oi
JOIN agri.orders o ON o.id = oi.order_id
JOIN agri.products p ON p.id = oi.product_id
LEFT JOIN agri.categories c ON c.id = p.category_id
WHERE o.created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND o.created_at <= CURRENT_DATE
  AND o.status NOT IN ('CANCELLED', 'FAILED')
GROUP BY c.name
ORDER BY revenue DESC;


-- 7. DASHBOARD SUMMARY (TẤT CẢ CHỈ SỐ)
-- ============================================
WITH stats AS (
  SELECT 
    COUNT(*) as total_orders,
    COALESCE(SUM(grand_total), 0) as total_revenue
  FROM agri.orders
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND created_at <= CURRENT_DATE
),
customers AS (
  SELECT COUNT(*) as new_customers
  FROM agri.accounts
  WHERE role = 'CUSTOMER'
    AND created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND created_at <= CURRENT_DATE
),
top_products AS (
  SELECT COUNT(DISTINCT p.id) as top_products_count
  FROM agri.order_items oi
  JOIN agri.orders o ON o.id = oi.order_id
  JOIN agri.products p ON p.id = oi.product_id
  WHERE o.created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND o.created_at <= CURRENT_DATE
    AND o.status NOT IN ('CANCELLED', 'FAILED')
)
SELECT 
  s.total_orders,
  s.total_revenue,
  c.new_customers,
  tp.top_products_count
FROM stats s, customers c, top_products tp;


-- ============================================
-- HELPER: KIỂM TRA DỮ LIỆU CÓ SẴN
-- ============================================

-- Check số lượng đơn hàng
SELECT COUNT(*) as total_orders FROM agri.orders;

-- Check số lượng sản phẩm đã bán
SELECT COUNT(DISTINCT product_id) as products_sold 
FROM agri.order_items oi
JOIN agri.orders o ON o.id = oi.order_id
WHERE o.status NOT IN ('CANCELLED', 'FAILED');

-- Check số lượng khách hàng
SELECT COUNT(*) as total_customers 
FROM agri.accounts 
WHERE role = 'CUSTOMER';

-- Check doanh thu tổng
SELECT COALESCE(SUM(grand_total), 0) as total_revenue 
FROM agri.orders
WHERE status NOT IN ('CANCELLED', 'FAILED');


-- ============================================
-- INSERT SAMPLE DATA (NẾU CHƯA CÓ DATA)
-- ============================================

-- Tạo sample customers (nếu chưa có)
/*
INSERT INTO agri.accounts (email, full_name, phone, role, password_hash, created_at)
VALUES 
  ('customer1@test.com', 'Nguyễn Văn A', '0901234567', 'CUSTOMER', '$2a$10$sample', CURRENT_DATE - INTERVAL '25 days'),
  ('customer2@test.com', 'Trần Thị B', '0901234568', 'CUSTOMER', '$2a$10$sample', CURRENT_DATE - INTERVAL '20 days'),
  ('customer3@test.com', 'Lê Văn C', '0901234569', 'CUSTOMER', '$2a$10$sample', CURRENT_DATE - INTERVAL '15 days');
*/

-- Check kết quả
SELECT 
  'Orders' as table_name, COUNT(*)::text as count FROM agri.orders
UNION ALL
SELECT 'Customers', COUNT(*)::text FROM agri.accounts WHERE role = 'CUSTOMER'
UNION ALL
SELECT 'Products', COUNT(*)::text FROM agri.products
UNION ALL
SELECT 'Order Items', COUNT(*)::text FROM agri.order_items;
