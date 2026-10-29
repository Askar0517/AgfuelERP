import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory or project root
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend', '.env'),
  path.resolve(__dirname, '..', '..', '.env'),
  path.resolve(__dirname, '..', '..', 'backend', '.env'),
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}
dotenv.config();

export const CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/petropulse',
  DIRECT_URL: process.env.DIRECT_URL,
  CORS_ORIGIN: process.env.CORS_ORIGIN || process.env.CORS_ALLOWED_ORIGINS || '*',
  JWT_SECRET: process.env.JWT_SECRET || 'petropulse_default_dev_secret_change_in_prod',
  SESSION_EXPIRY_HOURS: parseInt(process.env.SESSION_EXPIRY_HOURS || '24', 10),
  DEFAULT_TIMEZONE: process.env.DEFAULT_TIMEZONE || 'Asia/Kolkata',
  EOD_CLOSE_TIME: process.env.EOD_CLOSE_TIME || '23:59:00',
};

export { db, pool } from '../db/index.ts';
