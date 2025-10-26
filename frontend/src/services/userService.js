import api from './api';

export const userService = {
  // Profile
  getProfile: async () => {
    const response = await api.get('/user/profile');
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await api.put('/user/profile', profileData);
    return response.data;
  },

  // Phones
  getPhones: async () => {
    const response = await api.get('/user/phones');
    return response.data;
  },

  addPhone: async (phoneData) => {
    const response = await api.post('/user/phones', phoneData);
    return response.data;
  },

  updatePhone: async (phoneId, phoneData) => {
    const response = await api.put(`/user/phones/${phoneId}`, phoneData);
    return response.data;
  },

  deletePhone: async (phoneId) => {
    const response = await api.delete(`/user/phones/${phoneId}`);
    return response.data;
  },

  // Addresses
  getAddresses: async () => {
    const response = await api.get('/user/addresses');
    return response.data;
  },

  addAddress: async (addressData) => {
    const response = await api.post('/user/addresses', addressData);
    return response.data;
  },

  updateAddress: async (addressId, addressData) => {
    const response = await api.put(`/user/addresses/${addressId}`, addressData);
    return response.data;
  },

  deleteAddress: async (addressId) => {
    const response = await api.delete(`/user/addresses/${addressId}`);
    return response.data;
  },

  // Admin: Account Management
  getAllAccounts: async (params) => {
    const response = await api.get('/user/accounts', { params });
    return response.data;
  },

  updateAccountRoleStatus: async (accountId, data) => {
    const response = await api.put(`/user/accounts/${accountId}`, data);
    return response.data;
  },
};
