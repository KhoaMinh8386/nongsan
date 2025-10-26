import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';
import * as orderService from '../services/orderService.js';

export const createOrder = async (req, res, next) => {
  try {
    const order = await orderService.createOrder(req.user.id, req.body);
    return successResponse(res, order, 'Order created successfully', 201);
  } catch (error) {
    if (error.message.includes('Not enough stock')) {
      return errorResponse(res, error.message, 400, 'INSUFFICIENT_STOCK');
    }
    next(error);
  }
};

export const getOrders = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      page: req.query.page || 1,
      limit: req.query.limit || 10
    };

    const result = await orderService.getOrders(req.user.id, req.user.role, filters);
    return paginatedResponse(res, result.orders, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const getOrderDetail = async (req, res, next) => {
  try {
    const order = await orderService.getOrderDetail(req.params.id, req.user.id, req.user.role);
    if (!order) {
      return errorResponse(res, 'Order not found', 404, 'NOT_FOUND');
    }
    return successResponse(res, order);
  } catch (error) {
    if (error.message === 'Unauthorized to view this order') {
      return errorResponse(res, error.message, 403, 'FORBIDDEN');
    }
    next(error);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    await orderService.updateOrderStatus(req.params.id, req.body.status);
    return successResponse(res, null, `Order status updated to ${req.body.status}`);
  } catch (error) {
    if (error.message.includes('Order') && error.message.includes('not found')) {
      return errorResponse(res, 'Order not found', 404, 'NOT_FOUND');
    }
    next(error);
  }
};

export const markOrderPaid = async (req, res, next) => {
  try {
    await orderService.markOrderPaid(req.params.id, req.body);
    return successResponse(res, null, 'Payment recorded successfully');
  } catch (error) {
    next(error);
  }
};

export const customerConfirmPayment = async (req, res, next) => {
  try {
    await orderService.customerConfirmPayment(req.params.id, req.user.id);
    return successResponse(res, null, 'Payment confirmation sent. Admin will verify your payment.');
  } catch (error) {
    next(error);
  }
};

export const adminConfirmPayment = async (req, res, next) => {
  try {
    console.log('🔵 Admin confirming payment for order:', req.params.id);
    console.log('🔵 Payment data:', req.body);
    await orderService.adminConfirmPayment(req.params.id, req.body);
    return successResponse(res, null, 'Payment confirmed successfully');
  } catch (error) {
    console.error('🔴 Error in adminConfirmPayment:', error);
    next(error);
  }
};
