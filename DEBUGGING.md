# 🐛 HƯỚNG DẪN DEBUG - ĐĂNG NHẬP KHÔNG HOẠT ĐỘNG

## ❓ Vấn Đề

Đăng nhập với `admin@example.com` / `123456` không hoạt động, token không được tạo.

---

## 🔍 BƯỚC 1: Kiểm Tra Database

### 1.1. Chạy script kiểm tra database

```bash
cd backend
node check-database.js
```

**Script này sẽ kiểm tra:**
- ✅ Kết nối database
- ✅ Schema `agri` có tồn tại không
- ✅ Bảng `accounts` có dữ liệu không
- ✅ Password hash có đúng không (test bcrypt)
- ✅ Products và inventory

### 1.2. Nếu database chưa import

```bash
# Từ thư mục gốc NONGSAN
psql -U postgres -f database/nong_san_full.sql

# Hoặc dùng pgAdmin:
# 1. Mở pgAdmin
# 2. Right-click Databases > Create Database > nong_san_db
# 3. Right-click nong_san_db > Query Tool
# 4. Mở file database/nong_san_full.sql và Execute
```

### 1.3. Nếu password hash không đúng

Chạy SQL này trong PostgreSQL:

```sql
-- Update admin password hash
UPDATE agri.accounts 
SET password_hash = '$2b$10$hL4cPoV2uukd5uE6x1L8ku3J8P8oYJ7uTWV1xCVuH0OtXJm0RorxG' 
WHERE email = 'admin@example.com';

-- Update customer password hash
UPDATE agri.accounts 
SET password_hash = '$2b$10$hL4cPoV2uukd5uE6x1L8ku3J8P8oYJ7uTWV1xCVuH0OtXJm0RorxG' 
WHERE email = 'khach@example.com';

-- Verify
SELECT email, role, is_active, LEFT(password_hash, 30) as hash 
FROM agri.accounts;
```

---

## 🚀 BƯỚC 2: Kiểm Tra Backend

### 2.1. Check file .env

Đảm bảo file `backend/.env` có đúng thông tin:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nong_san_db
DB_USER=postgres
DB_PASSWORD=zzz    # THAY BẰNG PASSWORD POSTGRES CỦA BẠN!

JWT_SECRET=nong_san_secret_key
JWT_EXPIRE=30d
```

### 2.2. Khởi động backend

```bash
cd backend
npm run dev
```

Kiểm tra console có thông báo:
```
✅ PostgreSQL connected successfully!
🚀 Server running on port 5000
```

Nếu có lỗi kết nối database:
- Kiểm tra PostgreSQL service đang chạy
- Kiểm tra password trong .env
- Kiểm tra firewall/port 5432

---

## 🧪 BƯỚC 3: Test API Login

### 3.1. Dùng test script (RECOMMENDED)

```bash
cd backend
node test-login.js
```

Script sẽ test:
1. ✅ Login admin
2. ✅ Protected route với admin token
3. ✅ Login customer
4. ✅ Protected route với customer token
5. ✅ Invalid credentials (should fail)

### 3.2. Dùng curl (Manual)

**Test Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"123456\"}"
```

**Kết quả mong đợi:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid-here",
      "email": "admin@example.com",
      "full_name": "Admin",
      "role": "ADMIN",
      "phone": "0900000000"
    }
  }
}
```

**Test Protected Route:**
```bash
# Thay YOUR_TOKEN bằng token nhận được từ login
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3.3. Dùng Thunder Client / Postman

**1. Import collection này:**

```json
{
  "name": "Nông Sản Auth",
  "requests": [
    {
      "name": "Login Admin",
      "method": "POST",
      "url": "http://localhost:5000/api/auth/login",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/json"
        }
      ],
      "body": {
        "email": "admin@example.com",
        "password": "123456"
      }
    },
    {
      "name": "Get Current User",
      "method": "GET",
      "url": "http://localhost:5000/api/auth/me",
      "headers": [
        {
          "key": "Authorization",
          "value": "Bearer {{token}}"
        }
      ]
    }
  ]
}
```

---

## 🔧 BƯỚC 4: Debug Chi Tiết

### 4.1. Enable debug logs

Thêm console.log vào `backend/src/services/authService.js`:

```javascript
export const loginUser = async ({ email, password }) => {
  console.log('🔍 Login attempt:', email);
  
  const result = await pool.query(
    `SELECT id, email, full_name, phone, password_hash, role, is_active
     FROM agri.accounts
     WHERE email = $1`,
    [email]
  );
  
  console.log('📋 Query result:', result.rows.length, 'rows');
  
  if (result.rows.length === 0) {
    console.log('❌ User not found');
    throw new Error('Invalid credentials');
  }
  
  const user = result.rows[0];
  console.log('👤 User found:', user.email, 'Role:', user.role);
  console.log('🔐 Hash preview:', user.password_hash.substring(0, 20));
  
  if (!user.is_active) {
    console.log('❌ Account inactive');
    throw new Error('Account is inactive');
  }
  
  console.log('🔑 Comparing password...');
  const isPasswordValid = await comparePassword(password, user.password_hash);
  console.log('✅ Password valid:', isPasswordValid);
  
  if (!isPasswordValid) {
    console.log('❌ Invalid password');
    throw new Error('Invalid credentials');
  }
  
  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role
  });
  
  console.log('✅ Token generated:', token.substring(0, 20) + '...');
  
  delete user.password_hash;
  return { token, user };
};
```

### 4.2. Check backend logs

Khi chạy `npm run dev`, terminal sẽ hiển thị:
- Request received
- Database queries
- Errors (nếu có)

---

## ❌ CÁC LỖI THƯỜNG GẶP

### Lỗi 1: "Cannot connect to database"

**Nguyên nhân:**
- PostgreSQL service không chạy
- Sai password trong .env
- Port 5432 bị block

**Giải pháp:**
```bash
# Windows: Check service
services.msc → tìm PostgreSQL

# Hoặc command line
pg_ctl status

# Restart PostgreSQL
# Windows: services.msc → right click → restart
```

### Lỗi 2: "relation agri.accounts does not exist"

**Nguyên nhân:**
- Database chưa import
- Schema chưa được tạo

**Giải pháp:**
```bash
psql -U postgres -f database/nong_san_full.sql
```

### Lỗi 3: "Invalid credentials" (password đúng nhưng vẫn fail)

**Nguyên nhân:**
- Password hash trong database sai format
- Bcrypt rounds không khớp

**Giải pháp:**
Chạy `node check-database.js` để test hash, sau đó update:

```sql
UPDATE agri.accounts 
SET password_hash = '$2b$10$hL4cPoV2uukd5uE6x1L8ku3J8P8oYJ7uTWV1xCVuH0OtXJm0RorxG'
WHERE email = 'admin@example.com';
```

### Lỗi 4: "Token invalid" khi gọi protected routes

**Nguyên nhân:**
- JWT_SECRET khác nhau giữa generate và verify
- Token expired
- Token format sai

**Giải pháp:**
- Check `.env` có `JWT_SECRET=nong_san_secret_key`
- Token phải gửi dạng: `Bearer YOUR_TOKEN`
- Re-login để lấy token mới

### Lỗi 5: CORS error từ frontend

**Nguyên nhân:**
- Backend chưa config CORS cho frontend URL

**Giải pháp:**
Check `backend/src/index.js` có:
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));
```

---

## ✅ CHECKLIST HOÀN CHỈNH

Trước khi test, đảm bảo:

- [ ] PostgreSQL service đang chạy
- [ ] Database `nong_san_db` đã được import
- [ ] File `backend/.env` có đúng DB_PASSWORD
- [ ] Backend `npm run dev` đang chạy không lỗi
- [ ] Console backend hiển thị "PostgreSQL connected"
- [ ] Chạy `node check-database.js` → all green
- [ ] Chạy `node test-login.js` → all tests pass

---

## 🆘 VẪN KHÔNG ĐƯỢC?

Nếu sau khi làm tất cả các bước trên vẫn không được:

1. **Copy toàn bộ error message** từ:
   - Backend console
   - check-database.js output
   - test-login.js output

2. **Kiểm tra:**
   - Node.js version: `node --version` (cần v18+)
   - PostgreSQL version: `psql --version` (cần v14+)
   - npm packages: `cd backend && npm install`

3. **Re-import database từ đầu:**
```bash
# Drop database
psql -U postgres -c "DROP DATABASE IF EXISTS nong_san_db;"

# Re-import
psql -U postgres -f database/nong_san_full.sql

# Verify
psql -U postgres -d nong_san_db -c "SELECT email, role FROM agri.accounts;"
```

---

**Good luck! 🚀**
