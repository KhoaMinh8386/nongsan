# 🔐 Hướng Dẫn Đăng Nhập - Nông Sản Sạch

## ✅ Vấn Đề Đã Được Sửa

Password hash trong database đã được cập nhật. Bạn có thể đăng nhập bình thường.

## 📝 Tài Khoản Demo

### Admin
```
Email: admin@example.com
Password: 123456
```

### Khách Hàng
```
Email: khach@example.com
Password: 123456
```

## 🚀 Cách Đăng Nhập

### 1. Khởi Động Backend
```bash
cd backend
npm run dev
```
Backend sẽ chạy tại: `http://localhost:5000`

### 2. Khởi Động Frontend
```bash
cd frontend
npm run dev
```
Frontend sẽ chạy tại: `http://localhost:5173`

### 3. Đăng Nhập
1. Truy cập: http://localhost:5173/login
2. Nhập email và password từ tài khoản demo ở trên
3. Nhấn "Đăng nhập"

### 4. Kiểm Tra Phân Quyền
- **Admin** sẽ được chuyển đến: `/admin` (Admin Dashboard)
- **Khách hàng** sẽ được chuyển đến: `/` (Trang chủ)

## 🧪 Test Đăng Nhập (Optional)

Để test API login trực tiếp từ backend:

```bash
cd backend
node test-login.js
```

Script này sẽ test:
- ✅ Admin login
- ✅ Admin protected routes
- ✅ Customer login
- ✅ Customer protected routes
- ✅ Invalid credentials rejection

## 🔧 Tools Hỗ Trợ

### Kiểm Tra Database
```bash
cd backend
node check-database.js
```
Script này kiểm tra:
- Database connection
- Schema exists
- Accounts và password hashes
- Products và inventory

### Sửa Password (Nếu Cần)
```bash
cd backend
node fix-passwords.js
```
Script này sẽ regenerate password hashes đúng cho demo accounts.

### Generate Hash Mới
```bash
cd backend
node generate-hash.js
```
Script này generate bcrypt hash cho password.

### Lấy Hash Hiện Tại
```bash
cd backend
node get-current-hashes.js
```
Script này lấy password hashes đang dùng trong database.

## 📊 Cấu Trúc Phân Quyền

### User Roles
- **ADMIN**: Quản trị viên - full access
- **STAFF**: Nhân viên - giới hạn một số chức năng
- **CUSTOMER**: Khách hàng - chỉ truy cập trang khách

### Route Protection

#### Backend Routes
```javascript
// Public routes
POST /api/auth/register
POST /api/auth/login

// Protected routes (requires authentication)
GET /api/auth/me

// Admin-only routes (requires ADMIN or STAFF role)
GET /api/admin/...
POST /api/admin/...
```

#### Frontend Routes
```javascript
// Public routes
/login
/register
/ (trang chủ)
/products

// Customer routes (requires login)
/cart
/checkout
/orders

// Admin routes (requires ADMIN/STAFF role)
/admin/*
```

## 🔒 Authentication Flow

1. **User Login**
   - POST `/api/auth/login` với `{ email, password }`
   - Backend verify password với bcrypt
   - Return JWT token + user info

2. **Store Token**
   - Frontend lưu token vào `localStorage`
   - Redux store cập nhật auth state

3. **Authenticated Requests**
   - Axios interceptor tự động thêm token vào header
   - Header: `Authorization: Bearer <token>`

4. **Token Verification**
   - Backend middleware verify JWT token
   - Check user still exists và active
   - Attach user info vào `req.user`

5. **Role-Based Access**
   - Authorization middleware check `req.user.role`
   - Allow/deny based on required roles

## ⚠️ Troubleshooting

### Không Đăng Nhập Được?

1. **Kiểm tra backend đang chạy**
   ```bash
   # Backend phải chạy tại port 5000
   curl http://localhost:5000/api/auth/login
   ```

2. **Kiểm tra database connection**
   ```bash
   cd backend
   node check-database.js
   ```

3. **Kiểm tra password hash**
   - Chạy `check-database.js`
   - Nếu password không match, chạy `fix-passwords.js`

4. **Xem console log**
   - Mở DevTools trong browser (F12)
   - Xem Console tab
   - Xem Network tab để check API responses

### Token Expired?

Token có thời hạn 30 ngày. Nếu hết hạn:
- Logout và login lại
- Token mới sẽ được generate

### CORS Issues?

Kiểm tra `.env` trong backend:
```
FRONTEND_URL=http://localhost:5173
```

## 📁 Files Quan Trọng

### Backend Authentication
- `src/services/authService.js` - Login logic
- `src/controllers/authController.js` - Auth endpoints
- `src/middlewares/auth.js` - Authentication & authorization
- `src/utils/bcrypt.js` - Password hashing
- `src/utils/jwt.js` - JWT token management

### Frontend Authentication
- `src/pages/auth/Login.jsx` - Login form
- `src/services/authService.js` - Auth API calls
- `src/store/authSlice.js` - Auth state management
- `src/services/api.js` - Axios config with interceptors

### Database
- `database/nong_san_full.sql` - Database schema + seed data
- Đã update với password hashes đúng

## 💡 Lưu Ý

1. **Passwords are hashed**: Không bao giờ lưu plaintext passwords
2. **JWT tokens**: Có expiration time (30 days default)
3. **Role-based access**: Frontend routing dựa trên user role
4. **API protection**: Backend routes được protect bằng middleware
5. **Demo accounts**: Chỉ dùng cho development, đừng dùng production

## 📞 Hỗ Trợ

Nếu vẫn gặp vấn đề:
1. Kiểm tra console logs (backend và frontend)
2. Chạy các test scripts
3. Check database với `check-database.js`
4. Đọc `FIX_LOGIN_ISSUE.md` để biết chi tiết về vấn đề đã fix

---

**Cập nhật lần cuối**: 2025-10-23  
**Trạng thái**: ✅ Hoạt động bình thường
