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

// Vercel Serverless URL Normalization Middleware
// When Vercel rewrites incoming routes to /api/index.js?__path=..., Express receives the internal destination path.
// This middleware restores the user's original requested URL path from __path or Vercel's headers.
app.use((req, _res, next) => {
  // 1. Primary: Read __path query parameter passed by Vercel rewrite
  const pathParam = req.query.__path as string | undefined;
  if (pathParam) {
    delete req.query.__path;
    const queryIdx = req.url.indexOf('?');
    let queryString = '';
    if (queryIdx !== -1) {
      const sp = new URLSearchParams(req.url.substring(queryIdx + 1));
      sp.delete('__path');
      const qs = sp.toString();
      queryString = qs ? `?${qs}` : '';
    }
    req.url = (pathParam.startsWith('/') ? pathParam : `/${pathParam}`) + queryString;
    return next();
  }

  // 2. Secondary: Fallback to Vercel invocation headers if present
  const matchedPath = (req.headers['x-matched-path'] ||
    req.headers['x-invoke-path'] ||
    req.headers['x-forwarded-uri'] ||
    req.headers['x-now-route-matches']) as string | undefined;

  if (matchedPath && (req.url === '/api' || req.url.startsWith('/api/index'))) {
    const queryIdx = req.url.indexOf('?');
    const queryString = queryIdx !== -1 ? req.url.substring(queryIdx) : '';
    req.url = (matchedPath.startsWith('/') ? matchedPath : `/${matchedPath}`) + queryString;
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
