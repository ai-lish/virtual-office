'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULT_MANIFEST_PATH = path.join(__dirname, 'publish-manifest.json');

const TEXT_SECRET_PATTERNS = [
  /ghp_[A-Za-z0-9_]+/i,
  /github_pat_[A-Za-z0-9_]+/i,
  /\bsk-[A-Za-z0-9_-]{8,}\b/i,
  /\bxox[baprs]-[A-Za-z0-9-]{8,}\b/i,
  /\bAKIA[0-9A-Z]{16}\b/,
  /-----BEGIN(?: [A-Z0-9]+)* PRIVATE KEY-----/,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/
];

const FORBIDDEN_NAME_PATTERN = /(?:^|\/)(?:\.env(?:\..*)?|.*\.map|.*(?:token|secret|credential|api[-_]?key|quota|usage|log).*|.*(?:\.bak|~))$/i;
const IMAGE_EXTENSIONS = new Set(['.gif', '.jpeg', '.jpg', '.png', '.webp']);
const PUBLIC_STATUS_LABELS = new Set(['public-site', 'assistant', 'dashboard']);
const PUBLIC_STATUS_VALUES = new Set(['ok', 'degraded', 'down']);
const PUBLIC_LOAD_VALUES = new Set(['low', 'normal', 'high']);

function fail(message) {
  throw new Error(`PUBLIC_SITE_GUARD_FAILED: ${message}`);
}

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function assertLiteralRelativePath(value, field) {
  if (typeof value !== 'string' || value.length === 0) {
    fail(`${field} must contain non-empty strings`);
  }
  if (path.isAbsolute(value) || value.includes('..') || /[*?[\]{}!]/.test(value)) {
    fail(`${field} contains a non-literal or unsafe path`);
  }
  if (value.split('/').some((part) => part === '' || part === '.')) {
    fail(`${field} contains a non-canonical path`);
  }
}

function loadManifest(manifestPath = DEFAULT_MANIFEST_PATH) {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    fail(`cannot read manifest: ${error.message}`);
  }
  if (!manifest || manifest.version !== 1 || manifest.publicRoot !== 'site') {
    fail('manifest version or publicRoot is invalid');
  }
  for (const field of ['sourceFiles', 'generatedFiles']) {
    if (!Array.isArray(manifest[field])) {
      fail(`manifest.${field} must be an array`);
    }
    for (const file of manifest[field]) {
      assertLiteralRelativePath(file, `manifest.${field}`);
    }
    if (new Set(manifest[field]).size !== manifest[field].length) {
      fail(`manifest.${field} contains duplicate paths`);
    }
  }
  const expectedGenerated = ['.nojekyll', 'index.html', 'robots.txt', 'status.json'];
  if (JSON.stringify([...manifest.generatedFiles].sort()) !== JSON.stringify([...expectedGenerated].sort())) {
    fail('manifest.generatedFiles is not the approved literal list');
  }
  if (manifest.sourceFiles.length !== 0) {
    fail('manifest.sourceFiles must be empty for the conservative first-round build');
  }
  return manifest;
}

function walkFiles(root, current = root, result = []) {
  const entries = fs.readdirSync(current, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(current, entry.name);
    const relative = path.relative(root, fullPath).split(path.sep).join('/');
    const stat = fs.lstatSync(fullPath);
    if (stat.isSymbolicLink()) {
      fail(`symbolic link is forbidden: ${relative}`);
    }
    if (stat.isDirectory()) {
      walkFiles(root, fullPath, result);
    } else if (stat.isFile()) {
      result.push({ relative, fullPath, stat });
    } else {
      fail(`unsupported filesystem entry: ${relative}`);
    }
  }
  return result;
}

function assertManifestSourceBoundaries(manifest) {
  for (const relativeSource of manifest.sourceFiles) {
    const sourcePath = path.resolve(REPO_ROOT, relativeSource);
    if (!isInside(REPO_ROOT, sourcePath)) {
      fail(`manifest source escapes repository root: ${relativeSource}`);
    }
    const sourceParts = path.relative(REPO_ROOT, sourcePath).split(path.sep);
    let current = REPO_ROOT;
    for (const part of sourceParts.slice(0, -1)) {
      current = path.join(current, part);
      if (current !== REPO_ROOT && fs.existsSync(path.join(current, '.git'))) {
        fail(`manifest source is inside a nested git repository: ${relativeSource}`);
      }
    }
    const stat = fs.lstatSync(sourcePath);
    if (stat.isSymbolicLink()) {
      fail(`manifest source is a symbolic link: ${relativeSource}`);
    }
    if (!stat.isFile()) {
      fail(`manifest source is not a regular file: ${relativeSource}`);
    }
    const resolved = fs.realpathSync(sourcePath);
    if (!isInside(REPO_ROOT, resolved)) {
      fail(`manifest source realpath escapes repository root: ${relativeSource}`);
    }
  }
}

function validateStatusFile(filePath) {
  let status;
  try {
    status = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`status.json is not valid JSON: ${error.message}`);
  }
  const topKeys = Object.keys(status).sort();
  if (JSON.stringify(topKeys) !== JSON.stringify(['generated_at', 'schema_version', 'services'])) {
    fail('status.json contains unknown or missing top-level keys');
  }
  if (status.schema_version !== '1') {
    fail('status.json schema_version is invalid');
  }
  if (typeof status.generated_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/.test(status.generated_at)) {
    fail('status.json generated_at must be rounded to an UTC hour');
  }
  if (!Array.isArray(status.services) || status.services.length > 8) {
    fail('status.json services must be a bounded array');
  }
  for (const service of status.services) {
    if (!service || typeof service !== 'object') {
      fail('status.json contains an invalid service entry');
    }
    const serviceKeys = Object.keys(service);
    if (!serviceKeys.every((key) => ['label', 'status', 'load'].includes(key))) {
      fail('status.json service contains unknown keys');
    }
    if (!PUBLIC_STATUS_LABELS.has(service.label) || !PUBLIC_STATUS_VALUES.has(service.status)) {
      fail('status.json service contains a non-public label or status');
    }
    if (service.load !== undefined && !PUBLIC_LOAD_VALUES.has(service.load)) {
      fail('status.json service contains an invalid load value');
    }
  }
}

function assertImageMagic(buffer, relative) {
  const extension = path.extname(relative).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(extension)) {
    return false;
  }
  const isPng = buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg = buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  const isGif = buffer.length >= 6 && (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a');
  const isWebp = buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  if (!(isPng || isJpeg || isGif || isWebp)) {
    fail(`image file failed magic-byte validation: ${relative}`);
  }
  return true;
}

function scanContent(file) {
  const buffer = fs.readFileSync(file.fullPath);
  if (assertImageMagic(buffer, file.relative)) {
    return;
  }
  const text = buffer.toString('utf8');
  for (const pattern of TEXT_SECRET_PATTERNS) {
    if (pattern.test(text)) {
      fail(`credential-like content detected in ${file.relative}`);
    }
  }
}

function runGuard({ siteDir = path.join(REPO_ROOT, 'site'), manifestPath = DEFAULT_MANIFEST_PATH } = {}) {
  const manifest = loadManifest(manifestPath);
  const resolvedSite = path.resolve(siteDir);
  if (!isInside(REPO_ROOT, resolvedSite) || path.basename(resolvedSite) !== 'site') {
    fail(`site path is outside repository root: ${resolvedSite}`);
  }
  if (!fs.existsSync(resolvedSite)) {
    fail('site directory does not exist; run the build first');
  }
  const siteStat = fs.lstatSync(resolvedSite);
  if (siteStat.isSymbolicLink()) {
    fail('site directory itself must not be a symbolic link');
  }
  if (!siteStat.isDirectory()) {
    fail('site path is not a directory');
  }
  assertManifestSourceBoundaries(manifest);

  const files = walkFiles(resolvedSite);
  const actual = files.map((file) => file.relative).sort();
  const expected = [...manifest.sourceFiles, ...manifest.generatedFiles].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    const actualSet = new Set(actual);
    const expectedSet = new Set(expected);
    const extra = actual.filter((file) => !expectedSet.has(file));
    const missing = expected.filter((file) => !actualSet.has(file));
    fail(`output does not match allowlist; extra=[${extra.join(', ')}] missing=[${missing.join(', ')}]`);
  }

  for (const file of files) {
    if (FORBIDDEN_NAME_PATTERN.test(file.relative)) {
      fail(`forbidden filename in public output: ${file.relative}`);
    }
    scanContent(file);
  }

  validateStatusFile(path.join(resolvedSite, 'status.json'));
  return { files: actual };
}

if (require.main === module) {
  try {
    const argumentsPassed = process.argv.slice(2);
    if (argumentsPassed.some((argument) => argument !== '--check')) {
      fail('only --check is supported');
    }
    const result = runGuard();
    console.log(`Public-site guard passed (${result.files.length} exact allowlisted files).`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { runGuard, validateStatusFile };
