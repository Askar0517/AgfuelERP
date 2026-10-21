import { test } from 'node:test';
import assert from 'node:assert';
import { SYSTEM_ROLES, APP_MODULES } from '../src/utils/rolesAndPermissions.js';

test('Authoritative roles catalog contains all 5 forecourt ERP roles', () => {
  assert.strictEqual(SYSTEM_ROLES.length, 5);
  const roleIds = SYSTEM_ROLES.map((r) => r.id);
  assert.ok(roleIds.includes('OWNER'));
  assert.ok(roleIds.includes('MANAGER'));
  assert.ok(roleIds.includes('ATTENDANT'));
  assert.ok(roleIds.includes('CASHIER'));
  assert.ok(roleIds.includes('AUDITOR'));
});

test('ERP Modules catalog defines all 10 core functional areas', () => {
  assert.strictEqual(APP_MODULES.length, 10);
  const moduleIds = APP_MODULES.map((m) => m.id);
  assert.ok(moduleIds.includes('DASHBOARD'));
  assert.ok(moduleIds.includes('BUNKS'));
  assert.ok(moduleIds.includes('TANKS'));
  assert.ok(moduleIds.includes('NOZZLES'));
  assert.ok(moduleIds.includes('METERS'));
  assert.ok(moduleIds.includes('USERS'));
  assert.ok(moduleIds.includes('PRICING'));
  assert.ok(moduleIds.includes('REPORTS'));
  assert.ok(moduleIds.includes('CONFIGURATION'));
  assert.ok(moduleIds.includes('AUDIT'));
});

test('Super Admin (OWNER) role possesses all CRUD capabilities', () => {
  const owner = SYSTEM_ROLES.find((r) => r.id === 'OWNER');
  assert.ok(owner);
  for (const mod of APP_MODULES) {
    const perm = owner.defaultPermissions[mod.id];
    assert.strictEqual(perm.canRead, true);
    assert.strictEqual(perm.canCreate, true);
    assert.strictEqual(perm.canUpdate, true);
    assert.strictEqual(perm.canDelete, true);
  }
});
