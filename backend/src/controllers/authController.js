import { successResponse, errorResponse } from '../utils/response.js';
import * as authService from '../services/authService.js';

export const register = async (req, res, next) => {
  try {
    const user = await authService.registerUser(req.body);
    return successResponse(res, user, 'User registered successfully', 201);
  } catch (error) {
    if (error.code === '23505') {
      return errorResponse(res, 'Email already exists', 409, 'CONFLICT');
    }
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const result = await authService.loginUser(req.body);
    return successResponse(res, result, 'Login successful');
  } catch (error) {
    if (error.message === 'Invalid credentials' || error.message === 'Account is inactive') {
      return errorResponse(res, error.message, 401, 'UNAUTHORIZED');
    }
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.user.id);
    if (!user) {
      return errorResponse(res, 'User not found', 404, 'NOT_FOUND');
    }
    return successResponse(res, user);
  } catch (error) {
    next(error);
  }
};
