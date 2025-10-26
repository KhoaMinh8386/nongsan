import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';

// Layouts
import CustomerLayout from './layouts/CustomerLayout';
import AdminLayout from './layouts/AdminLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Customer Pages
import Home from './pages/customer/Home';
import ProductList from './pages/customer/ProductList';
import ProductDetail from './pages/customer/ProductDetail';
import Cart from './pages/customer/Cart';
import Checkout from './pages/customer/Checkout';
import OrderHistory from './pages/customer/OrderHistory';
import OrderDetail from './pages/customer/OrderDetail';
import Returns from './pages/customer/Returns';
import Profile from './pages/customer/Profile';

// Admin Pages
import Dashboard from './pages/admin/Dashboard';
import ProductManagement from './pages/admin/ProductManagement';
import OrderManagement from './pages/admin/OrderManagement';
import ReturnManagement from './pages/admin/ReturnManagement';
import AccountManagement from './pages/admin/AccountManagement';
import SupplierManagement from './pages/admin/SupplierManagement';
import ImportReceiptList from './pages/admin/ImportReceiptList';
import ImportReceiptForm from './pages/admin/ImportReceiptForm';
import ImportReceiptDetail from './pages/admin/ImportReceiptDetail';

// Shipper Pages
import ShipperDashboard from './pages/shipper/ShipperDashboard';

import NotFound from './pages/NotFound';

function App() {
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const PrivateRoute = ({ children, roles }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" />;
    }
    if (roles && !roles.includes(user?.role)) {
      return <Navigate to="/" />;
    }
    return children;
  };

  return (
    <>
      <Toaster position="top-right" />
      <Router>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Customer Routes */}
        <Route path="/" element={<CustomerLayout />}>
          <Route index element={<Home />} />
          <Route path="products" element={<ProductList />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="cart" element={
            <PrivateRoute>
              <Cart />
            </PrivateRoute>
          } />
          <Route path="checkout" element={
            <PrivateRoute>
              <Checkout />
            </PrivateRoute>
          } />
          <Route path="orders" element={
            <PrivateRoute>
              <OrderHistory />
            </PrivateRoute>
          } />
          <Route path="orders/:id" element={
            <PrivateRoute>
              <OrderDetail />
            </PrivateRoute>
          } />
          <Route path="returns" element={
            <PrivateRoute>
              <Returns />
            </PrivateRoute>
          } />
          <Route path="profile" element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          } />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={
          <PrivateRoute roles={['ADMIN', 'STAFF']}>
            <AdminLayout />
          </PrivateRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<ProductManagement />} />
          <Route path="orders" element={<OrderManagement />} />
          <Route path="returns" element={<ReturnManagement />} />
          <Route path="accounts" element={<AccountManagement />} />
          <Route path="suppliers" element={<SupplierManagement />} />
          <Route path="import-receipts" element={<ImportReceiptList />} />
          <Route path="import-receipts/create" element={<ImportReceiptForm />} />
          <Route path="import-receipts/:id" element={<ImportReceiptDetail />} />
          <Route path="import-receipts/:id/edit" element={<ImportReceiptForm />} />
        </Route>

        {/* Shipper Routes */}
        <Route path="/shipper" element={
          <PrivateRoute roles={['SHIPPER']}>
            <ShipperDashboard />
          </PrivateRoute>
        } />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
    </>
  );
}

export default App;
