import express from 'express';
import * as orderController from '../controllers/orderController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', authenticate, orderController.getOrders);
router.get('/:id', authenticate, orderController.getOrderDetail);
router.post('/', authenticate, orderController.createOrder);
router.put('/:id/status', authenticate, authorize('ADMIN', 'STAFF'), orderController.updateOrderStatus);
router.post('/:id/payment', authenticate, authorize('ADMIN', 'STAFF'), orderController.markOrderPaid);
router.post('/:id/confirm-payment', authenticate, orderController.customerConfirmPayment);
router.post('/:id/admin-confirm-payment', authenticate, authorize('ADMIN', 'STAFF'), orderController.adminConfirmPayment);

export default router;
