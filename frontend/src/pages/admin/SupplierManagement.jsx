import { useState, useEffect } from 'react';
import { supplierService } from '../../services/supplierService';
import { toast } from 'react-hot-toast';

const SupplierManagement = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 0 });
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({ name: '', contact_name: '', phone: '', email: '', address: '', note: '' });

  useEffect(() => {
    fetchSuppliers();
  }, [pagination.page]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await supplierService.getSuppliers({ search: searchTerm, page: pagination.page, limit: pagination.limit });
      setSuppliers(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Không thể tải danh sách nhà cung cấp');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination({ ...pagination, page: 1 });
    fetchSuppliers();
  };

  const handleOpenModal = (supplier = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({ name: supplier.name, contact_name: supplier.contact_name || '', phone: supplier.phone || '', email: supplier.email || '', address: supplier.address || '', note: supplier.note || '' });
    } else {
      setEditingSupplier(null);
      setFormData({ name: '', contact_name: '', phone: '', email: '', address: '', note: '' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSupplier(null);
    setFormData({ name: '', contact_name: '', phone: '', email: '', address: '', note: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Tên nhà cung cấp là bắt buộc');
      return;
    }

    try {
      if (editingSupplier) {
        await supplierService.updateSupplier(editingSupplier.id, formData);
        toast.success('Cập nhật nhà cung cấp thành công');
      } else {
        await supplierService.createSupplier(formData);
        toast.success('Thêm nhà cung cấp thành công');
      }
      handleCloseModal();
      fetchSuppliers();
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error(editingSupplier ? 'Không thể cập nhật nhà cung cấp' : 'Không thể thêm nhà cung cấp');
    }
  };

  const handleDelete = async (supplier) => {
    if (!window.confirm(`Bạn có chắc muốn xóa nhà cung cấp "${supplier.name}"?`)) return;

    try {
      await supplierService.deleteSupplier(supplier.id);
      toast.success('Xóa nhà cung cấp thành công');
      fetchSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      const message = error.response?.data?.message || 'Không thể xóa nhà cung cấp';
      toast.error(message);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý nhà cung cấp</h1>
          <p className="text-gray-600 mt-1">Quản lý thông tin các nhà cung cấp sản phẩm</p>
        </div>
        <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          + Thêm nhà cung cấp
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <input type="text" placeholder="Tìm kiếm theo tên, người đại diện, SĐT..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" />
          <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Tìm kiếm</button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên NCC</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người đại diện</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SĐT</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Địa chỉ</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan="6" className="px-6 py-12 text-center"><div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div></td></tr>
            ) : suppliers.length === 0 ? (
              <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">Không tìm thấy nhà cung cấp nào</td></tr>
            ) : (
              suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{supplier.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{supplier.contact_name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{supplier.phone || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{supplier.email || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{supplier.address || '-'}</td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => handleOpenModal(supplier)} className="text-blue-600 hover:text-blue-800 mr-3" title="Chỉnh sửa">✏️</button>
                    <button onClick={() => handleDelete(supplier)} className="text-red-600 hover:text-red-800" title="Xóa">🗑️</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {pagination.total_pages > 1 && (
          <div className="px-6 py-4 border-t flex justify-between items-center">
            <div className="text-sm text-gray-500">Hiển thị {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total}</div>
            <div className="flex gap-2">
              <button onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })} disabled={pagination.page === 1} className="px-4 py-2 border rounded-lg disabled:opacity-50">Trước</button>
              <span className="px-4 py-2">Trang {pagination.page} / {pagination.total_pages}</span>
              <button onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })} disabled={pagination.page === pagination.total_pages} className="px-4 py-2 border rounded-lg disabled:opacity-50">Sau</button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingSupplier ? 'Chỉnh sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tên nhà cung cấp <span className="text-red-500">*</span></label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Người đại diện</label>
                  <input type="text" value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Số điện thoại</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Địa chỉ</label>
                <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows="2" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <textarea value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} rows="3" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Lưu</button>
                <button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierManagement;