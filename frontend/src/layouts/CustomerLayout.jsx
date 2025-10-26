import { Outlet, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { ShoppingCart, User, LogOut, Package, RefreshCw } from 'lucide-react';
import { logout } from '../store/authSlice';

function CustomerLayout() {
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { totalItems } = useSelector((state) => state.cart);

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">NS</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Nông Sản Sạch</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              <Link to="/" className="text-gray-700 hover:text-primary-600 font-medium">
                Trang chủ
              </Link>
              <Link to="/products" className="text-gray-700 hover:text-primary-600 font-medium">
                Sản phẩm
              </Link>
            </nav>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              {/* Cart */}
              <Link to="/cart" className="relative p-2 hover:bg-gray-100 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-gray-700" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Link>

              {/* User Menu */}
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <Link to="/orders" className="flex items-center space-x-1 text-gray-700 hover:text-primary-600">
                    <Package className="w-5 h-5" />
                    <span className="hidden md:inline">Đơn hàng</span>
                  </Link>
                  <Link to="/returns" className="flex items-center space-x-1 text-gray-700 hover:text-primary-600">
                    <RefreshCw className="w-5 h-5" />
                    <span className="hidden md:inline">Đổi trả</span>
                  </Link>
                  <div className="flex items-center space-x-2">
                    <User className="w-5 h-5 text-gray-700" />
                    <span className="text-sm font-medium text-gray-700">{user?.full_name}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1 text-gray-700 hover:text-red-600"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="hidden md:inline">Đăng xuất</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link to="/login" className="text-gray-700 hover:text-primary-600 font-medium">
                    Đăng nhập
                  </Link>
                  <Link to="/register" className="btn-primary">
                    Đăng ký
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-screen">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">Nông Sản Sạch</h3>
              <p className="text-gray-300">
                Cung cấp nông sản sạch, chất lượng cao từ trang trại đến bàn ăn của bạn.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">Liên kết</h3>
              <ul className="space-y-2">
                <li><Link to="/products" className="text-gray-300 hover:text-white">Sản phẩm</Link></li>
                <li><Link to="/orders" className="text-gray-300 hover:text-white">Đơn hàng</Link></li>
                <li><Link to="/returns" className="text-gray-300 hover:text-white">Đổi trả</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">Liên hệ</h3>
              <p className="text-gray-300">Email: info@nongsansach.com</p>
              <p className="text-gray-300">Hotline: 1900 xxxx</p>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Nông Sản Sạch. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default CustomerLayout;
