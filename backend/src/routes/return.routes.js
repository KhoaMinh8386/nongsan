import express from 'express';
import * as returnController from '../controllers/returnController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', authenticate, returnController.getReturns);
router.post('/', authenticate, returnController.createReturn);
router.put('/:id/approve', authenticate, authorize('ADMIN'), returnController.approveReturn);
router.put('/:id/reject', authenticate, authorize('ADMIN'), returnController.rejectReturn);

export default router;
