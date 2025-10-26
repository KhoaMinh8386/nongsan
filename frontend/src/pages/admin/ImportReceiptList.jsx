import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { importReceiptService } from '../../services/importReceiptService';
import { supplierService } from '../../services/supplierService';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';
import { Plus, Eye, CheckCircle, Trash2, Filter } from 'lucide-react';

const ImportReceiptList = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 0 });
  
  // Filters
  const [filters, setFilters] = useState({
    supplier_id: '',
    status: '',
    date_from: '',
    date_to: ''
  });

  useEffect(() => {
    fetchSuppliers();
    fetchReceipts();
  }, [pagination.page, filters.supplier_id, filters.status]);

  const fetchSuppliers = async () => {
    try {
      const response = await supplierService.getSuppliers({ limit: 100 });
      setSuppliers(response.data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      };
      const response = await importReceiptService.getImportReceipts(params);
      setReceipts(response.data || []);
      setPagination(response.pagination || pagination);
    } catch (error) {
      console.error('Error fetching receipts:', error);
      toast.error('Không thể tải danh sách phiếu nhập');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (receipt) => {
    if (!window.confirm(`Xác nhận duyệt phiếu nhập "${receipt.code}"?\nHàng sẽ được nhập vào kho tự động.`)) return;

    try {
      await importReceiptService.approveImportReceipt(receipt.id);
      toast.success('Duyệt phiếu nhập thành công! Kho đã được cập nhật.');
      fetchReceipts();
    } catch (error) {
      console.error('Error approving receipt:', error);
      const message = error.response?.data?.message || 'Không thể duyệt phiếu nhập';
      toast.error(message);
    }
  };

  const handleDelete = async (receipt) => {
    if (!window.confirm(`Xác nhận xóa phiếu nhập "${receipt.code}"?`)) return;

    try {
      await importReceiptService.deleteImportReceipt(receipt.id);
      toast.success('Xóa phiếu nhập thành công');
      fetchReceipts();
    } catch (error) {
      console.error('Error deleting receipt:', error);
      const message = error.response?.data?.message || 'Không thể xóa phiếu nhập';
      toast.error(message);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      DRAFT: { label: 'Nháp', color: 'bg-gray-100 text-gray-800' },
      APPROVED: { label: 'Đã duyệt', color: 'bg-green-100 text-green-800' },
      CANCELLED: { label: 'Đã hủy', color: 'bg-red-100 text-red-800' }
    };
    const config = statusConfig[status] || statusConfig.DRAFT;
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>{config.label}</span>;
  };

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
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý phiếu nhập hàng</h1>
          <p className="text-gray-600 mt-1">Quản lý các phiếu nhập hàng từ nhà cung cấp</p>
        </div>
        <button
          onClick={() => navigate('/admin/import-receipts/create')}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Tạo phiếu nhập mới
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-5 h-5 text-gray-500" />
          <span className="font-medium text-gray-700">Bộ lọc</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nhà cung cấp</label>
            <select
              value={filters.supplier_id}
              onChange={(e) => setFilters({ ...filters, supplier_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="">Tất cả</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="">Tất cả</option>
              <option value="DRAFT">Nháp</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã phiếu</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nhà cung cấp</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người tạo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày tạo</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số mặt hàng</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tổng SL</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tổng tiền</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan="9" className="px-6 py-12 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  </div>
                </td>
              </tr>
            ) : receipts.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                  Không có phiếu nhập nào
                </td>
              </tr>
            ) : (
              receipts.map((receipt) => (
                <tr key={receipt.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{receipt.code}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{receipt.supplier_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{receipt.created_by_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(receipt.created_at)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">{receipt.items_count || 0}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">{receipt.total_qty || 0}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right font-semibold">{formatCurrency(receipt.total_cost)}</td>
                  <td className="px-6 py-4 text-center">{getStatusBadge(receipt.status)}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => navigate(`/admin/import-receipts/${receipt.id}`)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {receipt.status === 'DRAFT' && (
                        <>
                          <button
                            onClick={() => handleApprove(receipt)}
                            className="text-green-600 hover:text-green-800"
                            title="Duyệt phiếu"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(receipt)}
                            className="text-red-600 hover:text-red-800"
                            title="Xóa phiếu"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="px-6 py-4 border-t flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Hiển thị {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Trước
              </button>
              <span className="px-4 py-2">Trang {pagination.page} / {pagination.total_pages}</span>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.total_pages}
                className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportReceiptList;
