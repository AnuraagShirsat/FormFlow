/**
 * Tests for Rate Limiting (Task 4)
 * Tests defenses for:
 * - Attack 7: Volumetric exhaustion & Gemini quota drain
 * - Attack 9: Brute-force guessing / automated probing
 *
 * Verifies:
 * - Gemini endpoints enforce 10 requests per minute limit per IP
 * - 11th request returns HTTP 429 Too Many Requests
 * - Retry-After header is returned
 * - Error body matches contract code: RATE_LIMIT_EXCEEDED
 * - Independent IPs maintain separate rate limit buckets
 */

const test = require('node:test');
const assert = require('node:assert');
const app = require('../server');
const { request } = require('./test-helper');

test('Rate limiting permits requests within 10/min limit', async () => {
  const ip = '192.168.1.50';

  const res = await request(app, {
    method: 'POST',
    url: '/analyze-form',
    ip: ip,
    body: {
      language: 'en',
      pageTitle: 'Test Form',
      fields: [{ id: 'field_1', label: 'Field 1', type: 'text' }]
    }
  });

  assert.strictEqual(res.status, 200);
});

test('Rate limiting on Gemini endpoint triggers 429 on 11th request with Retry-After', async () => {
  const testIp = '192.168.1.99';
  const payload = {
    language: 'en',
    pageTitle: 'Rate Limit Test',
    fields: [{ id: 'test_field', label: 'Test Field', type: 'text' }]
  };

  // Send 10 rapid requests from the same IP (exhausting the 10/min limit)
  for (let i = 0; i < 10; i++) {
    const res = await request(app, {
      method: 'POST',
      url: '/analyze-form',
      ip: testIp,
      body: payload
    });
    assert.strictEqual(res.status, 200, `Request ${i + 1} should succeed`);
  }

  // 11th request from the same IP should be rate limited
  const blockedRes = await request(app, {
    method: 'POST',
    url: '/analyze-form',
    ip: testIp,
    body: payload
  });

  assert.strictEqual(blockedRes.status, 429);
  assert.strictEqual(blockedRes.body?.error?.code, 'RATE_LIMIT_EXCEEDED');
  assert.ok(
    blockedRes.headers['retry-after'],
    'Retry-After header must be present on 429 response'
  );

  // A different IP should NOT be blocked
  const diffIpRes = await request(app, {
    method: 'POST',
    url: '/analyze-form',
    ip: '192.168.1.100',
    body: payload
  });

  assert.strictEqual(diffIpRes.status, 200, 'Different IP should succeed independently');
});
