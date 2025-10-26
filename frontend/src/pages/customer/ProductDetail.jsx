import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { productService } from '../../services/productService';
import { cartService } from '../../services/cartService';
import { formatCurrency } from '../../utils/formatters';
import { ShoppingCart, ArrowLeft, Package, Tag } from 'lucide-react';

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const data = await productService.getProductById(id);
      setProduct(data);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      setAddingToCart(true);
      
      // Get current cart
      const cartResponse = await cartService.getCart();
      const currentCart = cartResponse.data || { items: [] };
      
      // Check if product already in cart
      const existingItem = currentCart.items.find(item => item.product_id === id);
      
      let updatedItems;
      if (existingItem) {
        // Increase quantity
        updatedItems = currentCart.items.map(item => ({
          product_id: item.product_id,
          qty: item.product_id === id ? item.qty + quantity : item.qty
        }));
      } else {
        // Add new item
        updatedItems = [
          ...currentCart.items.map(item => ({ product_id: item.product_id, qty: item.qty })),
          { product_id: id, qty: quantity }
        ];
      }
      
      await cartService.updateCart(updatedItems);
      alert('Đã thêm sản phẩm vào giỏ hàng!');
      navigate('/cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Không thể thêm sản phẩm vào giỏ hàng');
    } finally {
      setAddingToCart(false);
    }
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

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Không tìm thấy sản phẩm</h2>
          <button onClick={() => navigate('/products')} className="btn-primary">
            Quay lại danh sách sản phẩm
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <button
        onClick={() => navigate('/products')}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="mr-2 h-5 w-5" />
        Quay lại danh sách sản phẩm
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Product Image */}
        <div className="bg-gray-100 rounded-lg overflow-hidden">
          {product.main_image ? (
            <img
              src={product.main_image}
              alt={product.name}
              className="w-full h-auto object-cover"
            />
          ) : (
            <div className="w-full h-96 flex items-center justify-center">
              <Package className="h-32 w-32 text-gray-400" />
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>
          
          <div className="flex items-center space-x-3 mb-6">
            <span className="text-4xl font-bold text-primary-600">
              {formatCurrency(product.final_price)}
            </span>
            <span className="text-gray-500">/ {product.unit}</span>
          </div>

          {product.discount_rate > 0 && (
            <div className="flex items-center space-x-2 mb-6">
              <span className="text-xl text-gray-400 line-through">
                {formatCurrency(product.price)}
              </span>
              <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-semibold">
                Giảm {product.discount_rate}%
              </span>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">SKU:</span>
              <span className="font-semibold">{product.sku || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Danh mục:</span>
              <span className="font-semibold">{product.category?.name || product.category_name || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Thương hiệu:</span>
              <span className="font-semibold">{product.brand?.name || product.brand_name || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Số lượng còn lại:</span>
              <span className={`font-bold ${product.stock_qty > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {product.stock_qty > 0 ? `${product.stock_qty} ${product.unit}` : 'Hết hàng'}
              </span>
            </div>
          </div>

          {/* Quantity Selector */}
          {product.stock_qty > 0 && (
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">Số lượng:</label>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max={product.stock_qty}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock_qty, parseInt(e.target.value) || 1)))}
                  className="w-20 text-center border-2 border-gray-300 rounded-lg py-2 font-semibold"
                />
                <button
                  onClick={() => setQuantity(Math.min(product.stock_qty, quantity + 1))}
                  disabled={quantity >= product.stock_qty}
                  className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Tối đa: {product.stock_qty} {product.unit}
              </p>
            </div>
          )}

          {/* Add to Cart Button */}
          <div className="flex space-x-4">
            {product.stock_qty > 0 ? (
              <button
                onClick={addToCart}
                disabled={addingToCart}
                className="flex-1 btn-primary flex items-center justify-center space-x-2 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-6 h-6" />
                <span>{addingToCart ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}</span>
              </button>
            ) : (
              <button
                disabled
                className="flex-1 bg-gray-300 text-gray-600 flex items-center justify-center space-x-2 py-3 text-lg rounded-lg font-medium cursor-not-allowed"
              >
                <Package className="w-6 h-6" />
                <span>Hết hàng</span>
              </button>
            )}
          </div>

          {/* Description */}
          {product.short_desc && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-3">Mô tả ngắn</h3>
              <p className="text-gray-600">{product.short_desc}</p>
            </div>
          )}

          {product.description && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Mô tả chi tiết</h3>
              <p className="text-gray-600 whitespace-pre-line">{product.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
