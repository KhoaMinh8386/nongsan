import api from './api';

export const checkoutService = {
  createOrder: async (orderData) => {
    const response = await api.post('/checkout', orderData);
    return response.data;
  },

  getOrders: async (params = {}) => {
    const response = await api.get('/orders', { params });
    return response.data;
  },

  getOrderDetail: async (orderId) => {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  },

  updateOrderStatus: async (orderId, status) => {
    const response = await api.put(`/orders/${orderId}/status`, { status });
    return response.data;
  },

  confirmPayment: async (orderId) => {
    const response = await api.post(`/orders/${orderId}/confirm-payment`);
    return response.data;
  },

  adminConfirmPayment: async (orderId, paymentData) => {
    const response = await api.post(`/orders/${orderId}/admin-confirm-payment`, paymentData);
    return response.data;
  },
};
