import { useState, useEffect } from 'react';
import { returnService } from '../../services/returnService';
import { formatCurrency } from '../../utils/formatters';
import { CheckCircle, XCircle, Clock, Package, Wifi, WifiOff } from 'lucide-react';
import useWebSocket from '../../hooks/useWebSocket';
import { toast } from 'react-hot-toast';

function ReturnManagement() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, REQUESTED, APPROVED, REJECTED, COMPLETED
  const [processing, setProcessing] = useState({});

  // WebSocket for realtime return requests
  const { isConnected } = useWebSocket((message) => {
    if (message.type === 'return_requested') {
      console.log('🔄 New return request:', message.data);
      fetchReturns(); // Auto-refresh list
    }
  });

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const response = await returnService.getReturns();
      setReturns(response.data || []);
    } catch (error) {
      console.error('Error fetching returns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (returnId) => {
    if (!window.confirm('Xác nhận duyệt yêu cầu đổi trả? Hàng sẽ được nhập lại vào kho.')) return;

    try {
      setProcessing(prev => ({ ...prev, [returnId]: true }));
      await returnService.approveReturn(returnId);
      toast.success('Đã duyệt yêu cầu đổi trả thành công! Hàng đã được nhập lại vào kho.');
      fetchReturns();
    } catch (error) {
      console.error('Error approving return:', error);
      const message = error.response?.data?.message || 'Không thể duyệt yêu cầu đổi trả';
      toast.error(message);
    } finally {
      setProcessing(prev => ({ ...prev, [returnId]: false }));
    }
  };

  const handleReject = async (returnId) => {
    if (!window.confirm('Xác nhận từ chối yêu cầu đổi trả?')) return;

    try {
      setProcessing(prev => ({ ...prev, [returnId]: true }));
      await returnService.rejectReturn(returnId);
      toast.success('Đã từ chối yêu cầu đổi trả');
      fetchReturns();
    } catch (error) {
      console.error('Error rejecting return:', error);
      const message = error.response?.data?.message || 'Không thể từ chối yêu cầu đổi trả';
      toast.error(message);
    } finally {
      setProcessing(prev => ({ ...prev, [returnId]: false }));
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
      <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center w-fit ${config.color}`}>
        <Icon className="h-4 w-4 mr-1" />
        {config.label}
      </span>
    );
  };

  const filteredReturns = filter === 'ALL'
    ? returns
    : returns.filter(ret => ret.status === filter);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Quản lý đổi trả</h1>
        
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

      {/* Filters */}
      <div className="mb-6 flex space-x-2">
        {['ALL', 'REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === status
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            {status === 'ALL' ? 'Tất cả' :
             status === 'REQUESTED' ? 'Chờ xử lý' :
             status === 'APPROVED' ? 'Đã duyệt' :
             status === 'REJECTED' ? 'Đã từ chối' :
             'Hoàn thành'}
          </button>
        ))}
      </div>

      {/* Returns List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : filteredReturns.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          Không có yêu cầu đổi trả nào
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReturns.map((returnItem) => (
            <div key={returnItem.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Đơn hàng: {returnItem.order_code}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">
                    Khách hàng: <span className="font-medium">{returnItem.customer_name}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Ngày tạo: {formatDate(returnItem.created_at)}
                  </p>
                </div>
                {getStatusBadge(returnItem.status)}
              </div>

              {/* Return Items */}
              {returnItem.items && returnItem.items.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2 font-semibold">Sản phẩm đổi trả:</p>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    {returnItem.items.map((item, index) => (
                      <div key={item.id || index} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900">{item.product_name}</p>
                          <p className="text-sm text-gray-600">Số lượng: {item.qty} {item.unit}</p>
                        </div>
                        <p className="text-primary-600 font-semibold">
                          {formatCurrency(item.refund_line)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600 mb-1 font-semibold">Lý do đổi trả:</p>
                <p className="text-gray-900">{returnItem.reason || 'Không có lý do cụ thể'}</p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-600">Số tiền hoàn lại:</span>
                  <span className="ml-2 text-lg font-bold text-primary-600">
                    {formatCurrency(returnItem.refund_amount)}
                  </span>
                </div>

                {returnItem.status === 'REQUESTED' && (
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleApprove(returnItem.id)}
                      disabled={processing[returnItem.id]}
                      className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Duyệt
                    </button>
                    <button
                      onClick={() => handleReject(returnItem.id)}
                      disabled={processing[returnItem.id]}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle className="mr-2 h-5 w-5" />
                      Từ chối
                    </button>
                  </div>
                )}

                {returnItem.status === 'APPROVED' && (
                  <span className="text-blue-600 font-medium">
                    Đã duyệt - Chờ hoàn thành
                  </span>
                )}

                {returnItem.status === 'COMPLETED' && (
                  <span className="text-green-600 font-medium flex items-center">
                    <Package className="mr-2 h-5 w-5" />
                    Đã nhập lại vào kho
                  </span>
                )}

                {returnItem.status === 'REJECTED' && (
                  <span className="text-red-600 font-medium">
                    Yêu cầu đã bị từ chối
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReturnManagement;
