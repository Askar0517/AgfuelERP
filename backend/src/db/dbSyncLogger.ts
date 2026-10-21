import { pool } from './index.ts';
import * as schema from './schema.ts';
import { mockStore } from './mockStore.ts';

export interface TableSyncInfo {
  tableName: string;
  label: string;
  status: 'SYNCED' | 'MISSING' | 'READY_IN_MEMORY';
  rowCount: number;
  error?: string;
}

export interface DbSyncReport {
  timestamp: string;
  connection: {
    target: string;
    connected: boolean;
    engine: string;
    database: string;
    latencyMs?: number;
    error?: string;
    pool: {
      total: number;
      idle: number;
      waiting: number;
    };
  };
  tableSync: {
    mode: 'POSTGRESQL' | 'IN_MEMORY_FALLBACK';
    totalExpectedTables: number;
    syncedTablesCount: number;
    missingTablesCount: number;
    tables: TableSyncInfo[];
  };
}

export const SCHEMA_TABLES: Array<{
  tableName: string;
  label: string;
  mockKey: string;
}> = [
  { tableName: 'number_sequences', label: 'Atomic Number Sequences', mockKey: 'sequences' },
  { tableName: 'stations', label: 'Bunks & Forecourts', mockKey: 'stations' },
  { tableName: 'fuels', label: 'Fuel Master Catalog', mockKey: 'fuels' },
  { tableName: 'tanks', label: 'Underground Storage Tanks', mockKey: 'tanks' },
  { tableName: 'tank_loads', label: 'Decanting Receipts (Tank Loads)', mockKey: 'tankDeliveries' },
  { tableName: 'dispensers', label: 'Forecourt Dispensers', mockKey: 'dispensers' },
  { tableName: 'nozzles', label: 'Dispenser Fuel Nozzles', mockKey: 'nozzles' },
  { tableName: 'manual_meter_readings', label: 'Meter Readings & Totalizers', mockKey: 'meterReadings' },
  { tableName: 'employees', label: 'Employees & User Master', mockKey: 'users' },
  { tableName: 'shifts', label: 'Forecourt Shifts & Handover', mockKey: 'shifts' },
  { tableName: 'eod_settlements', label: 'EOD Day Settlements', mockKey: 'dayCloseRecords' },
  { tableName: 'role_permissions', label: 'Role Privilege Matrix', mockKey: 'rolePermissions' },
  { tableName: 'fuel_price_history', label: 'Fuel Price History & Audit', mockKey: 'fuelPriceHistory' },
  { tableName: 'audit_logs', label: 'Forecourt Audit Logs', mockKey: 'auditLogs' },
  { tableName: 'sessions', label: 'Active User Sessions', mockKey: 'sessions' },
];

let lastSyncReport: DbSyncReport | null = null;

/**
 * Returns sanitized database connection target string with credentials safely masked.
 */
export function getSanitizedDbTarget(): string {
  const connStr = process.env.DATABASE_URL;
  if (connStr) {
    try {
      const parsed = new URL(connStr);
      const user = parsed.username || 'postgres';
      const host = parsed.hostname || 'localhost';
      const port = parsed.port || '3306';
      const db = parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'petropulse';
      return `postgresql://${user}:******@${host}:${port}/${db}`;
    } catch {
      return connStr.replace(/:([^:@]+)@/, ':******@');
    }
  }

  const user = process.env.SQL_USER || 'postgres';
  const host = process.env.SQL_HOST || 'localhost';
  const port = process.env.SQL_PORT || '3306';
  const db = process.env.SQL_DB_NAME || 'petropulse';
  return `postgresql://${user}:******@${host}:${port}/${db}`;
}

/**
 * Tests direct connection to PostgreSQL and calculates round-trip latency.
 */
export async function testDbConnection(): Promise<{
  connected: boolean;
  latencyMs?: number;
  engine: string;
  database: string;
  error?: string;
}> {
  const sanitizedTarget = getSanitizedDbTarget();
  console.log(`[DB Connection] 🔌 Initializing PostgreSQL connection diagnostics...`);
  console.log(`[DB Connection] 🎯 Target: ${sanitizedTarget} (Pool Max: 10, Timeout: 15000ms)`);

  const startTime = Date.now();
  let client: any = null;

  try {
    client = await pool.connect();
    const result = await client.query(`
      SELECT 
        current_database() AS db_name, 
        version() AS db_version, 
        NOW() AS server_time
    `);
    const latencyMs = Date.now() - startTime;
    const dbName = result.rows[0]?.db_name || 'petropulse';
    const versionStr = result.rows[0]?.db_version || 'PostgreSQL';
    const shortVersion = versionStr.split(',')[0] || 'PostgreSQL';

    console.log(`[DB Connection] ✅ PostgreSQL connection established successfully in ${latencyMs}ms!`);
    console.log(`[DB Connection] 📦 Database: "${dbName}" | Engine: ${shortVersion}`);

    return {
      connected: true,
      latencyMs,
      database: dbName,
      engine: shortVersion,
    };
  } catch (err: any) {
    console.log("Error ion test DB connnection ",err)
    const latencyMs = Date.now() - startTime;
    console.warn(`[DB Connection] ⚠️ PostgreSQL connection failed (${latencyMs}ms): ${err.message}`);
    console.info(`[DB Connection] 🛡️ PetroPulse Resilient Architecture: Automatically operating in In-Memory / MockStore offline mode.`);

    return {
      connected: false,
      latencyMs,
      database: process.env.SQL_DB_NAME || 'petropulse',
      engine: 'In-Memory MockStore (Offline Resilient)',
      error: err.message,
    };
  } finally {
    if (client) {
      try {
        client.release();
      } catch {}
    }
  }
}

/**
 * Inspects all schema tables and verifies synchronization against PostgreSQL or In-Memory Store.
 */
export async function verifyAndLogTableSync(connectionInfo: {
  connected: boolean;
  engine: string;
  database: string;
  latencyMs?: number;
  error?: string;
}): Promise<DbSyncReport> {
  const tables: TableSyncInfo[] = [];

  if (connectionInfo.connected) {
    console.log(`[DB Table Sync] 🔄 Verifying ${SCHEMA_TABLES.length} schema tables against PostgreSQL public schema...`);

    let existingTableSet = new Set<string>();
    let client: any = null;
    try {
      client = await pool.connect();
      const res = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `);
      existingTableSet = new Set(res.rows.map((r: any) => r.table_name.toLowerCase()));

      for (const item of SCHEMA_TABLES) {
        const isPresent = existingTableSet.has(item.tableName.toLowerCase());
        let count = 0;
        let countErr: string | undefined;

        if (isPresent) {
          try {
            const countRes = await client.query(`SELECT count(*)::int AS cnt FROM "${item.tableName}"`);
            count = countRes.rows[0]?.cnt || 0;
          } catch (e: any) {
            countErr = e.message;
          }
        }

        tables.push({
          tableName: item.tableName,
          label: item.label,
          status: isPresent ? 'SYNCED' : 'MISSING',
          rowCount: count,
          error: countErr,
        });
      }
    } catch (err: any) {
      console.warn(`[DB Table Sync] ⚠️ Failed querying information_schema: ${err.message}`);
    } finally {
      if (client) {
        try {
          client.release();
        } catch {}
      }
    }

    const syncedCount = tables.filter((t) => t.status === 'SYNCED').length;
    const missingCount = tables.filter((t) => t.status === 'MISSING').length;

    console.log(`[DB Table Sync] 📊 Table Synchronization Status (${syncedCount}/${SCHEMA_TABLES.length} Synced):`);
    for (let i = 0; i < tables.length; i++) {
      const t = tables[i];
      const isLast = i === tables.length - 1;
      const prefix = isLast ? '  └── ' : '  ├── ';
      const padName = t.tableName.padEnd(24, '.');
      const statusStr = t.status === 'SYNCED' ? `[SYNCED - ${t.rowCount} rows]` : `[MISSING ⚠️]`;
      console.log(`${prefix}${padName} ${statusStr}`);
    }

    if (missingCount === 0) {
      console.log(`[DB Table Sync] ✅ All ${syncedCount} database schema tables are fully synchronized!`);
    } else {
      console.warn(`[DB Table Sync] ⚠️ Schema disparity: ${missingCount} tables missing in PostgreSQL.`);
      console.info(`[DB Table Sync] 💡 Tip: Run 'npm run migrate' to synchronize schema automatically.`);
    }

    const report: DbSyncReport = {
      timestamp: new Date().toISOString(),
      connection: {
        target: getSanitizedDbTarget(),
        connected: true,
        engine: connectionInfo.engine,
        database: connectionInfo.database,
        latencyMs: connectionInfo.latencyMs,
        pool: {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount,
        },
      },
      tableSync: {
        mode: 'POSTGRESQL',
        totalExpectedTables: SCHEMA_TABLES.length,
        syncedTablesCount: syncedCount,
        missingTablesCount: missingCount,
        tables,
      },
    };
    lastSyncReport = report;
    return report;
  }

  // Fallback: In-Memory / MockStore Synchronization
  console.log(`[DB Table Sync] 🔄 Synchronizing In-Memory Forecourt Schema Stores...`);

  for (const item of SCHEMA_TABLES) {
    let count = 0;
    try {
      const storeVal = (mockStore as any)[item.mockKey];
      if (Array.isArray(storeVal)) {
        count = storeVal.length;
      } else if (storeVal && typeof storeVal === 'object') {
        count = Object.keys(storeVal).length;
      }
    } catch {
      count = 0;
    }

    tables.push({
      tableName: item.tableName,
      label: item.label,
      status: 'READY_IN_MEMORY',
      rowCount: count,
    });
  }

  console.log(`[DB Table Sync] 📊 In-Memory Entity Store Synchronization Status (${tables.length}/${SCHEMA_TABLES.length} Synced):`);
  for (let i = 0; i < tables.length; i++) {
    const t = tables[i];
    const isLast = i === tables.length - 1;
    const prefix = isLast ? '  └── ' : '  ├── ';
    const padName = t.tableName.padEnd(24, '.');
    console.log(`${prefix}${padName} [READY - ${t.rowCount} records]`);
  }
  console.log(`[DB Table Sync] ✅ All ${tables.length} forecourt entities ready and synchronized in reactive in-memory store.`);

  const report: DbSyncReport = {
    timestamp: new Date().toISOString(),
    connection: {
      target: getSanitizedDbTarget(),
      connected: false,
      engine: connectionInfo.engine,
      database: connectionInfo.database,
      latencyMs: connectionInfo.latencyMs,
      error: connectionInfo.error,
      pool: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      },
    },
    tableSync: {
      mode: 'IN_MEMORY_FALLBACK',
      totalExpectedTables: SCHEMA_TABLES.length,
      syncedTablesCount: tables.length,
      missingTablesCount: 0,
      tables,
    },
  };
  lastSyncReport = report;
  return report;
}

/**
 * Initializes database connection check and performs full table synchronization logging.
 */
export async function initDbAndSyncTables(): Promise<DbSyncReport> {
  const connResult = await testDbConnection();
  return await verifyAndLogTableSync(connResult);
}

/**
 * Retrieves latest DB Connection and Table Synchronization diagnostic report.
 */
export function getDbSyncStatus(): DbSyncReport | null {
  return lastSyncReport;
}
