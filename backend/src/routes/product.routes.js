import express from 'express';
import * as productController from '../controllers/productController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { optionalUploadProductImage } from '../middlewares/upload.js';

const router = express.Router();

router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);
router.post('/', authenticate, authorize('ADMIN'), productController.createProduct);
router.put('/:id', authenticate, authorize('ADMIN'), productController.updateProduct);
router.delete('/:id', authenticate, authorize('ADMIN'), productController.deleteProduct);

// Image upload routes - supports both file upload and URL
router.post('/:id/images', authenticate, authorize('ADMIN'), optionalUploadProductImage, productController.uploadImage);
router.delete('/:id/images/:imageId', authenticate, authorize('ADMIN'), productController.deleteImage);
router.put('/:id/images/:imageId/set-main', authenticate, authorize('ADMIN'), productController.setMainImage);

export default router;
