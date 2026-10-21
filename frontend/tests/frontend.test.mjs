import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('Frontend has zero direct database driver or PostgreSQL imports', () => {
  const srcDir = fs.existsSync('src') ? path.resolve('src') : path.resolve('frontend/src');
  const files = [];

  function walk(dir) {
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (full.endsWith('.ts') || full.endsWith('.tsx')) files.push(full);
    }
  }
  walk(srcDir);

  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    assert.strictEqual(
      content.includes("from 'pg'") || content.includes("from 'drizzle-orm'"),
      false,
      `Frontend file ${f} must not import backend database packages directly`
    );
  }
});

test('Frontend environment template does not leak database credentials', () => {
  const envPath = fs.existsSync('frontend/.env.example')
    ? 'frontend/.env.example'
    : (fs.existsSync('.env.example') ? '.env.example' : '../.env.example');
  const envContent = fs.readFileSync(envPath, 'utf8');
  assert.strictEqual(envContent.includes('DATABASE_URL'), false);
  assert.strictEqual(envContent.includes('JWT_SECRET'), false);
  assert.ok(envContent.includes('VITE_API_URL'));
});
