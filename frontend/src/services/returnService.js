import api from './api';

export const returnService = {
  // Get all returns (customer sees their own, admin sees all)
  getReturns: async () => {
    const response = await api.get('/returns');
    return response.data;
  },

  // Create return request
  createReturn: async (returnData) => {
    const response = await api.post('/returns', returnData);
    return response.data;
  },

  // Approve return (admin only)
  approveReturn: async (returnId) => {
    const response = await api.put(`/returns/${returnId}/approve`);
    return response.data;
  },

  // Reject return (admin only)
  rejectReturn: async (returnId) => {
    const response = await api.put(`/returns/${returnId}/reject`);
    return response.data;
  },
};
