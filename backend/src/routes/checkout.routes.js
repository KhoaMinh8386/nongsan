import express from 'express';
import * as checkoutController from '../controllers/checkoutController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

router.post('/', authenticate, checkoutController.createOrder);
router.get('/:id', authenticate, checkoutController.getOrderDetail);

export default router;
