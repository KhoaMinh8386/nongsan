import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';
import * as productService from '../services/productService.js';

export const getProducts = async (req, res, next) => {
  try {
    const filters = {
      category_id: req.query.category_id,
      brand_id: req.query.brand_id,
      min_price: req.query.min_price,
      max_price: req.query.max_price,
      search: req.query.search,
      page: req.query.page || 1,
      limit: req.query.limit || 12,
      sort: req.query.sort || 'created_at',
      order: req.query.order || 'desc'
    };

    const result = await productService.getProducts(filters);
    return paginatedResponse(res, result.products, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    if (!product) {
      return errorResponse(res, 'Product not found', 404, 'NOT_FOUND');
    }
    return successResponse(res, product);
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body);
    return successResponse(res, product, 'Product created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    if (!product) {
      return errorResponse(res, 'Product not found', 404, 'NOT_FOUND');
    }
    return successResponse(res, product, 'Product updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const deleted = await productService.deleteProduct(req.params.id);
    if (!deleted) {
      return errorResponse(res, 'Product not found', 404, 'NOT_FOUND');
    }
    return successResponse(res, null, 'Product deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const uploadImage = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const isMain = req.body.is_main === 'true' || req.body.is_main === true;
    let imageUrl;

    // Check if URL provided instead of file
    if (req.body.image_url) {
      imageUrl = req.body.image_url;
    } else if (req.file) {
      // Generate public URL for uploaded file
      imageUrl = `/uploads/products/${req.file.filename}`;
    } else {
      return errorResponse(res, 'No image file or URL provided', 400, 'NO_IMAGE');
    }
    
    const image = await productService.addProductImage(productId, imageUrl, isMain);
    return successResponse(res, image, 'Image added successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteImage = async (req, res, next) => {
  try {
    const { imageId } = req.params;
    const deleted = await productService.deleteProductImage(imageId);
    
    if (!deleted) {
      return errorResponse(res, 'Image not found', 404, 'NOT_FOUND');
    }
    
    return successResponse(res, null, 'Image deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const setMainImage = async (req, res, next) => {
  try {
    const { id: productId, imageId } = req.params;
    await productService.setMainProductImage(productId, imageId);
    return successResponse(res, null, 'Main image updated successfully');
  } catch (error) {
    if (error.message === 'Image not found') {
      return errorResponse(res, error.message, 404, 'NOT_FOUND');
    }
    next(error);
  }
};
