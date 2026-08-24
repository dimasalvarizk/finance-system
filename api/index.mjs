import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Import Route Handlers from microservices
import authRoutes from '../backend/auth-service/routes/authRoutes.js';
import invoiceRoutes from '../backend/invoice-service/routes/invoiceRoutes.js';
import companyRoutes from '../backend/company-service/routes/companyRoutes.js';
import requestRoutes from '../backend/request-service/routes/requestRoutes.js';
import settingRoutes from '../backend/setting-service/routes/settingRoutes.js';

// Import Database connection functions
import { connectDB as connectAuthDB } from '../backend/auth-service/config/db.js';
import { connectDB as connectInvoiceDB } from '../backend/invoice-service/config/db.js';
import { connectDB as connectCompanyDB } from '../backend/company-service/config/db.js';
import { connectDB as connectRequestDB } from '../backend/request-service/config/db.js';
import { connectDB as connectSettingDB } from '../backend/setting-service/config/db.js';

// Import error handler from auth service (or define a generic one)
import { errorHandler as authErrorHandler } from '../backend/auth-service/utils/errorHandler.js';

dotenv.config();

const app = express();

// Middleware to ensure all databases are connected
let isConnected = false;
app.use(async (req, res, next) => {
  if (!isConnected) {
    try {
      console.log('[Serverless] Initializing database pools...');
      await Promise.all([
        connectAuthDB(),
        connectInvoiceDB(),
        connectCompanyDB(),
        connectRequestDB(),
        connectSettingDB()
      ]);
      isConnected = true;
      console.log('[Serverless] All database pools connected successfully!');
    } catch (err) {
      console.error('[Serverless] Database connection failed:', err);
      return res.status(500).json({
        success: false,
        message: 'Internal Database Connection Error',
        error: err.message
      });
    }
  }
  next();
});

// Standard HTTP Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Base Gateway Route
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Unified Finance System API Gateway is running on Vercel...',
    timestamp: new Date().toISOString()
  });
});

// Mount routes mirroring the API gateway paths
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/settings', settingRoutes);

// Catch-all route for unknown API requests
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API Route not found: ${req.originalUrl}`
  });
});

// Error handling middleware
app.use(authErrorHandler);

export default app;
