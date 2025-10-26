import express from 'express';
import * as cartController from '../controllers/cartController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', authenticate, cartController.getCart);
router.post('/', authenticate, cartController.updateCart);
router.delete('/', authenticate, cartController.clearCart);

export default router;
