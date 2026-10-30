import express from 'express';
import { corsMiddleware } from './middleware/cors.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import { requestResponseLogger, requestLogger } from './middleware/requestLogger.ts';
import { healthCheckHandler } from './controllers/healthController.ts';
import apiRouter from './routes/index.ts';

import path from 'path';
import fs from 'fs';

export const app = express();

const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded media statically from local disk
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
app.get('/health/dashboard', healthCheckHandler);
app.get('/status', healthCheckHandler);

// Mount Central API Routes
app.use('/api', apiRouter);

// Centralized Error Handling
app.use(errorHandler);

export default app;
