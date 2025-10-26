import express from 'express';
import * as userController from '../controllers/userController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Profile
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);

// Phones
router.get('/phones', userController.getPhones);
router.post('/phones', userController.addPhone);
router.put('/phones/:id', userController.updatePhone);
router.delete('/phones/:id', userController.deletePhone);

// Addresses
router.get('/addresses', userController.getAddresses);
router.post('/addresses', userController.addAddress);
router.put('/addresses/:id', userController.updateAddress);
router.delete('/addresses/:id', userController.deleteAddress);

// Admin: Account Management
router.get('/accounts', authorize('ADMIN'), userController.getAllAccounts);
router.put('/accounts/:id', authorize('ADMIN'), userController.updateAccountRoleStatus);

export default router;
