import { test, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../src/app.ts';
import { dbService } from '../src/db/service.ts';
import { mockStore } from '../src/db/mockStore.ts';

let server;
let baseUrl = '';

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}/api`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('GET /api/fuels - returns default/global fuel product rates', async () => {
  const res = await fetch(`${baseUrl}/fuels`, {
    headers: { 'x-user-role': 'OWNER' },
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data));
  assert.ok(data.length >= 3);

  const octane95 = data.find((f) => f.code === 'OCTANE_95');
  assert.ok(octane95);
  assert.ok(octane95.ratePerLiter > 0);
  assert.strictEqual(octane95.isStationCustom, false);
});

test('POST /api/fuels/:code/rate with stationId - updates rate specifically for that station', async () => {
  const targetStationId = 'BUNK-000001';
  const newRate = 125.75;

  const updateRes = await fetch(`${baseUrl}/fuels/OCTANE_95/rate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': 'OWNER',
    },
    body: JSON.stringify({
      rate: newRate,
      stationId: targetStationId,
      remarks: 'Special municipal zone surcharge',
    }),
  });
  assert.strictEqual(updateRes.status, 200);

  // Verify that BUNK-000001 returns the new custom rate
  const stationFuelsRes = await fetch(`${baseUrl}/fuels?stationId=${targetStationId}`, {
    headers: { 'x-user-role': 'OWNER' },
  });
  assert.strictEqual(stationFuelsRes.status, 200);
  const stationFuels = await stationFuelsRes.json();
  const stationOctane95 = stationFuels.find((f) => f.code === 'OCTANE_95');
  assert.ok(stationOctane95);
  assert.strictEqual(stationOctane95.ratePerLiter, newRate);
  assert.strictEqual(stationOctane95.isStationCustom, true);

  // Verify that another station (e.g. BUNK-000002) still inherits the base rate, NOT 125.75
  const otherStationFuelsRes = await fetch(`${baseUrl}/fuels?stationId=BUNK-000002`, {
    headers: { 'x-user-role': 'OWNER' },
  });
  assert.strictEqual(otherStationFuelsRes.status, 200);
  const otherFuels = await otherStationFuelsRes.json();
  const otherOctane95 = otherFuels.find((f) => f.code === 'OCTANE_95');
  assert.ok(otherOctane95);
  assert.notStrictEqual(otherOctane95.ratePerLiter, newRate);
  assert.strictEqual(otherOctane95.isStationCustom, false);
});

test('POST /api/fuels/:code/reset - reverts station custom override back to global base rate', async () => {
  const targetStationId = 'BUNK-000001';

  const resetRes = await fetch(`${baseUrl}/fuels/OCTANE_95/reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': 'OWNER',
    },
    body: JSON.stringify({
      stationId: targetStationId,
    }),
  });
  assert.strictEqual(resetRes.status, 200);

  // Verify that BUNK-000001 is back to inheriting global base rate
  const stationFuelsRes = await fetch(`${baseUrl}/fuels?stationId=${targetStationId}`, {
    headers: { 'x-user-role': 'OWNER' },
  });
  assert.strictEqual(stationFuelsRes.status, 200);
  const stationFuels = await stationFuelsRes.json();
  const stationOctane95 = stationFuels.find((f) => f.code === 'OCTANE_95');
  assert.ok(stationOctane95);
  assert.strictEqual(stationOctane95.isStationCustom, false);
});
