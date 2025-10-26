import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { importReceiptService } from '../../services/importReceiptService';
import { supplierService } from '../../services/supplierService';
import { productService } from '../../services/productService';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';
import { ArrowLeft, Plus, Trash2, Save, CheckCircle } from 'lucide-react';

const ImportReceiptForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  const [formData, setFormData] = useState({
    supplier_id: '',
    note: '',
    items: []
  });

  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: ''
  });

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
    if (isEditMode) {
      fetchReceiptDetail();
    }
  }, [id]);

  useEffect(() => {
    if (productSearch.length >= 2) {
      searchProducts();
    } else {
      setSearchResults([]);
    }
  }, [productSearch]);

  const fetchSuppliers = async () => {
    try {
      const response = await supplierService.getSuppliers({ limit: 100 });
      setSuppliers(response.data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productService.getProducts({ limit: 1000 });
      setProducts(response.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchReceiptDetail = async () => {
    try {
      setLoading(true);
      const response = await importReceiptService.getImportReceiptById(id);
      const receipt = response.data;
      
      setFormData({
        supplier_id: receipt.supplier_id,
        note: receipt.note || '',
        items: receipt.items.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          unit: item.unit,
          qty: item.qty,
          unit_cost: item.unit_cost,
          line_total: item.line_total,
          note: item.note || ''
        }))
      });
    } catch (error) {
      console.error('Error fetching receipt:', error);
      toast.error('Không thể tải thông tin phiếu nhập');
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = () => {
    const keyword = productSearch.toLowerCase();
    const results = products.filter(p => 
      p.name.toLowerCase().includes(keyword) || 
      (p.sku && p.sku.toLowerCase().includes(keyword))
    ).slice(0, 10);
    setSearchResults(results);
  };

  const addItem = (product = null) => {
    const newItem = product ? {
      product_id: product.id,
      product_name: product.name,
      unit: product.unit,
      qty: 1,
      unit_cost: product.cost_price || 0,
      line_total: product.cost_price || 0,
      note: ''
    } : {
      product_id: '',
      product_name: '',
      unit: '',
      qty: 1,
      unit_cost: 0,
      line_total: 0,
      note: ''
    };
    
    setFormData({ ...formData, items: [...formData.items, newItem] });
    setProductSearch('');
    setSearchResults([]);
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    if (field === 'qty' || field === 'unit_cost') {
      const qty = parseFloat(newItems[index].qty) || 0;
      const cost = parseFloat(newItems[index].unit_cost) || 0;
      newItems[index].line_total = qty * cost;
    }
    
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].product_name = product.name;
        newItems[index].unit = product.unit;
        newItems[index].unit_cost = product.cost_price || 0;
        newItems[index].line_total = newItems[index].qty * (product.cost_price || 0);
      }
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotals = () => {
    const totalQty = formData.items.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
    const totalCost = formData.items.reduce((sum, item) => sum + (parseFloat(item.line_total) || 0), 0);
    return { totalQty, totalCost };
  };

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    if (!newSupplier.name.trim()) {
      toast.error('Tên nhà cung cấp là bắt buộc');
      return;
    }

    try {
      const response = await supplierService.createSupplier(newSupplier);
      toast.success('Thêm nhà cung cấp thành công');
      await fetchSuppliers();
      setFormData({ ...formData, supplier_id: response.data.id });
      setShowSupplierModal(false);
      setNewSupplier({ name: '', contact_name: '', phone: '', email: '', address: '' });
    } catch (error) {
      console.error('Error adding supplier:', error);
      toast.error('Không thể thêm nhà cung cấp');
    }
  };

  const handleSubmit = async (action) => {
    if (!formData.supplier_id) {
      toast.error('Vui lòng chọn nhà cung cấp');
      return;
    }

    if (formData.items.length === 0) {
      toast.error('Vui lòng thêm ít nhất một sản phẩm');
      return;
    }

    const invalidItems = formData.items.filter(item => !item.product_id || item.qty <= 0);
    if (invalidItems.length > 0) {
      toast.error('Vui lòng nhập đầy đủ thông tin sản phẩm');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        supplier_id: formData.supplier_id,
        note: formData.note,
        items: formData.items.map(item => ({
          product_id: item.product_id,
          qty: parseFloat(item.qty),
          unit_cost: parseFloat(item.unit_cost),
          note: item.note
        }))
      };

      let response;
      if (isEditMode) {
        response = await importReceiptService.updateImportReceipt(id, payload);
      } else {
        response = await importReceiptService.createImportReceipt(payload);
      }

      const receiptId = response.data.id;

      if (action === 'save') {
        toast.success(isEditMode ? 'Cập nhật phiếu nhập thành công' : 'Tạo phiếu nhập thành công');
        navigate(`/admin/import-receipts/${receiptId}`);
      } else if (action === 'approve') {
        await importReceiptService.approveImportReceipt(receiptId);
        toast.success('Duyệt phiếu nhập thành công! Kho đã được cập nhật.');
        navigate('/admin/import-receipts');
      }
    } catch (error) {
      console.error('Error submitting receipt:', error);
      const message = error.response?.data?.message || 'Không thể lưu phiếu nhập';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const { totalQty, totalCost } = calculateTotals();

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate('/admin/import-receipts')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Chỉnh sửa phiếu nhập' : 'Tạo phiếu nhập mới'}
          </h1>
          <p className="text-gray-600 mt-1">Nhập thông tin phiếu nhập hàng từ nhà cung cấp</p>
        </div>
      </div>

      {/* Supplier & Note */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Thông tin chung</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nhà cung cấp <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <select
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Chọn nhà cung cấp</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowSupplierModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
              >
                + Thêm NCC
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ghi chú</label>
            <input
              type="text"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Ghi chú về phiếu nhập..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </div>

      {/* Product Search */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Tìm kiếm sản phẩm</h2>
        <div className="relative">
          <input
            type="text"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Tìm sản phẩm theo tên hoặc mã SKU..."
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
          />
          {searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addItem(product)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0"
                >
                  <div className="font-medium text-gray-900">{product.name}</div>
                  <div className="text-sm text-gray-500">
                    SKU: {product.sku} | Đơn vị: {product.unit} | Giá: {formatCurrency(product.cost_price || 0)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Danh sách sản phẩm</h2>
          <button
            type="button"
            onClick={() => addItem()}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Thêm dòng
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">STT</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sản phẩm</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đơn vị</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số lượng</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Giá nhập</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thành tiền</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {formData.items.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    Chưa có sản phẩm nào. Tìm kiếm và thêm sản phẩm ở trên.
                  </td>
                </tr>
              ) : (
                formData.items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm text-gray-900">{index + 1}</td>
                    <td className="px-4 py-4">
                      <select
                        value={item.product_id}
                        onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                        className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-green-500"
                        required
                      >
                        <option value="">Chọn sản phẩm</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>{product.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{item.unit || '-'}</td>
                    <td className="px-4 py-4">
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateItem(index, 'qty', e.target.value)}
                        min="0"
                        step="0.01"
                        className="w-24 px-2 py-1 border rounded text-right focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        type="number"
                        value={item.unit_cost}
                        onChange={(e) => updateItem(index, 'unit_cost', e.target.value)}
                        min="0"
                        step="1000"
                        className="w-32 px-2 py-1 border rounded text-right focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-gray-900 text-right">
                      {formatCurrency(item.line_total)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-end">
          <div className="w-full md:w-1/2 space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Tổng số mặt hàng:</span>
              <span className="font-semibold">{formData.items.length} mặt hàng</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Tổng số lượng:</span>
              <span className="font-semibold">{totalQty.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-lg font-semibold text-gray-900">Tổng chi phí:</span>
              <span className="text-lg font-bold text-green-600">{formatCurrency(totalCost)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/import-receipts')}
            disabled={submitting}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('save')}
            disabled={submitting}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Lưu nháp
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('approve')}
            disabled={submitting}
            className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Đang xử lý...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Lưu và duyệt ngay
              </>
            )}
          </button>
        </div>
      </div>

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Thêm nhà cung cấp mới</h2>
            </div>
            <form onSubmit={handleAddSupplier} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tên nhà cung cấp <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Người đại diện</label>
                  <input
                    type="text"
                    value={newSupplier.contact_name}
                    onChange={(e) => setNewSupplier({ ...newSupplier, contact_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={newSupplier.email}
                  onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Địa chỉ</label>
                <textarea
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                  rows="2"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Thêm nhà cung cấp
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSupplierModal(false);
                    setNewSupplier({ name: '', contact_name: '', phone: '', email: '', address: '' });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportReceiptForm;