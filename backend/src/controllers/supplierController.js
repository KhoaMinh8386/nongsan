import { successResponse, errorResponse } from '../utils/response.js';
import * as supplierService from '../services/supplierService.js';

export const getSuppliers = async (req, res, next) => {
  try {
    const filters = {
      search: req.query.search,
      page: req.query.page || 1,
      limit: req.query.limit || 20
    };

    const result = await supplierService.getSuppliers(filters);

    return res.json({
      success: true,
      data: result.suppliers,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

export const getSupplierById = async (req, res, next) => {
  try {
    const supplier = await supplierService.getSupplierById(req.params.id);
    
    if (!supplier) {
      return errorResponse(res, 'Supplier not found', 404, 'NOT_FOUND');
    }

    return successResponse(res, supplier);
  } catch (error) {
    next(error);
  }
};

export const createSupplier = async (req, res, next) => {
  try {
    const supplier = await supplierService.createSupplier(req.body);
    return successResponse(res, supplier, 'Supplier created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updateSupplier = async (req, res, next) => {
  try {
    const supplier = await supplierService.updateSupplier(req.params.id, req.body);
    return successResponse(res, supplier, 'Supplier updated successfully');
  } catch (error) {
    if (error.message === 'Supplier not found') {
      return errorResponse(res, error.message, 404, 'NOT_FOUND');
    }
    next(error);
  }
};

export const deleteSupplier = async (req, res, next) => {
  try {
    const deleted = await supplierService.deleteSupplier(req.params.id);
    
    if (!deleted) {
      return errorResponse(res, 'Supplier not found', 404, 'NOT_FOUND');
    }

    return successResponse(res, null, 'Supplier deleted successfully');
  } catch (error) {
    if (error.message.includes('Cannot delete supplier')) {
      return errorResponse(res, error.message, 400, 'CANNOT_DELETE');
    }
    next(error);
  }
};
