#!/usr/bin/env node

import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const manifest = JSON.parse(await readFile(path.join(root, 'publish.allowlist.json'), 'utf8'));
const siteRoot = path.resolve(root, manifest.publicRoot);

function assertSafeHost(value) {
  if (typeof value !== 'string' || value.length === 0 || value !== value.toLowerCase() || /[/:?#\s*]/.test(value)) {
    throw new Error(`external host is not a bare lowercase hostname: ${value}`);
  }
}

if (manifest.version !== 2 || manifest.publicRoot !== 'site' || !Array.isArray(manifest.entries) || !Array.isArray(manifest.generatedFiles) || !Array.isArray(manifest.allowedExternalHosts)) {
  throw new Error('invalid publish manifest');
}
for (const host of manifest.allowedExternalHosts) assertSafeHost(host);
const allowedExternalHosts = new Set(manifest.allowedExternalHosts);

const forbiddenName = /(?:^|\/)(?:.*\.map|.*(?:token|secret|credential|api[-_]?key|quota|usage|log).*|.*(?:\.bak|~))$/i;
const forbiddenContent = [
  /ghp_[A-Za-z0-9_]+/i,
  /github_pat_[A-Za-z0-9_]+/i,
  /\bsk-[A-Za-z0-9_-]{12,}\b/i,
  /\bxox[baprs]-[A-Za-z0-9-]{8,}\b/i,
  /-----BEGIN(?: [A-Z0-9]+)* PRIVATE KEY-----/,
  /(?:API_TOKEN|DISCORD_WEBHOOK_URL|MINIMAX_API_KEY|GITHUB_TOKEN)\s*=/i,
  /(?:API_KEY|apiKey|google_api_key|firebaseConfig|spreadsheetId|driveId|memory\/data)\s*[:=]?/i,
  /(?:Authorization|x-api-key|x-goog-api-key)\s*[:=]/i,
  /\bmethod\s*:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i,
  /(?:studentId|teacherId|classId|spreadsheetId|driveId)\s*[:=]/i,
  /[?&](?:id|fileId|driveId|spreadsheetId|studentId|teacherId|classId|token|key)=/i
];
const externalUrlPattern = /\bhttps?:\/\/[^\s"'<>`)]+/gi;

const PUBLIC_PROVIDERS = new Map([
  ['chatgpt', 'ChatGPT'],
  ['claude', 'Claude'],
  ['gemini', 'Gemini'],
  ['minimax', 'MiniMax'],
  ['copilot', 'GitHub Copilot']
]);
const PUBLIC_WINDOWS = new Set(['five_hour', 'seven_day', 'monthly']);
const BUCKET_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._ *-]{0,63}$/;
const HOUR_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/;
const PUBLIC_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

function assertExactKeys(value, keys, message) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) {
    throw new Error(message);
  }
}

function assertHeader(value, name) {
  if (!['1', '2'].includes(value.schema_version)) throw new Error(`${name} schema_version is invalid`);
  if (typeof value.generated_at !== 'string' || !HOUR_PATTERN.test(value.generated_at)) {
    throw new Error(`${name} generated_at must be rounded to an UTC hour`);
  }
}

function assertResetCount(value, name) {
  if (value !== null && (!Number.isInteger(value) || value < 0)) throw new Error(`${name} manual_resets_remaining is invalid`);
}

function assertResetMetadata(windows, resetsAt, resetMarkers, name) {
  const names = Object.keys(windows || {}).sort();
  for (const [field, value] of [['resets_at', resetsAt], ['reset_markers', resetMarkers]]) {
    if (!value || typeof value !== 'object' || Array.isArray(value)
      || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(names)) {
      throw new Error(`${name} ${field} windows do not match windows`);
    }
  }
  for (const window of names) {
    const resetAt = resetsAt[window];
    if (resetAt !== null && (typeof resetAt !== 'string' || !PUBLIC_TIME_PATTERN.test(resetAt))) {
      throw new Error(`${name} resets_at values must be null or ISO timestamps`);
    }
    const marker = resetMarkers[window];
    assertExactKeys(marker, ['detected', 'manual', 'pre_reset_observed_at', 'pre_reset_peak_pct'], `${name} reset marker contains unknown or missing keys`);
    if (typeof marker.detected !== 'boolean' || typeof marker.manual !== 'boolean') {
      throw new Error(`${name} reset marker flags must be boolean`);
    }
    if (marker.pre_reset_peak_pct === null) {
      if (marker.pre_reset_observed_at !== null) throw new Error(`${name} reset peak time requires a peak`);
    } else if (!Number.isInteger(marker.pre_reset_peak_pct) || marker.pre_reset_peak_pct < 0 || marker.pre_reset_peak_pct > 100
      || typeof marker.pre_reset_observed_at !== 'string' || !PUBLIC_TIME_PATTERN.test(marker.pre_reset_observed_at)) {
      throw new Error(`${name} reset peak is invalid`);
    }
  }
}

function assertWindows(windows, name) {
  if (!windows || typeof windows !== 'object' || Array.isArray(windows)) throw new Error(`${name} windows must be an object`);
  const names = Object.keys(windows);
  if (names.length === 0 || names.some((window) => !PUBLIC_WINDOWS.has(window))) {
    throw new Error(`${name} contains unknown or empty windows`);
  }
  for (const window of names) {
    if (!Number.isInteger(windows[window]) || windows[window] < 0 || windows[window] > 100) {
      throw new Error(`${name} window values must be integers between 0 and 100`);
    }
  }
}

function validateProviders(value) {
  assertExactKeys(value, ['generated_at', 'providers', 'schema_version'], 'providers.json contains unknown or missing top-level keys');
  assertHeader(value, 'providers.json');
  if (!Array.isArray(value.providers) || value.providers.length !== PUBLIC_PROVIDERS.size) {
    throw new Error('providers.json must list exactly the approved providers');
  }
  const seen = new Set();
  for (const provider of value.providers) {
    assertExactKeys(provider, ['buckets', 'id', 'label', 'observed_at'], 'providers.json provider entry contains unknown or missing keys');
    if (PUBLIC_PROVIDERS.get(provider.id) !== provider.label || seen.has(provider.id)) {
      throw new Error('providers.json contains an unknown, relabelled or duplicate provider');
    }
    seen.add(provider.id);
    const timePattern = value.schema_version === '1' ? HOUR_PATTERN : PUBLIC_TIME_PATTERN;
    if (provider.observed_at !== null && (typeof provider.observed_at !== 'string' || !timePattern.test(provider.observed_at))) {
      throw new Error(value.schema_version === '1'
        ? 'providers.json observed_at must be null or rounded to an UTC hour'
        : 'providers.json observed_at must be null or an ISO timestamp');
    }
    if (!Array.isArray(provider.buckets) || provider.buckets.length > 8) throw new Error('providers.json buckets must be a bounded array');
    if ((provider.observed_at === null) !== (provider.buckets.length === 0)) {
      throw new Error('providers.json observed_at and buckets must be present together');
    }
    for (const bucket of provider.buckets) {
      const bucketKeys = value.schema_version === '1'
        ? ['bucket', 'windows']
        : ['bucket', 'manual_resets_remaining', 'reset_markers', 'resets_at', 'windows'];
      assertExactKeys(bucket, bucketKeys, 'providers.json bucket contains unknown or missing keys');
      if (typeof bucket.bucket !== 'string' || !BUCKET_PATTERN.test(bucket.bucket)) throw new Error('providers.json bucket label is invalid');
      if (value.schema_version === '2') {
        assertResetCount(bucket.manual_resets_remaining, 'providers.json');
      }
      assertWindows(bucket.windows, 'providers.json');
      if (value.schema_version === '2') {
        assertResetMetadata(bucket.windows, bucket.resets_at, bucket.reset_markers, 'providers.json');
      }
    }
  }
}

function validateHistory(value) {
  assertExactKeys(value, ['generated_at', 'records', 'schema_version'], 'history.json contains unknown or missing top-level keys');
  assertHeader(value, 'history.json');
  if (!Array.isArray(value.records) || value.records.length > 20000) throw new Error('history.json records must be a bounded array');
  for (const record of value.records) {
    const recordKeys = value.schema_version === '1'
      ? ['bucket', 'observed_at', 'period', 'provider', 'windows']
      : ['bucket', 'manual_resets_remaining', 'observed_at', 'period', 'provider', 'reset_markers', 'resets_at', 'windows'];
    assertExactKeys(record, recordKeys, 'history.json record contains unknown or missing keys');
    if (!PUBLIC_PROVIDERS.has(record.provider)) throw new Error('history.json contains an unknown provider');
    if (typeof record.bucket !== 'string' || !BUCKET_PATTERN.test(record.bucket)) throw new Error('history.json bucket label is invalid');
    if (!['native', 'observation'].includes(record.period)) throw new Error('history.json period is invalid');
    const timePattern = value.schema_version === '1' ? HOUR_PATTERN : PUBLIC_TIME_PATTERN;
    if (typeof record.observed_at !== 'string' || !timePattern.test(record.observed_at)) {
      throw new Error(value.schema_version === '1'
        ? 'history.json observed_at must be rounded to an UTC hour'
        : 'history.json observed_at must be an ISO timestamp');
    }
    assertWindows(record.windows, 'history.json');
    if (value.schema_version === '2') {
      assertResetCount(record.manual_resets_remaining, 'history.json');
      assertResetMetadata(record.windows, record.resets_at, record.reset_markers, 'history.json');
    }
  }
}

async function walk(current, files = []) {
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const full = path.join(current, entry.name);
    const relative = path.relative(siteRoot, full).split(path.sep).join('/');
    const stat = await lstat(full);
    if (stat.isSymbolicLink()) throw new Error(`symbolic link in public output: ${relative}`);
    if (stat.isDirectory()) await walk(full, files);
    else if (stat.isFile()) files.push({ full, relative });
  }
  return files;
}

const expected = new Set([...manifest.entries.map((entry) => entry.destination), ...manifest.generatedFiles]);
const files = await walk(siteRoot);
const actual = new Set(files.map((file) => file.relative));
const extra = [...actual].filter((file) => !expected.has(file));
const missing = [...expected].filter((file) => !actual.has(file));
if (extra.length || missing.length) throw new Error(`public output differs from exact allowlist; extra=${extra.join(',')} missing=${missing.join(',')}`);

for (const file of files) {
  if (forbiddenName.test(file.relative)) throw new Error(`forbidden public filename: ${file.relative}`);
  const content = (await readFile(file.full)).toString('utf8');
  if (forbiddenContent.some((pattern) => pattern.test(content))) throw new Error(`forbidden credential/backend reference in public output: ${file.relative}`);
  for (const match of content.matchAll(externalUrlPattern)) {
    let url;
    try {
      url = new URL(match[0]);
    } catch {
      throw new Error(`invalid external URL in public output: ${file.relative}`);
    }
    if (url.protocol !== 'https:' || url.username || url.password || url.port) {
      throw new Error(`unsafe external URL form in public output: ${file.relative}`);
    }
    if (!allowedExternalHosts.has(url.hostname)) {
      throw new Error(`external host is not in manifest allowlist: ${file.relative} (${url.hostname})`);
    }
    if (/[?&](?:id|fileId|driveId|spreadsheetId|studentId|teacherId|classId|token|key)=/i.test(url.search)) {
      throw new Error(`identifier-like query parameter in public output: ${file.relative}`);
    }
  }
}

for (const [name, validate] of [['providers.json', validateProviders], ['history.json', validateHistory]]) {
  const file = files.find((entry) => entry.relative === name);
  if (!file) throw new Error(`${name} is missing from public output`);
  validate(JSON.parse((await readFile(file.full)).toString('utf8')));
}

console.log(`Public-site guard passed (${files.length} exact files).`);
