import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cartService } from '../../services/cartService';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';

function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], subtotal: 0, total_items: 0 });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      setLoading(true);
      const response = await cartService.getCart();
      setCart(response.data || { items: [], subtotal: 0, total_items: 0 });
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, newQty) => {
    if (newQty < 1) return;
    
    try {
      setUpdating(true);
      const updatedItems = cart.items.map(item =>
        item.product_id === productId ? { product_id: item.product_id, qty: newQty } : { product_id: item.product_id, qty: item.qty }
      );
      
      await cartService.updateCart(updatedItems);
      await loadCart();
    } catch (error) {
      console.error('Error updating quantity:', error);
      alert('Không thể cập nhật số lượng');
    } finally {
      setUpdating(false);
    }
  };

  const removeItem = async (productId) => {
    try {
      setUpdating(true);
      const updatedItems = cart.items
        .filter(item => item.product_id !== productId)
        .map(item => ({ product_id: item.product_id, qty: item.qty }));
      
      await cartService.updateCart(updatedItems);
      await loadCart();
    } catch (error) {
      console.error('Error removing item:', error);
      alert('Không thể xóa sản phẩm');
    } finally {
      setUpdating(false);
    }
  };

  const clearAllCart = async () => {
    if (!confirm('Bạn có chắc muốn xóa toàn bộ giỏ hàng?')) return;
    
    try {
      setUpdating(true);
      await cartService.clearCart();
      await loadCart();
    } catch (error) {
      console.error('Error clearing cart:', error);
      alert('Không thể xóa giỏ hàng');
    } finally {
      setUpdating(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
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

  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center py-16">
          <ShoppingBag className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Giỏ hàng trống</h2>
          <p className="text-gray-600 mb-6">Bạn chưa có sản phẩm nào trong giỏ hàng</p>
          <button
            onClick={() => navigate('/products')}
            className="btn-primary inline-flex items-center"
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            Tiếp tục mua sắm
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Giỏ hàng của bạn</h1>
        <button
          onClick={clearAllCart}
          disabled={updating}
          className="text-red-600 hover:text-red-700 font-medium flex items-center"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Xóa tất cả
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => (
            <div key={item.product_id} className="bg-white rounded-lg shadow-md p-6 flex items-center space-x-4">
              {/* Product Image */}
              <div className="flex-shrink-0 w-24 h-24 bg-gray-200 rounded-lg overflow-hidden">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingCart className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.name}</h3>
                <p className="text-sm text-gray-600 mb-2">Đơn vị: {item.unit}</p>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold text-primary-600">
                    {formatPrice(item.price * (1 - item.discount_rate / 100))}
                  </span>
                  {item.discount_rate > 0 && (
                    <>
                      <span className="text-sm text-gray-400 line-through">
                        {formatPrice(item.price)}
                      </span>
                      <span className="text-sm text-red-600 font-semibold">
                        -{item.discount_rate}%
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => updateQuantity(item.product_id, item.qty - 1)}
                  disabled={updating || item.qty <= 1}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center font-semibold">{item.qty}</span>
                <button
                  onClick={() => updateQuantity(item.product_id, item.qty + 1)}
                  disabled={updating}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Line Total */}
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">
                  {formatPrice(item.line_total)}
                </p>
              </div>

              {/* Remove Button */}
              <button
                onClick={() => removeItem(item.product_id)}
                disabled={updating}
                className="text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Tổng đơn hàng</h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Tạm tính ({cart.total_items} sản phẩm)</span>
                <span>{formatPrice(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Phí vận chuyển</span>
                <span className="text-green-600">Miễn phí</span>
              </div>
              <div className="border-t pt-3 flex justify-between text-lg font-bold text-gray-900">
                <span>Tổng cộng</span>
                <span className="text-primary-600">{formatPrice(cart.subtotal)}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              disabled={updating}
              className="w-full btn-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Tiến hành thanh toán
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>

            <button
              onClick={() => navigate('/products')}
              className="w-full mt-3 btn-outline"
            >
              Tiếp tục mua sắm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Cart;
