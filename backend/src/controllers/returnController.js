import { successResponse } from '../utils/response.js';
import * as returnService from '../services/returnService.js';

export const createReturn = async (req, res, next) => {
  try {
    const returnData = await returnService.createReturn(req.user.id, req.body);
    return successResponse(res, returnData, 'Return request created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getReturns = async (req, res, next) => {
  try {
    const returns = await returnService.getReturns(req.user.id, req.user.role);
    return successResponse(res, returns);
  } catch (error) {
    next(error);
  }
};

export const approveReturn = async (req, res, next) => {
  try {
    await returnService.approveReturn(req.params.id);
    return successResponse(res, null, 'Return approved and stock updated');
  } catch (error) {
    next(error);
  }
};

export const rejectReturn = async (req, res, next) => {
  try {
    await returnService.rejectReturn(req.params.id);
    return successResponse(res, null, 'Return rejected');
  } catch (error) {
    next(error);
  }
};
