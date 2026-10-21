import { test } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import app from '../src/app.ts';
import {
  getSanitizedDbTarget,
  initDbAndSyncTables,
  getDbSyncStatus,
  SCHEMA_TABLES,
} from '../src/db/index.ts';

test('getSanitizedDbTarget masks database passwords in connection targets', () => {
  const target = getSanitizedDbTarget();
  assert.ok(target.includes('postgresql://'));
  assert.ok(target.includes('******'));
  assert.strictEqual(target.includes('Askar@12345'), false); // Raw password must not be exposed
});

test('SCHEMA_TABLES catalog defines all 15 core forecourt tables', () => {
  assert.strictEqual(SCHEMA_TABLES.length, 15);
  const tableNames = SCHEMA_TABLES.map((t) => t.tableName);
  assert.ok(tableNames.includes('stations'));
  assert.ok(tableNames.includes('fuels'));
  assert.ok(tableNames.includes('tanks'));
  assert.ok(tableNames.includes('dispensers'));
  assert.ok(tableNames.includes('nozzles'));
  assert.ok(tableNames.includes('manual_meter_readings'));
  assert.ok(tableNames.includes('employees'));
  assert.ok(tableNames.includes('shifts'));
  assert.ok(tableNames.includes('tank_loads'));
  assert.ok(tableNames.includes('eod_settlements'));
  assert.ok(tableNames.includes('role_permissions'));
  assert.ok(tableNames.includes('fuel_price_history'));
  assert.ok(tableNames.includes('audit_logs'));
  assert.ok(tableNames.includes('number_sequences'));
  assert.ok(tableNames.includes('sessions'));
});

test('initDbAndSyncTables produces authoritative DB connection & table sync report', async () => {
  const report = await initDbAndSyncTables();
  assert.ok(report);
  assert.ok(report.timestamp);
  assert.ok(report.connection);
  assert.strictEqual(typeof report.connection.connected, 'boolean');
  assert.ok(report.connection.target);
  assert.ok(report.tableSync);
  assert.strictEqual(report.tableSync.totalExpectedTables, 15);
  assert.strictEqual(report.tableSync.tables.length, 15);

  const cached = getDbSyncStatus();
  assert.strictEqual(cached?.timestamp, report.timestamp);
});

test('GET /api/health and GET /api/db/status expose live DB connection and table sync status', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = address.port;

  try {
    // 1. Check /api/health
    const healthRes = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.strictEqual(healthRes.status, 200);
    const healthJson = await healthRes.json();
    assert.strictEqual(healthJson.status, 'ok');
    assert.ok(healthJson.database);
    assert.strictEqual(typeof healthJson.database.connected, 'boolean');
    assert.ok(healthJson.database.tablesSynced);

    // 2. Check /api/db/status
    const dbStatusRes = await fetch(`http://127.0.0.1:${port}/api/db/status`);
    assert.strictEqual(dbStatusRes.status, 200);
    const dbStatusJson = await dbStatusRes.json();
    assert.ok(dbStatusJson.connection);
    assert.ok(dbStatusJson.tableSync);
    assert.strictEqual(dbStatusJson.tableSync.totalExpectedTables, 15);
  } finally {
    server.close();
  }
});
