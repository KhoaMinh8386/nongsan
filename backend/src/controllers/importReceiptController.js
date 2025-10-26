import { successResponse, errorResponse } from '../utils/response.js';
import * as importReceiptService from '../services/importReceiptService.js';

export const getImportReceipts = async (req, res, next) => {
  try {
    const filters = {
      supplier_id: req.query.supplier_id,
      status: req.query.status,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      page: req.query.page || 1,
      limit: req.query.limit || 20
    };

    const result = await importReceiptService.getImportReceipts(filters);

    return res.json({
      success: true,
      data: result.receipts,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

export const getImportReceiptById = async (req, res, next) => {
  try {
    const receipt = await importReceiptService.getImportReceiptById(req.params.id);
    
    if (!receipt) {
      return errorResponse(res, 'Import receipt not found', 404, 'NOT_FOUND');
    }

    return successResponse(res, receipt);
  } catch (error) {
    next(error);
  }
};

export const createImportReceipt = async (req, res, next) => {
  try {
    const receipt = await importReceiptService.createImportReceipt(req.body, req.user.id);
    return successResponse(res, receipt, 'Import receipt created successfully', 201);
  } catch (error) {
    if (error.message.includes('must have at least one item') || error.message.includes('Invalid item data')) {
      return errorResponse(res, error.message, 400, 'INVALID_DATA');
    }
    next(error);
  }
};

export const updateImportReceipt = async (req, res, next) => {
  try {
    const receipt = await importReceiptService.updateImportReceipt(req.params.id, req.body);
    return successResponse(res, receipt, 'Import receipt updated successfully');
  } catch (error) {
    if (error.message === 'Import receipt not found') {
      return errorResponse(res, error.message, 404, 'NOT_FOUND');
    }
    if (error.message.includes('Can only update') || error.message.includes('Invalid item data')) {
      return errorResponse(res, error.message, 400, 'INVALID_OPERATION');
    }
    next(error);
  }
};

export const approveImportReceipt = async (req, res, next) => {
  try {
    const receipt = await importReceiptService.approveImportReceipt(req.params.id);
    return successResponse(res, receipt, 'Import receipt approved and stock updated successfully');
  } catch (error) {
    if (error.message === 'Import receipt not found') {
      return errorResponse(res, error.message, 404, 'NOT_FOUND');
    }
    if (error.message.includes('already approved') || error.message.includes('cancelled')) {
      return errorResponse(res, error.message, 400, 'INVALID_OPERATION');
    }
    next(error);
  }
};

export const cancelImportReceipt = async (req, res, next) => {
  try {
    const receipt = await importReceiptService.cancelImportReceipt(req.params.id);
    return successResponse(res, receipt, 'Import receipt cancelled successfully');
  } catch (error) {
    if (error.message.includes('Cannot cancel')) {
      return errorResponse(res, error.message, 400, 'INVALID_OPERATION');
    }
    next(error);
  }
};

export const deleteImportReceipt = async (req, res, next) => {
  try {
    await importReceiptService.deleteImportReceipt(req.params.id);
    return successResponse(res, null, 'Import receipt deleted successfully');
  } catch (error) {
    if (error.message === 'Import receipt not found') {
      return errorResponse(res, error.message, 404, 'NOT_FOUND');
    }
    if (error.message.includes('Can only delete')) {
      return errorResponse(res, error.message, 400, 'INVALID_OPERATION');
    }
    next(error);
  }
};
