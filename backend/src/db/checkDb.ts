import { initDbAndSyncTables, pool } from './index.ts';

async function main() {
  console.log('\n=============================================================');
  console.log('   PETROPULSE DATABASE CONNECTION & TABLE SYNC DIAGNOSTICS   ');
  console.log('=============================================================\n');

  try {
    const report = await initDbAndSyncTables();
    console.log('\n-------------------------------------------------------------');
    console.log(`Diagnostic Complete at: ${report.timestamp}`);
    console.log(`Connection Status    : ${report.connection.connected ? 'ONLINE (PostgreSQL)' : 'OFFLINE (In-Memory Fallback)'}`);
    console.log(`Database Target      : ${report.connection.target}`);
    console.log(`Engine               : ${report.connection.engine}`);
    if (report.connection.latencyMs !== undefined) {
      console.log(`Round-Trip Latency   : ${report.connection.latencyMs}ms`);
    }
    console.log(`Table Sync Mode      : ${report.tableSync.mode}`);
    console.log(`Synchronized Tables  : ${report.tableSync.syncedTablesCount} / ${report.tableSync.totalExpectedTables}`);
    console.log('=============================================================\n');
  } catch (err: any) {
    console.error('❌ Diagnostics failed:', err.message);
  } finally {
    try {
      await pool.end();
    } catch {}
    process.exit(0);
  }
}

main();
