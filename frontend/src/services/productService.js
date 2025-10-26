import api from './api';

export const productService = {
  getProducts: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });

    const response = await api.get(`/products?${params.toString()}`);
    const { success, data = [], pagination = {} } = response.data;

    return {
      success,
      products: data,
      pagination
    };
  },

  getProductById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data?.data || null;
  },

  createProduct: async (productData) => {
    const response = await api.post('/products', productData);
    return response.data;
  },

  updateProduct: async (id, productData) => {
    const response = await api.put(`/products/${id}`, productData);
    return response.data;
  },

  deleteProduct: async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },

  uploadImage: async (productId, data) => {
    // Check if data is FormData (file upload) or object (URL)
    const isFormData = data instanceof FormData;
    
    const response = await api.post(`/products/${productId}/images`, data, {
      headers: isFormData ? {
        'Content-Type': 'multipart/form-data',
      } : {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  },

  deleteImage: async (productId, imageId) => {
    const response = await api.delete(`/products/${productId}/images/${imageId}`);
    return response.data;
  },

  setMainImage: async (productId, imageId) => {
    const response = await api.put(`/products/${productId}/images/${imageId}/set-main`);
    return response.data;
  },
};
