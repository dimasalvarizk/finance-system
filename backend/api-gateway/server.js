import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';

dotenv.config();

const app = express();

// Enable CORS for frontend
const allowedOrigins = [
  'http://localhost:5173',
  'https://odstfin.io',
  'https://www.odstfin.io',
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : [])
];

app.use((req, res, next) => {
  // Set Private Network Access header if requested
  if (req.headers['access-control-request-private-network']) {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }

  // Handle preflight OPTIONS requests manually to guarantee correct headers
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
      res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || '*');
      return res.status(204).end();
    }
  }
  next();
});

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Proxy definitions using pathFilter functions to preserve the paths
const authProxy = createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL || 'http://localhost:5001',
  changeOrigin: true,
  pathFilter: (path, req) => path.startsWith('/api/auth'),
  logLevel: 'debug',
});

const invoiceProxy = createProxyMiddleware({
  target: process.env.INVOICE_SERVICE_URL || 'http://localhost:5002',
  changeOrigin: true,
  pathFilter: (path, req) => path.startsWith('/api/invoices'),
  logLevel: 'debug',
});

const companyProxy = createProxyMiddleware({
  target: process.env.COMPANY_SERVICE_URL || 'http://localhost:5004',
  changeOrigin: true,
  pathFilter: (path, req) => path.startsWith('/api/companies'),
  logLevel: 'debug',
});

const requestProxy = createProxyMiddleware({
  target: process.env.REQUEST_SERVICE_URL || 'http://localhost:5003',
  changeOrigin: true,
  pathFilter: (path, req) => path.startsWith('/api/requests'),
  logLevel: 'debug',
});

const settingProxy = createProxyMiddleware({
  target: process.env.SETTING_SERVICE_URL || 'http://localhost:5005',
  changeOrigin: true,
  pathFilter: (path, req) => path.startsWith('/api/settings'),
  logLevel: 'debug',
});

// Apply proxies at the root level (no path prefix mounting in Express)
// This preserves the original path so the microservices receive the full URI (e.g., /api/invoices)
app.use(authProxy);
app.use(invoiceProxy);
app.use(companyProxy);
app.use(requestProxy);
app.use(settingProxy);

// Base route for gateway health check (only matches exactly / or paths not caught by proxies)
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Gateway is running...',
    services: {
      auth: process.env.AUTH_SERVICE_URL || 'http://localhost:5001',
      invoice: process.env.INVOICE_SERVICE_URL || 'http://localhost:5002',
      request: process.env.REQUEST_SERVICE_URL || 'http://localhost:5003',
      company: process.env.COMPANY_SERVICE_URL || 'http://localhost:5004',
      setting: process.env.SETTING_SERVICE_URL || 'http://localhost:5005'
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[API Gateway] Running on port ${PORT}`);
});
