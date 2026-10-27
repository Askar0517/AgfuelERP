import { test, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../src/app.ts';

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

// 1. GET /api/stations & /api/bunks
test('GET /api/stations - returns list of stations with status 200', async () => {
  const res = await fetch(`${baseUrl}/stations`, {
    headers: { 'x-user-role': 'OWNER' },
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data), 'Response should be an array of stations');
  assert.ok(data.length > 0, 'Should have at least one seed station');
  assert.ok(data[0].id, 'Station should have an id');
  assert.ok(data[0].code, 'Station should have a code');
});

test('GET /api/bunks - alias route functions identically', async () => {
  const res = await fetch(`${baseUrl}/bunks`, {
    headers: { 'x-user-role': 'OWNER' },
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data));
});

test('GET /api/stations with search and status query parameters', async () => {
  const res = await fetch(`${baseUrl}/stations?search=Central&status=ONLINE`, {
    headers: { 'x-user-role': 'OWNER' },
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data));
});

test('GET /api/stations - unauthenticated request returns 401 Unauthorized', async () => {
  const res = await fetch(`${baseUrl}/stations`);
  assert.strictEqual(res.status, 401);
  const data = await res.json();
  assert.ok(data.error?.includes('Authentication required'));
});

// 2. GET /api/stations/next-code
test('GET /api/stations/next-code - generates formatted bunk code', async () => {
  const res = await fetch(`${baseUrl}/stations/next-code`, {
    headers: { 'x-user-role': 'OWNER' },
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.ok(data.code, 'Response should contain next code');
  assert.match(data.code, /^BUNK-\d{6}$/, 'Code should follow BUNK-XXXXXX pattern');
});

// 3. GET /api/stations/:id
test('GET /api/stations/:id - returns station for existing id', async () => {
  const listRes = await fetch(`${baseUrl}/stations`, {
    headers: { 'x-user-role': 'OWNER' },
  });
  const list = await listRes.json();
  const stationId = list[0].id;

  const res = await fetch(`${baseUrl}/stations/${stationId}`, {
    headers: { 'x-user-role': 'OWNER' },
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.id, stationId);
  assert.ok(data.name);
});

test('GET /api/stations/:id - returns 404 for non-existent bunk id', async () => {
  const res = await fetch(`${baseUrl}/stations/non-existent-bunk-99999`, {
    headers: { 'x-user-role': 'OWNER' },
  });
  assert.strictEqual(res.status, 404);
  const data = await res.json();
  assert.ok(data.error);
});

// 4. POST /api/stations - Validations & RBAC
test('POST /api/stations - returns 400 when name is missing or too short', async () => {
  const res = await fetch(`${baseUrl}/stations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': 'OWNER',
    },
    body: JSON.stringify({
      name: '',
      address: '123 Highway Lane',
    }),
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.ok(data.errors, 'Should return validation errors object');
  assert.ok(data.errors.name, 'Name error should be reported');
});

test('POST /api/stations - returns 403 when user role is MANAGER (RBAC enforcement)', async () => {
  const res = await fetch(`${baseUrl}/stations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': 'MANAGER',
    },
    body: JSON.stringify({
      name: 'Unauthorized Station By Manager',
      address: '456 Test Road',
    }),
  });
  assert.strictEqual(res.status, 403);
  const data = await res.json();
  assert.ok(data.error.includes('Access Denied'));
});

test('POST /api/stations - returns 403 when user role is ATTENDANT', async () => {
  const res = await fetch(`${baseUrl}/stations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': 'ATTENDANT',
    },
    body: JSON.stringify({
      name: 'Unauthorized Station By Attendant',
      address: '789 Test Road',
    }),
  });
  assert.strictEqual(res.status, 403);
});

test('POST, PUT, DEACTIVATE, and DELETE on isolated bunk lifecycle', async () => {
  const uniqueCode = `BUNK-99${Math.floor(1000 + Math.random() * 9000)}`;
  const payload = {
    name: 'Automated Audit Test Bunk',
    code: uniqueCode,
    address: '42 Forecourt Express Highway, Bengaluru',
    cityState: 'Bengaluru, Karnataka',
    postalCode: '560001',
    phone: '+91 98888 77777',
    email: 'audit.bunk@petropulse.io',
    operatingHours: '24_HOURS',
    timezone: 'Asia/Kolkata',
    eodCloseTime: '23:59',
    status: 'ONLINE',
  };

  // Create
  const res = await fetch(`${baseUrl}/stations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': 'OWNER',
      'x-user-name': 'Test Admin',
    },
    body: JSON.stringify(payload),
  });

  assert.strictEqual(res.status, 201);
  const created = await res.json();
  assert.ok(created.id, 'Created station should have an id');
  assert.strictEqual(created.name, payload.name);
  assert.strictEqual(created.code, uniqueCode);

  // Update
  const updatePayload = {
    name: 'Automated Audit Test Bunk (Updated)',
    address: '42 Forecourt Express Highway, Bengaluru - North Wing',
  };

  const updateRes = await fetch(`${baseUrl}/stations/${created.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': 'OWNER',
      'x-user-name': 'Test Admin',
    },
    body: JSON.stringify(updatePayload),
  });

  assert.strictEqual(updateRes.status, 200);
  const updated = await updateRes.json();
  assert.strictEqual(updated.name, updatePayload.name);
  assert.strictEqual(updated.address, updatePayload.address);

  // Deactivate toggle
  const deactRes = await fetch(`${baseUrl}/stations/${created.id}/deactivate`, {
    method: 'POST',
    headers: {
      'x-user-role': 'OWNER',
      'x-user-name': 'Test Admin',
    },
  });
  assert.strictEqual(deactRes.status, 200);
  const deactData = await deactRes.json();
  assert.strictEqual(deactData.status, 'INACTIVE');

  // Reactivate toggle
  const reactRes = await fetch(`${baseUrl}/stations/${created.id}/deactivate`, {
    method: 'POST',
    headers: {
      'x-user-role': 'OWNER',
      'x-user-name': 'Test Admin',
    },
  });
  assert.strictEqual(reactRes.status, 200);
  const reactData = await reactRes.json();
  assert.strictEqual(reactData.status, 'ONLINE');

  // Delete isolated bunk (no tanks/nozzles/shifts)
  const delRes = await fetch(`${baseUrl}/stations/${created.id}`, {
    method: 'DELETE',
    headers: {
      'x-user-role': 'OWNER',
    },
  });
  assert.strictEqual(delRes.status, 200);
  const delData = await delRes.json();
  assert.strictEqual(delData.success, true);

  // Verify bunk is gone
  const verifyRes = await fetch(`${baseUrl}/stations/${created.id}`, {
    headers: { 'x-user-role': 'OWNER' },
  });
  assert.strictEqual(verifyRes.status, 404);
});

// 5. PUT /api/stations/:id - returns 404 for non-existent bunk
test('PUT /api/stations/:id - returns 404 for non-existent bunk', async () => {
  const res = await fetch(`${baseUrl}/stations/non-existent-bunk-99999`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': 'OWNER',
    },
    body: JSON.stringify({ name: 'Valid Name But Bunk Does Not Exist' }),
  });
  assert.strictEqual(res.status, 404);
});

// 6. Data Integrity: DELETE /api/stations/:id with active dependencies must be blocked
test('DELETE /api/stations/:id - blocks deletion with 400 when tanks/nozzles/shifts exist', async () => {
  const listRes = await fetch(`${baseUrl}/stations`, { headers: { 'x-user-role': 'OWNER' } });
  const list = await listRes.json();
  const seedBunk = list.find((s) => (s.tankCount || 0) > 0 || (s.nozzleCount || 0) > 0) || list[0];

  const res = await fetch(`${baseUrl}/stations/${seedBunk.id}`, {
    method: 'DELETE',
    headers: {
      'x-user-role': 'OWNER',
    },
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('Cannot permanently delete bunk'), 'Should explain active dependencies');
});

// 7. QR code resolution for bunk
test('GET /api/qr/resolve/:identifier - resolves bunk QR code or ID', async () => {
  const listRes = await fetch(`${baseUrl}/stations`, { headers: { 'x-user-role': 'OWNER' } });
  const list = await listRes.json();
  const target = list[0];

  const res = await fetch(`${baseUrl}/qr/resolve/${target.code}`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.type, 'BUNK');
  assert.strictEqual(data.stationId, target.id);
});
