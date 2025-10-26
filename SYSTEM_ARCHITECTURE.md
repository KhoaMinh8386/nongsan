# HỆ THỐNG THƯƠNG MẠI ĐIỆN TỬ NÔNG SẢN SẠCH
## PHÂN TÍCH HỆ THỐNG & KIẾN TRÚC TỔNG QUAN

---

## 📋 1. TỔNG QUAN DỰ ÁN

### 1.1 Mô Tả Hệ Thống
**Tên dự án**: Nông Sản Sạch E-Commerce  
**Mục tiêu**: Xây dựng nền tảng thương mại điện tử chuyên về nông sản sạch với 2 website:
- **Website Khách Hàng**: Mua sắm, đặt hàng, theo dõi đơn hàng
- **Website Quản Trị**: Quản lý sản phẩm, đơn hàng, khách hàng, báo cáo

### 1.2 Stack Công Nghệ
- **Backend**: Node.js + Express.js
- **Frontend**: React.js (Vite)
- **Database**: PostgreSQL với stored functions
- **Authentication**: JWT
- **UI Framework**: TailwindCSS + shadcn/ui

---

## 👥 2. PHÂN TÍCH ACTOR & USE CASE

### 2.1 Actors
1. **CUSTOMER (Khách hàng)**
2. **ADMIN (Quản trị viên)**
3. **STAFF (Nhân viên)**

### 2.2 Use Cases Chi Tiết

#### 🛍️ CUSTOMER Use Cases
| Use Case | Mô Tả | Function PostgreSQL |
|----------|-------|---------------------|
| UC-C01: Đăng ký tài khoản | Tạo tài khoản mới | INSERT agri.accounts |
| UC-C02: Đăng nhập | Xác thực và nhận token | SELECT agri.accounts |
| UC-C03: Xem danh sách sản phẩm | Lọc theo danh mục, giá, thương hiệu | SELECT agri.products |
| UC-C04: Tìm kiếm sản phẩm | Tìm kiếm full-text | agri.products.search_tsv |
| UC-C05: Xem chi tiết sản phẩm | Thông tin + hình ảnh | JOIN products, product_images |
| UC-C06: Thêm vào giỏ hàng | Cập nhật giỏ hàng | agri.cap_nhat_gio_hang() |
| UC-C07: Xem giỏ hàng | Danh sách items trong cart | SELECT agri.carts, cart_items |
| UC-C08: Đặt hàng | Tạo đơn hàng mới | agri.tao_don_hang() |
| UC-C09: Theo dõi đơn hàng | Xem trạng thái đơn | agri.don_hang_chi_tiet() |
| UC-C10: Yêu cầu đổi trả | Tạo yêu cầu return | agri.tao_yeu_cau_doi_tra() |
| UC-C11: Quản lý địa chỉ | CRUD addresses | agri.addresses |

#### 🔧 ADMIN/STAFF Use Cases
| Use Case | Mô Tả | Function PostgreSQL |
|----------|-------|---------------------|
| UC-A01: Quản lý tài khoản | CRUD users | agri.accounts |
| UC-A02: Quản lý sản phẩm | CRUD products | agri.products |
| UC-A03: Quản lý tồn kho | Cập nhật stock | agri.kho_khoi_tao() |
| UC-A04: Quản lý đơn hàng | Xem, duyệt đơn | agri.cap_nhat_trang_thai_don() |
| UC-A05: Xuất kho | Commit stock khi ship | agri.xuat_kho() |
| UC-A06: Quản lý thanh toán | Đánh dấu đã thanh toán | agri.danh_dau_thanh_toan() |
| UC-A07: Duyệt đổi trả | Approve/reject return | agri.duyet_doi_tra() |
| UC-A08: Dashboard tổng quan | Thống kê tổng quan | agri.tong_quan_dashboard() |
| UC-A09: Báo cáo doanh thu | Thống kê theo ngày | agri.thong_ke_doanh_thu() |
| UC-A10: Top sản phẩm | Sản phẩm bán chạy | agri.top_san_pham_theo_doanh_thu() |

---

## 🏗️ 3. KIẾN TRÚC HỆ THỐNG

### 3.1 Kiến Trúc Tổng Quan
```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                              │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │  Customer Portal │         │   Admin Portal   │          │
│  │   (React Vite)   │         │   (React Vite)   │          │
│  └────────┬─────────┘         └────────┬─────────┘          │
└───────────┼──────────────────────────────┼──────────────────┘
            │                              │
            │         HTTP/REST API        │
            └──────────────┬───────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                   APPLICATION LAYER                          │
│              ┌────────────▼────────────┐                     │
│              │   Express.js Server     │                     │
│              │  ┌──────────────────┐   │                     │
│              │  │  Auth Middleware │   │                     │
│              │  └──────────────────┘   │                     │
│              │  ┌──────────────────┐   │                     │
│              │  │   Controllers    │   │                     │
│              │  └──────────────────┘   │                     │
│              │  ┌──────────────────┐   │                     │
│              │  │    Services      │────┼─────┐              │
│              │  └──────────────────┘   │     │              │
│              └─────────────────────────┘     │              │
└──────────────────────────────────────────────┼──────────────┘
                                               │
┌──────────────────────────────────────────────┼──────────────┐
│                    DATABASE LAYER            │              │
│              ┌───────────────────────────────▼──┐           │
│              │      PostgreSQL Database         │           │
│              │  ┌───────────────────────────┐   │           │
│              │  │   Tables (agri schema)    │   │           │
│              │  └───────────────────────────┘   │           │
│              │  ┌───────────────────────────┐   │           │
│              │  │  Functions (plpgsql)      │   │           │
│              │  └───────────────────────────┘   │           │
│              │  ┌───────────────────────────┐   │           │
│              │  │      Triggers             │   │           │
│              │  └───────────────────────────┘   │           │
│              └──────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Luồng Dữ Liệu (Data Flow)
1. **Client** gửi HTTP request → **Backend API**
2. **Middleware** xác thực JWT token
3. **Controller** nhận request, validate input
4. **Service** gọi **PostgreSQL Function**
5. **Database** thực thi logic, trả về kết quả
6. **Service** format response
7. **Controller** trả về JSON cho client

---

## 📦 4. CẤU TRÚC THƯ MỤC CHI TIẾT

```
NONGSAN/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js              # PostgreSQL connection pool
│   │   │   └── env.js             # Environment variables
│   │   ├── middlewares/
│   │   │   ├── auth.js            # JWT authentication
│   │   │   ├── validate.js        # Request validation
│   │   │   └── errorHandler.js   # Error handling
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── productController.js
│   │   │   ├── cartController.js
│   │   │   ├── orderController.js
│   │   │   ├── returnController.js
│   │   │   └── dashboardController.js
│   │   ├── services/
│   │   │   ├── authService.js
│   │   │   ├── productService.js
│   │   │   ├── cartService.js
│   │   │   ├── orderService.js
│   │   │   ├── returnService.js
│   │   │   └── dashboardService.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── product.routes.js
│   │   │   ├── cart.routes.js
│   │   │   ├── order.routes.js
│   │   │   ├── return.routes.js
│   │   │   └── dashboard.routes.js
│   │   ├── utils/
│   │   │   ├── jwt.js
│   │   │   ├── bcrypt.js
│   │   │   └── response.js
│   │   └── index.js               # Main server file
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Header.jsx
│   │   │   │   ├── Footer.jsx
│   │   │   │   ├── Navbar.jsx
│   │   │   │   └── LoadingSpinner.jsx
│   │   │   ├── customer/
│   │   │   │   ├── ProductCard.jsx
│   │   │   │   ├── ProductFilter.jsx
│   │   │   │   ├── CartItem.jsx
│   │   │   │   └── OrderTracker.jsx
│   │   │   └── admin/
│   │   │       ├── ProductTable.jsx
│   │   │       ├── OrderTable.jsx
│   │   │       ├── DashboardCard.jsx
│   │   │       └── RevenueChart.jsx
│   │   ├── pages/
│   │   │   ├── customer/
│   │   │   │   ├── Home.jsx
│   │   │   │   ├── ProductList.jsx
│   │   │   │   ├── ProductDetail.jsx
│   │   │   │   ├── Cart.jsx
│   │   │   │   ├── Checkout.jsx
│   │   │   │   ├── OrderHistory.jsx
│   │   │   │   └── OrderDetail.jsx
│   │   │   ├── admin/
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── ProductManagement.jsx
│   │   │   │   ├── OrderManagement.jsx
│   │   │   │   ├── ReturnManagement.jsx
│   │   │   │   ├── UserManagement.jsx
│   │   │   │   └── Reports.jsx
│   │   │   ├── auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   └── Register.jsx
│   │   │   └── NotFound.jsx
│   │   ├── layouts/
│   │   │   ├── CustomerLayout.jsx
│   │   │   └── AdminLayout.jsx
│   │   ├── services/
│   │   │   ├── api.js             # Axios instance
│   │   │   ├── authService.js
│   │   │   ├── productService.js
│   │   │   ├── cartService.js
│   │   │   ├── orderService.js
│   │   │   └── dashboardService.js
│   │   ├── store/
│   │   │   ├── authSlice.js       # Redux auth state
│   │   │   ├── cartSlice.js
│   │   │   └── store.js           # Redux store config
│   │   ├── utils/
│   │   │   ├── formatters.js
│   │   │   └── constants.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── README.md
│
├── database/
│   └── nong_san_full.sql          # Full SQL schema + functions
│
├── SYSTEM_ARCHITECTURE.md          # This file
├── API_DOCUMENTATION.md            # API specs
└── README.md                       # Main project readme
```

---

## 🗄️ 5. DATABASE SCHEMA OVERVIEW

### 5.1 Core Tables
```
agri.accounts          → Tài khoản người dùng
agri.addresses         → Địa chỉ giao hàng
agri.categories        → Danh mục sản phẩm
agri.brands            → Thương hiệu
agri.products          → Sản phẩm
agri.product_images    → Hình ảnh sản phẩm
agri.inventory         → Tồn kho
agri.stock_movements   → Nhật ký xuất nhập kho
agri.carts             → Giỏ hàng
agri.cart_items        → Items trong giỏ
agri.orders            → Đơn hàng
agri.order_items       → Items trong đơn
agri.payments          → Thanh toán
agri.returns           → Đổi trả
agri.return_items      → Items đổi trả
```

### 5.2 Key PostgreSQL Functions
| Function | Mô Tả |
|----------|-------|
| `agri.tao_don_hang()` | Tạo đơn hàng mới + reserve stock |
| `agri.cap_nhat_trang_thai_don()` | Cập nhật trạng thái + auto xuất kho |
| `agri.xuat_kho()` | Commit stock movements |
| `agri.danh_dau_thanh_toan()` | Ghi nhận thanh toán |
| `agri.tao_yeu_cau_doi_tra()` | Tạo return request |
| `agri.duyet_doi_tra()` | Approve return + nhập kho |
| `agri.cap_nhat_gio_hang()` | Update cart items |
| `agri.thong_ke_doanh_thu()` | Revenue report by date |
| `agri.top_san_pham_theo_doanh_thu()` | Best sellers |
| `agri.tong_quan_dashboard()` | Dashboard overview |

---

## 🔐 6. AUTHENTICATION & AUTHORIZATION

### 6.1 Luồng Đăng Nhập
```
1. Client POST /auth/login { email, password }
2. Backend query SELECT * FROM agri.accounts WHERE email = ?
3. Verify password hash (bcrypt)
4. Generate JWT token (payload: { id, email, role })
5. Return { token, user: { id, email, full_name, role } }
6. Client lưu token vào localStorage
7. Mọi request tiếp theo gửi header: Authorization: Bearer <token>
```

### 6.2 Middleware Auth
```javascript
// Kiểm tra token hợp lệ
authenticate() → verify JWT → attach user to req.user

// Kiểm tra role
authorize(['ADMIN', 'STAFF']) → check req.user.role
```

---

## 📡 7. RESTFUL API ENDPOINTS OVERVIEW

### 7.1 Authentication
- `POST /api/auth/register` → Đăng ký
- `POST /api/auth/login` → Đăng nhập
- `GET /api/auth/me` → Lấy thông tin user hiện tại

### 7.2 Products
- `GET /api/products` → Danh sách sản phẩm (filter, search, paginate)
- `GET /api/products/:id` → Chi tiết sản phẩm
- `POST /api/products` → Tạo sản phẩm (ADMIN)
- `PUT /api/products/:id` → Cập nhật (ADMIN)
- `DELETE /api/products/:id` → Xóa (ADMIN)

### 7.3 Cart
- `GET /api/cart` → Lấy giỏ hàng
- `POST /api/cart` → Cập nhật giỏ (gọi `agri.cap_nhat_gio_hang()`)

### 7.4 Orders
- `GET /api/orders` → Danh sách đơn hàng
- `GET /api/orders/:id` → Chi tiết đơn (gọi `agri.don_hang_chi_tiet()`)
- `POST /api/orders` → Tạo đơn (gọi `agri.tao_don_hang()`)
- `PUT /api/orders/:id/status` → Cập nhật trạng thái (gọi `agri.cap_nhat_trang_thai_don()`)
- `POST /api/orders/:id/payment` → Đánh dấu thanh toán (gọi `agri.danh_dau_thanh_toan()`)

### 7.5 Returns
- `GET /api/returns` → Danh sách đổi trả
- `POST /api/returns` → Tạo yêu cầu (gọi `agri.tao_yeu_cau_doi_tra()`)
- `PUT /api/returns/:id/approve` → Duyệt (gọi `agri.duyet_doi_tra()`)

### 7.6 Dashboard (ADMIN)
- `GET /api/dashboard/overview` → Tổng quan (gọi `agri.tong_quan_dashboard()`)
- `GET /api/dashboard/revenue` → Doanh thu (gọi `agri.thong_ke_doanh_thu()`)
- `GET /api/dashboard/top-products` → Top sản phẩm (gọi `agri.top_san_pham_theo_doanh_thu()`)

---

## 🎨 8. UI/UX DESIGN GUIDELINES

### 8.1 Customer Portal Theme
- **Primary Color**: Green (#10b981) - tượng trưng cho nông sản sạch
- **Secondary Color**: Orange (#f97316) - năng lượng, tươi mới
- **Layout**: Clean, minimalist, focus vào hình ảnh sản phẩm

### 8.2 Admin Portal Theme
- **Primary Color**: Blue (#3b82f6) - chuyên nghiệp
- **Sidebar**: Dark mode với icons
- **Dashboard**: Cards + Charts (recharts)

### 8.3 Key Components
- Product Card: Hình ảnh lớn, giá, discount badge
- Filter Sidebar: Danh mục, giá, thương hiệu
- Shopping Cart: Floating button với badge số lượng
- Order Tracker: Timeline hiển thị trạng thái đơn hàng

---

## 🚀 9. DEPLOYMENT STRATEGY

### 9.1 Development Environment
```
Frontend: http://localhost:5173 (Vite dev server)
Backend: http://localhost:5000 (Express)
Database: PostgreSQL localhost:5432
```

### 9.2 Production Recommendations
- **Frontend**: Vercel / Netlify
- **Backend**: Railway / Render / DigitalOcean
- **Database**: Supabase / Neon / DigitalOcean Managed PostgreSQL
- **CDN**: Cloudflare cho static assets

---

## 📊 10. PERFORMANCE CONSIDERATIONS

### 10.1 Database Optimization
- Indexes trên columns thường query (category_id, brand_id, email)
- Full-text search với `tsvector` cho products
- Connection pooling (pg library)

### 10.2 API Optimization
- Pagination cho list APIs
- Response caching (Redis - optional)
- Lazy loading cho hình ảnh

### 10.3 Frontend Optimization
- Code splitting (React.lazy)
- Image optimization (WebP format)
- Bundle size optimization (Vite build)

---

## 🔒 11. SECURITY MEASURES

1. **Password**: Bcrypt hashing (cost factor 10)
2. **JWT**: Expire 30 days, secret key trong .env
3. **SQL Injection**: Sử dụng parameterized queries
4. **XSS**: React auto-escapes, thêm helmet.js
5. **CORS**: Chỉ allow frontend domain
6. **Rate Limiting**: Express rate-limit middleware
7. **Input Validation**: Joi hoặc express-validator

---

## 📝 12. TESTING STRATEGY

### 12.1 Backend Testing
- Unit tests: Jest cho services
- Integration tests: Supertest cho API endpoints
- Database: Test với PostgreSQL test database

### 12.2 Frontend Testing
- Component tests: React Testing Library
- E2E tests: Playwright (optional)

---

## 📚 13. DOCUMENTATION

### 13.1 Code Documentation
- JSDoc cho functions quan trọng
- README.md cho setup instructions
- API_DOCUMENTATION.md chi tiết endpoints

### 13.2 Database Documentation
- ER Diagram
- Function reference guide
- Sample queries

---

**NEXT STEPS**: 
1. Setup backend codebase
2. Setup frontend codebase  
3. Create API documentation
4. Implement core features
5. Testing & deployment
