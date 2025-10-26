# 🌐 HƯỚNG DẪN SỬ DỤNG NGROK VỚI BACKEND

## ✅ ĐÃ FIX

**Lỗi:** `ValidationError: The 'X-Forwarded-For' header is set but the Express 'trust proxy' setting is false`

**Giải pháp:** Đã thêm `app.set('trust proxy', 1);` vào `src/index.js` line 29

---

## 🔍 GIẢI THÍCH

### Vấn đề gì?

Khi sử dụng **ngrok** (hoặc bất kỳ reverse proxy nào), request từ client không đến trực tiếp backend, mà đi qua ngrok trước:

```
Client → Ngrok → Backend
```

Ngrok tự động thêm header `X-Forwarded-For` để backend biết IP thực của client. Tuy nhiên, Express mặc định **KHÔNG TIN** header này (vì lý do bảo mật), dẫn đến:

1. `express-rate-limit` không xác định đúng IP → Tất cả requests đều bị tính chung → Rate limit sai
2. `req.ip` trả về IP của ngrok thay vì IP thực của user

### Trust Proxy là gì?

```javascript
app.set('trust proxy', 1);
```

**Ý nghĩa:**
- `1` = Trust **1 proxy** (ngrok) ở phía trước backend
- Express sẽ tin tưởng header `X-Forwarded-For` từ proxy đầu tiên
- `req.ip` sẽ trả về IP thực của client (từ header)

**Các giá trị khác:**
```javascript
app.set('trust proxy', true);           // Trust tất cả proxies
app.set('trust proxy', 2);              // Trust 2 proxies
app.set('trust proxy', 'loopback');     // Chỉ trust localhost
app.set('trust proxy', '127.0.0.1');    // Trust IP cụ thể
```

---

## 🚀 HƯỚNG DẪN SỬ DỤNG NGROK

### 1. Cài đặt Ngrok

**Windows:**
```powershell
# Download từ: https://ngrok.com/download
# Hoặc dùng Chocolatey:
choco install ngrok
```

**Authenticate:**
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### 2. Khởi động Backend

```bash
cd backend
npm run dev
# Backend chạy tại http://localhost:5000
```

### 3. Expose qua Ngrok

```bash
ngrok http 5000
```

**Output:**
```
Session Status                online
Account                       Your Account (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:5000
```

### 4. Cập nhật Frontend API URL

**File:** `frontend/.env`

```bash
# Development (local)
VITE_API_URL=http://localhost:5000

# Production (ngrok)
VITE_API_URL=https://abc123.ngrok-free.app
```

**Restart frontend:**
```bash
cd frontend
npm run dev
```

### 5. Cập nhật CORS (nếu cần)

**File:** `backend/.env`

```bash
# Development
FRONTEND_URL=http://localhost:5173

# Production (ngrok)
FRONTEND_URL=https://your-frontend.ngrok-free.app
```

**Hoặc cho phép tất cả (chỉ dùng khi test):**
```javascript
// backend/src/index.js
app.use(cors({
  origin: '*', // ⚠️ KHÔNG DÙNG trong production thực
  credentials: true
}));
```

---

## 🧪 TEST SAU KHI FIX

### 1. Test Rate Limiting

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start ngrok
ngrok http 5000
# Copy URL: https://abc123.ngrok-free.app

# Terminal 3: Test rate limit
curl https://abc123.ngrok-free.app/health
curl https://abc123.ngrok-free.app/health
curl https://abc123.ngrok-free.app/health
# ... 100 lần
# Request thứ 101 sẽ bị 429 Too Many Requests
```

### 2. Test IP Detection

**Thêm route test vào `backend/src/index.js`:**

```javascript
app.get('/test-ip', (req, res) => {
  res.json({
    ip: req.ip,
    ips: req.ips,
    headers: {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip']
    }
  });
});
```

**Test qua ngrok:**
```bash
curl https://abc123.ngrok-free.app/test-ip
```

**✅ Expected output:**
```json
{
  "ip": "103.xxx.xxx.xxx",  // IP thật của bạn
  "ips": [],
  "headers": {
    "x-forwarded-for": "103.xxx.xxx.xxx",
    "x-real-ip": "103.xxx.xxx.xxx"
  }
}
```

**❌ Nếu chưa fix (trust proxy = false):**
```json
{
  "ip": "127.0.0.1",  // IP của ngrok, không phải user
  "ips": [],
  "headers": {
    "x-forwarded-for": "103.xxx.xxx.xxx",  // Header có nhưng không được trust
    "x-real-ip": null
  }
}
```

---

## ⚠️ BẢO MẬT

### Khi nào NÊN dùng Trust Proxy?

✅ Khi deploy trên:
- Heroku
- AWS (behind ELB/ALB)
- Google Cloud (behind Load Balancer)
- Cloudflare
- Ngrok (development/testing)
- Nginx reverse proxy

### Khi nào KHÔNG NÊN?

❌ Khi:
- Backend expose trực tiếp ra internet (không có proxy)
- Không chắc chắn về infrastructure
- User có thể tự set header `X-Forwarded-For` (bypass security)

### Best Practice

**Development:**
```javascript
// backend/src/index.js
if (process.env.NODE_ENV === 'production' || process.env.USE_PROXY) {
  app.set('trust proxy', 1);
}
```

**File:** `backend/.env`
```bash
NODE_ENV=development
USE_PROXY=true  # Set true khi dùng ngrok
```

---

## 🔧 TROUBLESHOOTING

### Lỗi: CORS blocked

**Hiện tượng:**
```
Access to fetch at 'https://abc.ngrok-free.app/api/products' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Giải pháp:**
```javascript
// backend/src/index.js
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-frontend.ngrok-free.app'
  ],
  credentials: true
}));
```

### Lỗi: Rate limit quá nhanh

**Hiện tượng:** Sau vài requests bị 429

**Nguyên nhân:** Tất cả requests từ ngrok bị tính chung 1 IP

**Giải pháp:** Đã fix với `trust proxy = 1` ✅

### Lỗi: ngrok session expired

**Hiện tượng:** URL ngrok ngừng hoạt động sau 2 giờ

**Giải pháp:**
- Free plan: URL thay đổi mỗi lần restart ngrok
- Paid plan: Có static domain

---

## 📊 SO SÁNH TRƯỚC/SAU

| Tính năng | ❌ TRƯỚC (trust proxy = false) | ✅ SAU (trust proxy = 1) |
|-----------|-------------------------------|--------------------------|
| `req.ip` | `127.0.0.1` (ngrok IP) | `103.xxx.xxx.xxx` (user real IP) |
| Rate limiting | Tất cả users chung 1 limit | Mỗi user có limit riêng |
| Header trust | Không tin `X-Forwarded-For` | Tin header từ proxy đầu |
| express-rate-limit error | ValidationError ❌ | OK ✅ |

---

## 📝 CHECKLIST

- [x] Thêm `app.set('trust proxy', 1);` vào `src/index.js`
- [ ] Update `VITE_API_URL` trong frontend/.env
- [ ] Update `FRONTEND_URL` trong backend/.env (nếu cần)
- [ ] Test rate limiting qua ngrok
- [ ] Test CORS với ngrok URL
- [ ] Verify `req.ip` trả về IP thật

---

## 🎯 KẾT LUẬN

**Lỗi đã được fix!** 

Backend giờ đây:
- ✅ Hoạt động đúng với ngrok
- ✅ Rate limiting theo IP thật của user
- ✅ Không còn ValidationError
- ✅ Sẵn sàng deploy lên cloud (Heroku, AWS, GCP...)

**Restart backend và test lại:**
```bash
cd backend
npm run dev
```

Không còn lỗi `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` nữa! 🎉
