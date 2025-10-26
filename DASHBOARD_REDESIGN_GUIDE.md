# 📊 DASHBOARD ADMIN REDESIGN - HƯỚNG DẪN

## ✅ ĐÃ HOÀN THÀNH

Dashboard Admin đã được thiết kế lại hoàn toàn theo hình mẫu hiện đại với:

### 🎨 Giao diện mới

**1. KPI Cards (4 cards)**
- ✅ Tổng doanh thu (với % tăng/giảm)
- ✅ Tổng đơn hàng
- ✅ Khách hàng mới
- ✅ Sản phẩm bán chạy
- ✅ Gradient background màu pastel
- ✅ Icon trong ô vuông trắng
- ✅ Badge % màu xanh/đỏ với arrow

**2. Biểu đồ Line Chart**
- ✅ Doanh thu 30 ngày qua
- ✅ Toggle 2 modes: "Doanh thu" / "Đơn hàng"
- ✅ Gradient fill màu xanh nhạt
- ✅ Smooth curve
- ✅ Custom tooltip
- ✅ Grid màu nhạt

**3. Biểu đồ Doughnut (Pie)**
- ✅ Phân bố danh mục
- ✅ 4 categories: Rau củ, Trái cây, Nấm, Khác
- ✅ Màu sắc: xanh lá, xanh dương, cam, tím
- ✅ Legend với giá trị tiền tệ

**4. Sản phẩm bán chạy**
- ✅ Top 5 products
- ✅ Icon box màu xanh nhạt
- ✅ Tên sản phẩm + số lượng bán
- ✅ Doanh thu + % tăng/giảm
- ✅ Button "Xem tất cả"

**5. Đơn hàng gần đây**
- ✅ 5 đơn hàng mới nhất
- ✅ Mã đơn + tên khách hàng
- ✅ Status badges đầy màu:
  - Hoàn thành: xanh lá
  - Đang xử lý: xanh dương
  - Chờ xác nhận: vàng
  - Đã hủy: đỏ
- ✅ Tổng tiền bên phải

**6. Header Actions**
- ✅ 2 buttons góc phải trên:
  - "Xuất báo cáo" (viền)
  - "Xem chi tiết" (xanh lá)

### 🎨 Style theo hình mẫu

```css
✅ Border radius: 16-20px (rounded-2xl)
✅ Card shadows: subtle (shadow-sm)
✅ Spacing: gap-5, gap-6
✅ Font: Inter/system fonts
✅ Colors:
   - Primary Green: #10b981 (green-600)
   - Blue: #3b82f6
   - Orange: #f59e0b
   - Purple: #a855f7
   - Background: white (#FFFFFF)
```

---

## 🚀 CÁCH CHẠY

### Bước 1: Cài đặt dependencies (nếu chưa)

```bash
cd frontend
npm install recharts react-hot-toast lucide-react
```

### Bước 2: Restart frontend

```bash
npm run dev
```

### Bước 3: Truy cập Dashboard

```
http://localhost:5173/admin/dashboard
```

---

## 📁 FILES ĐÃ SỬA

### 1. Dashboard.jsx (frontend/src/pages/admin/Dashboard.jsx)
- ✅ Viết lại hoàn toàn
- ✅ 410 dòng code mới
- ✅ 4 KPI cards với gradient
- ✅ Line chart với toggle mode
- ✅ Doughnut chart cho categories
- ✅ Top products section
- ✅ Recent orders section

### 2. dashboardService.js (frontend/src/services/dashboardService.js)
- ✅ Thêm `getRecentOrders(limit)`
- ✅ Thêm `getCategoryBreakdown(startDate, endDate)`

---

## 🎯 TÍNH NĂNG NỔI BẬT

### 1. Toggle Chart Mode
```
Click "Doanh thu" → Hiển thị biểu đồ doanh thu
Click "Đơn hàng" → Hiển thị biểu đồ số đơn hàng
→ Cùng 1 chart, chuyển đổi real-time!
```

### 2. Color-coded Status Badges
```
✅ Hoàn thành   → bg-green-100 text-green-700
🔵 Đang xử lý   → bg-blue-100 text-blue-700
🟡 Chờ xác nhận → bg-yellow-100 text-yellow-700
🔴 Đã hủy       → bg-red-100 text-red-700
```

### 3. Gradient KPI Cards
```
Doanh thu  → green gradient
Đơn hàng   → blue gradient
Khách hàng → purple gradient
Sản phẩm   → orange gradient
```

### 4. Custom Tooltips
```
Hover vào chart point:
┌──────────────────┐
│ 15/10            │
│ Doanh thu:       │
│ 2,850,000₫      │
└──────────────────┘
```

---

## 📊 DỮ LIỆU

### Backend APIs đang dùng:

```javascript
✅ GET /api/dashboard/overview?start_date=&end_date=
✅ GET /api/dashboard/revenue?start_date=&end_date=
✅ GET /api/dashboard/top-products?start_date=&end_date=&limit=5
⏸️ GET /api/orders?page=1&limit=5&sort_by=created_at  (recent orders)
⏸️ GET /api/dashboard/category-breakdown?start_date=&end_date=  (category data)
```

### Mock data hiện tại:

**Category breakdown** (mock - cần thay bằng API thực):
```javascript
[
  { name: 'Rau củ', value: 4500000, color: '#10b981' },
  { name: 'Trái cây', value: 3200000, color: '#3b82f6' },
  { name: 'Nấm', value: 2100000, color: '#f59e0b' },
  { name: 'Khác', value: 1800000, color: '#a855f7' }
]
```

**Recent orders** (mock - cần thay bằng API thực):
```javascript
[
  { id: 'DH001', customer: 'Nguyễn Văn A', items: 5, status: 'completed', total: 285000 },
  ...
]
```

---

## 🔧 TÙY CHỈNH

### Đổi màu KPI cards

File: `Dashboard.jsx` → line 104-149

```javascript
const kpiCards = [
  {
    bgColor: 'bg-gradient-to-br from-green-50 to-green-100',
    iconColor: 'text-green-600',
    borderColor: 'border-green-200'
    // Thay đổi màu ở đây
  }
]
```

### Đổi số lượng sản phẩm/đơn hàng hiển thị

```javascript
// Line 324: Top products
{topProducts.slice(0, 5).map(...)}  // Đổi 5 thành số khác

// Line 356: Recent orders
{recentOrders.map(...)}  // Đang hiển thị tất cả
```

### Đổi chiều cao biểu đồ

```javascript
// Line 236: Line chart
<ResponsiveContainer width="100%" height={320}>
                                           ↑ đổi số này

// Line 280: Doughnut chart
<ResponsiveContainer width="100%" height={200}>
                                           ↑ đổi số này
```

---

## 🎨 RESPONSIVE DESIGN

Dashboard tự động điều chỉnh trên các màn hình:

### Desktop (≥1024px)
```
- KPI cards: 4 cột
- Charts: Line (2/3) + Doughnut (1/3)
- Bottom: 2 cột (Products | Orders)
```

### Tablet (768px-1023px)
```
- KPI cards: 2 cột
- Charts: Line full width, Doughnut full width
- Bottom: 2 cột
```

### Mobile (<768px)
```
- KPI cards: 1 cột
- Charts: 1 cột
- Bottom: 1 cột
```

---

## 🐛 TROUBLESHOOTING

### Lỗi: "Cannot find module 'recharts'"
```bash
npm install recharts
```

### Lỗi: Biểu đồ không hiển thị
- Check console có lỗi không
- Verify `revenueData` có data không:
  ```javascript
  console.log('Revenue data:', revenueData);
  ```

### Lỗi: API không trả về dữ liệu
- Check backend đang chạy: http://localhost:5000/health
- Check network tab trong DevTools
- Verify token authentication

### Gradient không hiển thị
- Đảm bảo `<defs>` nằm trong `<LineChart>`
- Check fill="url(#colorRevenue)" đúng ID

---

## ✨ SO SÁNH TRƯỚC/SAU

### Trước (Old Dashboard)
```
❌ Layout đơn giản, ít thông tin
❌ Chỉ có stats cards cơ bản
❌ Biểu đồ Line/Bar toggle (cả 2 metrics cùng lúc)
❌ Không có phân tích category
❌ Không có top products
❌ Không có recent orders
❌ Màu sắc đơn điệu
```

### Sau (New Dashboard)
```
✅ Layout hiện đại, full-featured
✅ 4 KPI cards với gradient + % thay đổi
✅ Line chart toggle giữa Revenue/Orders
✅ Doughnut chart phân tích categories
✅ Top 5 products bán chạy
✅ 5 đơn hàng gần đây với status badges
✅ Màu sắc đa dạng, professional
✅ 2 action buttons (Xuất báo cáo, Xem chi tiết)
✅ Spacing hợp lý, responsive tốt
```

---

## 🚀 NEXT STEPS (Tùy chọn)

### 1. Kết nối API thực
- [ ] Replace mock `categoryData` với API thực
- [ ] Replace mock `recentOrders` với API thực
- [ ] Thêm API để tính % thay đổi cho KPI cards

### 2. Thêm filters
- [ ] Date range picker
- [ ] Filter theo category
- [ ] Export CSV/Excel

### 3. Thêm animations
- [ ] Fade in khi load
- [ ] Smooth transitions khi toggle chart mode
- [ ] Count-up animation cho numbers

### 4. Real-time updates
- [ ] WebSocket cho real-time orders
- [ ] Auto-refresh mỗi 30s
- [ ] Notification khi có đơn hàng mới

---

## 📸 SCREENSHOTS CHECKLIST

Kiểm tra các elements sau có giống hình mẫu:

- [ ] 4 KPI cards với gradient background
- [ ] Icon trong box trắng bo góc
- [ ] % change với arrow icon
- [ ] Line chart màu xanh với gradient fill
- [ ] Toggle buttons "Doanh thu" / "Đơn hàng"
- [ ] Doughnut chart với 4 màu
- [ ] Legend với giá trị tiền bên phải
- [ ] Top products với icon box xanh nhạt
- [ ] Recent orders với status badges màu sắc
- [ ] "Xuất báo cáo" button (outline)
- [ ] "Xem chi tiết" button (solid green)

---

**🎉 DASHBOARD ĐÃ SẴN SÀNG SỬ DỤNG!**

Restart frontend và truy cập `/admin/dashboard` để xem kết quả!
