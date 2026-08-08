'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { normalizeTarget, validateStatusPayload } = require('./verify-public-pages');

test('does not require a network target', () => {
  assert.equal(normalizeTarget(undefined), null);
});

test('normalizes a safe HTTPS target without credentials', () => {
  const target = normalizeTarget('https://example.test/virtual-office');
  assert.equal(target.toString(), 'https://example.test/virtual-office/');
});

test('rejects target URLs containing credentials or query state', () => {
  assert.throws(() => normalizeTarget('https://user:password@example.test/site/'), /without credentials/);
  assert.throws(() => normalizeTarget('https://example.test/site/?token=redacted'), /without credentials/);
  assert.throws(() => normalizeTarget('http://example.test/site/'), /HTTPS/);
  assert.equal(normalizeTarget('http://localhost:8080/site/').toString(), 'http://localhost:8080/site/');
});

test('accepts only the closed public status schema', () => {
  assert.equal(validateStatusPayload({
    schema_version: '1',
    generated_at: '2026-08-09T00:00:00.000Z',
    services: [{ label: 'public-site', status: 'ok' }]
  }), null);
});

test('rejects unknown public status keys without reporting values', () => {
  assert.match(validateStatusPayload({
    schema_version: '1',
    generated_at: '2026-08-09T00:00:00.000Z',
    services: [{ label: 'public-site', status: 'ok' }],
    raw: 'must not be exposed'
  }), /unknown or missing top-level keys/);
});
