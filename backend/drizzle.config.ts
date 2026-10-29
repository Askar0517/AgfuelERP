import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory or project root
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend', '.env'),
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '..', '.env'),
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}
dotenv.config();

// Support DIRECT_URL (recommended for migrations/DDL on Supabase pooler) and DATABASE_URL
const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const sqlHost = process.env.SQL_HOST || 'localhost';
const sqlPort = parseInt(process.env.SQL_PORT || '3306', 10);
const sqlDbName = process.env.SQL_DB_NAME || 'petropulse';
const user = process.env.SQL_ADMIN_USER || 'postgres';
const password = process.env.SQL_ADMIN_PASSWORD || 'postgres';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  schemaFilter: ['public'],
  dbCredentials: databaseUrl
    ? {
        url: databaseUrl,
      }
    : {
        host: sqlHost,
        port: sqlPort,
        user: user,
        password: password,
        database: sqlDbName,
        ssl: false,
      },
  verbose: true,
  strict: false,
});
