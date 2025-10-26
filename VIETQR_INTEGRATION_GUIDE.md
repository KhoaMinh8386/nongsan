# 🏦 Hướng Dẫn Tích Hợp VietQR - Thanh Toán Chuyển Khoản

**Ngày:** 26/10/2025  
**Tính năng:** Thanh toán qua VietQR cho đơn hàng chuyển khoản ngân hàng

---

## 🎯 Tổng Quan

Hệ thống đã được tích hợp VietQR để tự động tạo mã QR thanh toán cho phương thức **Chuyển khoản ngân hàng**.

### Luồng Hoạt Động

```
1. Khách hàng chọn "Chuyển khoản ngân hàng" → Đặt hàng
2. Hệ thống tạo đơn hàng → Hiển thị mã QR VietQR
3. Khách quét mã QR → Chuyển khoản
4. Khách nhấn "Tôi đã chuyển khoản" → payment_status: PENDING_CONFIRMATION
5. Admin kiểm tra tài khoản → Xác nhận thanh toán
6. Đơn hàng được cập nhật → payment_status: PAID
```

---

## 📋 Thông Tin Tài Khoản VietQR

| Thông tin | Giá trị |
|-----------|---------|
| **Ngân hàng** | VietinBank (ICB) |
| **Chủ tài khoản** | HUYNH MINH KHOA |
| **Số tài khoản** | 103885257744 |
| **Template QR** | VietQR Standard |

---

## 🔧 Cấu Trúc URL QR Code

```
https://img.vietqr.io/image/{BANK_CODE}-{ACCOUNT_NUMBER}-qr_only.png?amount={AMOUNT}&addInfo={CONTENT}
```

### Ví dụ thực tế:
```
https://img.vietqr.io/image/ICB-103885257744-qr_only.png?amount=250000&addInfo=ThanhToan_ORD-20251026-1234
```

### Tham số:
- **BANK_CODE**: `ICB` (VietinBank)
- **ACCOUNT_NUMBER**: `103885257744`
- **amount**: Số tiền đơn hàng (đã làm tròn)
- **addInfo**: Nội dung chuyển khoản = `ThanhToan_{order_code}`

---

## 💻 Frontend Implementation

### 1. Checkout Page (`Checkout.jsx`)

#### State Variables:
```javascript
const [createdOrder, setCreatedOrder] = useState(null);
const [showQR, setShowQR] = useState(false);
const [confirmingPayment, setConfirmingPayment] = useState(false);
```

#### QR URL Generator:
```javascript
const generateQRUrl = () => {
  if (!createdOrder) return '';
  
  const bankAccount = '103885257744';
  const amount = Math.round(createdOrder.grand_total);
  const addInfo = `ThanhToan_${createdOrder.order_code}`;
  
  return `https://img.vietqr.io/image/ICB-${bankAccount}-qr_only.png?amount=${amount}&addInfo=${encodeURIComponent(addInfo)}`;
};
```

#### Payment Confirmation Handler:
```javascript
const handleConfirmPayment = async () => {
  if (!createdOrder) return;
  
  if (!confirm('Xác nhận bạn đã chuyển khoản?')) {
    return;
  }
  
  try {
    setConfirmingPayment(true);
    await checkoutService.confirmPayment(createdOrder.id);
    alert('Đã gửi xác nhận! Admin sẽ kiểm tra và xác nhận thanh toán của bạn.');
    navigate(`/orders/${createdOrder.id}`);
  } catch (error) {
    console.error('Error confirming payment:', error);
    alert('Không thể xác nhận thanh toán');
  } finally {
    setConfirmingPayment(false);
  }
};
```

### 2. Admin Order Management (`OrderManagement.jsx`)

#### Payment Status Colors & Labels:
```javascript
const getPaymentStatusColor = (status) => {
  const colors = {
    'PAID': 'bg-green-100 text-green-800',
    'PENDING_CONFIRMATION': 'bg-orange-100 text-orange-800',
    'UNPAID': 'bg-yellow-100 text-yellow-800',
    'REFUNDED': 'bg-blue-100 text-blue-800',
    'PARTIALLY_REFUNDED': 'bg-purple-100 text-purple-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getPaymentStatusLabel = (status) => {
  const labels = {
    'PAID': 'Đã thanh toán',
    'PENDING_CONFIRMATION': 'Chờ xác nhận TT',
    'UNPAID': 'Chưa thanh toán',
    'REFUNDED': 'Đã hoàn tiền',
    'PARTIALLY_REFUNDED': 'Hoàn 1 phần'
  };
  return labels[status] || status;
};
```

#### Admin Confirm Payment Handler:
```javascript
const handleConfirmPayment = async (orderId) => {
  const amount = prompt('Nhập số tiền đã nhận (bỏ trống nếu đủ):');
  const txnRef = prompt('Mã giao dịch (nếu có):');
  const note = prompt('Ghi chú:');

  try {
    await checkoutService.adminConfirmPayment(orderId, {
      amount: amount ? parseFloat(amount) : null,
      txn_ref: txnRef || null,
      note: note || null
    });
    alert('Xác nhận thanh toán thành công!');
    fetchOrders();
    if (selectedOrder === orderId) {
      viewOrderDetail(orderId);
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
    alert('Không thể xác nhận thanh toán');
  }
};
```

---

## 🔌 Backend Implementation

### 1. Service Layer (`orderService.js`)

#### Customer Confirm Payment:
```javascript
export const customerConfirmPayment = async (orderId, userId) => {
  // Update order to show customer has confirmed payment
  await pool.query(
    `UPDATE agri.orders 
     SET payment_status = 'PENDING_CONFIRMATION'::agri.payment_status,
         updated_at = NOW()
     WHERE id = $1 AND customer_id = $2 AND payment_method = 'BANK_TRANSFER'`,
    [orderId, userId]
  );
  
  return true;
};
```

#### Admin Confirm Payment:
```javascript
export const adminConfirmPayment = async (orderId, paymentData) => {
  const { amount, txn_ref, note } = paymentData;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get order total
    const orderResult = await client.query(
      'SELECT grand_total FROM agri.orders WHERE id = $1',
      [orderId]
    );
    
    if (orderResult.rows.length === 0) {
      throw new Error('Order not found');
    }
    
    const orderTotal = parseFloat(orderResult.rows[0].grand_total);
    const paidAmount = amount || orderTotal;
    
    // Mark as paid using existing function
    await client.query(
      'SELECT agri.danh_dau_thanh_toan($1, $2, $3, $4)',
      [orderId, paidAmount, 'BANK_TRANSFER', txn_ref || null]
    );
    
    // Add admin note if provided
    if (note) {
      await client.query(
        `UPDATE agri.orders 
         SET note = COALESCE(note || E'\\n', '') || $1
         WHERE id = $2`,
        [`[Admin xác nhận thanh toán: ${note}]`, orderId]
      );
    }
    
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
```

### 2. API Routes (`order.routes.js`)

```javascript
// Customer confirms payment
router.post('/:id/confirm-payment', authenticate, orderController.customerConfirmPayment);

// Admin confirms payment received
router.post('/:id/admin-confirm-payment', authenticate, authorize('ADMIN', 'STAFF'), orderController.adminConfirmPayment);
```

---

## 🗄️ Database Changes

### 1. New Payment Status

Migration file: `add_pending_confirmation_status.sql`

```sql
-- Add new value to payment_status enum
ALTER TYPE agri.payment_status ADD VALUE IF NOT EXISTS 'PENDING_CONFIRMATION' AFTER 'UNPAID';

COMMENT ON TYPE agri.payment_status IS 'Payment status: UNPAID, PENDING_CONFIRMATION (customer confirmed), PAID, REFUNDED, PARTIALLY_REFUNDED';
```

### 2. Payment Status Values

| Status | Ý nghĩa | Màu sắc |
|--------|---------|---------|
| `UNPAID` | Chưa thanh toán | Vàng |
| `PENDING_CONFIRMATION` | Khách đã xác nhận CK, chờ admin duyệt | Cam |
| `PAID` | Đã thanh toán | Xanh lá |
| `REFUNDED` | Đã hoàn tiền | Xanh dương |
| `PARTIALLY_REFUNDED` | Hoàn tiền 1 phần | Tím |

---

## 📱 Giao Diện Người Dùng

### 1. Trang Checkout - Hiển thị QR

Khi khách chọn **Chuyển khoản ngân hàng** và đặt hàng:

```
╔════════════════════════════════════════╗
║   🎯 Quét mã VietQR để thanh toán     ║
║                                        ║
║     [QR CODE IMAGE 320x320]           ║
║                                        ║
║  📋 Thông tin chuyển khoản:           ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ║
║  Ngân hàng: VietinBank                ║
║  Chủ TK: HUYNH MINH KHOA              ║
║  Số TK: 103885257744                  ║
║  Số tiền: 250,000 đ                   ║
║  Nội dung: ThanhToan_ORD-20251026     ║
║                                        ║
║  ⚠️ Lưu ý: Nhập đúng nội dung CK      ║
║                                        ║
║  [✅ Tôi đã chuyển khoản]             ║
╚════════════════════════════════════════╝
```

### 2. Admin Order Management - Alert Xác Nhận

Khi có đơn `PENDING_CONFIRMATION`:

```
╔═══════════════════════════════════════════════╗
║ ⚠️ Khách hàng đã xác nhận chuyển khoản       ║
║ Vui lòng kiểm tra TK ngân hàng               ║
║                                               ║
║              [✅ Xác nhận đã nhận tiền]       ║
╚═══════════════════════════════════════════════╝
```

---

## 🚀 Hướng Dẫn Triển Khai

### Bước 1: Apply Database Migration

```bash
# Connect to PostgreSQL
psql -U postgres -d nongsan_db

# Run migration
\i c:/NONGSAN/database/migrations/add_pending_confirmation_status.sql

# Verify
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'agri.payment_status'::regtype;
```

### Bước 2: Restart Backend

```bash
cd c:\NONGSAN\backend
npm start
```

### Bước 3: Restart Frontend

```bash
cd c:\NONGSAN\frontend
npm start
```

---

## ✅ Checklist Kiểm Tra

### Frontend:
- [ ] Checkout page hiển thị QR code khi chọn BANK_TRANSFER
- [ ] QR code có đúng số tiền và nội dung chuyển khoản
- [ ] Button "Tôi đã chuyển khoản" hoạt động
- [ ] Admin thấy alert khi payment_status = PENDING_CONFIRMATION
- [ ] Admin có thể xác nhận thanh toán

### Backend:
- [ ] Route `/orders/:id/confirm-payment` hoạt động (customer)
- [ ] Route `/orders/:id/admin-confirm-payment` hoạt động (admin)
- [ ] Payment status được cập nhật đúng
- [ ] Function `danh_dau_thanh_toan` được gọi khi admin xác nhận

### Database:
- [ ] Enum `payment_status` có value `PENDING_CONFIRMATION`
- [ ] Orders table cập nhật payment_status thành công

---

## 🧪 Test Cases

### Test Case 1: Customer Flow

1. Login as CUSTOMER
2. Thêm sản phẩm vào giỏ
3. Checkout → Chọn "Chuyển khoản ngân hàng"
4. Đặt hàng
5. ✅ **Expected:** Hiển thị QR code VietQR
6. Nhấn "Tôi đã chuyển khoản"
7. ✅ **Expected:** payment_status = PENDING_CONFIRMATION

### Test Case 2: Admin Flow

1. Login as ADMIN
2. Vào Order Management
3. Tìm đơn có payment_status = PENDING_CONFIRMATION
4. ✅ **Expected:** Thấy alert màu cam
5. Nhấn "Xác nhận đã nhận tiền"
6. Nhập thông tin (có thể bỏ trống)
7. ✅ **Expected:** payment_status = PAID

### Test Case 3: QR Code Generation

1. Tạo đơn với grand_total = 150,000đ
2. Order code = ORD-20251026-5678
3. ✅ **Expected QR URL:**
```
https://img.vietqr.io/image/ICB-103885257744-qr_only.png?amount=150000&addInfo=ThanhToan_ORD-20251026-5678
```

---

## 🔍 Troubleshooting

### Lỗi: QR không hiển thị

**Nguyên nhân:** URL không đúng hoặc VietQR service down

**Giải pháp:**
- Kiểm tra console log để xem URL
- Test URL trực tiếp trên browser
- Kiểm tra `createdOrder` có dữ liệu không

### Lỗi: Không cập nhật được payment_status

**Nguyên nhân:** Database chưa có PENDING_CONFIRMATION enum value

**Giải pháp:**
```sql
ALTER TYPE agri.payment_status ADD VALUE IF NOT EXISTS 'PENDING_CONFIRMATION';
```

### Lỗi: Admin không thấy nút xác nhận

**Nguyên nhân:** Payment status hoặc payment method không đúng

**Giải pháp:** Kiểm tra điều kiện:
```javascript
orderDetail.payment_status === 'PENDING_CONFIRMATION' && 
orderDetail.payment_method === 'BANK_TRANSFER'
```

---

## 📊 Payment Status Flow Diagram

```
┌──────────────────┐
│  Tạo đơn hàng    │
│  BANK_TRANSFER   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  payment_status  │
│  = UNPAID        │
└────────┬─────────┘
         │
         │ Khách nhấn "Tôi đã chuyển khoản"
         ▼
┌───────────────────────┐
│  payment_status       │
│  = PENDING_           │
│    CONFIRMATION       │
└────────┬──────────────┘
         │
         │ Admin xác nhận đã nhận tiền
         ▼
┌──────────────────┐
│  payment_status  │
│  = PAID          │
└──────────────────┘
```

---

## 🎨 UI Components

### VietQR Display Component

**Màu sắc:**
- Background: Gradient từ green-50 đến blue-50
- Border: 2px solid green-500
- QR Box: White với shadow-md
- Info Box: White rounded-lg

**Icons:**
- QR Code: `<QrCode className="w-8 h-8 text-green-600" />`
- Confirm: `<CheckCircle className="w-6 h-6" />`

---

## 📞 Support

Nếu có vấn đề, kiểm tra:
1. Console logs (Frontend & Backend)
2. Database payment_status enum values
3. Network requests trong DevTools
4. VietQR API response

---

## 🔐 Security Notes

- ✅ Customer chỉ có thể confirm payment cho đơn của mình (check userId)
- ✅ Admin verify payment qua ADMIN/STAFF role
- ✅ Nội dung chuyển khoản động theo order_code để tránh trùng
- ✅ Amount được làm tròn để tránh lỗi số thập phân

---

## 📝 Future Improvements

1. **Auto-verification:** Tích hợp API ngân hàng để tự động verify
2. **QR Templates:** Cho phép admin thay đổi template VietQR
3. **Multiple Banks:** Hỗ trợ nhiều tài khoản ngân hàng
4. **Payment Reminders:** Gửi email nhắc khách thanh toán
5. **Receipt Upload:** Cho phép khách upload ảnh chuyển khoản

---

**✨ VietQR Integration Complete! ✨**
