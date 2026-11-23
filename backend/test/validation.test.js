/**
 * Tests for Server Security & Request Validation (Tasks 2 & 3)
 * Tests attacks:
 * - Attack 1: Unknown routes return 404
 * - Attack 5: Types, lengths, array limits, enum constraints, payload size limit (200kb)
 * - Attack 8: Strip unknown fields, reject unauthorized origin with 403
 * - Health check: Returns { ok: true } only
 */

const test = require('node:test');
const assert = require('node:assert');
const app = require('../server');
const config = require('../lib/config');
const { request } = require('./test-helper');

test('GET /health returns { ok: true } only', async () => {
  const res = await request(app, { method: 'GET', url: '/health' });
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, { ok: true });
});

test('Attack 1: Unknown route returns 404 with contract error code', async () => {
  const res = await request(app, { method: 'GET', url: '/admin/debug' });
  assert.strictEqual(res.status, 404);
  assert.strictEqual(res.body?.error?.code, 'not_found');
});

test('Attack 8: Unauthorized Origin header returns 403 when origin check applies', async () => {
  if (config.allowedOrigin) {
    const res = await request(app, {
      method: 'POST',
      url: '/analyze-form',
      headers: {
        Origin: 'https://malicious-website.com'
      },
      body: {
        language: 'en',
        pageTitle: 'Test Page',
        fields: [{ id: 'name', label: 'Name', type: 'text' }]
      }
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body?.error?.code, 'forbidden_origin');
  }
});

test('POST /analyze-form accepts valid contract payload', async () => {
  const res = await request(app, {
    method: 'POST',
    url: '/analyze-form',
    headers: {
      Origin: config.allowedOrigin || undefined
    },
    body: {
      language: 'en',
      pageTitle: 'Scholarship Form (SAMPLE)',
      fields: [
        {
          id: 'applicant_full_name',
          label: 'Full Name',
          type: 'text',
          required: true,
          options: [],
          hint: 'Enter your name'
        }
      ]
    }
  });

  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body.fields));
  assert.ok(Array.isArray(res.body.requiredDocuments));
  assert.strictEqual(res.body.fields[0].id, 'applicant_full_name');
});

test('Attack 8: Extra / unknown fields are strictly stripped', async () => {
  const res = await request(app, {
    method: 'POST',
    url: '/analyze-form',
    headers: {
      Origin: config.allowedOrigin || undefined
    },
    body: {
      language: 'kn',
      pageTitle: 'Test Portal',
      injectedRootKey: 'malicious_content',
      fields: [
        {
          id: 'aadhaar_number',
          label: 'Aadhaar Number',
          type: 'text',
          injectedFieldProperty: 'should_be_stripped'
        }
      ]
    }
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.fields[0].id, 'aadhaar_number');
  assert.strictEqual(res.body.injectedRootKey, undefined);
  assert.strictEqual(res.body.fields[0].injectedFieldProperty, undefined);
});

test('Attack 5: Invalid language enum returns 400', async () => {
  const res = await request(app, {
    method: 'POST',
    url: '/analyze-form',
    headers: {
      Origin: config.allowedOrigin || undefined
    },
    body: {
      language: 'fr', // Not en | kn | hi
      pageTitle: 'Test Form',
      fields: [{ id: 'name', label: 'Name', type: 'text' }]
    }
  });

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body?.error?.code, 'bad_request');
});

test('Attack 5: Invalid field type enum returns 400', async () => {
  const res = await request(app, {
    method: 'POST',
    url: '/analyze-form',
    headers: {
      Origin: config.allowedOrigin || undefined
    },
    body: {
      language: 'en',
      pageTitle: 'Test Form',
      fields: [{ id: 'name', label: 'Name', type: 'invalid_type_enum' }]
    }
  });

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body?.error?.code, 'bad_request');
});

test('Attack 5: Exceeding 100 fields array cap returns 400', async () => {
  const fields = [];
  for (let i = 0; i < 101; i++) {
    fields.push({
      id: `field_${i}`,
      label: `Field ${i}`,
      type: 'text'
    });
  }

  const res = await request(app, {
    method: 'POST',
    url: '/analyze-form',
    headers: {
      Origin: config.allowedOrigin || undefined
    },
    body: {
      language: 'en',
      pageTitle: 'Oversized Form',
      fields: fields
    }
  });

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body?.error?.code, 'bad_request');
});

test('Attack 5: Non-object or empty request body returns 400', async () => {
  const res = await request(app, {
    method: 'POST',
    url: '/analyze-form',
    headers: {
      Origin: config.allowedOrigin || undefined
    },
    body: ''
  });

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body?.error?.code, 'bad_request');
});

test('Attack 5: Oversize body (>200kb limit) returns 400 bad_request', async () => {
  // Generate a large payload > 200kb
  const largeLabel = 'A'.repeat(250 * 1024); // 250kb string
  const res = await request(app, {
    method: 'POST',
    url: '/analyze-form',
    headers: {
      Origin: config.allowedOrigin || undefined
    },
    body: {
      language: 'en',
      pageTitle: 'Large Payload',
      fields: [
        {
          id: 'field_1',
          label: largeLabel,
          type: 'text'
        }
      ]
    }
  });

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body?.error?.code, 'bad_request');
  assert.ok(res.body?.error?.message?.includes('200kb'));
});
