import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { cartService } from '../../services/cartService';
import { userService } from '../../services/userService';
import { checkoutService } from '../../services/checkoutService';
import { formatCurrency } from '../../utils/formatters';
import { ShoppingCart, MapPin, CreditCard, FileText, ArrowRight, Plus, QrCode, CheckCircle } from 'lucide-react';

function Checkout() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cartData, addressesData] = await Promise.all([
        cartService.getCart(),
        userService.getAddresses()
      ]);
      
      const cartItems = cartData.data || { items: [], subtotal: 0 };
      setCart(cartItems);
      
      const userAddresses = addressesData.data || [];
      setAddresses(userAddresses);
      
      // Auto-select default address
      const defaultAddr = userAddresses.find(addr => addr.is_default);
      if (defaultAddr) {
        setSelectedAddress(defaultAddr.id);
      } else if (userAddresses.length > 0) {
        setSelectedAddress(userAddresses[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!createdOrder) return;
    
    if (!confirm('Xác nhận bạn đã chuyển khoản?')) {
      return;
    }
    
    try {
      setConfirmingPayment(true);
      await checkoutService.confirmPayment(createdOrder.id);
      alert('Đã gửi xác nhận! Admin sẽ kiểm tra và xác nhận thanh toán của bạn.');
      navigate(`/orders/${createdOrder.id}`);
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('Không thể xác nhận thanh toán');
    } finally {
      setConfirmingPayment(false);
    }
  };

  const generateQRUrl = () => {
    if (!createdOrder) return '';
    
    const bankAccount = '103885257744';
    const amount = Math.round(createdOrder.grand_total);
    const addInfo = `ThanhToan_${createdOrder.order_code}`;
    
    return `https://img.vietqr.io/image/ICB-${bankAccount}-qr_only.png?amount=${amount}&addInfo=${encodeURIComponent(addInfo)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedAddress) {
      alert('Vui lòng chọn địa chỉ giao hàng');
      return;
    }

    if (cart.items.length === 0) {
      alert('Giỏ hàng trống');
      return;
    }

    try {
      setSubmitting(true);
      const orderData = {
        address_id: selectedAddress,
        payment_method: paymentMethod,
        note: note.trim() || null
      };
      
      const response = await checkoutService.createOrder(orderData);
      const order = response.data;
      
      setCreatedOrder(order);
      
      // If BANK_TRANSFER, show QR code
      if (paymentMethod === 'BANK_TRANSFER') {
        setShowQR(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        alert('Đặt hàng thành công!');
        navigate(`/orders/${order.id}`);
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert(error.response?.data?.error?.message || 'Không thể đặt hàng');
    } finally {
      setSubmitting(false);
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

  if (cart.items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center py-16">
          <ShoppingCart className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Giỏ hàng trống</h2>
          <p className="text-gray-600 mb-6">Vui lòng thêm sản phẩm vào giỏ hàng trước khi thanh toán</p>
          <button onClick={() => navigate('/products')} className="btn-primary">
            Tiếp tục mua sắm
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Thanh toán</h1>

      {/* VietQR Payment Display */}
      {showQR && createdOrder && (
        <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-500 rounded-xl shadow-lg p-8 mb-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <QrCode className="w-8 h-8 text-green-600 mr-2" />
              <h2 className="text-2xl font-bold text-gray-900">Quét mã VietQR để thanh toán</h2>
            </div>
            
            <div className="bg-white rounded-lg p-6 mb-6 inline-block shadow-md">
              <img 
                src={generateQRUrl()} 
                alt="VietQR Payment" 
                className="w-80 h-80 object-contain mx-auto"
              />
            </div>

            <div className="bg-white rounded-lg p-6 mb-6 text-left max-w-md mx-auto">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Ngân hàng:</span>
                  <span className="font-bold text-gray-900">VietinBank</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Chủ tài khoản:</span>
                  <span className="font-bold text-gray-900">HUYNH MINH KHOA</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Số tài khoản:</span>
                  <span className="font-bold text-blue-600">103885257744</span>
                </div>
                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Số tiền:</span>
                  <span className="font-bold text-2xl text-green-600">{formatCurrency(createdOrder.grand_total)}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600 font-medium">Nội dung CK:</span>
                  <span className="font-bold text-red-600 text-right">ThanhToan_{createdOrder.order_code}</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6 max-w-md mx-auto">
              <p className="text-sm text-yellow-800">
                <strong>Lưu ý:</strong> Vui lòng nhập đúng nội dung chuyển khoản để hệ thống xử lý nhanh chóng.
              </p>
            </div>

            <button
              onClick={handleConfirmPayment}
              disabled={confirmingPayment}
              className="btn-primary text-lg px-8 py-4 flex items-center justify-center mx-auto disabled:opacity-50"
            >
              <CheckCircle className="w-6 h-6 mr-2" />
              {confirmingPayment ? 'Đang xử lý...' : 'Tôi đã chuyển khoản'}
            </button>

            <p className="text-sm text-gray-600 mt-4">
              Admin sẽ kiểm tra và xác nhận thanh toán của bạn trong thời gian sớm nhất
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Shipping & Payment */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <MapPin className="h-6 w-6 text-primary-600 mr-2" />
                  <h2 className="text-xl font-bold">Địa chỉ giao hàng</h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Thêm địa chỉ mới
                </button>
              </div>

              {addresses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">Bạn chưa có địa chỉ giao hàng</p>
                  <button
                    type="button"
                    onClick={() => navigate('/profile')}
                    className="btn-primary"
                  >
                    Thêm địa chỉ
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <label
                      key={address.id}
                      className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedAddress === address.id
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start">
                        <input
                          type="radio"
                          name="address"
                          value={address.id}
                          checked={selectedAddress === address.id}
                          onChange={(e) => setSelectedAddress(e.target.value)}
                          className="mt-1 h-4 w-4 text-primary-600"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold">{address.recipient}</p>
                            {address.is_default && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                Mặc định
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{address.phone}</p>
                          <p className="text-sm text-gray-700 mt-1">
                            {[address.line1, address.line2, address.ward, address.district, address.city]
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <CreditCard className="h-6 w-6 text-primary-600 mr-2" />
                <h2 className="text-xl font-bold">Phương thức thanh toán</h2>
              </div>

              <div className="space-y-3">
                <label className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  paymentMethod === 'COD'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="payment"
                      value="COD"
                      checked={paymentMethod === 'COD'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="h-4 w-4 text-primary-600"
                    />
                    <div className="ml-3">
                      <p className="font-semibold">Thanh toán khi nhận hàng (COD)</p>
                      <p className="text-sm text-gray-600">Thanh toán bằng tiền mặt khi nhận hàng</p>
                    </div>
                  </div>
                </label>

                <label className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  paymentMethod === 'BANK_TRANSFER'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="payment"
                      value="BANK_TRANSFER"
                      checked={paymentMethod === 'BANK_TRANSFER'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="h-4 w-4 text-primary-600"
                    />
                    <div className="ml-3">
                      <p className="font-semibold">Chuyển khoản ngân hàng</p>
                      <p className="text-sm text-gray-600">Chuyển khoản trước khi giao hàng</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Note */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <FileText className="h-6 w-6 text-primary-600 mr-2" />
                <h2 className="text-xl font-bold">Ghi chú</h2>
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows="3"
                placeholder="Ghi chú cho đơn hàng (tùy chọn)..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h2 className="text-xl font-bold mb-6">Đơn hàng</h2>

              {/* Order Items */}
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {cart.items.map((item) => (
                  <div key={item.product_id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded">
                      {item.image && (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-sm text-gray-600">
                        {item.qty} x {formatCurrency(item.price * (1 - item.discount_rate / 100))}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(item.line_total)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Tạm tính</span>
                  <span>{formatCurrency(cart.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Phí vận chuyển</span>
                  <span className="text-green-600">Miễn phí</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-lg font-bold">
                  <span>Tổng cộng</span>
                  <span className="text-primary-600">{formatCurrency(cart.subtotal)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !selectedAddress}
                className="w-full btn-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Đang xử lý...' : 'Đặt hàng'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                Bằng cách đặt hàng, bạn đồng ý với điều khoản sử dụng của chúng tôi
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default Checkout;
