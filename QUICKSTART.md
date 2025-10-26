# 🚀 QUICK START GUIDE - NÔNG SẢN SẠCH

## Khởi Chạy Hệ Thống Trong 5 Phút

### 📋 Bước 1: Chuẩn Bị

**Yêu cầu:**
- ✅ Node.js v18+ đã cài
- ✅ PostgreSQL v14+ đã cài và đang chạy
- ✅ npm hoặc yarn

### 🗄️ Bước 2: Setup Database

```bash
# 1. Import SQL file (copy nội dung SQL từ prompt vào file database/nong_san_full.sql trước)
psql -U postgres -f database/nong_san_full.sql

# Hoặc sử dụng pgAdmin để import file SQL
```

**Note:** File SQL chứa:
- Schema database
- Tables, Functions, Triggers
- Seed data (admin, customer, products)

### ⚙️ Bước 3: Setup Backend

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# File .env đã được tạo sẵn, kiểm tra và sửa password PostgreSQL nếu cần
# DB_PASSWORD=zzz  (thay bằng password PostgreSQL của bạn)

# Start server
npm run dev
```

✅ Backend running at: **http://localhost:5000**

### 🎨 Bước 4: Setup Frontend

```bash
# Mở terminal mới, navigate to frontend folder
cd frontend

# Install dependencies  
npm install

# Start dev server
npm run dev
```

✅ Frontend running at: **http://localhost:5173**

### 🎯 Bước 5: Đăng Nhập & Test

**Mở trình duyệt:**
- Customer site: http://localhost:5173
- Admin site: http://localhost:5173/admin

**Đăng nhập với tài khoản demo:**

**Admin Panel:**
```
Email: admin@example.com
Password: 123456
URL: http://localhost:5173/login
```

**Customer Account:**
```
Email: khach@example.com  
Password: 123456
URL: http://localhost:5173/login
```

---

## 🧪 Test Các Chức Năng

### Customer Features
1. ✅ Xem danh sách sản phẩm: `/products`
2. ✅ Thêm vào giỏ hàng
3. ✅ Đặt hàng
4. ✅ Theo dõi đơn hàng: `/orders`

### Admin Features
1. ✅ Dashboard: `/admin`
2. ✅ Quản lý sản phẩm: `/admin/products`
3. ✅ Quản lý đơn hàng: `/admin/orders`
4. ✅ Quản lý đổi trả: `/admin/returns`

---

## 🔧 Troubleshooting

### Backend không khởi động được

**Error: "Connection refused"**
```bash
# Check PostgreSQL đang chạy
# Windows:
services.msc → tìm PostgreSQL

# Hoặc kiểm tra port 5432
netstat -ano | findstr :5432
```

**Error: "Database not found"**
```bash
# Re-import SQL
psql -U postgres -f database/nong_san_full.sql
```

### Frontend không connect được API

**Error: "Network Error"**
- Check backend đang chạy tại port 5000
- Check CORS settings trong backend/.env
- FRONTEND_URL=http://localhost:5173

### Login không hoạt động

**Error: "Invalid credentials"**
- Database chưa import đúng
- Password hash không đúng
- Re-import SQL file

---

## 📂 Cấu Trúc File Quan Trọng

```
NONGSAN/
│
├── backend/
│   ├── .env                    ← Configure PostgreSQL here
│   ├── src/index.js           ← Main server
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx           ← Main routing
│   │   ├── pages/            ← All pages
│   │   └── services/         ← API calls
│   └── package.json
│
├── database/
│   └── nong_san_full.sql     ← Import this file
│
└── README.md                  ← Full documentation
```

---

## 🎓 Tiếp Theo?

**Học cách hệ thống hoạt động:**
1. 📖 Đọc **SYSTEM_ARCHITECTURE.md** - Kiến trúc tổng quan
2. 📡 Đọc **API_DOCUMENTATION.md** - Chi tiết API
3. 🗄️ Xem **database/nong_san_full.sql** - Database functions

**Mở rộng hệ thống:**
- Thêm upload ảnh sản phẩm
- Tích hợp payment gateway
- Thêm email notifications
- Deploy lên production

---

## ❓ Cần Trợ Giúp?

- 📖 Đọc README.md
- 📡 Xem API_DOCUMENTATION.md
- 🏗️ Xem SYSTEM_ARCHITECTURE.md
- 🗄️ Xem database/README.md

**Happy Coding! 🚀**
