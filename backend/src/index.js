import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
// import rateLimit from 'express-rate-limit'; // DISABLED - No rate limiting
import dotenv from 'dotenv';

import pool from './config/db.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { setupWebSocket } from './services/websocketService.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import cartRoutes from './routes/cart.routes.js';
import orderRoutes from './routes/order.routes.js';
import returnRoutes from './routes/return.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import userRoutes from './routes/user.routes.js';
import checkoutRoutes from './routes/checkout.routes.js';
import shipperRoutes from './routes/shipper.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import importReceiptRoutes from './routes/importReceipt.routes.js';
import categoryRoutes from './routes/category.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy - Required for ngrok/reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting - DISABLED (no limit)
// const limiter = rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
//   max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
// });
// app.use('/api', limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files - serve uploaded images
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/user', userRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/shipper', shipperRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/import-receipts', importReceiptRoutes);
app.use('/api/categories', categoryRoutes);

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Create HTTP server
const server = createServer(app);

// Setup WebSocket
setupWebSocket(server);

// Test database connection and start server
pool.query('SELECT NOW()')
  .then(() => {
    console.log('✅ Database connection successful');
    server.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}/api`);
      console.log(`🔌 WebSocket available at ws://localhost:${PORT}/ws`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing HTTP server...');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});

export default app;
