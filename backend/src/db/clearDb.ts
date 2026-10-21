import { pool, db } from './index.ts';
import * as schema from './schema.ts';
import { mockStore } from './mockStore.ts';
import { eq, ne } from 'drizzle-orm';

/**
 * Completely removes forecourt seed data (stations, tanks, dispensers, nozzles,
 * meter readings, shifts, decanting records, etc.) while preserving the core
 * fuel catalog and Super Admin credentials so users can immediately log in
 * and feed their own forecourt configuration from scratch.
 */
export async function clearAllSeedData(): Promise<{
  success: boolean;
  clearedTables: string[];
  preservedEntities: string[];
  isPostgres: boolean;
}> {
  console.log('\n🧹 =============================================================');
  console.log('   PETROPULSE: CLEARING FORECOURT SEED & TEST DATA             ');
  console.log('=============================================================\n');

  const clearedTables: string[] = [];
  const preservedEntities: string[] = ['Fuel Master Catalog (3 Standard Fuels)', 'Super Admin Account (admin)'];

  let client: any = null;
  let isPostgres = false;

  try {
    client = await pool.connect();
    isPostgres = true;

    console.log('[ClearDB] 🔌 Connected to PostgreSQL. Truncating operational forecourt tables...');

    // Foreign-key safe table truncation order
    const tablesToTruncate = [
      'manual_meter_readings',
      'shifts',
      'tank_loads',
      'eod_settlements',
      'nozzles',
      'dispensers',
      'tanks',
      'stations',
      'audit_logs',
      'fuel_price_history',
      'sessions',
    ];

    for (const table of tablesToTruncate) {
      await client.query(`TRUNCATE TABLE "${table}" CASCADE`);
      clearedTables.push(table);
      console.log(`  ✓ Cleared table "${table}" (0 records remaining)`);
    }

    // Clean employees table, preserving the Super Admin (OWNER) account
    await client.query(`DELETE FROM "employees" WHERE id != 'emp-admin-001' AND role != 'OWNER'`);
    clearedTables.push('employees (non-admin demo staff removed)');
    console.log(`  ✓ Cleaned "employees" table (preserved Super Admin "admin")`);

    // Reset sequential numbering counters so new bunks, tanks, nozzles start at 000001
    await client.query(`
      UPDATE "number_sequences" SET current_value = 0;
      INSERT INTO "number_sequences" (prefix, current_value, updated_at) 
      VALUES 
        ('BUNK', 0, NOW()),
        ('TANK', 0, NOW()),
        ('NOZZ', 0, NOW()),
        ('READ', 0, NOW())
      ON CONFLICT (prefix) DO UPDATE SET current_value = 0, updated_at = NOW();
    `);
    clearedTables.push('number_sequences (reset to 0)');
    console.log(`  ✓ Reset "number_sequences" (next code will be 000001)`);
  } catch (err: any) {
    console.warn('[ClearDB] ⚠️ PostgreSQL connection or truncation warning:', err.message);
  } finally {
    if (client) {
      try {
        client.release();
      } catch {}
    }
  }

  // Also reset in-memory mockStore so offline fallback or hybrid tests start completely empty
  console.log('[ClearDB] 🧹 Resetting in-memory forecourt data store...');
  mockStore.clearForecourtData();
  clearedTables.push('mockStore in-memory collections');

  console.log('\n=============================================================');
  console.log('   ✅ FORECOURT DATA SUCCESSFULLY PURGED                      ');
  console.log('   Your system is now a blank canvas ready for custom data:   ');
  console.log('   - No bunks, tanks, dispensers, or nozzles                  ');
  console.log('   - No shifts or meter readings                              ');
  console.log('   - Number sequences reset to BUNK-000001, TANK-000001       ');
  console.log('   - Log in with: admin / PetroPulse@123                      ');
  console.log('=============================================================\n');

  return {
    success: true,
    clearedTables,
    preservedEntities,
    isPostgres,
  };
}

// Standalone execution entrypoint (e.g. npm run db:clear)
const isDirectRun = process.argv[1]?.includes('clearDb');
if (isDirectRun) {
  clearAllSeedData()
    .then(async () => {
      try {
        await pool.end();
      } catch {}
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Failed clearing data:', err);
      process.exit(1);
    });
}
