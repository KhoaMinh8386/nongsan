import express from 'express';
import * as categoryController from '../controllers/categoryController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

// Public routes
router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategoryById);
router.get('/:id/products', categoryController.getCategoryProducts);
router.get('/:id/stats', categoryController.getCategoryStats);

// Admin only routes
router.post('/', authenticate, authorize('ADMIN', 'STAFF'), categoryController.createCategory);
router.put('/:id', authenticate, authorize('ADMIN', 'STAFF'), categoryController.updateCategory);
router.delete('/:id', authenticate, authorize('ADMIN'), categoryController.deleteCategory);

export default router;
