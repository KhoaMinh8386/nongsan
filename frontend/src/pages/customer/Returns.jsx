import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { returnService } from '../../services/returnService';
import { orderService } from '../../services/orderService';
import { formatCurrency } from '../../utils/formatters';
import { PackageX, Clock, CheckCircle, XCircle, Package, ArrowLeft } from 'lucide-react';

function Returns() {
  const navigate = useNavigate();
  const [returns, setReturns] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reason, setReason] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [returnsResponse, ordersResponse] = await Promise.all([
        returnService.getReturns(),
        orderService.getOrders()
      ]);
      
      setReturns(returnsResponse.data || []);
      // Only show delivered orders that can be returned
      const deliveredOrders = (ordersResponse.data?.orders || []).filter(
        order => order.status === 'DELIVERED'
      );
      setOrders(deliveredOrders);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = (order) => {
    setSelectedOrder(order);
    setSelectedItems(order.items.map(item => ({ order_item_id: item.id, qty: item.qty })));
    setReason('');
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setSelectedOrder(null);
    setSelectedItems([]);
    setReason('');
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      alert('Vui lòng nhập lý do đổi trả');
      return;
    }

    try {
      setSubmitting(true);
      await returnService.createReturn({
        order_id: selectedOrder.id,
        reason: reason.trim(),
        items: selectedItems
      });
      
      alert('Tạo yêu cầu đổi trả thành công!');
      closeCreateModal();
      fetchData();
    } catch (error) {
      console.error('Error creating return:', error);
      alert('Không thể tạo yêu cầu đổi trả');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      REQUESTED: { label: 'Chờ xử lý', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      APPROVED: { label: 'Đã duyệt', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      REJECTED: { label: 'Đã từ chối', color: 'bg-red-100 text-red-800', icon: XCircle },
      COMPLETED: { label: 'Hoàn thành', color: 'bg-green-100 text-green-800', icon: Package },
    };

    const config = statusConfig[status] || statusConfig.REQUESTED;
    const Icon = config.icon;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center ${config.color}`}>
        <Icon className="h-4 w-4 mr-1" />
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <button
          onClick={() => navigate('/orders')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Quay lại danh sách đơn hàng
        </button>
        <h1 className="text-3xl font-bold">Quản lý đổi trả</h1>
      </div>

      {/* My Returns */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Yêu cầu đổi trả của bạn</h2>
        {returns.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <PackageX className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <p className="text-gray-600">Bạn chưa có yêu cầu đổi trả nào</p>
          </div>
        ) : (
          <div className="space-y-4">
            {returns.map((returnItem) => (
              <div key={returnItem.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      Đơn hàng: {returnItem.order_code}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Ngày tạo: {formatDate(returnItem.created_at)}
                    </p>
                  </div>
                  {getStatusBadge(returnItem.status)}
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600 mb-1 font-semibold">Lý do:</p>
                  <p className="text-gray-900">{returnItem.reason}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-600">Số tiền hoàn lại:</span>
                    <span className="ml-2 text-lg font-bold text-primary-600">
                      {formatCurrency(returnItem.refund_amount)}
                    </span>
                  </div>
                  
                  {returnItem.status === 'COMPLETED' && (
                    <span className="text-green-600 text-sm font-medium">
                      Đã hoàn tiền
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Eligible Orders for Return */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Đơn hàng có thể đổi trả</h2>
        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <p className="text-gray-600">Không có đơn hàng nào có thể đổi trả</p>
            <p className="text-sm text-gray-500 mt-2">
              Chỉ các đơn hàng đã giao mới có thể yêu cầu đổi trả
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      Đơn hàng: {order.order_code}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Ngày đặt: {formatDate(order.created_at)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Tổng tiền: <span className="font-bold">{formatCurrency(order.grand_total)}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => openCreateModal(order)}
                    className="btn-primary flex items-center"
                  >
                    <PackageX className="mr-2 h-5 w-5" />
                    Yêu cầu đổi trả
                  </button>
                </div>

                {order.items && order.items.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      Sản phẩm ({order.items.length}):
                    </p>
                    <div className="space-y-2">
                      {order.items.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {item.product_name} x {item.qty}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(item.line_total)}
                          </span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-sm text-gray-500 italic">
                          ... và {order.items.length - 3} sản phẩm khác
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Return Modal */}
      {showCreateModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold">Tạo yêu cầu đổi trả</h2>
              <p className="text-gray-600 mt-2">
                Đơn hàng: {selectedOrder.order_code}
              </p>
            </div>

            <form onSubmit={handleSubmitReturn} className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lý do đổi trả *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  rows="4"
                  placeholder="Vui lòng mô tả lý do bạn muốn đổi trả sản phẩm..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Sản phẩm đổi trả (Tất cả sản phẩm trong đơn)
                </h3>
                <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-900">
                        {item.product_name} x {item.qty}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(item.line_total)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                    <span>Tổng hoàn lại:</span>
                    <span className="text-primary-600">
                      {formatCurrency(selectedOrder.grand_total)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="btn-outline"
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={submitting}
                >
                  {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Returns;
