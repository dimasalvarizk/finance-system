import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import invoiceRoutes from './routes/invoiceRoutes.js';
import { connectDB } from './config/db.js';
import { errorHandler } from './utils/errorHandler.js';

// Load env variables
dotenv.config();

// Connect to MySQL and initialize tables/seeding
connectDB();

const app = express();

// Middlewares
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Base Route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Invoice Service API is running...',
  });
});

// Mount Routes
app.use('/api/invoices', invoiceRoutes);

// Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5002;

const server = app.listen(PORT, () => {
  console.log(`Invoice Service running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
