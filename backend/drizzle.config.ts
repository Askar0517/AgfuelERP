import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

// Support both DATABASE_URL and separate environment variables
const databaseUrl = process.env.DATABASE_URL;
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
  strict: true,
});
