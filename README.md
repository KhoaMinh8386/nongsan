# HỆ THỐNG THƯƠNG MẠI ĐIỆN TỬ NÔNG SẢN SẠCH

## 📋 Tổng Quan

Hệ thống E-Commerce fullstack cho nông sản sạch, gồm:
- **Website Khách Hàng**: Mua sắm, đặt hàng, theo dõi đơn hàng
- **Website Quản Trị**: Quản lý sản phẩm, đơn hàng, kho, báo cáo

## 🛠️ Stack Công Nghệ

### Backend
- **Node.js** + **Express.js**
- **PostgreSQL** với stored functions (plpgsql)
- **JWT** authentication
- **Bcrypt** password hashing

### Frontend
- **React.js** + **Vite**
- **Redux Toolkit** (state management)
- **TailwindCSS** (styling)
- **Lucide React** (icons)
- **Axios** (HTTP client)

### Database
- **PostgreSQL** với schema `agri`
- Toàn bộ business logic trong database functions
- Triggers tự động cập nhật timestamps

## 📦 Cấu Trúc Dự Án

```
NONGSAN/
├── backend/                 # Node.js API Server
│   ├── src/
│   │   ├── config/         # DB connection
│   │   ├── controllers/    # Request handlers
│   │   ├── services/       # Business logic (calls DB functions)
│   │   ├── routes/         # API routes
│   │   ├── middlewares/    # Auth, validation
│   │   └── utils/          # Helpers
│   └── package.json
├── frontend/               # React App
│   ├── src/
│   │   ├── pages/         # Customer & Admin pages
│   │   ├── components/    # Reusable components
│   │   ├── layouts/       # Layout components
│   │   ├── services/      # API services
│   │   ├── store/         # Redux slices
│   │   └── utils/         # Helpers
│   └── package.json
├── database/
│   └── nong_san_full.sql  # Full DB schema + functions + seed data
├── SYSTEM_ARCHITECTURE.md  # System design doc
├── API_DOCUMENTATION.md    # API specs
└── README.md              # This file
```

## 🚀 Hướng Dẫn Cài Đặt & Chạy

### Yêu Cầu
- Node.js v18+
- PostgreSQL v14+
- npm hoặc yarn

### Bước 1: Clone & Setup Database

```bash
# Clone/navigate to project
cd NONGSAN

# Import database
psql -U postgres -f database/nong_san_full.sql
```

### Bước 2: Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Run development server
npm run dev
```

Backend sẽ chạy tại: **http://localhost:5000**

### Bước 3: Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend sẽ chạy tại: **http://localhost:5173**

## 🔐 Tài Khoản Demo

Sau khi import database, sử dụng tài khoản sau để đăng nhập:

**Admin:**
- Email: `admin@example.com`
- Password: `123456`

**Khách Hàng:**
- Email: `khach@example.com`
- Password: `123456`

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user

### Products
- `GET /api/products` - Danh sách sản phẩm
- `GET /api/products/:id` - Chi tiết sản phẩm
- `POST /api/products` - Tạo sản phẩm (ADMIN)
- `PUT /api/products/:id` - Cập nhật (ADMIN)
- `DELETE /api/products/:id` - Xóa (ADMIN)

### Cart
- `GET /api/cart` - Lấy giỏ hàng
- `POST /api/cart` - Cập nhật giỏ hàng

### Orders
- `GET /api/orders` - Danh sách đơn hàng
- `GET /api/orders/:id` - Chi tiết đơn hàng
- `POST /api/orders` - Tạo đơn hàng
- `PUT /api/orders/:id/status` - Cập nhật trạng thái (ADMIN)
- `POST /api/orders/:id/payment` - Đánh dấu thanh toán (ADMIN)

### Returns
- `GET /api/returns` - Danh sách đổi trả
- `POST /api/returns` - Tạo yêu cầu đổi trả
- `PUT /api/returns/:id/approve` - Duyệt (ADMIN)
- `PUT /api/returns/:id/reject` - Từ chối (ADMIN)

### Dashboard (ADMIN)
- `GET /api/dashboard/overview` - Tổng quan
- `GET /api/dashboard/revenue` - Báo cáo doanh thu
- `GET /api/dashboard/top-products` - Top sản phẩm

Xem chi tiết: **API_DOCUMENTATION.md**

## 🗄️ Database Functions

Hệ thống sử dụng PostgreSQL functions để xử lý business logic:

| Function | Mô Tả |
|----------|-------|
| `agri.tao_don_hang()` | Tạo đơn hàng + reserve stock |
| `agri.cap_nhat_trang_thai_don()` | Cập nhật trạng thái + auto xuất kho |
| `agri.xuat_kho()` | Commit stock movements |
| `agri.danh_dau_thanh_toan()` | Ghi nhận thanh toán |
| `agri.tao_yeu_cau_doi_tra()` | Tạo return request |
| `agri.duyet_doi_tra()` | Approve return + nhập kho |
| `agri.cap_nhat_gio_hang()` | Update cart items |
| `agri.thong_ke_doanh_thu()` | Revenue report |
| `agri.top_san_pham_theo_doanh_thu()` | Best sellers |
| `agri.tong_quan_dashboard()` | Dashboard overview |

## 🎯 Chức Năng Chính

### Khách Hàng
✅ Đăng ký / Đăng nhập  
✅ Xem danh sách sản phẩm (filter, search, pagination)  
✅ Xem chi tiết sản phẩm  
✅ Thêm vào giỏ hàng  
✅ Đặt hàng  
✅ Theo dõi đơn hàng  
✅ Yêu cầu đổi trả  

### Quản Trị
✅ Dashboard tổng quan  
✅ Quản lý sản phẩm (CRUD + tồn kho)  
✅ Quản lý đơn hàng (duyệt, cập nhật trạng thái)  
✅ Quản lý đổi trả  
✅ Báo cáo doanh thu  
✅ Top sản phẩm bán chạy  

## 📁 File Quan Trọng

- **SYSTEM_ARCHITECTURE.md** - Phân tích kiến trúc hệ thống
- **API_DOCUMENTATION.md** - Chi tiết API endpoints
- **database/nong_san_full.sql** - Database schema + functions + seed data
- **backend/README.md** - Hướng dẫn backend
- **frontend/README.md** - Hướng dẫn frontend (tạo thêm nếu cần)

## 🔧 Development

### Backend Development
```bash
cd backend
npm run dev    # Nodemon auto-reload
```

### Frontend Development
```bash
cd frontend
npm run dev    # Vite hot reload
```

### Production Build
```bash
# Backend
cd backend
npm start

# Frontend
cd frontend
npm run build
npm run preview
```

## 🧪 Testing

Backend có thể test bằng:
- Postman/Thunder Client (import API collection)
- curl commands
- Automated tests (chưa implement)

## 📝 Notes

- Database functions xử lý toàn bộ business logic (inventory, orders, returns)
- Frontend sử dụng Redux cho global state (auth, cart)
- API authentication sử dụng JWT với Bearer token
- Password được hash bằng bcrypt (salt rounds: 10)
- CORS được cấu hình cho frontend URL

## 🤝 Contributing

Dự án này được thiết kế như một template fullstack E-Commerce.  
Bạn có thể mở rộng bằng cách:
- Thêm payment gateway integration
- Implement upload ảnh sản phẩm
- Thêm email notifications
- Implement search nâng cao
- Thêm reviews & ratings
- Deploy lên cloud

## 📧 Contact

Email: admin@nongsansach.com  
Website: https://nongsansach.com

---

**Happy Coding! 🚀**
