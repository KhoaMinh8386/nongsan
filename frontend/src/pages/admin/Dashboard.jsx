import { useState, useEffect } from 'react';
import { dashboardService } from '../../services/dashboardService';
import { formatCurrency } from '../../utils/formatters';
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package, 
  TrendingUp, 
  TrendingDown,
  FileText,
  Eye,
  Box
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { toast } from 'react-hot-toast';

function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartMode, setChartMode] = useState('revenue'); // 'revenue' or 'orders'

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Fetch all dashboard data
      const [summaryRes, revenueRes, topProductsRes, newCustomersRes, recentOrdersRes] = await Promise.all([
        dashboardService.getSummary(startDate, endDate),
        dashboardService.getRevenue30Days(startDate, endDate),
        dashboardService.getTopProducts(startDate, endDate, 5),
        dashboardService.getNewCustomers(startDate, endDate),
        dashboardService.getRecentOrders(5)
      ]);
      
      // Set overview from summary
      setOverview(summaryRes.data);
      
      // Set top products
      console.log('Top Products Response:', topProductsRes);
      console.log('Top Products Data:', topProductsRes.data);
      setTopProducts(topProductsRes.data || []);
      
      // Format revenue data for chart
      const formattedData = revenueRes.data.map(item => ({
        date: formatDateShort(item.date),
        fullDate: item.date,
        revenue: item.net,
        orders: item.orders_count
      }));
      setRevenueData(formattedData);

      // Calculate category data from top products
      const categoryMap = {};
      const colorMap = {
        'Rau củ': '#10b981',
        'Trái cây': '#3b82f6',
        'Nấm': '#f59e0b',
        'Hạt - Ngũ cốc': '#a855f7'
      };
      
      (topProductsRes.data || []).forEach(product => {
        const catName = product.category_name || 'Khác';
        if (!categoryMap[catName]) {
          categoryMap[catName] = 0;
        }
        categoryMap[catName] += parseFloat(product.total_revenue || 0);
      });

      // Convert to array with colors
      let categoryArray = Object.entries(categoryMap).map(([name, value]) => ({
        name,
        value,
        color: colorMap[name] || '#6b7280'
      }));

      // Fallback to mock data if no categories
      if (categoryArray.length === 0) {
        categoryArray = [
          { name: 'Rau củ', value: 4500000, color: '#10b981' },
          { name: 'Trái cây', value: 3200000, color: '#3b82f6' },
          { name: 'Nấm', value: 2100000, color: '#f59e0b' },
          { name: 'Khác', value: 1800000, color: '#a855f7' }
        ];
      }
      setCategoryData(categoryArray);

      // Process recent orders from API
      const orders = recentOrdersRes?.data || [];
      if (orders.length > 0) {
        const processedOrders = orders.map(order => ({
          id: order.order_code || `DH${String(order.order_id).padStart(3, '0')}`,
          customer: order.customer_name || 'Khách hàng',
          items: parseInt(order.total_items) || 0,
          status: mapOrderStatus(order.status),
          total: parseFloat(order.total_price) || 0
        }));
        setRecentOrders(processedOrders);
      } else {
        setRecentOrders([]);
      }

    } catch (error) {
      console.error('Error fetching overview:', error);
      toast.error('Không thể tải dữ liệu dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to map order status
  const mapOrderStatus = (status) => {
    const statusMap = {
      'DELIVERED': 'completed',
      'CONFIRMED': 'processing',
      'PENDING': 'pending',
      'CANCELLED': 'cancelled',
      'SHIPPING': 'processing'
    };
    return statusMap[status] || 'pending';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">Đang tải dữ liệu...</div>
      </div>
    );
  }

  // Calculate KPI cards data from real API responses
  const totalRevenue = overview?.total_revenue || 0;
  const totalOrders = overview?.total_orders || 0;
  const newCustomers = overview?.new_customers || 0;
  const topSellingCount = overview?.top_products_count || 0;

  const kpiCards = [
    {
      title: 'Tổng doanh thu',
      value: `${(totalRevenue / 1000000).toFixed(1)}M ₫`,
      change: '+23.5%',
      changeType: 'increase',
      subtitle: 'so với tháng trước',
      icon: DollarSign,
      bgColor: 'bg-gradient-to-br from-green-50 to-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200'
    },
    {
      title: 'Tổng đơn hàng',
      value: totalOrders,
      change: '+18.2%',
      changeType: 'increase',
      subtitle: 'so với tháng trước',
      icon: ShoppingCart,
      bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Khách hàng mới',
      value: newCustomers,
      change: '+12.8%',
      changeType: 'increase',
      subtitle: 'so với tháng trước',
      icon: Users,
      bgColor: 'bg-gradient-to-br from-purple-50 to-purple-100',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-200'
    },
    {
      title: 'Sản phẩm bán chạy',
      value: topSellingCount,
      change: '-5.3%',
      changeType: 'decrease',
      subtitle: 'so với tháng trước',
      icon: Package,
      bgColor: 'bg-gradient-to-br from-orange-50 to-orange-100',
      iconColor: 'text-orange-600',
      borderColor: 'border-orange-200'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Tổng quan hoạt động kinh doanh</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Xuất báo cáo
          </button>
          <button className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Xem chi tiết
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiCards.map((card, index) => (
          <div 
            key={index} 
            className={`${card.bgColor} ${card.borderColor} border-2 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`${card.iconColor} bg-white p-3 rounded-xl shadow-sm`}>
                <card.icon className="w-6 h-6" />
              </div>
              <div className={`flex items-center gap-1 text-sm font-semibold ${
                card.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
              }`}>
                {card.changeType === 'increase' ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {card.change}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">{card.title}</p>
              <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Line Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Doanh thu 30 ngày qua</h2>
              <p className="text-sm text-gray-500">Biểu đồ doanh thu và đơn hàng</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setChartMode('revenue')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  chartMode === 'revenue'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Doanh thu
              </button>
              <button
                onClick={() => setChartMode('orders')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  chartMode === 'orders'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Đơn hàng
              </button>
            </div>
          </div>

          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  stroke="#e5e7eb"
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickFormatter={(value) => chartMode === 'revenue' ? `${(value / 1000000).toFixed(1)}M` : value}
                  stroke="#e5e7eb"
                />
                <Tooltip content={<CustomTooltip mode={chartMode} />} />
                <Line 
                  type="monotone" 
                  dataKey={chartMode === 'revenue' ? 'revenue' : 'orders'}
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={false}
                  fill="url(#colorRevenue)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Chưa có dữ liệu</p>
            </div>
          )}
        </div>

        {/* Category Doughnut Chart */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">Phân bố danh mục</h2>
            <p className="text-sm text-gray-500">Doanh thu theo danh mục</p>
          </div>
          
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-4 space-y-3">
            {categoryData.map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                  <span className="text-sm text-gray-700">{cat.name}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{formatCurrency(cat.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section - Top Products & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Sản phẩm bán chạy</h2>
            <button className="text-sm text-green-600 hover:text-green-700 font-medium">
              Xem tất cả
            </button>
          </div>
          
          <div className="space-y-4">
            {topProducts.length > 0 ? (
              topProducts.slice(0, 5).map((product, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Box className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {product.product_name || 'Sản phẩm'}
                    </p>
                    <p className="text-xs text-gray-500">Đã bán: {product.total_sold || 0}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      {formatCurrency(product.total_revenue || 0)}
                    </p>
                    <p className={`text-xs font-medium ${
                      product.percent_change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {product.percent_change >= 0 ? '↑' : '↓'} {Math.abs(product.percent_change)}%
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                Chưa có sản phẩm bán chạy
              </div>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Đơn hàng gần đây</h2>
            <button className="text-sm text-green-600 hover:text-green-700 font-medium">
              Xem tất cả
            </button>
          </div>
          
          <div className="space-y-4">
            {recentOrders.length > 0 ? (
              recentOrders.map((order, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{order.id}</p>
                    <p className="text-xs text-gray-500">{order.customer} • {order.items} sản phẩm</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      order.status === 'completed' ? 'bg-green-100 text-green-700' :
                      order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {order.status === 'completed' ? 'Hoàn thành' :
                       order.status === 'processing' ? 'Đang xử lý' :
                       order.status === 'pending' ? 'Chờ xác nhận' : 'Đã hủy'}
                    </span>
                    <span className="text-sm font-bold text-gray-900 min-w-[80px] text-right">
                      {formatCurrency(order.total)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                Chưa có đơn hàng
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label, mode }) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {mode === 'revenue' ? 'Doanh thu:' : 'Đơn hàng:'}
          </span>
          <span className="text-sm font-bold text-green-600">
            {mode === 'revenue' ? formatCurrency(value) : value}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

// Helper function to format date
const formatDateShort = (dateString) => {
  const date = new Date(dateString);
  return `${date.getDate()}/${date.getMonth() + 1}`;
};

export default Dashboard;
