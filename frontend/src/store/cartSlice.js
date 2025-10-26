import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  totalItems: 0,
  subtotal: 0,
  loading: false,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setCart: (state, action) => {
      state.items = action.payload.items || [];
      state.totalItems = action.payload.total_items || 0;
      state.subtotal = action.payload.subtotal || 0;
    },
    addToCart: (state, action) => {
      const existingItem = state.items.find(item => item.product_id === action.payload.product_id);
      if (existingItem) {
        existingItem.qty += action.payload.qty;
      } else {
        state.items.push(action.payload);
      }
      state.totalItems = state.items.reduce((sum, item) => sum + item.qty, 0);
    },
    updateCartItem: (state, action) => {
      const item = state.items.find(item => item.product_id === action.payload.product_id);
      if (item) {
        item.qty = action.payload.qty;
      }
      state.totalItems = state.items.reduce((sum, item) => sum + item.qty, 0);
    },
    removeFromCart: (state, action) => {
      state.items = state.items.filter(item => item.product_id !== action.payload);
      state.totalItems = state.items.reduce((sum, item) => sum + item.qty, 0);
    },
    clearCart: (state) => {
      state.items = [];
      state.totalItems = 0;
      state.subtotal = 0;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
});

export const { setCart, addToCart, updateCartItem, removeFromCart, clearCart, setLoading } = cartSlice.actions;
export default cartSlice.reducer;
