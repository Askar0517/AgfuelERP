import { test } from 'node:test';
import assert from 'node:assert';
import app from '../src/app.ts';

test('Express app initializes with all mounted routes', () => {
  assert.ok(app);
  assert.strictEqual(typeof app.listen, 'function');
});

test('App contains router stack with API routes', () => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push(middleware.route.path);
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push(handler.route.path);
        }
      });
    }
  });
  assert.ok(routes.length > 0, 'Router stack should contain API endpoints');
});
