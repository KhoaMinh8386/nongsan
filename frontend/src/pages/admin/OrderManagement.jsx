import { useState, useEffect } from 'react';
import { checkoutService } from '../../services/checkoutService';
import { formatCurrency } from '../../utils/formatters';
import { Package, Eye, Filter, X, User, MapPin, CreditCard, Wifi, WifiOff } from 'lucide-react';
import useWebSocket from '../../hooks/useWebSocket';

function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // WebSocket for realtime updates
  const { isConnected } = useWebSocket((message) => {
    if (message.type === 'new_order' || message.type === 'order_status_update') {
      console.log('📢 Order update received:', message.type, message.data);
      fetchOrders(); // Refresh orders list
      
      // If detail modal is open for this order, refresh it too
      if (selectedOrder && message.data.order_id === selectedOrder) {
        viewOrderDetail(selectedOrder);
      }
    }
  });

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = statusFilter !== 'ALL' ? { status: statusFilter } : {};
      const response = await checkoutService.getOrders(params);
      setOrders(response.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewOrderDetail = async (orderId) => {
    setLoadingDetail(true);
    setSelectedOrder(orderId);
    try {
      const response = await checkoutService.getOrderDetail(orderId);
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

  const handleUpdateStatus = async (orderId, newStatus) => {
    if (!confirm(`Xác nhận thay đổi trạng thái đơn hàng sang "${getStatusLabel(newStatus)}"?`)) {
      return;
    }

    try {
      await checkoutService.updateOrderStatus(orderId, newStatus);
      alert('Cập nhật trạng thái thành công!');
      fetchOrders();
      if (selectedOrder === orderId) {
        viewOrderDetail(orderId); // Refresh detail
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Không thể cập nhật trạng thái');
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'PENDING': 'Chờ xử lý',
      'PROCESSING': 'Đang xử lý',
      'SHIPPING': 'Đang giao',
      'DRIVER_ARRIVED': 'Đã đến nơi',
      'DELIVERED': 'Đã giao',
      'FAILED': 'Thất bại',
      'CANCELLED': 'Đã hủy'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'PROCESSING': 'bg-blue-100 text-blue-800',
      'SHIPPING': 'bg-purple-100 text-purple-800',
      'DRIVER_ARRIVED': 'bg-indigo-100 text-indigo-800',
      'DELIVERED': 'bg-green-100 text-green-800',
      'FAILED': 'bg-red-100 text-red-800',
      'CANCELLED': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      'PAID': 'bg-green-100 text-green-800',
      'PENDING_CONFIRMATION': 'bg-orange-100 text-orange-800',
      'UNPAID': 'bg-yellow-100 text-yellow-800',
      'REFUNDED': 'bg-blue-100 text-blue-800',
      'PARTIALLY_REFUNDED': 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusLabel = (status) => {
    const labels = {
      'PAID': 'Đã thanh toán',
      'PENDING_CONFIRMATION': 'Chờ xác nhận TT',
      'UNPAID': 'Chưa thanh toán',
      'REFUNDED': 'Đã hoàn tiền',
      'PARTIALLY_REFUNDED': 'Hoàn 1 phần'
    };
    return labels[status] || status;
  };

  const handleConfirmPayment = async (orderId) => {
    if (!confirm('Xác nhận đã nhận đủ tiền chuyển khoản từ khách hàng?')) {
      return;
    }

    try {
      await checkoutService.adminConfirmPayment(orderId, {
        amount: null,  // Full amount
        txn_ref: null,
        note: 'Admin xác nhận đã nhận tiền'
      });
      alert('✅ Xác nhận thanh toán thành công!');
      fetchOrders();
      if (selectedOrder === orderId) {
        viewOrderDetail(orderId);
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('❌ Không thể xác nhận thanh toán. Vui lòng thử lại.');
    }
  };

  const availableStatusTransitions = (currentStatus) => {
    const transitions = {
      'PENDING': ['PROCESSING', 'CANCELLED'],
      'PROCESSING': ['SHIPPING', 'CANCELLED'],
      'SHIPPING': ['DRIVER_ARRIVED', 'FAILED'],
      'DRIVER_ARRIVED': ['DELIVERED', 'FAILED'],
    };
    return transitions[currentStatus] || [];
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Quản lý đơn hàng</h1>
        
        {/* Realtime Status */}
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

      {/* Filter */}
      <div className="mb-6 flex items-center space-x-2">
        <Filter className="h-5 w-5 text-gray-500" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="PENDING">Chờ xử lý</option>
          <option value="PROCESSING">Đang xử lý</option>
          <option value="SHIPPING">Đang giao</option>
          <option value="DELIVERED">Đã giao</option>
          <option value="FAILED">Thất bại</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã đơn</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khách hàng</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng tiền</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thanh toán</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tạo</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    Không có đơn hàng nào
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="font-medium text-gray-900">{order.order_code}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.customer_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(order.grand_total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getPaymentStatusColor(order.payment_status)}`}>
                        {getPaymentStatusLabel(order.payment_status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => viewOrderDetail(order.id)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Mã đơn hàng</p>
                      <p className="font-semibold text-lg">{orderDetail.order_code}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Ngày tạo</p>
                      <p className="font-semibold">{new Date(orderDetail.created_at).toLocaleString('vi-VN')}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Trạng thái</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(orderDetail.status)}`}>
                        {getStatusLabel(orderDetail.status)}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Thanh toán</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(orderDetail.payment_status)}`}>
                        {getPaymentStatusLabel(orderDetail.payment_status)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Confirmation */}
                  {orderDetail.payment_status === 'PENDING_CONFIRMATION' && orderDetail.payment_method === 'BANK_TRANSFER' && (
                    <div className="bg-orange-50 border-2 border-orange-400 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-orange-800 mb-1">⚠️ Khách hàng đã xác nhận chuyển khoản</p>
                          <p className="text-sm text-orange-700">Vui lòng kiểm tra tài khoản ngân hàng và xác nhận thanh toán</p>
                        </div>
                        <button
                          onClick={() => handleConfirmPayment(orderDetail.id)}
                          className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-semibold"
                        >
                          ✅ Xác nhận đã nhận tiền
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Status Update */}
                  {availableStatusTransitions(orderDetail.status).length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="font-semibold mb-3">Thay đổi trạng thái</p>
                      <div className="flex space-x-2">
                        {availableStatusTransitions(orderDetail.status).map((status) => (
                          <button
                            key={status}
                            onClick={() => handleUpdateStatus(orderDetail.id, status)}
                            className="btn-secondary"
                          >
                            {getStatusLabel(status)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

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
                        <p className="text-gray-600 w-32">Email:</p>
                        <p className="font-medium">{orderDetail.customer?.email}</p>
                      </div>
                      <div className="flex items-center">
                        <p className="text-gray-600 w-32">Số điện thoại:</p>
                        <p className="font-medium">{orderDetail.customer?.phone}</p>
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
                      Sản phẩm ({orderDetail.items?.length || 0})
                    </h3>
                    <div className="space-y-3">
                      {orderDetail.items?.map((item, index) => (
                        <div key={index} className="flex items-center bg-gray-50 rounded-lg p-4">
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

export default OrderManagement;
