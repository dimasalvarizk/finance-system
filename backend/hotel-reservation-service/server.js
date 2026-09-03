import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import hotelReservationRoutes from './routes/hotelReservationRoutes.js';
import { connectDB } from './config/db.js';
import { errorHandler } from './utils/errorHandler.js';
import { initHotelOverdueCron } from './cron/overdueChecker.js';

// Load environment variables
dotenv.config();

// Connect to Database
connectDB().then(() => {
  initHotelOverdueCron();
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
    message: 'Hotel Reservation Service API is running...',
  });
});

// Mount Routes
app.use('/api/hotel-reservations', hotelReservationRoutes);

// Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5006;

const server = app.listen(PORT, () => {
  console.log(`Hotel Reservation Service running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
  // Close server & exit process
  // server.close(() => process.exit(1));
});
