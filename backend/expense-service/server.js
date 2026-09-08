import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import expenseRoutes from './routes/expenseRoutes.js';
import { connectDB } from './config/db.js';
import { errorHandler } from './utils/errorHandler.js';

// Load environment variables
dotenv.config();

// Connect to Database and auto-initialize tables
connectDB().catch((err) => {
  console.error('Failed to initialize database for expense-service:', err);
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health Check / Base Route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Expense Service API (Corporate Expenses & Reimbursements) is running...',
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'expense-service',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/expenses', expenseRoutes);

// Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5007;

const server = app.listen(PORT, () => {
  console.log(`Expense Service running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

process.on('unhandledRejection', (err) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});

export default app;
