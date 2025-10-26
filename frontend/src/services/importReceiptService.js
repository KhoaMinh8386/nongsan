import api from './api';

export const importReceiptService = {
  getImportReceipts: async (params) => {
    const response = await api.get('/import-receipts', { params });
    return response.data;
  },

  getImportReceiptById: async (id) => {
    const response = await api.get(`/import-receipts/${id}`);
    return response.data;
  },

  createImportReceipt: async (receiptData) => {
    const response = await api.post('/import-receipts', receiptData);
    return response.data;
  },

  updateImportReceipt: async (id, receiptData) => {
    const response = await api.put(`/import-receipts/${id}`, receiptData);
    return response.data;
  },

  approveImportReceipt: async (id) => {
    const response = await api.post(`/import-receipts/${id}/approve`);
    return response.data;
  },

  cancelImportReceipt: async (id) => {
    const response = await api.post(`/import-receipts/${id}/cancel`);
    return response.data;
  },

  deleteImportReceipt: async (id) => {
    const response = await api.delete(`/import-receipts/${id}`);
    return response.data;
  },
};
