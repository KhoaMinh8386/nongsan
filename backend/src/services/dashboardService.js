import pool from '../config/db.js';

export const getDashboardOverview = async (startDate, endDate) => {
  try {
    // Try stored procedure first
    const result = await pool.query(
      'SELECT * FROM agri.tong_quan_dashboard($1, $2)',
      [startDate, endDate]
    );
    
    if (result.rows.length > 0) {
      return {
        total_orders: result.rows[0].total_orders || 0,
        total_revenue: parseFloat(result.rows[0].total_revenue || 0),
        delivered: result.rows[0].delivered || 0,
        cancelled: result.rows[0].cancelled || 0,
        returning_count: result.rows[0].returning_count || 0
      };
    }
  } catch (error) {
    console.error('Stored procedure error, using direct query:', error.message);
  }
  
  // Fallback to direct queries if stored procedure fails
  try {
    const statsQuery = await pool.query(
      `SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(grand_total), 0) as total_revenue,
        COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled
       FROM agri.orders
       WHERE created_at >= $1 AND created_at <= $2`,
      [startDate, endDate]
    );
    
    const returnsQuery = await pool.query(
      `SELECT COUNT(*) as returning_count
       FROM agri.returns
       WHERE created_at >= $1 AND created_at <= $2`,
      [startDate, endDate]
    );
    
    return {
      total_orders: parseInt(statsQuery.rows[0].total_orders),
      total_revenue: parseFloat(statsQuery.rows[0].total_revenue),
      delivered: parseInt(statsQuery.rows[0].delivered),
      cancelled: parseInt(statsQuery.rows[0].cancelled),
      returning_count: parseInt(returnsQuery.rows[0].returning_count)
    };
  } catch (error) {
    console.error('Dashboard overview error:', error);
    return {
      total_orders: 0,
      total_revenue: 0,
      delivered: 0,
      cancelled: 0,
      returning_count: 0
    };
  }
};

export const getRevenueReport = async (startDate, endDate) => {
  try {
    // Try stored procedure first
    const result = await pool.query(
      'SELECT * FROM agri.thong_ke_doanh_thu($1, $2)',
      [startDate, endDate]
    );
    
    if (result.rows.length > 0) {
      return result.rows.map(row => ({
        date: row.d,
        orders_count: row.orders_count || 0,
        gross: parseFloat(row.gross || 0),
        shipping: parseFloat(row.shipping || 0),
        discount: parseFloat(row.discount || 0),
        tax: parseFloat(row.tax || 0),
        net: parseFloat(row.net || 0)
      }));
    }
  } catch (error) {
    console.error('Stored procedure error, using direct query:', error.message);
  }
  
  // Fallback to direct queries
  try {
    const result = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders_count,
        COALESCE(SUM(grand_total), 0) as net
       FROM agri.orders
       WHERE created_at >= $1 AND created_at <= $2
         AND status NOT IN ('CANCELLED', 'FAILED')
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [startDate, endDate]
    );
    
    return result.rows.map(row => ({
      date: row.date,
      orders_count: parseInt(row.orders_count),
      gross: parseFloat(row.net),
      shipping: 0,
      discount: 0,
      tax: 0,
      net: parseFloat(row.net)
    }));
  } catch (error) {
    console.error('Revenue report error:', error);
    return [];
  }
};

export const getTopProducts = async (startDate, endDate, limit = 10) => {
  try {
    // Try stored procedure first
    const result = await pool.query(
      'SELECT * FROM agri.top_san_pham_theo_doanh_thu($1, $2, $3)',
      [startDate, endDate, limit]
    );
    
    return result.rows.map(row => ({
      product_id: row.product_id,
      product_name: row.name || row.product_name,
      category_name: row.category_name || 'Khác',
      total_sold: parseFloat(row.total_qty || 0),
      total_revenue: parseFloat(row.revenue || 0),
      percent_change: 0 // Mock - cần so sánh với period trước
    }));
  } catch (error) {
    console.error('Stored procedure error, using direct query:', error.message);
  }
  
  // Fallback to direct query with date range
  try {
    let result = await pool.query(
      `SELECT 
        p.id as product_id,
        p.name as product_name,
        COALESCE(c.name, 'Khác') as category_name,
        COALESCE(SUM(oi.qty), 0) as total_sold,
        COALESCE(SUM(oi.line_total), 0) as total_revenue
       FROM agri.order_items oi
       JOIN agri.orders o ON o.id = oi.order_id
       JOIN agri.products p ON p.id = oi.product_id
       LEFT JOIN agri.categories c ON c.id = p.category_id
       WHERE o.created_at >= $1 AND o.created_at <= $2
         AND o.status NOT IN ('CANCELLED', 'FAILED')
       GROUP BY p.id, p.name, c.name
       ORDER BY total_sold DESC
       LIMIT $3`,
      [startDate, endDate, limit]
    );
    
    // If no data in date range, try all-time
    if (result.rows.length === 0) {
      console.log('No data in date range, querying all-time top products');
      result = await pool.query(
        `SELECT 
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
         LIMIT $1`,
        [limit]
      );
    }
    
    return result.rows.map(row => ({
      product_id: row.product_id,
      product_name: row.product_name,
      category_name: row.category_name,
      total_sold: parseFloat(row.total_sold),
      total_revenue: parseFloat(row.total_revenue),
      percent_change: 0
    }));
  } catch (error) {
    console.error('Top products error:', error);
    return [];
  }
};

// Get new customers count
export const getNewCustomers = async (startDate, endDate) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as new_customers
       FROM agri.accounts
       WHERE role = 'CUSTOMER'
         AND created_at >= $1 AND created_at <= $2`,
      [startDate, endDate]
    );
    
    return {
      new_customers: parseInt(result.rows[0].new_customers || 0)
    };
  } catch (error) {
    console.error('New customers error:', error);
    return { new_customers: 0 };
  }
};

// Get recent orders
export const getRecentOrders = async (limit = 5) => {
  try {
    const result = await pool.query(
      `SELECT 
        o.id,
        o.order_code,
        o.status,
        o.grand_total as total_price,
        o.created_at,
        a.full_name as customer_name,
        (SELECT COUNT(*) FROM agri.order_items oi WHERE oi.order_id = o.id) as total_items
       FROM agri.orders o
       JOIN agri.accounts a ON a.id = o.customer_id
       ORDER BY o.created_at DESC
       LIMIT $1`,
      [limit]
    );
    
    return result.rows.map(row => ({
      order_id: row.id,
      order_code: row.order_code,
      customer_name: row.customer_name,
      total_items: parseInt(row.total_items),
      total_price: parseFloat(row.total_price),
      status: row.status,
      created_at: row.created_at
    }));
  } catch (error) {
    console.error('Recent orders error:', error);
    return [];
  }
};

// Get dashboard summary
export const getDashboardSummary = async (startDate, endDate) => {
  try {
    // Get overview data
    const overview = await getDashboardOverview(startDate, endDate);
    
    // Get new customers
    const customers = await getNewCustomers(startDate, endDate);
    
    // Get top products count
    const topProducts = await getTopProducts(startDate, endDate, 10);
    
    return {
      total_revenue: overview.total_revenue,
      total_orders: overview.total_orders,
      new_customers: customers.new_customers,
      top_products_count: topProducts.length
    };
  } catch (error) {
    console.error('Dashboard summary error:', error);
    return {
      total_revenue: 0,
      total_orders: 0,
      new_customers: 0,
      top_products_count: 0
    };
  }
};
