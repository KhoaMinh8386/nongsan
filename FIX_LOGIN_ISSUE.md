# 🔧 Báo Cáo Sửa Lỗi Đăng Nhập Admin

## ❌ Vấn Đề
Không thể đăng nhập bằng tài khoản admin với thông tin:
- Email: `admin@example.com`
- Password: `123456`

## 🔍 Nguyên Nhân
Password hash trong database **KHÔNG KHỚP** với mật khẩu thực tế. Hash được lưu trong file SQL ban đầu (`nong_san_full.sql`) có vấn đề hoặc không được tạo đúng cách với bcrypt.

### Chi Tiết Kỹ Thuật
- Hash trong database: `$2b$10$hL4cPoV2uukd5uE6x1L8ku3J8P8oYJ7uTWV1xCVuH0OtXJm0RorxG`
- Hash này **KHÔNG** match với password `123456` khi verify bằng bcrypt
- Backend sử dụng `bcryptjs` với 10 salt rounds để hash và compare passwords
- Auth flow: `authService.loginUser()` → compare password → generate JWT token

## ✅ Giải Pháp
Đã tạo và chạy script `fix-passwords.js` để:
1. Tạo lại password hash đúng cho các tài khoản demo
2. Cập nhật database với hash mới
3. Verify hash mới hoạt động chính xác

### Scripts Tạo
1. **`check-database.js`** - Kiểm tra database và verify password hash
2. **`fix-passwords.js`** - Sửa password hash cho demo accounts
3. **`test-login.js`** - Test login API với các tài khoản

## 🧪 Kết Quả Test
Đã chạy `test-login.js` và tất cả tests đều PASS:
- ✅ Admin login thành công
- ✅ Admin protected route hoạt động
- ✅ Customer login thành công
- ✅ Customer protected route hoạt động
- ✅ Invalid credentials được reject đúng cách

## 📝 Tài Khoản Demo (Đã Fix)
```
Admin:
  Email: admin@example.com
  Password: 123456
  Role: ADMIN

Customer:
  Email: khach@example.com
  Password: 123456
  Role: CUSTOMER
```

## 🚀 Cách Test Trên Frontend
1. Đảm bảo backend đang chạy: `cd backend && npm run dev`
2. Đảm bảo frontend đang chạy: `cd frontend && npm run dev`
3. Truy cập: http://localhost:5173/login
4. Đăng nhập với tài khoản admin ở trên
5. Sẽ được redirect đến `/admin` (admin dashboard)

## 🔐 Phân Quyền Đã Được Kiểm Tra
- **Middleware `authenticate`**: Verify JWT token và check user active
- **Middleware `authorize(...roles)`**: Check user role có quyền truy cập không
- **Login redirect logic**: 
  - ADMIN/STAFF → `/admin`
  - CUSTOMER → `/`

## 📁 Files Liên Quan
### Backend
- `src/services/authService.js` - Login logic với bcrypt compare
- `src/controllers/authController.js` - Login controller
- `src/middlewares/auth.js` - Authentication & authorization middleware
- `src/utils/bcrypt.js` - Password hashing utilities
- `src/utils/jwt.js` - JWT token generation
- `database/nong_san_full.sql` - Database schema & seed data

### Frontend
- `src/pages/auth/Login.jsx` - Login form component
- `src/services/authService.js` - Auth API calls
- `src/store/authSlice.js` - Redux auth state
- `src/services/api.js` - Axios instance với interceptors

## 💡 Lưu Ý Cho Tương Lai
Nếu cần reset password cho bất kỳ account nào, có thể:

1. **Sử dụng script fix-passwords.js** (đã tạo sẵn)
2. **Hoặc manual SQL**:
   ```sql
   -- Generate hash bằng bcrypt trong Node.js:
   -- const bcrypt = require('bcryptjs');
   -- const hash = await bcrypt.hash('your_password', 10);
   
   UPDATE agri.accounts 
   SET password_hash = 'your_bcrypt_hash_here', 
       updated_at = NOW()
   WHERE email = 'email@example.com';
   ```

3. **Hoặc tạo API endpoint** (nên có trong production) để reset password

## ✅ Trạng Thái
**RESOLVED** - Đăng nhập admin đã hoạt động bình thường.
