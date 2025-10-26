import * as categoryService from '../services/categoryService.js';
import { successResponse } from '../utils/response.js';

// Get all categories
export const getCategories = async (req, res, next) => {
  try {
    const { is_active } = req.query;
    
    const filters = {};
    if (is_active !== undefined) {
      filters.is_active = is_active === 'true';
    }
    
    const categories = await categoryService.getCategories(filters);
    return successResponse(res, categories);
  } catch (error) {
    console.error('Get categories controller error:', error);
    next(error);
  }
};

// Get category by ID
export const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await categoryService.getCategoryById(id);
    return successResponse(res, category);
  } catch (error) {
    console.error('Get category by ID controller error:', error);
    next(error);
  }
};

// Create category
export const createCategory = async (req, res, next) => {
  try {
    const category = await categoryService.createCategory(req.body);
    return successResponse(res, category, 201);
  } catch (error) {
    console.error('Create category controller error:', error);
    next(error);
  }
};

// Update category
export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await categoryService.updateCategory(id, req.body);
    return successResponse(res, category);
  } catch (error) {
    console.error('Update category controller error:', error);
    next(error);
  }
};

// Delete category
export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    await categoryService.deleteCategory(id);
    return successResponse(res, { message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category controller error:', error);
    next(error);
  }
};

// Get products in category
export const getCategoryProducts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit, offset } = req.query;
    
    const filters = {};
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);
    
    const result = await categoryService.getCategoryProducts(id, filters);
    return successResponse(res, result);
  } catch (error) {
    console.error('Get category products controller error:', error);
    next(error);
  }
};

// Get category statistics
export const getCategoryStats = async (req, res, next) => {
  try {
    const { id } = req.params;
    const stats = await categoryService.getCategoryStats(id);
    return successResponse(res, stats);
  } catch (error) {
    console.error('Get category stats controller error:', error);
    next(error);
  }
};
