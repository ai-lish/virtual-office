'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { runGuard } = require('./guard-public-site');

const REPO_ROOT = path.resolve(__dirname, '..');

function createValidSite() {
  const tempRoot = fs.mkdtempSync(path.join(REPO_ROOT, '.guard-test-'));
  const isolatedSite = path.join(tempRoot, 'site');
  fs.mkdirSync(isolatedSite, { recursive: true });
  fs.writeFileSync(path.join(isolatedSite, '.nojekyll'), '');
  fs.writeFileSync(path.join(isolatedSite, 'index.html'), '<!doctype html><title>safe</title>\n');
  fs.writeFileSync(path.join(isolatedSite, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  fs.writeFileSync(path.join(isolatedSite, 'status.json'), `${JSON.stringify({
    schema_version: '1',
    generated_at: '2026-08-09T00:00:00.000Z',
    services: [{ label: 'public-site', status: 'ok' }]
  })}\n`);
  return { tempRoot, isolatedSite };
}

function withGuardSite(callback) {
  const fixture = createValidSite();
  try {
    return callback(fixture.isolatedSite);
  } finally {
    fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
  }
}

test('accepts the exact safe output shape', () => {
  withGuardSite((siteDir) => {
    assert.doesNotThrow(() => runGuard({ siteDir }));
  });
});

test('rejects a non-manifest file', () => {
  withGuardSite((siteDir) => {
    fs.writeFileSync(path.join(siteDir, 'unexpected.txt'), 'not allowlisted\n');
    assert.throws(() => runGuard({ siteDir }), /output does not match allowlist/);
  });
});

test('rejects credential-shaped text', () => {
  withGuardSite((siteDir) => {
    const fakePrefix = ['gh', 'p_'].join('');
    fs.writeFileSync(path.join(siteDir, 'index.html'), `<p>${fakePrefix}FAKE_TEST_ONLY</p>\n`);
    assert.throws(() => runGuard({ siteDir }), /credential-like content detected/);
  });
});

test('rejects symlinks in the output tree', () => {
  withGuardSite((siteDir) => {
    const outside = path.join(path.dirname(siteDir), 'outside.txt');
    fs.writeFileSync(outside, 'outside\n');
    fs.symlinkSync(outside, path.join(siteDir, 'linked.txt'));
    assert.throws(() => runGuard({ siteDir }), /symbolic link is forbidden/);
    fs.unlinkSync(outside);
  });
});

test('rejects unknown sanitized-status keys', () => {
  withGuardSite((siteDir) => {
    fs.writeFileSync(path.join(siteDir, 'status.json'), `${JSON.stringify({
      schema_version: '1',
      generated_at: '2026-08-09T00:00:00.000Z',
      services: [{ label: 'public-site', status: 'ok' }],
      raw: 'must not be published'
    })}\n`);
    assert.throws(() => runGuard({ siteDir }), /unknown or missing top-level keys/);
  });
});
