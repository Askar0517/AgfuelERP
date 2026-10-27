import { test } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import app from '../src/app.ts';
import {
  sendMail,
  sendInitialCredentials,
  sendPasswordResetMail,
  sendLowStockAlert,
  getMailLog,
  clearMailLog,
  testSmtpConnection,
  isSmtpConfigured,
} from '../src/utils/mailHelper.ts';
import { mockStore } from '../src/db/mockStore.ts';

test('isSmtpConfigured returns boolean indicating configuration state', () => {
  const result = isSmtpConfigured();
  assert.strictEqual(typeof result, 'boolean');
});

test('sendMail dispatches email and updates in-memory audit log', async () => {
  clearMailLog();
  const res = await sendMail({
    to: 'forecourt.manager@petropulse.in',
    subject: 'Daily Forecourt Checklist',
    text: 'Please review morning dip logs and totalizers.',
  });

  assert.strictEqual(res.success, true);
  assert.ok(res.recipient.includes('forecourt.manager@petropulse.in'));
  assert.strictEqual(res.subject, 'Daily Forecourt Checklist');

  const logs = getMailLog();
  assert.strictEqual(logs.length, 1);
  assert.strictEqual(logs[0].to, 'forecourt.manager@petropulse.in');
  assert.strictEqual(logs[0].cc, 'abdulaskar45@gmail.com');
  assert.strictEqual(logs[0].subject, 'Daily Forecourt Checklist');
  assert.strictEqual(logs[0].status, 'SENT');
});

test('sendInitialCredentials dispatches formatted onboarding email with credentials', async () => {
  clearMailLog();
  const testUser = {
    name: 'Vikram Singh',
    email: 'vikram.singh@petropulse.in',
    username: 'vikram.singh',
    role: 'ATTENDANT',
    stationName: 'Metro Central Forecourt',
  };
  const tempPassword = 'TempPassword#2026';

  const res = await sendInitialCredentials({
    user: testUser,
    temporaryPassword: tempPassword,
    loginUrl: 'http://localhost:3000/login',
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.recipient, testUser.email);
  assert.ok(res.subject.includes('Credentials'));

  const logs = getMailLog();
  assert.strictEqual(logs.length, 1);
  const sentMail = logs[0];
  assert.ok(sentMail.text?.includes(testUser.name));
  assert.ok(sentMail.text?.includes(testUser.username));
  assert.ok(sentMail.text?.includes(testUser.role));
  assert.ok(sentMail.text?.includes(tempPassword));
  assert.ok(sentMail.html?.includes(testUser.name));
  assert.ok(sentMail.html?.includes(tempPassword));
  assert.ok(sentMail.html?.includes('Metro Central Forecourt'));
});

test('sendPasswordResetMail dispatches secure reset token email', async () => {
  clearMailLog();
  const testUser = {
    name: 'Ananya Roy',
    email: 'ananya.roy@petropulse.in',
  };
  const token = 'rst-tok-998877';

  const res = await sendPasswordResetMail({
    user: testUser,
    resetToken: token,
  });

  assert.strictEqual(res.success, true);
  const logs = getMailLog();
  assert.ok(logs[0].text?.includes(token));
  assert.ok(logs[0].html?.includes(token));
});

test('sendLowStockAlert dispatches urgent tank inventory notification', async () => {
  clearMailLog();
  const res = await sendLowStockAlert({
    managerEmail: 'station.manager@petropulse.in',
    stationName: 'Highway Plaza Express',
    tankName: 'Tank 2 (Diesel)',
    fuelName: 'Diesel',
    currentStockLiters: 2500,
    safeCapacityLiters: 28500,
    lowThresholdLiters: 5000,
  });

  assert.strictEqual(res.success, true);
  const logs = getMailLog();
  assert.ok(logs[0].subject.includes('Low Fuel Stock Alert'));
  assert.ok(logs[0].text?.includes('Tank 2 (Diesel)'));
  assert.ok(logs[0].text?.includes('2,500'));
});

test('POST /api/users/:id/send-credentials triggers credential email dispatch', async () => {
  clearMailLog();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    // Pick an existing demo user
    const users = mockStore.getUsers();
    const targetUser = users.find((u) => u.email) || users[0];

    const res = await fetch(`http://127.0.0.1:${port}/api/users/${targetUser.id}/send-credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'OWNER',
        'x-user-name': 'Test Admin',
      },
      body: JSON.stringify({
        password: 'CustomTempPass#123',
      }),
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.temporaryPassword, 'CustomTempPass#123');

    const logs = getMailLog();
    assert.ok(logs.some((l) => l.to === targetUser.email && l.text?.includes('CustomTempPass#123')));
  } finally {
    server.close();
  }
});

test('GET /api/mail/status returns mail subsystem connection status', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/mail/status`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(typeof json.configured, 'boolean');
    assert.strictEqual(typeof json.connected, 'boolean');
  } finally {
    server.close();
  }
});
