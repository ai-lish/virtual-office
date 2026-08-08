'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { loadManifest } = require('./build-public-site');

const REPO_ROOT = path.resolve(__dirname, '..');
const LEGACY_PATHS_PATH = path.join(__dirname, 'legacy-paths.json');
const MAX_BODY_BYTES = 64 * 1024;
const EXPECTED_CONTENT_TYPES = {
  '/index.html': ['text/html'],
  '/robots.txt': ['text/plain'],
  '/status.json': ['application/json']
};
const STATUS_TOP_KEYS = ['generated_at', 'schema_version', 'services'];
const STATUS_LABELS = new Set(['public-site', 'assistant', 'dashboard']);
const STATUS_VALUES = new Set(['ok', 'degraded', 'down']);
const LOAD_VALUES = new Set(['low', 'normal', 'high']);
const SAFE_PUBLIC_RELATIVE_PATHS = new Set(['/', '/index.html', '/robots.txt', '/status.json', '/.nojekyll']);
const FORBIDDEN_PUBLIC_REFERENCES = [
  /usage-quota/i,
  /minimax-api-status/i,
  /copilot-summary/i,
  /token-log/i,
  /dashboard\.html/i,
  /(?:^|["'/(])public\//i
];
const CREDENTIAL_PATTERNS = [
  /ghp_[A-Za-z0-9_]+/i,
  /github_pat_[A-Za-z0-9_]+/i,
  /\bsk-[A-Za-z0-9_-]{8,}\b/i,
  /\bxox[baprs]-[A-Za-z0-9-]{8,}\b/i,
  /\bAKIA[0-9A-Z]{16}\b/,
  /-----BEGIN(?: [A-Z0-9]+)* PRIVATE KEY-----/,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/
];

class VerificationError extends Error {
  constructor(prefix, message, exitCode) {
    super(`${prefix}: ${message}`);
    this.exitCode = exitCode;
  }
}

function fail(message) {
  throw new VerificationError('PUBLIC_PAGES_VERIFY_FAILED', message, 1);
}

function inconclusive(message) {
  throw new VerificationError('PUBLIC_PAGES_VERIFY_INCONCLUSIVE', message, 3);
}

function assertLiteralPath(value, field, { allowDirectory = false } = {}) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.includes('..') || value.includes('?') || value.includes('#')) {
    fail(`${field} contains an unsafe path`);
  }
  if (!allowDirectory && value.endsWith('/')) {
    fail(`${field} must identify a fixed file path`);
  }
}

function loadLegacyPaths() {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(LEGACY_PATHS_PATH, 'utf8'));
  } catch (error) {
    fail(`cannot read legacy path manifest: ${error.message}`);
  }
  if (!data || data.version !== 1 || !Array.isArray(data.retiredPaths) || !Array.isArray(data.spotCheckPaths)) {
    fail('legacy path manifest schema is invalid');
  }
  for (const pathValue of data.retiredPaths) {
    assertLiteralPath(pathValue, 'retiredPaths');
  }
  for (const pathValue of data.spotCheckPaths) {
    assertLiteralPath(pathValue, 'spotCheckPaths', { allowDirectory: true });
  }
  if (new Set(data.retiredPaths).size !== data.retiredPaths.length || new Set(data.spotCheckPaths).size !== data.spotCheckPaths.length) {
    fail('legacy path manifest contains duplicate paths');
  }
  const generated = new Set(['/index.html', '/robots.txt', '/status.json', '/.nojekyll']);
  if (data.retiredPaths.some((pathValue) => generated.has(pathValue))) {
    fail('legacy path manifest conflicts with the public generated allowlist');
  }
  return data;
}

function normalizeTarget(rawTarget) {
  if (!rawTarget) {
    return null;
  }
  let target;
  try {
    target = new URL(rawTarget);
  } catch (error) {
    fail(`target URL is invalid: ${error.message}`);
  }
  const isLocalHttpTarget = target.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(target.hostname);
  if ((!['http:', 'https:'].includes(target.protocol) || (target.protocol !== 'https:' && !isLocalHttpTarget)) || target.username || target.password || target.search || target.hash) {
    fail('target URL must use HTTPS (HTTP is allowed only for localhost), without credentials, query, or fragment');
  }
  if (!target.pathname.endsWith('/')) {
    target.pathname += '/';
  }
  return target;
}

function makeTargetUrl(target, pathValue) {
  return new URL(pathValue.replace(/^\/+/, ''), target);
}

function getContentType(response) {
  return (response.headers.get('content-type') || '').split(';', 1)[0].trim().toLowerCase();
}

async function request(target, pathValue, method) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    return await fetch(makeTargetUrl(target, pathValue), {
      method,
      redirect: 'manual',
      signal: controller.signal
    });
  } catch (error) {
    fail(`${method} ${pathValue} request failed: ${error.name === 'AbortError' ? 'timeout' : error.message}`);
  } finally {
    clearTimeout(timeout);
  }
}

async function discardBody(response) {
  try {
    await response.body?.cancel();
  } catch {
    // The status and headers are already sufficient for a retired-path check.
  }
}

async function readBoundedBody(response, pathValue) {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    fail(`${pathValue} response exceeds ${MAX_BODY_BYTES} bytes`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_BODY_BYTES) {
    fail(`${pathValue} response exceeds ${MAX_BODY_BYTES} bytes`);
  }
  return buffer.toString('utf8');
}

function validateStatusPayload(status) {
  if (!status || typeof status !== 'object' || Array.isArray(status)) {
    return 'status.json must contain an object';
  }
  const topKeys = Object.keys(status).sort();
  if (JSON.stringify(topKeys) !== JSON.stringify(STATUS_TOP_KEYS)) {
    return 'status.json contains unknown or missing top-level keys';
  }
  if (status.schema_version !== '1') {
    return 'status.json schema_version is invalid';
  }
  if (typeof status.generated_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/.test(status.generated_at)) {
    return 'status.json generated_at is not rounded to an UTC hour';
  }
  if (!Array.isArray(status.services) || status.services.length > 8) {
    return 'status.json services is not a bounded array';
  }
  for (const service of status.services) {
    if (!service || typeof service !== 'object' || Array.isArray(service)) {
      return 'status.json contains an invalid service entry';
    }
    if (Object.keys(service).some((key) => !['label', 'status', 'load'].includes(key))) {
      return 'status.json service contains unknown keys';
    }
    if (!STATUS_LABELS.has(service.label) || !STATUS_VALUES.has(service.status)) {
      return 'status.json service contains a non-public label or status';
    }
    if (service.load !== undefined && !LOAD_VALUES.has(service.load)) {
      return 'status.json service contains an invalid load value';
    }
  }
  return null;
}

function validatePublicText(pathValue, text) {
  for (const pattern of [...FORBIDDEN_PUBLIC_REFERENCES, ...CREDENTIAL_PATTERNS]) {
    if (pattern.test(text)) {
      return `public response contains a forbidden reference or credential-shaped pattern`;
    }
  }
  return null;
}

async function verifyGet(target, pathValue) {
  const response = await request(target, pathValue, 'GET');
  if (response.status !== 200) {
    fail(`GET ${pathValue} returned HTTP ${response.status}; expected 200`);
  }
  const expectedTypes = EXPECTED_CONTENT_TYPES[pathValue] || [];
  const contentType = getContentType(response);
  if (expectedTypes.length > 0 && !expectedTypes.includes(contentType)) {
    fail(`GET ${pathValue} returned Content-Type ${contentType || '[missing]'}`);
  }
  const body = await readBoundedBody(response, pathValue);
  if (pathValue === '/status.json') {
    let status;
    try {
      status = JSON.parse(body);
    } catch (error) {
      fail(`GET ${pathValue} returned invalid JSON`);
    }
    const statusError = validateStatusPayload(status);
    if (statusError) {
      fail(statusError);
    }
  } else {
    const textError = validatePublicText(pathValue, body);
    if (textError) {
      fail(`GET ${pathValue} ${textError}`);
    }
  }
}

async function verifyMissing(target, pathValue) {
  const response = await request(target, pathValue, 'HEAD');
  if ([404, 410].includes(response.status)) {
    await discardBody(response);
    return;
  }
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location');
    await discardBody(response);
    if (!location) {
      inconclusive(`HEAD ${pathValue} returned ${response.status} without a Location header`);
    }
    let destination;
    try {
      destination = new URL(location, makeTargetUrl(target, pathValue));
    } catch (error) {
      fail(`HEAD ${pathValue} returned an invalid redirect location`);
    }
    if (destination.origin !== target.origin || destination.search || destination.hash) {
      fail(`HEAD ${pathValue} redirects outside the target site`);
    }
    const targetPrefix = target.pathname.endsWith('/') ? target.pathname : `${target.pathname}/`;
    if (!destination.pathname.startsWith(targetPrefix)) {
      fail(`HEAD ${pathValue} redirects outside the target path`);
    }
    const relativePath = `/${destination.pathname.slice(targetPrefix.length)}`.replace(/\/+/g, '/');
    if (!SAFE_PUBLIC_RELATIVE_PATHS.has(relativePath)) {
      fail(`HEAD ${pathValue} redirects to a non-public path`);
    }
    return;
  }
  if ([405, 501].includes(response.status)) {
    await discardBody(response);
    const fallback = await request(target, pathValue, 'GET');
    if ([404, 410].includes(fallback.status)) {
      await discardBody(fallback);
      return;
    }
    if ([405, 501].includes(fallback.status)) {
      await discardBody(fallback);
      inconclusive(`${pathValue} does not support HEAD or GET status verification`);
    }
    if (fallback.status >= 300 && fallback.status < 400) {
      const location = fallback.headers.get('location');
      await discardBody(fallback);
      if (location) {
        inconclusive(`${pathValue} requires redirect evaluation after HEAD fallback`);
      }
    }
    await discardBody(fallback);
    fail(`${pathValue} returned HTTP ${fallback.status}; expected 404 or 410`);
  }
  await discardBody(response);
  fail(`HEAD ${pathValue} returned HTTP ${response.status}; expected 404 or 410`);
}

async function verifyTarget(rawTarget) {
  const target = normalizeTarget(rawTarget);
  if (!target) {
    console.log('PUBLIC_PAGES_VERIFY_SKIPPED: provide --target or VERIFY_TARGET to enable network checks.');
    return { skipped: true };
  }
  loadManifest();
  const legacy = loadLegacyPaths();
  await verifyGet(target, '/index.html');
  await verifyGet(target, '/robots.txt');
  await verifyGet(target, '/status.json');
  for (const pathValue of [...legacy.retiredPaths, ...legacy.spotCheckPaths]) {
    await verifyMissing(target, pathValue);
  }
  console.log(`Post-deploy verification passed: 3 public files and ${legacy.retiredPaths.length + legacy.spotCheckPaths.length} retired/spot-check paths.`);
  return { skipped: false, retired: legacy.retiredPaths.length, spotChecks: legacy.spotCheckPaths.length };
}

function parseTargetArg(args) {
  if (args.length === 0) {
    return process.env.VERIFY_TARGET || null;
  }
  if (args.length === 2 && args[0] === '--target') {
    return args[1];
  }
  if (args.length === 1 && args[0] === '--help') {
    console.log('Usage: node scripts/verify-public-pages.js [--target https://host/project/]');
    return null;
  }
  fail('use no arguments, --target URL, or --help');
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === '--help') {
      console.log('Usage: node scripts/verify-public-pages.js [--target https://host/project/]');
      process.exitCode = 0;
    } else {
      verifyTarget(parseTargetArg(args)).then((result) => {
        if (result.skipped) {
          process.exitCode = 2;
        }
      }).catch((error) => {
        console.error(error.message);
        process.exitCode = error.exitCode || 1;
      });
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = error.exitCode || 1;
  }
}

module.exports = { loadLegacyPaths, normalizeTarget, validatePublicText, validateStatusPayload, verifyTarget };
