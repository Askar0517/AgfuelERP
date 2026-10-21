import { test } from 'node:test';
import assert from 'node:assert';
import { requestLogger } from '../src/middleware/requestLogger.ts';
import { activeSessions } from '../src/middleware/auth.ts';

test('requestLogger logs request URL, response Code, and user name on finish', (t, done) => {
  const originalLog = console.log;
  let loggedMessage = '';
  console.log = (msg) => {
    loggedMessage = msg;
  };

  const listeners = {};
  const mockReq = {
    method: 'GET',
    originalUrl: '/api/tanks',
    headers: {
      'x-user-name': 'Vikramaditya Singhania',
    },
    body: {},
  };

  const mockRes = {
    statusCode: 200,
    on: (event, handler) => {
      listeners[event] = handler;
    },
  };

  requestLogger(mockReq, mockRes, () => {
    // Trigger response finish event
    mockRes.statusCode = 200;
    if (listeners['finish']) {
      listeners['finish']();
    }

    console.log = originalLog;

    assert.ok(loggedMessage.includes('URL: /api/tanks'), 'Should log request URL');
    assert.ok(loggedMessage.includes('Response Code: 200'), 'Should log response Code');
    assert.ok(loggedMessage.includes('User: Vikramaditya Singhania'), 'Should log user name');
    done();
  });
});

test('requestLogger resolves user name from active bearer token session', (t, done) => {
  const originalLog = console.log;
  let loggedMessage = '';
  console.log = (msg) => {
    loggedMessage = msg;
  };

  const token = 'test_token_123';
  activeSessions.set(token, {
    userId: 'usr-1',
    role: 'MANAGER',
    userName: 'Ramesh Patel',
    createdAt: Date.now(),
  });

  const listeners = {};
  const mockReq = {
    method: 'POST',
    originalUrl: '/api/shifts/create',
    headers: {
      authorization: `Bearer ${token}`,
    },
    body: {},
  };

  const mockRes = {
    statusCode: 201,
    on: (event, handler) => {
      listeners[event] = handler;
    },
  };

  requestLogger(mockReq, mockRes, () => {
    if (listeners['finish']) {
      listeners['finish']();
    }

    console.log = originalLog;
    activeSessions.delete(token);

    assert.ok(loggedMessage.includes('URL: /api/shifts/create'));
    assert.ok(loggedMessage.includes('Response Code: 201'));
    assert.ok(loggedMessage.includes('User: Ramesh Patel'));
    done();
  });
});

test('requestLogger defaults to Anonymous when unauthenticated', (t, done) => {
  const originalLog = console.log;
  let loggedMessage = '';
  console.log = (msg) => {
    loggedMessage = msg;
  };

  const listeners = {};
  const mockReq = {
    method: 'GET',
    originalUrl: '/api/health',
    headers: {},
    body: {},
  };

  const mockRes = {
    statusCode: 200,
    on: (event, handler) => {
      listeners[event] = handler;
    },
  };

  requestLogger(mockReq, mockRes, () => {
    if (listeners['finish']) {
      listeners['finish']();
    }

    console.log = originalLog;

    assert.ok(loggedMessage.includes('URL: /api/health'));
    assert.ok(loggedMessage.includes('Response Code: 200'));
    assert.ok(loggedMessage.includes('User: Anonymous'));
    done();
  });
});
