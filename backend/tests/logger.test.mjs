import { test } from 'node:test';
import assert from 'node:assert';
import { requestLogger, requestResponseLogger } from '../src/middleware/requestLogger.ts';
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

test('requestResponseLogger captures API response payload and user name', (t, done) => {
  const originalLog = console.log;
  let loggedMessage = '';
  console.log = (msg) => {
    loggedMessage = msg;
  };

  const listeners = {};
  const mockReq = {
    method: 'GET',
    originalUrl: '/api/fuels',
    headers: {
      'x-user-name': 'Priya Sharma',
    },
    body: {},
  };

  const mockRes = {
    statusCode: 200,
    on: (event, handler) => {
      listeners[event] = handler;
    },
    json(payload) {
      return payload;
    },
    send(payload) {
      return payload;
    },
  };

  requestResponseLogger(mockReq, mockRes, () => {
    mockRes.json({ success: true, fuels: ['PETROL', 'DIESEL'] });

    if (listeners['finish']) {
      listeners['finish']();
    }

    console.log = originalLog;

    assert.ok(loggedMessage.includes('URL: /api/fuels'), 'Should log URL');
    assert.ok(loggedMessage.includes('Response Code: 200'), 'Should log response code');
    assert.ok(loggedMessage.includes('User: Priya Sharma'), 'Should log user name');
    assert.ok(loggedMessage.includes('"success":true'), 'Should log API response payload');
    assert.ok(loggedMessage.includes('PETROL'), 'Should log response fuel items');
    done();
  });
});

test('requestResponseLogger masks sensitive fields in API response payload', (t, done) => {
  const originalLog = console.log;
  let loggedMessage = '';
  console.log = (msg) => {
    loggedMessage = msg;
  };

  const listeners = {};
  const mockReq = {
    method: 'POST',
    originalUrl: '/api/auth/login',
    headers: {
      'x-user-name': 'AuthService',
    },
    body: {},
  };

  const mockRes = {
    statusCode: 200,
    on: (event, handler) => {
      listeners[event] = handler;
    },
    json(payload) {
      return payload;
    },
  };

  requestResponseLogger(mockReq, mockRes, () => {
    mockRes.json({
      status: 'ok',
      user: {
        username: 'admin',
        password_hash: '$2b$10$supersecret',
        token: 'secret_session_token_xyz',
      },
    });

    if (listeners['finish']) {
      listeners['finish']();
    }

    console.log = originalLog;

    assert.ok(loggedMessage.includes('User: AuthService'), 'Should log user name');
    assert.ok(loggedMessage.includes('"password_hash":"******"'), 'Should mask password_hash');
    assert.ok(loggedMessage.includes('"token":"******"'), 'Should mask token');
    assert.ok(!loggedMessage.includes('$2b$10$supersecret'), 'Should not log raw secret');
    done();
  });
});
