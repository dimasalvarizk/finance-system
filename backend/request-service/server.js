import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import requestRoutes from './routes/requestRoutes.js';
import { connectDB } from './config/db.js';
import { errorHandler } from './utils/errorHandler.js';
import { initOverdueCron } from './cron/overdueChecker.js';

// Load environmental variables
dotenv.config();

// Connect DB and initialize table & seed
connectDB().then(() => {
  initOverdueCron();
});

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'https://odstfin.io',
  'https://www.odstfin.io',
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : [])
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

// Base Route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Request Approval Service API is running...',
  });
});

// Mount routes
app.use('/api/requests', requestRoutes);

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5003;

const server = app.listen(PORT, () => {
  console.log(`Request Approval Service running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

process.on('unhandledRejection', (err, promise) => {
  console.error(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});
// Trigger restart for database re-seeding 2
