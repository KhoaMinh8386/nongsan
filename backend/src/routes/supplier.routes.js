import express from 'express';
import * as supplierController from '../controllers/supplierController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate, authorize('ADMIN'));

router.get('/', supplierController.getSuppliers);
router.get('/:id', supplierController.getSupplierById);
router.post('/', supplierController.createSupplier);
router.put('/:id', supplierController.updateSupplier);
router.delete('/:id', supplierController.deleteSupplier);

export default router;
