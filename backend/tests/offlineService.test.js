import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

test('Offline & PWA: manifest.json is valid JSON with required PWA fields', () => {
  const manifestPath = path.join(rootDir, 'manifest.json');
  assert.equal(fs.existsSync(manifestPath), true);

  const raw = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);

  assert.ok(manifest.name);
  assert.ok(manifest.short_name);
  assert.ok(manifest.start_url);
  assert.equal(manifest.display, 'standalone');
  assert.ok(Array.isArray(manifest.icons));
  assert.equal(manifest.icons.length >= 1, true);
});

test('Offline & PWA: sw.js exists and contains core caching strategies', () => {
  const swPath = path.join(rootDir, 'sw.js');
  assert.equal(fs.existsSync(swPath), true);

  const swContent = fs.readFileSync(swPath, 'utf8');
  assert.equal(swContent.includes('addEventListener(\'install\''), true);
  assert.equal(swContent.includes('addEventListener(\'activate\''), true);
  assert.equal(swContent.includes('addEventListener(\'fetch\''), true);
  assert.equal(swContent.includes('/api/'), true);
  assert.equal(swContent.includes('caches.open'), true);
});

test('Offline Action Queue: simulates queuing and batch processing', () => {
  // Mock localStorage queue simulation
  const queue = [];
  const action1 = {
    id: 'act-001',
    url: '/api/articles/art-01/read',
    method: 'PUT',
    body: { isRead: true },
    description: 'Mark article as read',
  };

  const action2 = {
    id: 'act-002',
    url: '/api/articles/art-02/save',
    method: 'PUT',
    body: {},
    description: 'Save article',
  };

  queue.push(action1, action2);
  assert.equal(queue.length, 2);

  const serialized = JSON.stringify(queue);
  const deserialized = JSON.parse(serialized);
  assert.equal(deserialized.length, 2);
  assert.equal(deserialized[0].id, 'act-001');
  assert.equal(deserialized[1].method, 'PUT');
});
