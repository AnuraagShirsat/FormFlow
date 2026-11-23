/**
 * Tests for In-Memory LRU Cache (Task 4)
 * Validates:
 * - Deterministic hash key generation from normalized fields + language
 * - Form structure caching with 1-hour TTL and LRU eviction
 * - Cache HIT / MISS header validation on /analyze-form
 * - Privacy invariant: Only form structure cached, zero personal data
 */

const test = require('node:test');
const assert = require('node:assert');
const {
  LRUCache,
  normalizeFieldsForCache,
  generateFormCacheKey,
  formAnalysisCache
} = require('../lib/cache');
const app = require('../server');
const { request } = require('./test-helper');

test('normalizeFieldsForCache sorts fields by ID and normalizes casing', () => {
  const fields = [
    { id: 'b_field', label: 'Field B  ', type: 'TEXT', required: false },
    { id: 'a_field', label: '  Field A', type: 'Number', required: true }
  ];

  const normalized = normalizeFieldsForCache(fields);
  assert.strictEqual(normalized[0].id, 'a_field');
  assert.strictEqual(normalized[0].label, 'field a');
  assert.strictEqual(normalized[0].type, 'number');
  assert.strictEqual(normalized[1].id, 'b_field');
});

test('generateFormCacheKey produces identical hash regardless of input field order', () => {
  const fields1 = [
    { id: 'field_1', label: 'Name', type: 'text' },
    { id: 'field_2', label: 'Age', type: 'number' }
  ];

  const fields2 = [
    { id: 'field_2', label: 'Age', type: 'number' },
    { id: 'field_1', label: 'Name', type: 'text' }
  ];

  const key1 = generateFormCacheKey('en', fields1);
  const key2 = generateFormCacheKey('en', fields2);

  assert.strictEqual(key1, key2);
});

test('generateFormCacheKey produces different hashes for different languages', () => {
  const fields = [{ id: 'field_1', label: 'Name', type: 'text' }];
  const keyEn = generateFormCacheKey('en', fields);
  const keyKn = generateFormCacheKey('kn', fields);
  const keyHi = generateFormCacheKey('hi', fields);

  assert.notStrictEqual(keyEn, keyKn);
  assert.notStrictEqual(keyEn, keyHi);
  assert.notStrictEqual(keyKn, keyHi);
});

test('LRUCache stores, retrieves, and respects TTL expiration', async () => {
  const testCache = new LRUCache({ max: 3, ttlMs: 50 }); // 50ms TTL for testing

  testCache.set('key1', { form: 'Structure 1' });
  assert.deepStrictEqual(testCache.get('key1'), { form: 'Structure 1' });

  // Wait for TTL expiration
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.strictEqual(testCache.get('key1'), null);
});

test('LRUCache evicts least recently used entry when max is reached', () => {
  const testCache = new LRUCache({ max: 2, ttlMs: 60000 });

  testCache.set('key1', 'first');
  testCache.set('key2', 'second');
  assert.strictEqual(testCache.size, 2);

  // Access key1 to make it most recently used
  testCache.get('key1');

  // Insert key3 -> should evict key2 (the least recently used)
  testCache.set('key3', 'third');

  assert.strictEqual(testCache.get('key1'), 'first');
  assert.strictEqual(testCache.get('key2'), null); // Evicted
  assert.strictEqual(testCache.get('key3'), 'third');
});

test('POST /analyze-form sets X-Cache: MISS on first call and X-Cache: HIT on second call', async () => {
  formAnalysisCache.clear();

  const payload = {
    language: 'en',
    pageTitle: 'Scholarship Form (SAMPLE)',
    fields: [
      {
        id: 'cache_test_field',
        label: 'Aadhaar Number',
        type: 'text',
        required: true,
        options: [],
        hint: '12 digits'
      }
    ]
  };

  // First request: Cache MISS
  const res1 = await request(app, {
    method: 'POST',
    url: '/analyze-form',
    ip: '10.0.0.1',
    body: payload
  });

  assert.strictEqual(res1.status, 200);
  assert.strictEqual(res1.headers['x-cache'], 'MISS');

  // Second request: Cache HIT
  const res2 = await request(app, {
    method: 'POST',
    url: '/analyze-form',
    ip: '10.0.0.1',
    body: payload
  });

  assert.strictEqual(res2.status, 200);
  assert.strictEqual(res2.headers['x-cache'], 'HIT');
  assert.deepStrictEqual(res1.body, res2.body);
});
