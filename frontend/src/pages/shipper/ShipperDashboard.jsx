import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { shipperService } from '../../services/shipperService';
import { formatCurrency } from '../../utils/formatters';
import useWebSocket from '../../hooks/useWebSocket';
import { Package, MapPin, Phone, User, TrendingUp, CheckCircle, XCircle, Clock, Wifi, WifiOff, Bell, X, Eye } from 'lucide-react';

function ShipperDashboard() {
  // ✅ Lấy user info từ Redux store
  const { user } = useSelector((state) => state.auth);
  
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available'); // available, myOrders, history
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // WebSocket for realtime new orders
  const { isConnected } = useWebSocket((message) => {
    if (message.type === 'new_order') {
      console.log('🆕 New order received:', message.data);
      showNotification('Có đơn hàng mới!');
      fetchData(); // Refresh orders list
    } else if (message.type === 'order_status_update') {
      console.log('📢 Order status updated:', message.data);
      fetchData(); // Refresh when any order status changes
    }
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersData, statsData] = await Promise.all([
        shipperService.getOrders(),
        shipperService.getStats()
      ]);
      
      setOrders(ordersData.data || []);
      setStats(statsData.data);
    } catch (error) {
      console.error('Error fetching shipper data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartDelivery = async (orderId) => {
  if (!confirm('Bạn muốn nhận đơn hàng này?')) return;

  try {
    await shipperService.startDelivery(orderId);
    alert('Đã nhận đơn hàng thành công!');
    await fetchData(); // Refresh lại toàn bộ data
    setActiveTab('myOrders'); // ✅ Chuyển sang tab đơn đang giao
  } catch (error) {
    alert('Không thể nhận đơn hàng: ' + (error.response?.data?.error?.message || error.message));
  }
};


  const handleUpdateStatus = async (orderId, newStatus) => {
    const messages = {
      DRIVER_ARRIVED: 'Xác nhận đã đến nơi?',
      DELIVERED: 'Xác nhận giao hàng thành công?',
      FAILED: 'Xác nhận giao hàng thất bại?'
    };

    if (!confirm(messages[newStatus])) return;

    try {
      await shipperService.updateStatus(orderId, newStatus);
      alert('Cập nhật trạng thái thành công!');
      fetchData(); // Refresh data
    } catch (error) {
      alert('Không thể cập nhật: ' + (error.response?.data?.error?.message || error.message));
    }
  };

  const viewOrderDetail = async (orderId) => {
    setLoadingDetail(true);
    setSelectedOrder(orderId);
    try {
      const response = await shipperService.getOrderDetail(orderId);
      setOrderDetail(response.data);
    } catch (error) {
      console.error('Error loading order detail:', error);
      alert('Không thể tải chi tiết đơn hàng');
      setSelectedOrder(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeModal = () => {
    setSelectedOrder(null);
    setOrderDetail(null);
  };

  const showNotification = (message) => {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-primary-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center animate-slide-in';
    notification.innerHTML = `<svg class="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>${message}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('animate-slide-out');
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  };

  const handleAcceptOrder = async (orderId) => {
  try {
    await shipperService.acceptOrder(orderId);
    
    // ✅ QUAN TRỌNG: Refresh data
    await fetchNewOrders();
    await fetchDeliveringOrders();
    await fetchStats();
    
    toast.success('Đã nhận đơn hàng');
  } catch (error) {
    console.error('Accept order error:', error);
    toast.error('Không thể nhận đơn');
  }
};
  // ✅ Tab "Đơn hàng mới": Chỉ PENDING và chưa có shipper
  const availableOrders = orders.filter(o => o.status === 'PENDING' && !o.shipper_id);
  

  
  // ✅ Tab "Đơn đang giao": PROCESSING, SHIPPING, DRIVER_ARRIVED của shipper này
  const myActiveOrders = orders.filter(o => {
    const isCorrectStatus = (o.status === 'PROCESSING' || o.status === 'SHIPPING' || o.status === 'DRIVER_ARRIVED');
    const isMyOrder = o.shipper_id === user?.id;
    
    console.log(`Order ${o.order_code}: status=${o.status}, shipper_id=${o.shipper_id}, user.id=${user?.id}, match=${isCorrectStatus && isMyOrder}`);
    
    return isCorrectStatus && isMyOrder;
  });
  
  console.log('Available orders (PENDING):', availableOrders.length);
  console.log('My active orders:', myActiveOrders.length);

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
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Dashboard Shipper</h1>
        
        {/* Connection Status */}
        <div className="flex items-center">
          {isConnected ? (
            <span className="flex items-center text-green-600">
              <Wifi className="h-5 w-5 mr-2" />
              <span className="font-medium">Realtime Active</span>
            </span>
          ) : (
            <span className="flex items-center text-gray-400">
              <WifiOff className="h-5 w-5 mr-2" />
              <span className="font-medium">Offline</span>
            </span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đang giao</p>
                <p className="text-2xl font-bold text-primary-600">{stats.active_count}</p>
              </div>
              <Clock className="h-10 w-10 text-primary-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đã giao</p>
                <p className="text-2xl font-bold text-green-600">{stats.delivered_count}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Thất bại</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed_count}</p>
              </div>
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng thu</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(stats.total_delivered_amount)}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-blue-600" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('available')}
              className={`px-6 py-4 font-medium ${
                activeTab === 'available'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Đơn hàng mới ({availableOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('myOrders')}
              className={`px-6 py-4 font-medium ${
                activeTab === 'myOrders'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Đơn đang giao ({myActiveOrders.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'available' && (
            <div className="space-y-4">
              {availableOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                  <p className="text-gray-600">Không có đơn hàng mới</p>
                </div>
              ) : (
                availableOrders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <Package className="h-5 w-5 text-primary-600 mr-2" />
                          <p className="font-semibold text-lg">{order.order_code}</p>
                          <span className={`ml-3 px-2 py-1 text-xs rounded-full ${
                            order.status === 'PENDING' 
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {order.status === 'PENDING' ? 'Chờ xử lý' : 'Đang xử lý'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div className="flex items-start">
                            <User className="h-4 w-4 text-gray-400 mr-2 mt-1" />
                            <div>
                              <p className="text-sm text-gray-600">Khách hàng</p>
                              <p className="font-medium">{order.shipping_recipient}</p>
                            </div>
                          </div>

                          <div className="flex items-start">
                            <Phone className="h-4 w-4 text-gray-400 mr-2 mt-1" />
                            <div>
                              <p className="text-sm text-gray-600">Số điện thoại</p>
                              <p className="font-medium">{order.shipping_phone}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start mb-3">
                          <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-1" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-600">Địa chỉ giao hàng</p>
                            <p className="text-gray-800">{order.shipping_address}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Tổng tiền</p>
                            <p className="text-xl font-bold text-primary-600">{formatCurrency(order.grand_total)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Thanh toán</p>
                            <p className="font-medium">{order.payment_method === 'COD' ? 'COD' : 'Chuyển khoản'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="ml-4 flex flex-col space-y-2">
                        <button
                          onClick={() => viewOrderDetail(order.id)}
                          className="btn-secondary whitespace-nowrap flex items-center justify-center"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Chi tiết
                        </button>
                        <button
                          onClick={() => handleStartDelivery(order.id)}
                          className="btn-primary whitespace-nowrap"
                        >
                          Nhận đơn
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'myOrders' && (
            <div className="space-y-4">
              {myActiveOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                  <p className="text-gray-600">Không có đơn hàng đang giao</p>
                </div>
              ) : (
                myActiveOrders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4 bg-blue-50">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <Package className="h-5 w-5 text-primary-600 mr-2" />
                          <p className="font-semibold text-lg">{order.order_code}</p>
                          <span className={`ml-3 px-2 py-1 text-xs rounded-full ${
                            order.status === 'SHIPPING'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {order.status === 'SHIPPING' ? 'Đang giao' : 'Đã đến nơi'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-gray-600">Khách hàng</p>
                            <p className="font-medium">{order.shipping_recipient}</p>
                            <p className="text-sm text-gray-600">{order.shipping_phone}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Tổng tiền</p>
                            <p className="text-xl font-bold text-primary-600">{formatCurrency(order.grand_total)}</p>
                          </div>
                        </div>

                        <div className="flex items-start mb-3">
                          <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-1" />
                          <p className="text-gray-800">{order.shipping_address}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2 mb-2">
                      <button
                        onClick={() => viewOrderDetail(order.id)}
                        className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 font-medium flex items-center justify-center"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Chi tiết
                      </button>
                    </div>
                    <div className="flex space-x-2">
                      {order.status === 'SHIPPING' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'DRIVER_ARRIVED')}
                          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
                        >
                          Đã đến nơi
                        </button>
                      )}
                      {order.status === 'DRIVER_ARRIVED' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium"
                          >
                            Giao thành công
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'FAILED')}
                            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium"
                          >
                            Giao thất bại
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Chi tiết đơn hàng</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {loadingDetail ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
              ) : orderDetail ? (
                <div className="space-y-6">
                  {/* Order Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Mã đơn hàng</p>
                        <p className="font-semibold text-lg">{orderDetail.order_code}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Trạng thái</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          orderDetail.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          orderDetail.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                          orderDetail.status === 'SHIPPING' ? 'bg-purple-100 text-purple-800' :
                          orderDetail.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {orderDetail.status === 'PENDING' ? 'Chờ xử lý' :
                           orderDetail.status === 'PROCESSING' ? 'Đang xử lý' :
                           orderDetail.status === 'SHIPPING' ? 'Đang giao' :
                           orderDetail.status === 'DELIVERED' ? 'Đã giao' : 'Thất bại'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Thanh toán</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          orderDetail.payment_status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {orderDetail.payment_status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Tổng tiền</p>
                        <p className="font-bold text-xl text-primary-600">{formatCurrency(orderDetail.grand_total)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3 flex items-center">
                      <User className="h-5 w-5 mr-2 text-primary-600" />
                      Thông tin khách hàng
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center">
                        <p className="text-gray-600 w-32">Tên:</p>
                        <p className="font-medium">{orderDetail.customer?.full_name}</p>
                      </div>
                      <div className="flex items-center">
                        <p className="text-gray-600 w-32">Số điện thoại:</p>
                        <p className="font-medium">{orderDetail.customer?.phone}</p>
                      </div>
                      <div className="flex items-center">
                        <p className="text-gray-600 w-32">Email:</p>
                        <p className="font-medium">{orderDetail.customer?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  {orderDetail.shipping_recipient && (
                    <div>
                      <h3 className="font-semibold text-lg mb-3 flex items-center">
                        <MapPin className="h-5 w-5 mr-2 text-primary-600" />
                        Địa chỉ giao hàng
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <div className="flex items-center">
                          <p className="text-gray-600 w-32">Người nhận:</p>
                          <p className="font-medium">{orderDetail.shipping_recipient}</p>
                        </div>
                        <div className="flex items-center">
                          <p className="text-gray-600 w-32">Số điện thoại:</p>
                          <p className="font-medium">{orderDetail.shipping_phone}</p>
                        </div>
                        <div className="flex items-start">
                          <p className="text-gray-600 w-32">Địa chỉ:</p>
                          <p className="font-medium flex-1">{orderDetail.shipping_address}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Order Items */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3 flex items-center">
                      <Package className="h-5 w-5 mr-2 text-primary-600" />
                      Sản phẩm trong đơn
                    </h3>
                    <div className="space-y-3">
                      {orderDetail.items?.map((item, index) => (
                        <div key={index} className="flex items-center bg-gray-50 rounded-lg p-4">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="h-16 w-16 object-cover rounded-md mr-4"
                              onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/64?text=No+Image';
                              }}
                            />
                          ) : (
                            <div className="h-16 w-16 bg-gray-200 rounded-md mr-4 flex items-center justify-center">
                              <Package className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-600">Số lượng: {item.qty}</p>
                            <p className="text-sm text-gray-600">Đơn giá: {formatCurrency(item.unit_price)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary-600">{formatCurrency(item.line_total)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="border-t pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tạm tính:</span>
                        <span className="font-medium">{formatCurrency(orderDetail.subtotal)}</span>
                      </div>
                      {orderDetail.tax_total > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Thuế:</span>
                          <span className="font-medium">{formatCurrency(orderDetail.tax_total)}</span>
                        </div>
                      )}
                      {orderDetail.shipping_fee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Phí vận chuyển:</span>
                          <span className="font-medium">{formatCurrency(orderDetail.shipping_fee)}</span>
                        </div>
                      )}
                      {orderDetail.discount_total > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Giảm giá:</span>
                          <span className="font-medium">-{formatCurrency(orderDetail.discount_total)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Tổng cộng:</span>
                        <span className="text-primary-600">{formatCurrency(orderDetail.grand_total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Note */}
                  {orderDetail.note && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-yellow-800 mb-1">Ghi chú:</p>
                      <p className="text-gray-700">{orderDetail.note}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600">Không thể tải thông tin đơn hàng</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4">
              <button onClick={closeModal} className="btn-secondary w-full">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShipperDashboard;
