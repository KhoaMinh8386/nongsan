import express from 'express';
import * as dashboardController from '../controllers/dashboardController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

router.get('/overview', authenticate, authorize('ADMIN', 'STAFF'), dashboardController.getDashboardOverview);
router.get('/revenue', authenticate, authorize('ADMIN', 'STAFF'), dashboardController.getRevenueReport);
router.get('/top-products', authenticate, authorize('ADMIN', 'STAFF'), dashboardController.getTopProducts);
router.get('/new-customers', authenticate, authorize('ADMIN', 'STAFF'), dashboardController.getNewCustomers);
router.get('/recent-orders', authenticate, authorize('ADMIN', 'STAFF'), dashboardController.getRecentOrdersController);
router.get('/summary', authenticate, authorize('ADMIN', 'STAFF'), dashboardController.getDashboardSummary);
router.get('/revenue-30-days', authenticate, authorize('ADMIN', 'STAFF'), dashboardController.getRevenueReport);

export default router;
