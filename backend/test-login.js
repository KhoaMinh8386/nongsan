/**
 * TEST LOGIN SCRIPT
 * Chay file nay de test login API
 * Usage: node test-login.js
 */

import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Test Login Function
async function testLogin(email, password) {
  console.log('\n🔐 Testing Login...');
  console.log('Email:', email);
  console.log('Password:', password);
  
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password
    });
    
    console.log('\n✅ LOGIN SUCCESS!');
    console.log('Token:', response.data.data.token);
    console.log('User:', response.data.data.user);
    
    return response.data.data;
  } catch (error) {
    console.log('\n❌ LOGIN FAILED!');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', error.response.data);
    } else if (error.request) {
      console.log('No response from server. Is backend running?');
      console.log('Make sure: npm run dev is running in backend folder');
    } else {
      console.log('Error:', error.message);
    }
    throw error;
  }
}

// Test Protected Route
async function testProtectedRoute(token) {
  console.log('\n🔒 Testing Protected Route...');
  
  try {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ PROTECTED ROUTE SUCCESS!');
    console.log('User Info:', response.data.data);
    
    return response.data.data;
  } catch (error) {
    console.log('❌ PROTECTED ROUTE FAILED!');
    console.log('Error:', error.response?.data || error.message);
    throw error;
  }
}

// Main Test
async function main() {
  console.log('='.repeat(60));
  console.log('🧪 AUTHENTICATION TEST - NÔNG SẢN SẠCH');
  console.log('='.repeat(60));
  
  try {
    // Test 1: Admin Login
    console.log('\n📋 TEST 1: Admin Login');
    const adminData = await testLogin('admin@example.com', '123456');
    
    // Test 2: Admin Protected Route
    console.log('\n📋 TEST 2: Admin Protected Route');
    await testProtectedRoute(adminData.token);
    
    // Test 3: Customer Login
    console.log('\n📋 TEST 3: Customer Login');
    const customerData = await testLogin('khach@example.com', '123456');
    
    // Test 4: Customer Protected Route
    console.log('\n📋 TEST 4: Customer Protected Route');
    await testProtectedRoute(customerData.token);
    
    // Test 5: Invalid Credentials
    console.log('\n📋 TEST 5: Invalid Credentials (Should Fail)');
    try {
      await testLogin('admin@example.com', 'wrongpassword');
    } catch (error) {
      console.log('✅ Correctly rejected invalid password');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS COMPLETED!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ TEST SUITE FAILED');
    console.log('='.repeat(60));
    process.exit(1);
  }
}

// Run tests
main();
