import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import useWebSocket from '../../hooks/useWebSocket';
import { formatCurrency } from '../../utils/formatters';
import { Package, ChevronRight, Clock, Truck, MapPin, CheckCircle, XCircle, Wifi, WifiOff } from 'lucide-react';

function OrderHistory() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, shipping, delivered, failed

  // WebSocket for realtime updates
  const { isConnected } = useWebSocket((message) => {
    if (message.type === 'order_status_update') {
      console.log('📢 Order status updated:', message.data);
      fetchOrders(); // Refresh orders when any order updates
      showNotification('Đơn hàng đã được cập nhật');
    }
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/orders');
      setOrders(response.data.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message) => {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  const getStatusBadge = (status) => {
    const badges = {
      PENDING: { text: 'Chờ xử lý', class: 'bg-yellow-100 text-yellow-800', icon: Clock },
      PROCESSING: { text: 'Đang xử lý', class: 'bg-blue-100 text-blue-800', icon: Package },
      SHIPPING: { text: 'Đang giao', class: 'bg-purple-100 text-purple-800', icon: Truck },
      DRIVER_ARRIVED: { text: 'Tài xế đã đến', class: 'bg-indigo-100 text-indigo-800', icon: MapPin },
      DELIVERED: { text: 'Giao thành công', class: 'bg-green-100 text-green-800', icon: CheckCircle },
      FAILED: { text: 'Giao thất bại', class: 'bg-red-100 text-red-800', icon: XCircle },
      CANCELLED: { text: 'Đã hủy', class: 'bg-gray-100 text-gray-800', icon: XCircle },
    };
    return badges[status] || badges.PENDING;
  };

  const getStepProgress = (status) => {
    const steps = ['PENDING', 'PROCESSING', 'SHIPPING', 'DRIVER_ARRIVED', 'DELIVERED'];
    const currentIndex = steps.indexOf(status);
    return currentIndex >= 0 ? ((currentIndex + 1) / steps.length) * 100 : 0;
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    if (filter === 'pending') return order.status === 'PENDING' || order.status === 'PROCESSING';
    if (filter === 'shipping') return order.status === 'SHIPPING' || order.status === 'DRIVER_ARRIVED';
    if (filter === 'delivered') return order.status === 'DELIVERED';
    if (filter === 'failed') return order.status === 'FAILED' || order.status === 'CANCELLED';
    return true;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Đơn hàng của tôi</h1>
        
        {/* Connection Status */}
        <div className="flex items-center">
          {isConnected ? (
            <span className="flex items-center text-green-600 text-sm">
              <Wifi className="h-4 w-4 mr-1" />
              Realtime
            </span>
          ) : (
            <span className="flex items-center text-gray-400 text-sm">
              <WifiOff className="h-4 w-4 mr-1" />
              Offline
            </span>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="flex border-b overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-4 font-medium whitespace-nowrap ${
              filter === 'all'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Tất cả ({orders.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-6 py-4 font-medium whitespace-nowrap ${
              filter === 'pending'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Chờ xử lý ({orders.filter(o => o.status === 'PENDING' || o.status === 'PROCESSING').length})
          </button>
          <button
            onClick={() => setFilter('shipping')}
            className={`px-6 py-4 font-medium whitespace-nowrap ${
              filter === 'shipping'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Đang giao ({orders.filter(o => o.status === 'SHIPPING' || o.status === 'DRIVER_ARRIVED').length})
          </button>
          <button
            onClick={() => setFilter('delivered')}
            className={`px-6 py-4 font-medium whitespace-nowrap ${
              filter === 'delivered'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Hoàn thành ({orders.filter(o => o.status === 'DELIVERED').length})
          </button>
          <button
            onClick={() => setFilter('failed')}
            className={`px-6 py-4 font-medium whitespace-nowrap ${
              filter === 'failed'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Thất bại ({orders.filter(o => o.status === 'FAILED' || o.status === 'CANCELLED').length})
          </button>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Chưa có đơn hàng</h2>
          <p className="text-gray-600 mb-6">
            {filter === 'all' 
              ? 'Bạn chưa có đơn hàng nào. Hãy mua sắm ngay!'
              : 'Không có đơn hàng trong mục này'}
          </p>
          {filter === 'all' && (
            <button onClick={() => navigate('/products')} className="btn-primary">
              Mua sắm ngay
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const statusInfo = getStatusBadge(order.status);
            const StatusIcon = statusInfo.icon;
            const progress = getStepProgress(order.status);

            return (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/orders/${order.id}`)}
              >
                <div className="p-6">
                  {/* Order Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Package className="h-5 w-5 text-primary-600 mr-2" />
                      <div>
                        <p className="font-semibold text-lg">{order.order_code}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(order.created_at).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.class} flex items-center`}>
                        <StatusIcon className="h-4 w-4 mr-1" />
                        {statusInfo.text}
                      </span>
                      <ChevronRight className="h-5 w-5 text-gray-400 ml-2" />
                    </div>
                  </div>

                  {/* Progress Bar for Active Orders */}
                  {order.status !== 'FAILED' && order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>Tiến trình giao hàng</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Order Items Preview */}
                  <div className="border-t pt-4 mb-4">
                    <p className="text-sm text-gray-600 mb-2">
                      {order.item_count || 1} sản phẩm
                    </p>
                  </div>

                  {/* Order Total */}
                  <div className="flex items-center justify-between border-t pt-4">
                    <div>
                      <p className="text-sm text-gray-600">Tổng thanh toán</p>
                      <p className="text-xl font-bold text-primary-600">
                        {formatCurrency(order.grand_total)}
                      </p>
                    </div>
                    
                    {/* Action based on status */}
                    {order.status === 'DELIVERED' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/returns/create/${order.id}`);
                        }}
                        className="btn-outline text-sm"
                      >
                        Yêu cầu đổi trả
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default OrderHistory;
