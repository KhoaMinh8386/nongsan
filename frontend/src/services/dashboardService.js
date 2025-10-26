import api from './api';

export const dashboardService = {
  getOverview: async (startDate, endDate) => {
    const response = await api.get('/dashboard/overview', {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  },

  getRevenueReport: async (startDate, endDate) => {
    const response = await api.get('/dashboard/revenue', {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  },

  getTopProducts: async (startDate, endDate, limit = 10) => {
    const response = await api.get('/dashboard/top-products', {
      params: { start_date: startDate, end_date: endDate, limit }
    });
    return response.data;
  },

  // Alias for getRevenueReport
  getRevenue: async (startDate, endDate) => {
    const response = await api.get('/dashboard/revenue', {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  },

  // Get new customers
  getNewCustomers: async (startDate, endDate) => {
    const response = await api.get('/dashboard/new-customers', {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  },

  // Get recent orders
  getRecentOrders: async (limit = 5) => {
    try {
      const response = await api.get('/dashboard/recent-orders', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      throw error;
    }
  },

  // Get dashboard summary
  getSummary: async (startDate, endDate) => {
    const response = await api.get('/dashboard/summary', {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  },

  // Get revenue 30 days (alias for getRevenue)
  getRevenue30Days: async (startDate, endDate) => {
    const response = await api.get('/dashboard/revenue-30-days', {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  },
};
