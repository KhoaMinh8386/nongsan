import { successResponse, errorResponse } from '../utils/response.js';
import * as shipperService from '../services/shipperService.js';

export const getOrders = async (req, res, next) => {
  try {
    const orders = await shipperService.getShipperOrders(req.user.id);
    return successResponse(res, orders);
  } catch (error) {
    next(error);
  }
};

export const startDelivery = async (req, res, next) => {
  try {
    const { order_id } = req.body;
    const order = await shipperService.startDelivery(req.user.id, order_id);
    return successResponse(res, order, 'Delivery started');
  } catch (error) {
    if (error.message.includes('not a shipper')) {
      return errorResponse(res, error.message, 403, 'FORBIDDEN');
    }
    next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { order_id, status } = req.body;
    const order = await shipperService.updateOrderStatus(req.user.id, order_id, status);
    return successResponse(res, order, 'Order status updated');
  } catch (error) {
    if (error.message.includes('not assigned')) {
      return errorResponse(res, error.message, 403, 'FORBIDDEN');
    }
    if (error.message.includes('Invalid status transition')) {
      return errorResponse(res, error.message, 400, 'INVALID_TRANSITION');
    }
    next(error);
  }
};

export const getHistory = async (req, res, next) => {
  try {
    const history = await shipperService.getShipperHistory(req.user.id);
    return successResponse(res, history);
  } catch (error) {
    next(error);
  }
};

export const getStats = async (req, res, next) => {
  try {
    const stats = await shipperService.getShipperStats(req.user.id);
    return successResponse(res, stats);
  } catch (error) {
    next(error);
  }
};

export const getOrderDetail = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const orderDetail = await shipperService.getOrderDetail(req.user.id, orderId);
    
    if (!orderDetail) {
      return errorResponse(res, 'Order not found', 404, 'NOT_FOUND');
    }
    
    return successResponse(res, orderDetail);
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      return errorResponse(res, error.message, 403, 'FORBIDDEN');
    }
    next(error);
  }
};
