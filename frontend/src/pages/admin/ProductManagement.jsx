import { useState, useEffect } from 'react';
import { productService } from '../../services/productService';
import { formatCurrency } from '../../utils/formatters';
import { Plus, Edit, Trash2, Search, X, Upload, Image as ImageIcon, Star, Eye } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    slug: '',
    unit: 'KG',
    price: '',
    cost_price: '',
    tax_rate: '8',
    discount_rate: '0',
    short_desc: '',
    description: '',
    is_active: true
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [productImages, setProductImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [isMainImage, setIsMainImage] = useState(false);
  
  // ✅ THÊM: States cho dropdowns và detail
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailProduct, setDetailProduct] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchCategoriesAndSuppliers();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productService.getProducts({ limit: 100 });
      setProducts(response.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ THÊM: Fetch categories và suppliers
  const fetchCategoriesAndSuppliers = async () => {
    try {
      const [catRes, supRes] = await Promise.all([
        api.get('/categories'),
        api.get('/suppliers')
      ]);
      setCategories(catRes.data.data || []);
      setSuppliers(supRes.data.data || []);
    } catch (error) {
      console.error('Error loading dropdowns:', error);
    }
  };

  // ✅ THÊM: Mở modal chi tiết sản phẩm
  const openDetailModal = async (product) => {
    try {
      const detail = await productService.getProductById(product.id);
      setDetailProduct(detail);
      setShowDetailModal(true);
    } catch (error) {
      toast.error('Không thể tải chi tiết sản phẩm');
      console.error('Error loading product detail:', error);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({
      sku: '',
      name: '',
      slug: '',
      unit: 'KG',
      price: '',
      cost_price: '',
      tax_rate: '8',
      discount_rate: '0',
      short_desc: '',
      description: '',
      is_active: true
    });
    setShowModal(true);
  };

  const openEditModal = async (product) => {
    setModalMode('edit');
    setSelectedProduct(product);
    setFormData({
      sku: product.sku || '',
      name: product.name || '',
      slug: product.slug || '',
      unit: product.unit || 'KG',
      price: product.price || '',
      cost_price: product.cost_price || '',
      tax_rate: product.tax_rate || '8',
      discount_rate: product.discount_rate || '0',
      short_desc: product.short_desc || '',
      description: product.description || '',
      is_active: product.is_active !== false
    });
    
    // Load product images
    try {
      const productDetail = await productService.getProductById(product.id);
      setProductImages(productDetail.images || []);
    } catch (error) {
      console.error('Error loading product images:', error);
      setProductImages([]);
    }
    
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedProduct(null);
    setProductImages([]);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Auto-generate slug from name if empty
      const slug = formData.slug || formData.name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const productData = {
        ...formData,
        slug,
        price: parseFloat(formData.price),
        cost_price: parseFloat(formData.cost_price || 0),
        tax_rate: parseFloat(formData.tax_rate || 0),
        discount_rate: parseFloat(formData.discount_rate || 0)
      };

      if (modalMode === 'create') {
        await productService.createProduct(productData);
        alert('Tạo sản phẩm thành công!');
      } else {
        await productService.updateProduct(selectedProduct.id, productData);
        alert('Cập nhật sản phẩm thành công!');
      }

      closeModal();
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Lỗi: ' + (error.response?.data?.error?.message || 'Không thể lưu sản phẩm'));
    }
  };

  const handleDelete = async (product) => {
    if (!confirm(`Bạn có chắc muốn xóa sản phẩm "${product.name}"?`)) return;

    try {
      await productService.deleteProduct(product.id);
      alert('Xóa sản phẩm thành công!');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Không thể xóa sản phẩm');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!selectedProduct) {
      alert('Vui lòng tạo sản phẩm trước khi upload ảnh');
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('image', file);
      formData.append('is_main', productImages.length === 0 ? 'true' : 'false');

      const response = await productService.uploadImage(selectedProduct.id, formData);
      
      // Reload product images
      const productDetail = await productService.getProductById(selectedProduct.id);
      setProductImages(productDetail.images || []);
      
      alert('Upload ảnh thành công!');
      fetchProducts(); // Refresh list to show new image
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Không thể upload ảnh: ' + (error.response?.data?.error?.message || error.message));
    } finally {
      setUploadingImage(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleAddImageUrl = async () => {
    const trimmedUrl = imageUrl.trim();
    
    if (!trimmedUrl) {
      alert('Vui lòng nhập URL ảnh');
      return;
    }

    // Validate URL format
    const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i;
    if (!urlPattern.test(trimmedUrl)) {
      alert('URL không hợp lệ. Vui lòng nhập URL ảnh có định dạng:\nhttps://example.com/image.jpg');
      return;
    }

    if (!selectedProduct) {
      alert('Vui lòng tạo sản phẩm trước');
      return;
    }

    try {
      setUploadingImage(true);
      
      // Test if image can be loaded
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Không thể tải ảnh từ URL này'));
        img.src = trimmedUrl;
      });
      
      // Send FULL URL to backend (không cắt, không xử lý)
      await productService.uploadImage(selectedProduct.id, {
        image_url: trimmedUrl, // Lưu đầy đủ URL
        is_main: isMainImage || productImages.length === 0
      });
      
      // Reload product images
      const productDetail = await productService.getProductById(selectedProduct.id);
      setProductImages(productDetail.images || []);
      
      alert('Thêm ảnh từ URL thành công!');
      setImageUrl('');
      setIsMainImage(false);
      fetchProducts(); // Refresh list
    } catch (error) {
      console.error('Error adding image URL:', error);
      alert('Không thể thêm ảnh: ' + (error.response?.data?.error?.message || error.message));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!confirm('Bạn có chắc muốn xóa ảnh này?')) return;

    try {
      await productService.deleteImage(selectedProduct.id, imageId);
      
      // Reload product images
      const productDetail = await productService.getProductById(selectedProduct.id);
      setProductImages(productDetail.images || []);
      
      alert('Xóa ảnh thành công!');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Không thể xóa ảnh');
    }
  };

  const handleSetMainImage = async (imageId) => {
    try {
      await productService.setMainImage(selectedProduct.id, imageId);
      
      // Reload product images
      const productDetail = await productService.getProductById(selectedProduct.id);
      setProductImages(productDetail.images || []);
      
      alert('Đã đặt làm ảnh chính!');
      fetchProducts();
    } catch (error) {
      console.error('Error setting main image:', error);
      alert('Không thể đặt ảnh chính');
    }
  };

  const filteredProducts = products.filter(product =>
    product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Quản lý sản phẩm</h1>
        <button onClick={openCreateModal} className="btn-primary flex items-center">
          <Plus className="mr-2 h-5 w-5" />
          Thêm sản phẩm mới
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ảnh</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên sản phẩm</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đơn vị</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giảm giá</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tồn kho</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                    Không tìm thấy sản phẩm nào
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        // Logic: Nếu có URL và bắt đầu bằng http → dùng trực tiếp
                        // Nếu có URL local path → thêm API_URL
                        // Nếu null/empty → fallback
                        const imageUrl = product.main_image && product.main_image.startsWith('http')
                          ? product.main_image
                          : product.main_image
                          ? `${import.meta.env.VITE_API_URL}${product.main_image}`
                          : '/no-image.svg';
                        
                        return (
                          <img
                            src={imageUrl}
                            alt={product.name}
                            className="h-12 w-12 object-cover rounded"
                            onError={(e) => {
                              e.target.src = '/no-image.svg';
                              e.target.onerror = null; // Prevent infinite loop
                            }}
                          />
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.sku || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.discount_rate > 0 ? `${product.discount_rate}%` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`font-semibold ${
                        (product.stock_qty || 0) > 10 ? 'text-green-600' : 
                        (product.stock_qty || 0) > 0 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {product.stock_qty || 0}
                      </span> {product.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        product.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {product.is_active ? 'Hoạt động' : 'Tạm ngừng'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openDetailModal(product)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="Chi tiết"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => openEditModal(product)}
                        className="text-primary-600 hover:text-primary-900 mr-3"
                        title="Sửa"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
                        className="text-red-600 hover:text-red-900"
                        title="Xóa"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-bold">
                {modalMode === 'create' ? 'Thêm sản phẩm mới' : 'Chỉnh sửa sản phẩm'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SKU *
                  </label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đơn vị *
                  </label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                  >
                    <option value="KG">KG</option>
                    <option value="G">G</option>
                    <option value="BOX">Hộp</option>
                    <option value="BUNDLE">Bó</option>
                    <option value="PCS">Cái</option>
                    <option value="L">Lít</option>
                    <option value="ML">ML</option>
                  </select>
                </div>
              </div>

              {/* ✅ THÊM: Dropdowns Danh mục và Thương hiệu */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Danh mục
                  </label>
                  <select
                    name="category_id"
                    value={formData.category_id || ''}
                    onChange={handleInputChange}
                    className="input-field"
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Thương hiệu / Nhà cung cấp
                  </label>
                  <select
                    name="supplier_id"
                    value={formData.supplier_id || ''}
                    onChange={handleInputChange}
                    className="input-field"
                  >
                    <option value="">Chọn thương hiệu</option>
                    {suppliers.map(sup => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên sản phẩm *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug (tự động tạo nếu để trống)
                </label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="tu-dong-tao-tu-ten-san-pham"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giá bán * (VNĐ)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="1000"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giá vốn (VNĐ)
                  </label>
                  <input
                    type="number"
                    name="cost_price"
                    value={formData.cost_price}
                    onChange={handleInputChange}
                    min="0"
                    step="1000"
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Thuế (%)
                  </label>
                  <input
                    type="number"
                    name="tax_rate"
                    value={formData.tax_rate}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    step="0.1"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giảm giá (%)
                  </label>
                  <input
                    type="number"
                    name="discount_rate"
                    value={formData.discount_rate}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    step="0.1"
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả ngắn
                </label>
                <textarea
                  name="short_desc"
                  value={formData.short_desc}
                  onChange={handleInputChange}
                  rows="2"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả chi tiết
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  className="input-field"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Sản phẩm đang hoạt động
                </label>
              </div>

              {/* Image Management - Only show in edit mode */}
              {modalMode === 'edit' && selectedProduct && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3">Quản lý hình ảnh</h3>
                  
                  {/* Upload Options */}
                  <div className="mb-4 space-y-3">
                    {/* File Upload */}
                    <div>
                      <label className="btn-outline cursor-pointer inline-flex items-center">
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingImage ? 'Đang upload...' : 'Upload ảnh từ máy'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-1">Tối đa 5MB. Hỗ trợ: JPG, PNG, WEBP, GIF</p>
                    </div>

                    {/* URL Input */}
                    <div className="border-t pt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Hoặc nhập URL ảnh</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          placeholder="https://example.com/image.jpg"
                          className="input-field flex-1"
                          disabled={uploadingImage}
                        />
                        <button
                          type="button"
                          onClick={handleAddImageUrl}
                          disabled={!imageUrl || uploadingImage}
                          className="btn-primary whitespace-nowrap"
                        >
                          Thêm URL
                        </button>
                      </div>
                      <div className="flex items-center mt-2">
                        <input
                          type="checkbox"
                          id="is_main_url"
                          checked={isMainImage}
                          onChange={(e) => setIsMainImage(e.target.checked)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor="is_main_url" className="ml-2 block text-sm text-gray-700">
                          Đặt làm ảnh chính
                        </label>
                      </div>
                      
                      {/* Image Preview */}
                      {imageUrl && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600 mb-2">Preview:</p>
                          <div className="flex items-start space-x-3">
                            <img 
                              src={imageUrl} 
                              alt="Preview" 
                              className="w-24 h-24 object-cover border rounded"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                            <div className="hidden text-red-500 text-sm">
                              ⚠️ Không thể tải ảnh từ URL này
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 break-all">{imageUrl}</p>
                              <p className="text-xs text-gray-400 mt-1">Độ dài: {imageUrl.length} ký tự</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Image Grid */}
                  {productImages.length > 0 ? (
                    <div className="grid grid-cols-3 gap-4">
                      {productImages.map((image) => {
                        // Check if URL is external (starts with http/https) or local path
                        const imageUrl = image.url.startsWith('http') 
                          ? image.url // External URL - use as is
                          : `${import.meta.env.VITE_API_URL}${image.url}`; // Local path - add API URL
                        
                        return (
                          <div key={image.id} className="relative group border rounded-lg p-2">
                            <img
                              src={imageUrl}
                              alt="Product"
                              className="w-full h-32 object-cover rounded"
                              onError={(e) => {
                                e.target.src = '/no-image.svg';
                                e.target.alt = 'Lỗi tải ảnh';
                                e.target.onerror = null;
                              }}
                            />
                          {image.is_main && (
                            <div className="absolute top-3 left-3 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-bold flex items-center">
                              <Star className="h-3 w-3 mr-1 fill-current" />
                              Chính
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 flex space-x-2">
                              {!image.is_main && (
                                <button
                                  onClick={() => handleSetMainImage(image.id)}
                                  className="bg-white text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-100"
                                  title="Đặt làm ảnh chính"
                                >
                                  <Star className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteImage(image.id)}
                                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                                title="Xóa"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">Chưa có hình ảnh nào</p>
                    </div>
                  )}
                </div>
              )}

              {modalMode === 'create' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Lưu ý:</strong> Bạn cần tạo sản phẩm trước, sau đó mới có thể upload hình ảnh.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-outline"
                >
                  Hủy
                </button>
                <button type="submit" className="btn-primary">
                  {modalMode === 'create' ? 'Tạo sản phẩm' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ THÊM: Detail Modal */}
      {showDetailModal && detailProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-bold">Chi tiết sản phẩm</h2>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Product Images */}
              {detailProduct.images && detailProduct.images.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Hình ảnh</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {detailProduct.images.map((img, idx) => (
                      <div key={idx} className="relative">
                        <img 
                          src={img.url} 
                          alt={`Product ${idx + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        {img.is_main && (
                          <span className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 text-xs rounded">
                            Chính
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Thông tin cơ bản</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">SKU:</span>
                      <span className="font-medium">{detailProduct.sku}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Tên sản phẩm:</span>
                      <span className="font-medium">{detailProduct.name}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Danh mục:</span>
                      <span className="font-medium">{detailProduct.category_name || '-'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Thương hiệu:</span>
                      <span className="font-medium">{detailProduct.brand_name || detailProduct.supplier_name || '-'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Đơn vị:</span>
                      <span className="font-medium">{detailProduct.unit}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Giá & Tồn kho</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Giá bán:</span>
                      <span className="font-medium text-green-600">{formatCurrency(detailProduct.price)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Giá vốn:</span>
                      <span className="font-medium">{formatCurrency(detailProduct.cost_price || 0)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Giảm giá:</span>
                      <span className="font-medium">{detailProduct.discount_rate || 0}%</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Tồn kho:</span>
                      <span className={`font-semibold ${
                        (detailProduct.stock_qty || 0) > 10 ? 'text-green-600' : 
                        (detailProduct.stock_qty || 0) > 0 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {detailProduct.stock_qty || 0} {detailProduct.unit}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Trạng thái:</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        detailProduct.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {detailProduct.is_active ? 'Hoạt động' : 'Tạm ngừng'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Mô tả</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Mô tả ngắn:</strong> {detailProduct.short_desc || 'Không có'}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Mô tả chi tiết:</strong>
                  </p>
                  <div className="mt-2 prose prose-sm max-w-none">
                    {detailProduct.description || 'Không có mô tả chi tiết'}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="btn-primary"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductManagement;
