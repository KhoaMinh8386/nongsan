/**
 * TEST API CONNECTION TO NGROK
 * Kiểm tra kết nối API và WebSocket
 */

const API_URL = 'http://localhost:5000/api';
const WS_URL = 'ws://localhost:5000/ws';

console.log('🧪 Testing API Connection...\n');

// Test 1: Health Check
fetch(`${API_URL.replace('/api', '')}/health`, {
  headers: {
    'ngrok-skip-browser-warning': 'true'
  }
})
  .then(res => res.json())
  .then(data => {
    console.log('✅ Health Check:', data);
  })
  .catch(err => {
    console.error('❌ Health Check Failed:', err.message);
  });

// Test 2: Get Products
fetch(`${API_URL}/products`, {
  headers: {
    'ngrok-skip-browser-warning': 'true',
    'Content-Type': 'application/json'
  }
})
  .then(res => res.json())
  .then(data => {
    console.log('\n✅ Products API Response:');
    console.log('  - Success:', data.success);
    console.log('  - Products Count:', data.data?.length || 0);
    console.log('  - Pagination:', data.pagination);
    
    if (data.data && data.data.length > 0) {
      console.log('  - First Product:', data.data[0].name);
    } else {
      console.log('  ⚠️ No products found in database');
    }
  })
  .catch(err => {
    console.error('❌ Products API Failed:', err.message);
  });

// Test 3: WebSocket Connection (requires token)
console.log('\n🔌 WebSocket URL:', WS_URL);
console.log('   (WebSocket test requires authentication token)');
