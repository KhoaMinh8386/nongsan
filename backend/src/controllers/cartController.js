import { successResponse } from '../utils/response.js';
import * as cartService from '../services/cartService.js';

export const getCart = async (req, res, next) => {
  try {
    const cart = await cartService.getCart(req.user.id);
    return successResponse(res, cart);
  } catch (error) {
    next(error);
  }
};

export const updateCart = async (req, res, next) => {
  try {
    await cartService.updateCart(req.user.id, req.body.items);
    return successResponse(res, null, 'Cart updated successfully');
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (req, res, next) => {
  try {
    await cartService.clearCart(req.user.id);
    return successResponse(res, null, 'Cart cleared successfully');
  } catch (error) {
    next(error);
  }
};
