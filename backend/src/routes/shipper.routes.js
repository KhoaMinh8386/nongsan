import express from 'express';
import * as shipperController from '../controllers/shipperController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

// All routes require SHIPPER role
router.use(authenticate, authorize('SHIPPER'));

router.get('/orders', shipperController.getOrders);
router.get('/orders/:orderId', shipperController.getOrderDetail);
router.post('/start-delivery', shipperController.startDelivery);
router.post('/update-status', shipperController.updateStatus);
router.get('/history', shipperController.getHistory);
router.get('/stats', shipperController.getStats);

export default router;
