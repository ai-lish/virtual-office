#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const manifest = JSON.parse(await readFile(path.join(root, 'publish.allowlist.json'), 'utf8'));
const siteRoot = path.resolve(root, manifest.publicRoot);
const EXPECTED_PEDAGOGY_SOURCE_HOSTS = Object.freeze([
  'academic.oup.com', 'doi.org', 'eric.ed.gov', 'escholarship.org', 'fis.leuphana.de',
  'gupea.ub.gu.se', 'mitpress.mit.edu', 'nrich.maths.org', 'press.princeton.edu',
  'search.worldcat.org', 'shop.elsevier.com', 'udlguidelines.cast.org', 'webspace.science.uu.nl',
  'www.aft.org', 'www.apa.org', 'www.ascd.org', 'www.cambridge.org', 'www.corwin.com',
  'www.edb.gov.hk', 'www.hkeaa.edu.hk', 'www.hup.harvard.edu', 'www.jstor.org',
  'www.pearson.com', 'www.routledge.com', 'www.solutiontree.com', 'www.w3.org',
  'ies.ed.gov', 'joanganzcooneycenter.org', 'www.gutenberg.org'
]);
const PUBLIC_PEDAGOGY_KEYS = Object.freeze(['zh', 'en', 'workflow', 'media', 'source', 'theory', 'example', 'examples', 'level']);
const PEDAGOGY_EXAMPLE_PATTERN = /^(?:(?:AI-Learning|preschool)《([^》]+)》|自擬)：(.+)$/;
function isValidPedagogyExample(value) {
  const match = typeof value === 'string' && PEDAGOGY_EXAMPLE_PATTERN.exec(value);
  return Boolean(match && (!match[1] || match[1].trim()) && match[2].trim());
}
const MAX_PEDAGOGY_CARDS = 1000;
// Keep mirror validation aligned with the private build; current JSON is about 75 KiB.
const MAX_PEDAGOGY_JSON_BYTES = 1024 * 1024;
const PEDAGOGY_LEVELS = new Set(['secondary', 'k2']);
const PEDAGOGY_WORKFLOWS = new Set(['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'C']);
const PEDAGOGY_MEDIA = new Set(['V', 'S', 'P', 'W']);
const PEDAGOGY_PRIVATE_PATTERN = /(?:\/Users\/|C:\\Users\\|\.ai-shared|scratchpad|skills\/shared\/(?:lesson-observation|k2-observation)|skills\/pedagogy\/|office-ui\/|GoogleDrive|OneDrive|thread_id|session_name|teaching-methods\.md|用家原話|未公開校內試題|學生資料)/i;

function assertSafeHost(value) {
  if (typeof value !== 'string' || value.length === 0 || value !== value.toLowerCase() || /[/:?#\s*]/.test(value)) {
    throw new Error(`external host is not a bare lowercase hostname: ${value}`);
  }
}

if (manifest.version !== 2 || manifest.publicRoot !== 'site' || !Array.isArray(manifest.entries) || !Array.isArray(manifest.generatedFiles) || !Array.isArray(manifest.allowedExternalHosts) || !Array.isArray(manifest.allowedPedagogySourceHosts)) {
  throw new Error('invalid publish manifest');
}
for (const host of [...manifest.allowedExternalHosts, ...manifest.allowedPedagogySourceHosts]) assertSafeHost(host);
const allowedExternalHosts = new Set(manifest.allowedExternalHosts);
if (JSON.stringify([...manifest.allowedPedagogySourceHosts].sort()) !== JSON.stringify([...EXPECTED_PEDAGOGY_SOURCE_HOSTS].sort())) {
  throw new Error('pedagogy source host allowlist differs from the reviewed exact set');
}
const allowedPedagogySourceHosts = new Set(manifest.allowedPedagogySourceHosts);

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
  /(?:studentId|teacherId|classId|spreadsheetId|driveId)\s*[:=]/i
];
const externalUrlPattern = /\bhttps?:\/\/[^\s"'<>`)]+/gi;
const identifierQueryPattern = /[?&](?:id|fileId|driveId|spreadsheetId|studentId|teacherId|classId|token|key)=/i;
const identifierQueryKeyPattern = /^(?:id|fileId|driveId|spreadsheetId|studentId|teacherId|classId|token|key)$/i;

function hasIdentifierLikeQuery(url) {
  return [...url.searchParams.keys()].some((key) => identifierQueryKeyPattern.test(key));
}

const PUBLIC_PROVIDERS = new Map([
  ['chatgpt', 'ChatGPT'],
  ['claude', 'Claude'],
  ['claude-2', 'Claude（帳號 2）'],
  ['gemini', 'Gemini'],
  ['minimax', 'MiniMax'],
  ['copilot', 'GitHub Copilot'],
  ['antigravity', 'Antigravity'],
  ['grok-bot', 'Grok Bot']
]);
const FRACTIONAL_PERCENT_PROVIDERS = new Set(['antigravity', 'grok-bot']);
// Keep the exact current deployment valid until private feat/grok-bot-quota publishes Grok Bot.
const CLAUDE_2_DEPLOYMENT_PROVIDER_IDS = new Set([
  'chatgpt', 'claude', 'claude-2', 'gemini', 'minimax', 'copilot', 'antigravity'
]);
const ANTIGRAVITY_DEPLOYMENT_PROVIDER_IDS = new Set([
  'chatgpt', 'claude', 'gemini', 'minimax', 'copilot', 'antigravity'
]);
// Keep the exact current deployment valid until private #38 publishes Antigravity.
const LEGACY_PUBLIC_PROVIDER_IDS = new Set(['chatgpt', 'claude', 'gemini', 'minimax', 'copilot']);
const APPROVED_PROVIDER_SETS = [
  new Set(PUBLIC_PROVIDERS.keys()), CLAUDE_2_DEPLOYMENT_PROVIDER_IDS, ANTIGRAVITY_DEPLOYMENT_PROVIDER_IDS,
  LEGACY_PUBLIC_PROVIDER_IDS
];
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

function isValidPercent(value, allowFractional) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) return false;
  return allowFractional
    ? Math.abs(value * 10 - Math.round(value * 10)) < 1e-8
    : Number.isInteger(value);
}

function assertResetMetadata(windows, resetsAt, resetMarkers, name, provider) {
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
    } else if (!isValidPercent(marker.pre_reset_peak_pct, FRACTIONAL_PERCENT_PROVIDERS.has(provider))
      || typeof marker.pre_reset_observed_at !== 'string' || !PUBLIC_TIME_PATTERN.test(marker.pre_reset_observed_at)) {
      throw new Error(`${name} reset peak is invalid`);
    }
  }
}

function assertWindows(windows, name, provider) {
  if (!windows || typeof windows !== 'object' || Array.isArray(windows)) throw new Error(`${name} windows must be an object`);
  const names = Object.keys(windows);
  if (names.length === 0 || names.some((window) => !PUBLIC_WINDOWS.has(window))) {
    throw new Error(`${name} contains unknown or empty windows`);
  }
  if (provider === 'antigravity' && JSON.stringify(names) !== JSON.stringify(['seven_day'])) {
    throw new Error(`${name} Antigravity records must contain only the seven_day window`);
  }
  if (provider === 'grok-bot' && JSON.stringify(names) !== JSON.stringify(['seven_day'])) {
    throw new Error(`${name} Grok Bot records must contain only the seven_day window`);
  }
  for (const window of names) {
    if (!isValidPercent(windows[window], FRACTIONAL_PERCENT_PROVIDERS.has(provider))) {
      throw new Error(FRACTIONAL_PERCENT_PROVIDERS.has(provider)
        ? `${name} ${PUBLIC_PROVIDERS.get(provider)} window values must be percentages with at most one decimal place`
        : `${name} window values must be integers between 0 and 100`);
    }
  }
}

function validateProviders(value) {
  assertExactKeys(value, ['generated_at', 'providers', 'schema_version'], 'providers.json contains unknown or missing top-level keys');
  assertHeader(value, 'providers.json');
  if (!Array.isArray(value.providers) || !APPROVED_PROVIDER_SETS.some((approved) => approved.size === value.providers.length)) {
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
      assertWindows(bucket.windows, 'providers.json', provider.id);
      if (value.schema_version === '2') {
        assertResetMetadata(bucket.windows, bucket.resets_at, bucket.reset_markers, 'providers.json', provider.id);
      }
    }
  }
  if (!APPROVED_PROVIDER_SETS.some((approved) => approved.size === seen.size && [...approved].every((id) => seen.has(id)))) {
    throw new Error('providers.json must list exactly the approved providers');
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
    assertWindows(record.windows, 'history.json', record.provider);
    if (value.schema_version === '2') {
      assertResetCount(record.manual_resets_remaining, 'history.json');
      assertResetMetadata(record.windows, record.resets_at, record.reset_markers, 'history.json', record.provider);
    }
  }
}

function validatePedagogy(value, sourceBytes) {
  if (!Number.isSafeInteger(sourceBytes) || sourceBytes < 0 || sourceBytes > MAX_PEDAGOGY_JSON_BYTES) {
    throw new Error(`pedagogy/pedagogy.json exceeds the ${MAX_PEDAGOGY_JSON_BYTES}-byte limit`);
  }
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_PEDAGOGY_CARDS) {
    throw new Error(`pedagogy/pedagogy.json must contain between 1 and ${MAX_PEDAGOGY_CARDS} method cards`);
  }
  const usedHosts = new Set();
  for (const [index, card] of value.entries()) {
    assertExactKeys(card, PUBLIC_PEDAGOGY_KEYS, `pedagogy card ${index + 1} contains unknown or missing keys`);
    if (!PEDAGOGY_LEVELS.has(card.level)) {
      throw new Error(`pedagogy card ${index + 1} has an invalid level`);
    }
    for (const field of ['zh', 'en', 'source', 'theory', 'example']) {
      if (typeof card[field] !== 'string' || card[field].trim().length === 0 || card[field].length > 8000) {
        throw new Error(`pedagogy card ${index + 1} has an invalid ${field} field`);
      }
      if (field !== 'source' && /https?:\/\//i.test(card[field])) {
        throw new Error(`pedagogy card ${index + 1} may only contain external URLs in source`);
      }
      if (PEDAGOGY_PRIVATE_PATTERN.test(card[field])) {
        throw new Error(`pedagogy card ${index + 1} contains private operational content`);
      }
    }
    if (!Array.isArray(card.examples) || card.examples.length < 1 || card.examples.length > 5
      || card.examples.some((example) => !isValidPedagogyExample(example))
      || card.example !== card.examples[0]) {
      throw new Error(`pedagogy card ${index + 1} has invalid examples (expected 1 to 5 source-tagged non-empty strings)`);
    }
    for (const example of card.examples) {
      if (/https?:\/\//i.test(example)) throw new Error(`pedagogy card ${index + 1} may only contain external URLs in source`);
      if (PEDAGOGY_PRIVATE_PATTERN.test(example)) throw new Error(`pedagogy card ${index + 1} contains private operational content`);
    }
    for (const [field, allowed] of [['workflow', PEDAGOGY_WORKFLOWS], ['media', PEDAGOGY_MEDIA]]) {
      const items = card[field];
      if (!Array.isArray(items) || items.length < 1 || items.length > allowed.size
        || items.some((item) => typeof item !== 'string' || !allowed.has(item))
        || new Set(items).size !== items.length) {
        throw new Error(`pedagogy card ${index + 1} has invalid ${field} values`);
      }
    }
    if (!/\]\(https:\/\/[^)]+\)/i.test(card.source)) {
      throw new Error(`pedagogy card ${index + 1} must include a linked citation`);
    }
    for (const match of card.source.matchAll(externalUrlPattern)) {
      let url;
      try {
        url = new URL(match[0]);
      } catch {
        throw new Error(`pedagogy card ${index + 1} contains an invalid source URL`);
      }
      if (url.protocol !== 'https:' || url.username || url.password || url.port
        || !allowedPedagogySourceHosts.has(url.hostname)) {
        throw new Error(`pedagogy card ${index + 1} source URL is outside the exact source host allowlist: ${url.hostname}`);
      }
      const ericRecordId = url.searchParams.get('id') || '';
      const queryKeys = [...url.searchParams.keys()];
      const isPublicEricRecordId = url.hostname === 'eric.ed.gov'
        && url.pathname === '/'
        && queryKeys.length === 1
        && queryKeys[0] === 'id'
        && url.search === `?id=${ericRecordId}`
        && /^(?:EJ|ED)\d{6,}$/.test(ericRecordId);
      if (hasIdentifierLikeQuery(url)
        && !isPublicEricRecordId) {
        throw new Error(`pedagogy card ${index + 1} source URL contains an identifier-like query parameter`);
      }
      usedHosts.add(url.hostname);
    }
  }
  if (JSON.stringify([...usedHosts].sort()) !== JSON.stringify([...allowedPedagogySourceHosts].sort())) {
    throw new Error('pedagogy source host allowlist must match the hosts actually used in source fields');
  }
}

function validatePedagogyPage(filePath) {
  const html = readFileSync(filePath, 'utf8');
  if (PEDAGOGY_PRIVATE_PATTERN.test(html) || /PRIVATE_CANONICAL|\.\.\/shared\/lesson-observation/i.test(html)) {
    throw new Error('pedagogy/index.html contains a private path or local-only block');
  }
}

async function walk(current, files = []) {
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const full = path.join(current, entry.name);
    const relative = path.relative(siteRoot, full).split(path.sep).join('/');
    const stat = await lstat(full);
    if (stat.isSymbolicLink()) throw new Error(`symbolic link in public output: ${relative}`);
    if (stat.isDirectory()) await walk(full, files);
    else if (stat.isFile()) files.push({ full, relative, size: stat.size });
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
  if (file.relative === 'pedagogy/pedagogy.json' && file.size > MAX_PEDAGOGY_JSON_BYTES) {
    throw new Error(`pedagogy/pedagogy.json exceeds the ${MAX_PEDAGOGY_JSON_BYTES}-byte limit`);
  }
  const content = (await readFile(file.full)).toString('utf8');
  if (forbiddenContent.some((pattern) => pattern.test(content))) throw new Error(`forbidden credential/backend reference in public output: ${file.relative}`);
  if (file.relative !== 'pedagogy/pedagogy.json' && identifierQueryPattern.test(content)) {
    throw new Error(`identifier-like query parameter in public output: ${file.relative}`);
  }
  const fileAllowedExternalHosts = file.relative === 'pedagogy/pedagogy.json'
    ? allowedPedagogySourceHosts
    : allowedExternalHosts;
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
    if (!fileAllowedExternalHosts.has(url.hostname)) {
      throw new Error(`external host is not in manifest allowlist: ${file.relative} (${url.hostname})`);
    }
    if (file.relative !== 'pedagogy/pedagogy.json' && hasIdentifierLikeQuery(url)) {
      throw new Error(`identifier-like query parameter in public output: ${file.relative}`);
    }
  }
}

for (const [name, validate] of [['providers.json', validateProviders], ['history.json', validateHistory]]) {
  const file = files.find((entry) => entry.relative === name);
  if (!file) throw new Error(`${name} is missing from public output`);
  validate(JSON.parse((await readFile(file.full)).toString('utf8')));
}

const pedagogyFile = files.find((entry) => entry.relative === 'pedagogy/pedagogy.json');
if (!pedagogyFile) throw new Error('pedagogy/pedagogy.json is missing from public output');
const pedagogyContent = await readFile(pedagogyFile.full);
validatePedagogy(JSON.parse(pedagogyContent.toString('utf8')), pedagogyFile.size);
const pedagogyPage = files.find((entry) => entry.relative === 'pedagogy/index.html');
if (!pedagogyPage) throw new Error('pedagogy/index.html is missing from public output');
validatePedagogyPage(pedagogyPage.full);
const homepage = files.find((entry) => entry.relative === 'index.html');
if (!homepage || !readFileSync(homepage.full, 'utf8').includes('href="/virtual-office/pedagogy/"')) {
  throw new Error('index.html is missing the pedagogy page link');
}

console.log(`Public-site guard passed (${files.length} exact files).`);
