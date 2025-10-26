import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { importReceiptService } from '../../services/importReceiptService';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';
import { ArrowLeft, CheckCircle, XCircle, Package } from 'lucide-react';

const ImportReceiptDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchReceiptDetail();
    }
  }, [id]);

  const fetchReceiptDetail = async () => {
    try {
      setLoading(true);
      const response = await importReceiptService.getImportReceiptById(id);
      setReceipt(response.data);
    } catch (error) {
      console.error('Error fetching receipt detail:', error);
      toast.error('Không thể tải thông tin phiếu nhập');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm(`Xác nhận duyệt phiếu nhập "${receipt.code}"?\nHàng sẽ được nhập vào kho tự động.`)) return;

    try {
      setProcessing(true);
      await importReceiptService.approveImportReceipt(id);
      toast.success('Duyệt phiếu nhập thành công! Kho đã được cập nhật.');
      fetchReceiptDetail();
    } catch (error) {
      console.error('Error approving receipt:', error);
      const message = error.response?.data?.message || 'Không thể duyệt phiếu nhập';
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm(`Xác nhận hủy phiếu nhập "${receipt.code}"?`)) return;

    try {
      setProcessing(true);
      await importReceiptService.cancelImportReceipt(id);
      toast.success('Hủy phiếu nhập thành công');
      fetchReceiptDetail();
    } catch (error) {
      console.error('Error cancelling receipt:', error);
      const message = error.response?.data?.message || 'Không thể hủy phiếu nhập';
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      DRAFT: { label: 'Nháp', color: 'bg-gray-100 text-gray-800', icon: Package },
      APPROVED: { label: '✅ Đã duyệt', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      CANCELLED: { label: 'Đã hủy', color: 'bg-red-100 text-red-800', icon: XCircle }
    };
    const config = statusConfig[status] || statusConfig.DRAFT;
    const Icon = config.icon;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center w-fit ${config.color}`}>
        <Icon className="w-4 h-4 mr-1" />
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg p-12 text-center">
          <p className="text-gray-500">Không tìm thấy phiếu nhập</p>
          <button
            onClick={() => navigate('/admin/import-receipts')}
            className="mt-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/import-receipts')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chi tiết phiếu nhập</h1>
            <p className="text-gray-600 mt-1">Mã phiếu: {receipt.code}</p>
          </div>
        </div>
        <div>
          {getStatusBadge(receipt.status)}
        </div>
      </div>

      {/* Receipt Info */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Thông tin phiếu nhập</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Nhà cung cấp</label>
            <p className="text-gray-900 font-medium">{receipt.supplier_name}</p>
            {receipt.contact_name && <p className="text-sm text-gray-600">Liên hệ: {receipt.contact_name}</p>}
            {receipt.supplier_phone && <p className="text-sm text-gray-600">SĐT: {receipt.supplier_phone}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Người tạo</label>
            <p className="text-gray-900">{receipt.created_by_name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Ngày tạo</label>
            <p className="text-gray-900">{formatDate(receipt.created_at)}</p>
          </div>
          {receipt.approved_at && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Ngày duyệt</label>
              <p className="text-gray-900">{formatDate(receipt.approved_at)}</p>
            </div>
          )}
          {receipt.note && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-500 mb-1">Ghi chú</label>
              <p className="text-gray-900">{receipt.note}</p>
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Danh sách sản phẩm</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">STT</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã SP</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên sản phẩm</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đơn vị</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số lượng</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Giá nhập</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thành tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {receipt.items && receipt.items.length > 0 ? (
              receipt.items.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{index + 1}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.sku}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.product_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.unit}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">{item.qty}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(item.unit_cost)}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">{formatCurrency(item.line_total)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  Không có sản phẩm nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-end">
          <div className="w-full md:w-1/2 space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Tổng số mặt hàng:</span>
              <span className="font-semibold">{receipt.items?.length || 0} mặt hàng</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Tổng số lượng:</span>
              <span className="font-semibold">{receipt.total_qty || 0}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-lg font-semibold text-gray-900">Tổng chi phí:</span>
              <span className="text-lg font-bold text-green-600">{formatCurrency(receipt.total_cost)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      {receipt.status === 'DRAFT' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-end gap-3">
            <button
              onClick={handleCancel}
              disabled={processing}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Hủy phiếu
            </button>
            <button
              onClick={() => navigate(`/admin/import-receipts/${id}/edit`)}
              disabled={processing}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Chỉnh sửa
            </button>
            <button
              onClick={handleApprove}
              disabled={processing}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Đang xử lý...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Duyệt phiếu nhập
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportReceiptDetail;
