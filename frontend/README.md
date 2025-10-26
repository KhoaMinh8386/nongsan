# Frontend - Nông Sản Sạch E-Commerce

React + Vite frontend cho hệ thống E-commerce nông sản sạch.

## 🛠️ Tech Stack

- **React 18** - UI library
- **Vite** - Build tool & dev server
- **Redux Toolkit** - State management
- **React Router v6** - Routing
- **TailwindCSS** - Styling
- **Axios** - HTTP client
- **Lucide React** - Icons

## 📦 Installation

```bash
npm install
```

## 🚀 Development

```bash
npm run dev
```

Mở trình duyệt tại: http://localhost:5173

## 🏗️ Build for Production

```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
src/
├── components/        # Reusable components (future)
├── layouts/           # Layout components
│   ├── CustomerLayout.jsx
│   └── AdminLayout.jsx
├── pages/             # Page components
│   ├── auth/          # Login, Register
│   ├── customer/      # Customer pages
│   └── admin/         # Admin pages
├── services/          # API service calls
│   ├── api.js         # Axios instance
│   ├── authService.js
│   ├── productService.js
│   ├── cartService.js
│   ├── orderService.js
│   └── dashboardService.js
├── store/             # Redux store
│   ├── store.js
│   ├── authSlice.js
│   └── cartSlice.js
├── utils/             # Helper functions
│   ├── formatters.js
│   └── constants.js
├── App.jsx            # Main app with routing
├── main.jsx           # Entry point
└── index.css          # Global styles
```

## 🛣️ Routes

### Public Routes
- `/` - Home page
- `/products` - Product list
- `/products/:id` - Product detail
- `/login` - Login
- `/register` - Register

### Customer Routes (Requires Auth)
- `/cart` - Shopping cart
- `/checkout` - Checkout
- `/orders` - Order history
- `/orders/:id` - Order detail

### Admin Routes (ADMIN/STAFF only)
- `/admin` - Dashboard
- `/admin/products` - Product management
- `/admin/orders` - Order management
- `/admin/returns` - Return management

## 🔐 Authentication

JWT token được lưu trong localStorage:
- `token` - JWT access token
- `user` - User info (id, email, full_name, role)

Token tự động attach vào mọi API request qua Axios interceptor.

## 🎨 Styling

TailwindCSS classes + custom utility classes:

```jsx
// Buttons
<button className="btn-primary">Primary</button>
<button className="btn-secondary">Secondary</button>
<button className="btn-danger">Danger</button>

// Inputs
<input className="input-field" />

// Cards
<div className="card">...</div>
```

## 📡 API Integration

Tất cả API calls qua services:

```javascript
// Example: Login
import { authService } from './services/authService';

const response = await authService.login({ email, password });

// Example: Get products
import { productService } from './services/productService';

const products = await productService.getProducts({ 
  category_id: 'xxx',
  page: 1,
  limit: 12 
});
```

## 🔧 Environment Variables

Vite sử dụng `.env` files:

```env
VITE_API_URL=http://localhost:5000/api
```

Access trong code:
```javascript
const apiUrl = import.meta.env.VITE_API_URL;
```

## 📱 Responsive Design

TailwindCSS breakpoints:
- `sm:` - ≥640px
- `md:` - ≥768px
- `lg:` - ≥1024px
- `xl:` - ≥1280px

## 🧩 Components Overview

### Layouts
- **CustomerLayout** - Header, footer, navigation cho customer
- **AdminLayout** - Sidebar navigation cho admin

### Pages
**Auth:**
- Login, Register

**Customer:**
- Home, ProductList, ProductDetail
- Cart, Checkout
- OrderHistory, OrderDetail

**Admin:**
- Dashboard - Thống kê tổng quan
- ProductManagement - CRUD products
- OrderManagement - Quản lý đơn hàng
- ReturnManagement - Quản lý đổi trả

## 🔄 State Management

Redux slices:

**authSlice:**
```javascript
{
  user: { id, email, full_name, role },
  isAuthenticated: boolean,
  loading: boolean,
  error: string
}
```

**cartSlice:**
```javascript
{
  items: [],
  totalItems: number,
  subtotal: number,
  loading: boolean
}
```

## 🎯 Next Steps

Để hoàn thiện frontend:

1. **Product Detail Page** - Hiển thị đầy đủ thông tin, thêm vào giỏ
2. **Cart Page** - Quản lý items, cập nhật số lượng, checkout
3. **Checkout Page** - Form địa chỉ, xác nhận đơn hàng
4. **Order Pages** - Hiển thị chi tiết, tracking
5. **Admin Pages** - CRUD forms, tables, filters
6. **Components** - ProductCard, OrderTable, DashboardCard, Charts

## 🧪 Testing

```bash
# No tests configured yet
# Can add:
npm install -D @testing-library/react vitest
```

## 📚 Documentation

- Main README: `../README.md`
- API Docs: `../API_DOCUMENTATION.md`
- System Architecture: `../SYSTEM_ARCHITECTURE.md`

## 🚀 Deployment

Build cho production:

```bash
npm run build
```

Output tại `dist/` folder. Deploy lên:
- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages

## 🐛 Debugging

**React DevTools**
- Install extension trong Chrome/Firefox

**Redux DevTools**
- Install extension để inspect state

**Vite Dev Server**
- HMR (Hot Module Replacement) enabled
- Fast refresh cho React components

---

**Happy Coding! ⚛️**
