import { Request, Response, NextFunction } from 'express';
import { CONFIG } from '../config/index.ts';

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const allowedOrigins = CONFIG.CORS_ORIGIN.split(',').map((s) => s.trim());
  const origin = req.headers.origin;

  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-user-role, x-station-id, x-user-name'
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
}
