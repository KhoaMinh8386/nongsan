# Backend API - Nông Sản Sạch E-Commerce

Backend API cho hệ thống thương mại điện tử nông sản sạch.

## 🛠️ Tech Stack

- **Node.js** v18+
- **Express.js** - Web framework
- **PostgreSQL** - Database với stored functions
- **JWT** - Authentication
- **Bcrypt** - Password hashing

## 📦 Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env and configure your database credentials
```

## 🗄️ Database Setup

1. Đảm bảo PostgreSQL đã được cài đặt và chạy
2. Chạy file SQL để tạo database:

```bash
psql -U postgres -f ../database/nong_san_full.sql
```

## 🚀 Running the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

Server sẽ chạy tại: `http://localhost:5000`

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký tài khoản mới
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user hiện tại (requires auth)

### Products
- `GET /api/products` - Danh sách sản phẩm (public)
- `GET /api/products/:id` - Chi tiết sản phẩm (public)
- `POST /api/products` - Tạo sản phẩm (ADMIN only)
- `PUT /api/products/:id` - Cập nhật sản phẩm (ADMIN only)
- `DELETE /api/products/:id` - Xóa sản phẩm (ADMIN only)

### Cart
- `GET /api/cart` - Lấy giỏ hàng (requires auth)
- `POST /api/cart` - Cập nhật giỏ hàng (requires auth)
- `DELETE /api/cart` - Xóa giỏ hàng (requires auth)

### Orders
- `GET /api/orders` - Danh sách đơn hàng (requires auth)
- `GET /api/orders/:id` - Chi tiết đơn hàng (requires auth)
- `POST /api/orders` - Tạo đơn hàng (requires auth)
- `PUT /api/orders/:id/status` - Cập nhật trạng thái (ADMIN/STAFF only)
- `POST /api/orders/:id/payment` - Đánh dấu thanh toán (ADMIN/STAFF only)

### Returns
- `GET /api/returns` - Danh sách đổi trả (requires auth)
- `POST /api/returns` - Tạo yêu cầu đổi trả (requires auth)
- `PUT /api/returns/:id/approve` - Duyệt đổi trả (ADMIN only)
- `PUT /api/returns/:id/reject` - Từ chối đổi trả (ADMIN only)

### Dashboard (ADMIN)
- `GET /api/dashboard/overview` - Tổng quan dashboard
- `GET /api/dashboard/revenue` - Báo cáo doanh thu
- `GET /api/dashboard/top-products` - Top sản phẩm bán chạy

## 🔐 Authentication

API sử dụng JWT token. Sau khi login thành công, include token trong header:

```
Authorization: Bearer <your_token>
```

## 🧪 Testing

### Demo Accounts (sau khi chạy SQL seed)

**Admin:**
- Email: `admin@example.com`
- Password: `123456`

**Customer:**
- Email: `khach@example.com`
- Password: `123456`

## 📝 Environment Variables

```env
PORT=5000
NODE_ENV=development

JWT_SECRET=your_secret_key
JWT_EXPIRE=30d

DB_HOST=localhost
DB_PORT=5432
DB_NAME=nong_san_db
DB_USER=postgres
DB_PASSWORD=your_password

FRONTEND_URL=http://localhost:5173
```

## 🏗️ Project Structure

```
src/
├── config/          # Database connection
├── controllers/     # Request handlers
├── middlewares/     # Auth, validation, error handling
├── routes/          # API routes
├── services/        # Business logic (calls PostgreSQL functions)
├── utils/           # Helper functions
└── index.js         # Main entry point
```

## 🔄 PostgreSQL Functions Mapping

API gọi trực tiếp các functions đã được định nghĩa trong PostgreSQL:

| API Endpoint | PostgreSQL Function |
|--------------|---------------------|
| POST /api/orders | `agri.tao_don_hang()` |
| PUT /api/orders/:id/status | `agri.cap_nhat_trang_thai_don()` |
| POST /api/orders/:id/payment | `agri.danh_dau_thanh_toan()` |
| POST /api/cart | `agri.cap_nhat_gio_hang()` |
| POST /api/returns | `agri.tao_yeu_cau_doi_tra()` |
| PUT /api/returns/:id/approve | `agri.duyet_doi_tra()` |
| GET /api/dashboard/overview | `agri.tong_quan_dashboard()` |
| GET /api/dashboard/revenue | `agri.thong_ke_doanh_thu()` |
| GET /api/dashboard/top-products | `agri.top_san_pham_theo_doanh_thu()` |

## 📊 Error Handling

API trả về error theo format chuẩn:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

Common error codes:
- `VALIDATION_ERROR` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `INTERNAL_ERROR` (500)

## 📚 Documentation

Xem thêm chi tiết API tại: `../API_DOCUMENTATION.md`
