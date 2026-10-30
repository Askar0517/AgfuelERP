import express from 'express';
import { corsMiddleware } from './middleware/cors.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import { requestResponseLogger, requestLogger } from './middleware/requestLogger.ts';
import { healthCheckHandler } from './controllers/healthController.ts';
import authRoutes from './routes/authRoutes.ts';
import apiRouter from './routes/index.ts';

import path from 'path';
import fs from 'fs';
import os from 'os';

export const app = express();

// Safe uploads directory initialization (handles read-only filesystems in serverless like Vercel)
const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const uploadsDir = isServerless
  ? path.join(os.tmpdir(), 'uploads')
  : path.resolve(process.cwd(), 'uploads');

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err: any) {
  console.warn('[Uploads Directory Init Warning]:', err.message);
}

// Serve uploaded media statically
app.use('/uploads', express.static(uploadsDir));

// Body Parser Middleware with expanded limits for high-resolution photo uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// CORS Middleware
app.use(corsMiddleware);

// Request & Response Logging Middleware (logs Method, URL, Response Code, User Name, and API Response Body)
app.use(requestResponseLogger);

// Mount Root-level Health Check & Visual Dashboard
app.get('/', healthCheckHandler);
app.get('/health', healthCheckHandler);
app.get('/health/dashboard', healthCheckHandler);
app.get('/status', healthCheckHandler);
app.get('/api', healthCheckHandler);
app.get('/api/', healthCheckHandler);

// Mount Auth routes directly at /auth as well as /api/auth for maximum client compatibility
app.use('/auth', authRoutes);

// Mount Central API Routes
app.use('/api', apiRouter);

// Defensive fallback: handle double /api prefixes from misconfigured frontend VITE_API_URL
app.use('/api/api', apiRouter);

// Centralized Error Handling
app.use(errorHandler);

export default app;
