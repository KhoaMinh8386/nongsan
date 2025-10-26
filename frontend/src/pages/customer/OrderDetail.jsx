import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { checkoutService } from '../../services/checkoutService';
import { returnService } from '../../services/returnService';
import { formatCurrency } from '../../utils/formatters';
import OrderStatusStepper from '../../components/OrderStatusStepper';
import useWebSocket from '../../hooks/useWebSocket';
import { Package, MapPin, CreditCard, FileText, ArrowLeft, Wifi, WifiOff, RotateCcw, X } from 'lucide-react';

function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // WebSocket for realtime updates
  const { isConnected } = useWebSocket((message) => {
    if (message.type === 'order_status_update' && message.data.order_id === id) {
      console.log('📢 Order status updated realtime:', message.data);
      // Refresh order data
      fetchOrderDetail();
      
      // Show notification
      showNotification(`Đơn hàng ${message.data.new_status === 'DELIVERED' ? 'đã được giao thành công' : 'đã cập nhật trạng thái'}`);
    }
  });

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      const response = await checkoutService.getOrderDetail(id);
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order:', error);
      setError(error.response?.data?.error?.message || 'Không thể tải thông tin đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    // Simple notification - can be replaced with toast library
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    notification.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  const handleOpenReturnModal = () => {
    // Initialize all items as selected
    setSelectedItems(order.items.map(item => ({
      order_item_id: item.id,
      qty: item.qty
    })));
    setReturnReason('');
    setShowReturnModal(true);
  };

  const handleSubmitReturn = async () => {
    if (!returnReason.trim()) {
      showNotification('Vui lòng nhập lý do đổi trả', 'error');
      return;
    }

    if (selectedItems.length === 0) {
      showNotification('Vui lòng chọn ít nhất một sản phẩm', 'error');
      return;
    }

    try {
      setSubmittingReturn(true);
      const returnData = {
        order_id: order.id,
        reason: returnReason,
        items: selectedItems
      };

      await returnService.createReturn(returnData);

      showNotification('Yêu cầu đổi trả đã được gửi thành công', 'success');
      setShowReturnModal(false);
      setReturnReason('');
      setSelectedItems([]);
      fetchOrderDetail(); // Refresh order
    } catch (error) {
      console.error('Error submitting return:', error);
      showNotification('Không thể gửi yêu cầu đổi trả', 'error');
    } finally {
      setSubmittingReturn(false);
    }
  };

  const toggleItemSelection = (orderItemId, qty) => {
    setSelectedItems(prev => {
      const exists = prev.find(item => item.order_item_id === orderItemId);
      if (exists) {
        return prev.filter(item => item.order_item_id !== orderItemId);
      } else {
        return [...prev, { order_item_id: orderItemId, qty }];
      }
    });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center py-16">
          <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy đơn hàng</h2>
          <p className="text-gray-600 mb-6">{error || 'Đơn hàng không tồn tại hoặc đã bị xóa'}</p>
          <button onClick={() => navigate('/orders')} className="btn-primary">
            Quay lại đơn hàng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/orders')}
            className="flex items-center text-primary-600 hover:text-primary-800"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Quay lại
          </button>
          
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Chi tiết đơn hàng</h1>
            <p className="text-gray-600 mt-1">
              Mã đơn: <span className="font-semibold">{order.order_code}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Ngày đặt</p>
            <p className="font-semibold">{formatDate(order.created_at)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Stepper */}
          <OrderStatusStepper 
            currentStatus={order.status} 
            statusHistory={order.status_history || []}
          />

          {/* Order Items */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <Package className="h-6 w-6 text-primary-600 mr-2" />
              <h2 className="text-xl font-bold">Sản phẩm ({order.items?.length || 0})</h2>
            </div>
            
            <div className="space-y-4">
              {order.items?.map((item) => (
                <div key={item.id} className="flex items-center border-b pb-4 last:border-b-0 last:pb-0">
                  <div className="flex-shrink-0 w-20 h-20 bg-gray-200 rounded">
                    {item.image && (
                      <img src={item.image} alt={item.product_name} className="w-full h-full object-cover rounded" />
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="font-semibold text-gray-900">{item.product_name}</p>
                    <p className="text-sm text-gray-600">
                      Số lượng: {item.qty} {item.unit}
                    </p>
                    {item.discount_rate > 0 && (
                      <p className="text-sm text-red-600">Giảm giá: {item.discount_rate}%</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(item.line_total)}</p>
                    <p className="text-sm text-gray-600">{formatCurrency(item.unit_price)} / {item.unit}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <MapPin className="h-6 w-6 text-primary-600 mr-2" />
              <h2 className="text-xl font-bold">Địa chỉ giao hàng</h2>
            </div>
            {order.shipping_recipient ? (
              <div className="space-y-2">
                <p className="font-semibold">{order.shipping_recipient}</p>
                <p className="text-gray-600">{order.shipping_phone}</p>
                <p className="text-gray-700">{order.shipping_address}</p>
              </div>
            ) : (
              <p className="text-gray-500">Chưa có thông tin địa chỉ</p>
            )}
          </div>

          {/* Note */}
          {order.note && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <FileText className="h-6 w-6 text-primary-600 mr-2" />
                <h2 className="text-xl font-bold">Ghi chú</h2>
              </div>
              <p className="text-gray-700">{order.note}</p>
            </div>
          )}
        </div>

        {/* Right Column - Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
            <h2 className="text-xl font-bold mb-6">Thông tin thanh toán</h2>

            {/* Payment Method */}
            <div className="mb-6 pb-6 border-b">
              <div className="flex items-center mb-2">
                <CreditCard className="h-5 w-5 text-gray-600 mr-2" />
                <p className="text-sm font-medium text-gray-700">Phương thức thanh toán</p>
              </div>
              <p className="font-semibold ml-7">
                {order.payment_method === 'COD' ? 'Thanh toán khi nhận hàng (COD)' : 'Chuyển khoản ngân hàng'}
              </p>
            </div>

            {/* Order Totals */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Tạm tính</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.tax_total > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Thuế</span>
                  <span>{formatCurrency(order.tax_total)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Phí vận chuyển</span>
                <span className="text-green-600">Miễn phí</span>
              </div>
            </div>

            {/* Grand Total */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">Tổng cộng</span>
                <span className="text-2xl font-bold text-primary-600">
                  {formatCurrency(order.grand_total)}
                </span>
              </div>
            </div>

            {/* Payment Status Badge */}
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Trạng thái thanh toán</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  order.payment_status === 'PAID' 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {order.payment_status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                </span>
              </div>
            </div>

            {/* Return Button - Only show if order is delivered */}
            {order.status === 'DELIVERED' && (
              <div className="mt-6 pt-6 border-t">
                <button
                  onClick={handleOpenReturnModal}
                  className="w-full btn-outline flex items-center justify-center"
                >
                  <RotateCcw className="h-5 w-5 mr-2" />
                  Đổi trả hàng
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Return Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowReturnModal(false)}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center">
                <RotateCcw className="h-6 w-6 mr-2 text-primary-600" />
                Yêu cầu đổi trả hàng
              </h2>
              <button onClick={() => setShowReturnModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Order Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Mã đơn hàng</p>
                <p className="font-semibold text-lg">{order.order_code}</p>
              </div>

              {/* Select Items */}
              <div>
                <h3 className="font-semibold mb-3">Chọn sản phẩm muốn đổi trả</h3>
                <div className="space-y-2">
                  {order.items?.map((item) => {
                    const isSelected = selectedItems.some(si => si.order_item_id === item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleItemSelection(item.id, item.qty)}
                        className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                          isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mr-3"
                          />
                          <div className="flex-1">
                            <p className="font-medium">{item.product_name}</p>
                            <p className="text-sm text-gray-600">Số lượng: {item.qty} {item.unit}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-primary-600">{formatCurrency(item.line_total)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lý do đổi trả *
                </label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  rows="4"
                  className="input-field"
                  placeholder="Vui lòng mô tả lý do đổi trả hàng..."
                  required
                />
              </div>

              {/* Info Note */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Lưu ý:</strong> Yêu cầu đổi trả sẽ được quản trị viên xem xét và phản hồi trong vòng 1-2 ngày làm việc.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex space-x-3">
              <button
                onClick={() => setShowReturnModal(false)}
                className="flex-1 btn-outline"
                disabled={submittingReturn}
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitReturn}
                className="flex-1 btn-primary"
                disabled={submittingReturn}
              >
                {submittingReturn ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default OrderDetail;
