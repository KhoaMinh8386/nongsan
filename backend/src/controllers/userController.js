import { successResponse, errorResponse } from '../utils/response.js';
import * as userService from '../services/userService.js';

// ==================== PROFILE ====================

export const getProfile = async (req, res, next) => {
  try {
    const profile = await userService.getUserProfile(req.user.id);
    return successResponse(res, profile);
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const profile = await userService.updateUserProfile(req.user.id, req.body);
    return successResponse(res, profile, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
};

// ==================== PHONES ====================

export const getPhones = async (req, res, next) => {
  try {
    const phones = await userService.getUserPhones(req.user.id);
    return successResponse(res, phones);
  } catch (error) {
    next(error);
  }
};

export const addPhone = async (req, res, next) => {
  try {
    const phone = await userService.addUserPhone(req.user.id, req.body);
    return successResponse(res, phone, 'Phone added successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updatePhone = async (req, res, next) => {
  try {
    const phone = await userService.updateUserPhone(req.user.id, req.params.id, req.body);
    return successResponse(res, phone, 'Phone updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deletePhone = async (req, res, next) => {
  try {
    await userService.deleteUserPhone(req.user.id, req.params.id);
    return successResponse(res, null, 'Phone deleted successfully');
  } catch (error) {
    next(error);
  }
};

// ==================== ADDRESSES ====================

export const getAddresses = async (req, res, next) => {
  try {
    const addresses = await userService.getUserAddresses(req.user.id);
    return successResponse(res, addresses);
  } catch (error) {
    next(error);
  }
};

export const addAddress = async (req, res, next) => {
  try {
    const address = await userService.addUserAddress(req.user.id, req.body);
    return successResponse(res, address, 'Address added successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updateAddress = async (req, res, next) => {
  try {
    const address = await userService.updateUserAddress(req.user.id, req.params.id, req.body);
    return successResponse(res, address, 'Address updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteAddress = async (req, res, next) => {
  try {
    await userService.deleteUserAddress(req.user.id, req.params.id);
    return successResponse(res, null, 'Address deleted successfully');
  } catch (error) {
    next(error);
  }
};

// ==================== ADMIN ACCOUNT MANAGEMENT ====================

export const getAllAccounts = async (req, res, next) => {
  try {
    const filters = {
      search: req.query.search,
      role: req.query.role,
      is_active: req.query.is_active,
      page: req.query.page || 1,
      limit: req.query.limit || 20
    };

    const result = await userService.getAllAccounts(filters);
    
    return res.json({
      success: true,
      data: result.accounts,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

export const updateAccountRoleStatus = async (req, res, next) => {
  try {
    const account = await userService.updateAccountRoleStatus(req.params.id, req.body);
    return successResponse(res, account, 'Account updated successfully');
  } catch (error) {
    if (error.message === 'Account not found') {
      return errorResponse(res, error.message, 404, 'NOT_FOUND');
    }
    next(error);
  }
};
