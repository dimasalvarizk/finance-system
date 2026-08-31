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
import hotelReservationRoutes from '../backend/hotel-reservation-service/routes/hotelReservationRoutes.js';

// Import Database connection functions
import { connectDB as connectAuthDB, getPool as getAuthPool } from '../backend/auth-service/config/db.js';
import { connectDB as connectInvoiceDB } from '../backend/invoice-service/config/db.js';
import { connectDB as connectCompanyDB } from '../backend/company-service/config/db.js';
import { connectDB as connectRequestDB } from '../backend/request-service/config/db.js';
import { connectDB as connectSettingDB } from '../backend/setting-service/config/db.js';
import { connectDB as connectHotelDB } from '../backend/hotel-reservation-service/config/db.js';

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
        connectSettingDB(),
        connectHotelDB()
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Base Gateway Route
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Unified Finance System API Gateway is running on Vercel...',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/db-check', async (req, res) => {
  try {
    const pool = getAuthPool();
    const [tables] = await pool.query('SHOW TABLES');
    const tableInfo = {};
    for (const t of tables) {
      const tableName = Object.values(t)[0];
      try {
        const [desc] = await pool.query(`DESCRIBE \`${tableName}\``);
        tableInfo[tableName] = desc;
      } catch (err) {
        tableInfo[tableName] = { error: err.message };
      }
    }
    res.status(200).json({
      success: true,
      tables: tableInfo
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Mount routes mirroring the API gateway paths
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/hotel-reservations', hotelReservationRoutes);

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
