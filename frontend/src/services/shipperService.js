import api from './api';

export const shipperService = {
  getOrders: async () => {
    const response = await api.get('/shipper/orders');
    return response.data;
  },

  startDelivery: async (orderId) => {
    const response = await api.post('/shipper/start-delivery', { order_id: orderId });
    return response.data;
  },

  updateStatus: async (orderId, status) => {
    const response = await api.post('/shipper/update-status', { order_id: orderId, status });
    return response.data;
  },

  getHistory: async () => {
    const response = await api.get('/shipper/history');
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/shipper/stats');
    return response.data;
  },

  getOrderDetail: async (orderId) => {
    const response = await api.get(`/shipper/orders/${orderId}`);
    return response.data;
  },
};
