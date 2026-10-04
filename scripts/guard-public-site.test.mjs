import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile, copyFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicFiles = ['index.html', 'history.html', 'providers.json', 'history.json', 'robots.txt', 'status.json'];
const legacyProviders = JSON.parse(await readFile(path.join(repoRoot, 'providers.json'), 'utf8'));
const legacyHistory = JSON.parse(await readFile(path.join(repoRoot, 'history.json'), 'utf8'));

function projectProvidersV2(source) {
  return {
    ...source,
    schema_version: '2',
    providers: source.providers.map((provider) => ({
      ...provider,
      buckets: provider.buckets.map((bucket) => ({
        ...bucket,
        manual_resets_remaining: null,
        resets_at: Object.fromEntries(Object.keys(bucket.windows).map((window) => [window, null])),
        reset_markers: Object.fromEntries(Object.keys(bucket.windows).map((window) => [window, {
          detected: false,
          manual: false,
          pre_reset_peak_pct: null,
          pre_reset_observed_at: null
        }]))
      }))
    }))
  };
}

function projectHistoryV2(source) {
  return {
    ...source,
    schema_version: '2',
    records: source.records.map((record) => ({
      ...record,
      manual_resets_remaining: null,
      resets_at: Object.fromEntries(Object.keys(record.windows).map((window) => [window, null])),
      reset_markers: Object.fromEntries(Object.keys(record.windows).map((window) => [window, {
        detected: false,
        manual: false,
        pre_reset_peak_pct: null,
        pre_reset_observed_at: null
      }]))
    }))
  };
}

async function runGuard({ providers = legacyProviders, history = legacyHistory } = {}) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'virtual-office-guard-'));
  try {
    await mkdir(path.join(tempRoot, 'scripts'));
    await copyFile(path.join(repoRoot, 'publish.allowlist.json'), path.join(tempRoot, 'publish.allowlist.json'));
    await copyFile(path.join(repoRoot, 'scripts/guard-public-site.mjs'), path.join(tempRoot, 'scripts/guard-public-site.mjs'));
    await copyFile(path.join(repoRoot, 'scripts/build-public-site.mjs'), path.join(tempRoot, 'scripts/build-public-site.mjs'));
    for (const file of publicFiles) {
      const destination = path.join(tempRoot, file);
      await writeFile(destination, file === 'providers.json' ? JSON.stringify(providers)
        : file === 'history.json' ? JSON.stringify(history)
          : await readFile(path.join(repoRoot, file)));
    }
    const build = spawnSync(process.execPath, ['scripts/build-public-site.mjs'], {
      cwd: tempRoot,
      encoding: 'utf8'
    });
    if (build.status !== 0) return build;
    return spawnSync(process.execPath, ['scripts/guard-public-site.mjs'], {
      cwd: tempRoot,
      encoding: 'utf8'
    });
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

test('accepts the current schema 1 public projections during transition', async () => {
  assert.equal(legacyProviders.schema_version, '1');
  assert.equal(legacyHistory.schema_version, '1');
  const result = await runGuard();
  assert.equal(result.status, 0, result.stderr);
});

test('accepts schema 2 reset metadata with the exact approved fields', async () => {
  const providers = projectProvidersV2(legacyProviders);
  const history = projectHistoryV2(legacyHistory);
  const firstBucket = providers.providers.find((provider) => provider.buckets.length)?.buckets[0];
  if (firstBucket) {
    const window = Object.keys(firstBucket.windows)[0];
    firstBucket.manual_resets_remaining = 1;
    firstBucket.resets_at[window] = '2026-10-04T12:34:56Z';
    firstBucket.reset_markers[window] = {
      detected: true,
      manual: false,
      pre_reset_peak_pct: 87,
      pre_reset_observed_at: '2026-10-04T11:34:56.123Z'
    };
  }
  const result = await runGuard({ providers, history });
  assert.equal(result.status, 0, result.stderr);
});

test('rejects unlisted provider bucket and history record fields', async () => {
  const providers = projectProvidersV2(legacyProviders);
  const bucket = providers.providers.find((provider) => provider.buckets.length)?.buckets[0];
  assert.ok(bucket, 'fixture should include at least one bucket');
  bucket.account_email = 'not-public@example.invalid';
  let result = await runGuard({ providers, history: projectHistoryV2(legacyHistory) });
  assert.notEqual(result.status, 0);

  const history = projectHistoryV2(legacyHistory);
  assert.ok(history.records.length > 0, 'fixture should include history records');
  history.records[0].raw_response = 'forbidden';
  result = await runGuard({ providers: projectProvidersV2(legacyProviders), history });
  assert.notEqual(result.status, 0);
});

test('rejects invalid reset metadata types, ranges and timestamps', async () => {
  const providers = projectProvidersV2(legacyProviders);
  const bucket = providers.providers.find((provider) => provider.buckets.length)?.buckets[0];
  assert.ok(bucket, 'fixture should include at least one bucket');
  bucket.manual_resets_remaining = '1';
  let result = await runGuard({ providers, history: projectHistoryV2(legacyHistory) });
  assert.notEqual(result.status, 0);

  const invalidHistory = projectHistoryV2(legacyHistory);
  assert.ok(invalidHistory.records.length > 0, 'fixture should include history records');
  const record = invalidHistory.records[0];
  const window = Object.keys(record.windows)[0];
  record.resets_at[window] = 'tomorrow';
  result = await runGuard({ providers: projectProvidersV2(legacyProviders), history: invalidHistory });
  assert.notEqual(result.status, 0);
});
