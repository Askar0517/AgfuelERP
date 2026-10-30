import express from 'express';
import { corsMiddleware } from './middleware/cors.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import { requestResponseLogger, requestLogger } from './middleware/requestLogger.ts';
import { healthCheckHandler } from './controllers/healthController.ts';
import apiRouter from './routes/index.ts';

import path from 'path';
import fs from 'fs';
import os from 'os';

export const app = express();

// Vercel Serverless URL Normalization Middleware
// When Vercel rewrites incoming routes to /api or /api/index.js, Express receives the internal destination path.
// This middleware restores the user's original requested URL path from Vercel's x-matched-path / x-forwarded-uri headers.
app.use((req, _res, next) => {
  const matchedPath = (req.headers['x-matched-path'] ||
    req.headers['x-forwarded-uri'] ||
    req.headers['x-now-route-matches']) as string | undefined;

  if (matchedPath && (req.url === '/api' || req.url.startsWith('/api/index'))) {
    const queryIdx = req.url.indexOf('?');
    const queryString = queryIdx !== -1 ? req.url.substring(queryIdx) : '';
    req.url = matchedPath + queryString;
  } else if (req.url.startsWith('/api/index.js')) {
    const stripped = req.url.replace(/^\/api\/index\.js/, '') || '/';
    req.url = stripped;
  }
  next();
});

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

// Mount Central API Routes
app.use('/api', apiRouter);

// Centralized Error Handling
app.use(errorHandler);

export default app;
