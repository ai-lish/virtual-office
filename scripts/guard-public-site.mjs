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

function validateModelsSnapshot(value) {
  const topKeys = Object.keys(value).sort();
  if (JSON.stringify(topKeys) !== JSON.stringify(['freshness', 'generated_at', 'models', 'schema_version'])) {
    throw new Error('models.json contains unknown or missing top-level keys');
  }
  if (value.schema_version !== '1' || !['live', 'unavailable'].includes(value.freshness)) {
    throw new Error('models.json schema or freshness is invalid');
  }
  if (typeof value.generated_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/.test(value.generated_at)) {
    throw new Error('models.json generated_at must be rounded to an UTC hour');
  }
  if (!Array.isArray(value.models) || value.models.length > 32) {
    throw new Error('models.json models must be a bounded array');
  }
  const names = new Set();
  for (const model of value.models) {
    const modelKeys = Object.keys(model || {}).sort();
    if (JSON.stringify(modelKeys) !== JSON.stringify(['interval_used_percent', 'model', 'weekly_used_percent'])) {
      throw new Error('models.json model entry contains unknown or missing keys');
    }
    if (typeof model.model !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._ *-]{0,63}$/.test(model.model) || names.has(model.model)) {
      throw new Error('models.json contains an invalid or duplicate model name');
    }
    names.add(model.model);
    for (const field of ['interval_used_percent', 'weekly_used_percent']) {
      if (!Number.isInteger(model[field]) || model[field] < 0 || model[field] > 100) {
        throw new Error(`models.json ${field} must be an integer between 0 and 100`);
      }
    }
  }
  if (value.freshness === 'unavailable' && value.models.length !== 0) {
    throw new Error('unavailable models.json must not contain model entries');
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

const modelsFile = files.find((file) => file.relative === 'models.json');
if (!modelsFile) throw new Error('models.json is missing from public output');
validateModelsSnapshot(JSON.parse((await readFile(modelsFile.full)).toString('utf8')));

console.log(`Public-site guard passed (${files.length} exact files).`);
