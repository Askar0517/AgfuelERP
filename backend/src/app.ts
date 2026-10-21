import express from 'express';
import { corsMiddleware } from './middleware/cors.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import { requestLogger } from './middleware/requestLogger.ts';
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

// Request Logging Middleware (logs URL, Response Code, and User Name)
app.use(requestLogger);

// Mount Central API Routes
app.use('/api', apiRouter);

// Centralized Error Handling
app.use(errorHandler);

export default app;
