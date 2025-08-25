// api-gateway/src/index.ts
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from './middleware/auth';
import { logger } from './utils/logger';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Service routes
const services = {
  '/api/auth': 'http://localhost:3001',
  '/api/users': 'http://localhost:3002',
  '/api/courses': 'http://localhost:3003',
  '/api/recommendations': 'http://localhost:3004',
  '/api/progress': 'http://localhost:3005',
  '/api/social': 'http://localhost:3006',
  '/api/notifications': 'http://localhost:3007'
};

// Proxy configuration
Object.entries(services).forEach(([path, target]) => {
  app.use(path, authMiddleware.optional, createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (pathReq) => pathReq.replace(path, ''),
    onError: (err, req, res) => {
      logger.error(`Proxy error: ${err.message}`);
      res.status(502).json({ error: 'Service unavailable' });
    }
  }));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
});