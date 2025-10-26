import express from 'express';
import * as importReceiptController from '../controllers/importReceiptController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate, authorize('ADMIN'));

router.get('/', importReceiptController.getImportReceipts);
router.get('/:id', importReceiptController.getImportReceiptById);
router.post('/', importReceiptController.createImportReceipt);
router.put('/:id', importReceiptController.updateImportReceipt);
router.post('/:id/approve', importReceiptController.approveImportReceipt);
router.post('/:id/cancel', importReceiptController.cancelImportReceipt);
router.delete('/:id', importReceiptController.deleteImportReceipt);

export default router;
