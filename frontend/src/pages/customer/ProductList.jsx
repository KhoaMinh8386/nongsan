import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { productService } from '../../services/productService';
import { cartService } from '../../services/cartService';
import { formatCurrency } from '../../utils/formatters';
import { ShoppingCart, Filter, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Hard-coded categories and brands (from database)
const CATEGORIES = [
  { id: '20658ecf-8c34-48d8-815b-d0b958f36ec4', name: 'Rau củ' },
  { id: '6297981d-a59d-4959-8a23-e436f1bce3ca', name: 'Trái cây' },
  { id: '4f0c9bad-3dd4-48c0-8a83-ba70ffa8400a', name: 'Hạt - Ngũ cốc' },
  { id: '588035c1-f0dd-43cc-a94d-7e8fcc6beb4c', name: 'Nấm' }
];

const BRANDS = [
  { id: '974a450b-5fcd-4c0f-9ed4-1994da37b92c', name: 'Farm Fresh' },
  { id: '1c219abb-1425-4c2f-ae77-285e98f32a3b', name: 'Green Valley' },
  { id: '74d31649-6ab1-484c-bb73-1b6af60ab513', name: 'Organic Home' }
];

function ProductList() {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [addingToCart, setAddingToCart] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  // Advanced filters
  const [filters, setFilters] = useState({
    category_id: '',
    brand_id: '',
    min_price: '',
    max_price: '',
    search: '',
    page: 1,
    limit: 12
  });

  useEffect(() => {
    fetchProducts();
  }, [filters.category_id, filters.brand_id, filters.page]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = {
        category_id: filters.category_id || undefined,
        brand_id: filters.brand_id || undefined,
        min_price: filters.min_price || undefined,
        max_price: filters.max_price || undefined,
        search: filters.search || undefined,
        page: filters.page,
        limit: filters.limit
      };

      const response = await productService.getProducts(params);
      setProducts(response?.products || []);
      setPagination(response?.pagination || {});
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
      toast.error('Không thể tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, page: 1 }));
    await fetchProducts();
  };

  const handleResetFilters = () => {
    setFilters({
      category_id: '',
      brand_id: '',
      min_price: '',
      max_price: '',
      search: '',
      page: 1,
      limit: 12
    });
  };

  const addToCart = async (productId) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      setAddingToCart(prev => ({ ...prev, [productId]: true }));
      
      // Get current cart
      const cartResponse = await cartService.getCart();
      const currentCart = cartResponse.data || { items: [] };
      
      // Check if product already in cart
      const existingItem = currentCart.items.find(item => item.product_id === productId);
      
      let updatedItems;
      if (existingItem) {
        // Increase quantity
        updatedItems = currentCart.items.map(item => ({
          product_id: item.product_id,
          qty: item.product_id === productId ? item.qty + 1 : item.qty
        }));
      } else {
        // Add new item
        updatedItems = [
          ...currentCart.items.map(item => ({ product_id: item.product_id, qty: item.qty })),
          { product_id: productId, qty: 1 }
        ];
      }
      
      await cartService.updateCart(updatedItems);
      toast.success('Đã thêm sản phẩm vào giỏ hàng!');
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Không thể thêm sản phẩm vào giỏ hàng');
    } finally {
      setAddingToCart(prev => ({ ...prev, [productId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">Đang tải...</div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <h1 className="text-3xl font-bold mb-4">Sản phẩm</h1>
        <p>Hiện chưa có sản phẩm nào.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">Sản phẩm</h1>

      {/* Search Bar */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Filter className="w-5 h-5" />
            Bộ lọc
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Tìm kiếm
          </button>
        </form>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Danh mục</label>
              <select
                value={filters.category_id}
                onChange={(e) => setFilters({ ...filters, category_id: e.target.value, page: 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">Tất cả danh mục</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Thương hiệu</label>
              <select
                value={filters.brand_id}
                onChange={(e) => setFilters({ ...filters, brand_id: e.target.value, page: 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">Tất cả thương hiệu</option>
                {BRANDS.map((brand) => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Giá từ (₫)</label>
              <input
                type="number"
                placeholder="0"
                value={filters.min_price}
                onChange={(e) => setFilters({ ...filters, min_price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                min="0"
                step="1000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Giá đến (₫)</label>
              <input
                type="number"
                placeholder="1000000"
                value={filters.max_price}
                onChange={(e) => setFilters({ ...filters, max_price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                min="0"
                step="1000"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Áp dụng bộ lọc
            </button>
            <button
              onClick={handleResetFilters}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Đặt lại
            </button>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {(filters.category_id || filters.brand_id || filters.min_price || filters.max_price) && (
        <div className="mb-6 flex flex-wrap gap-2">
          <span className="text-sm text-gray-600">Đang lọc:</span>
          {filters.category_id && (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              {CATEGORIES.find(c => c.id === filters.category_id)?.name}
            </span>
          )}
          {filters.brand_id && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {BRANDS.find(b => b.id === filters.brand_id)?.name}
            </span>
          )}
          {filters.min_price && (
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
              Từ {formatCurrency(filters.min_price)}
            </span>
          )}
          {filters.max_price && (
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
              Đến {formatCurrency(filters.max_price)}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => {
          const isOutOfStock = !product.stock_qty || product.stock_qty <= 0;
          
          return (
            <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <Link to={`/products/${product.id}`}>
                <div className="aspect-w-1 aspect-h-1 bg-gray-200 relative">
                  {product.main_image ? (
                    <img src={product.main_image} alt={product.name} className="w-full h-48 object-cover" />
                  ) : (
                    <div className="w-full h-48 flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
                  {isOutOfStock && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      Hết hàng
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">{product.short_desc}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold text-primary-600">
                        {formatCurrency(product.final_price)}
                      </span>
                      <span className="text-sm text-gray-500">/{product.unit}</span>
                    </div>
                  </div>
                </div>
              </Link>
              <div className="px-4 pb-4">
                {isOutOfStock ? (
                  <button 
                    disabled
                    className="w-full bg-gray-300 text-gray-600 py-3 px-4 rounded-lg font-medium cursor-not-allowed"
                  >
                    Hết hàng
                  </button>
                ) : (
                  <button 
                    onClick={() => addToCart(product.id)}
                    disabled={addingToCart[product.id]}
                    className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    <span>{addingToCart[product.id] ? 'Đang thêm...' : 'Thêm vào giỏ'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="mt-12 flex justify-center items-center gap-2">
          <button
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            disabled={filters.page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Trước
          </button>
          <div className="flex gap-2">
            {[...Array(pagination.total_pages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => setFilters({ ...filters, page: i + 1 })}
                className={`px-4 py-2 rounded-lg ${
                  filters.page === i + 1
                    ? 'bg-green-600 text-white'
                    : 'border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {i + 1}
              </button>
            )).slice(Math.max(0, filters.page - 3), Math.min(pagination.total_pages, filters.page + 2))}
          </div>
          <button
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            disabled={filters.page === pagination.total_pages}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sau →
          </button>
        </div>
      )}

      {/* Results count */}
      {pagination.total && (
        <div className="mt-6 text-center text-sm text-gray-600">
          Hiển thị {products.length} / {pagination.total} sản phẩm
        </div>
      )}
    </div>
  );
}

export default ProductList;
