import { successResponse, errorResponse } from '../utils/response.js';
import * as checkoutService from '../services/checkoutService.js';

export const createOrder = async (req, res, next) => {
  try {
    const order = await checkoutService.createOrderFromCart(req.user.id, req.body);
    return successResponse(res, order, 'Order created successfully', 201);
  } catch (error) {
    if (error.message.includes('Cart not found')) {
      return errorResponse(res, 'Your cart is empty', 400, 'CART_EMPTY');
    }
    if (error.message.includes('Address not found')) {
      return errorResponse(res, 'Invalid shipping address', 400, 'INVALID_ADDRESS');
    }
    next(error);
  }
};

export const getOrderDetail = async (req, res, next) => {
  try {
    const order = await checkoutService.getOrderById(
      req.user.id,
      req.params.id,
      req.user.role
    );
    return successResponse(res, order);
  } catch (error) {
    if (error.message === 'Order not found') {
      return errorResponse(res, error.message, 404, 'NOT_FOUND');
    }
    next(error);
  }
};
