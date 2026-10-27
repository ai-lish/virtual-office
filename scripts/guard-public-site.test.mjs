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

function addAntigravityProjection(providers, history) {
  providers.providers = providers.providers.filter((provider) => provider.id !== 'antigravity');
  history.records = history.records.filter((record) => record.provider !== 'antigravity');
  providers.providers.push({
    id: 'antigravity',
    label: 'Antigravity',
    observed_at: '2026-10-17T00:00:00Z',
    buckets: [
      {
        bucket: 'gemini-models',
        manual_resets_remaining: null,
        windows: { seven_day: 26.6 },
        resets_at: { seven_day: '2026-10-23T18:52:05Z' },
        reset_markers: {
          seven_day: {
            detected: true,
            manual: false,
            pre_reset_peak_pct: 88.8,
            pre_reset_observed_at: '2026-10-16T18:52:05Z'
          }
        }
      },
      {
        bucket: 'third-party-models',
        manual_resets_remaining: null,
        windows: { seven_day: 21.9 },
        resets_at: { seven_day: '2026-10-23T18:57:46Z' },
        reset_markers: {
          seven_day: {
            detected: false,
            manual: false,
            pre_reset_peak_pct: null,
            pre_reset_observed_at: null
          }
        }
      }
    ]
  });
  history.records.push({
    provider: 'antigravity',
    bucket: 'gemini-models',
    period: 'native',
    observed_at: '2026-10-17T00:00:00Z',
    windows: { seven_day: 26.6 },
    resets_at: { seven_day: '2026-10-23T18:52:05Z' },
    reset_markers: {
      seven_day: {
        detected: true,
        manual: false,
        pre_reset_peak_pct: 88.8,
        pre_reset_observed_at: '2026-10-16T18:52:05Z'
      }
    },
    manual_resets_remaining: null
  });
  history.records.push({
    provider: 'antigravity',
    bucket: 'third-party-models',
    period: 'native',
    observed_at: '2026-10-17T00:00:00Z',
    windows: { seven_day: 21.9 },
    resets_at: { seven_day: '2026-10-23T18:57:46Z' },
    reset_markers: {
      seven_day: {
        detected: false,
        manual: false,
        pre_reset_peak_pct: null,
        pre_reset_observed_at: null
      }
    },
    manual_resets_remaining: null
  });
  return { providers, history };
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

test('accepts the current six-provider deployment during the Claude account 2 transition', async () => {
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

test('accepts Antigravity seven-day percentages and reset peaks with one decimal place', async () => {
  const { providers, history } = addAntigravityProjection(
    projectProvidersV2(legacyProviders),
    projectHistoryV2(legacyHistory)
  );
  const result = await runGuard({ providers, history });
  assert.equal(result.status, 0, result.stderr);
});

test('accepts the separate Claude account 2 provider with the neutral label', async () => {
  const providers = projectProvidersV2(legacyProviders);
  const history = projectHistoryV2(legacyHistory);
  addAntigravityProjection(providers, history);
  const observedAt = '2026-10-27T03:00:00Z';
  providers.providers.push({
    id: 'claude-2',
    label: 'Claude（帳號 2）',
    observed_at: observedAt,
    buckets: [{
      bucket: 'account',
      manual_resets_remaining: null,
      windows: { five_hour: 31, seven_day: 47 },
      resets_at: { five_hour: '2026-10-27T05:00:00Z', seven_day: '2026-10-30T05:00:00Z' },
      reset_markers: {
        five_hour: { detected: false, manual: false, pre_reset_peak_pct: null, pre_reset_observed_at: null },
        seven_day: { detected: false, manual: false, pre_reset_peak_pct: null, pre_reset_observed_at: null }
      }
    }]
  });
  history.records.push({
    provider: 'claude-2',
    bucket: 'account',
    period: 'native',
    observed_at: observedAt,
    windows: { five_hour: 31, seven_day: 47 },
    resets_at: { five_hour: '2026-10-27T05:00:00Z', seven_day: '2026-10-30T05:00:00Z' },
    reset_markers: {
      five_hour: { detected: false, manual: false, pre_reset_peak_pct: null, pre_reset_observed_at: null },
      seven_day: { detected: false, manual: false, pre_reset_peak_pct: null, pre_reset_observed_at: null }
    },
    manual_resets_remaining: null
  });
  const result = await runGuard({ providers, history });
  assert.equal(result.status, 0, result.stderr);
});

test('rejects Antigravity percentages and reset peaks with two decimal places', async () => {
  const providers = projectProvidersV2(legacyProviders);
  const history = projectHistoryV2(legacyHistory);
  addAntigravityProjection(providers, history);
  providers.providers.at(-1).buckets[0].windows.seven_day = 26.66;
  let result = await runGuard({ providers, history });
  assert.notEqual(result.status, 0);

  const fractionalProviders = projectProvidersV2(legacyProviders);
  const fractionalHistory = projectHistoryV2(legacyHistory);
  addAntigravityProjection(fractionalProviders, fractionalHistory);
  fractionalHistory.records.at(-1).reset_markers.seven_day.pre_reset_peak_pct = 88.88;
  result = await runGuard({ providers: fractionalProviders, history: fractionalHistory });
  assert.notEqual(result.status, 0);
});

test('rejects fractional percentages for every other provider', async () => {
  const providers = projectProvidersV2(legacyProviders);
  const history = projectHistoryV2(legacyHistory);
  const { providers: withAntigravity, history: withAntigravityHistory } = addAntigravityProjection(providers, history);
  const claude = withAntigravity.providers.find((provider) => provider.id === 'claude');
  claude.buckets[0].windows.seven_day = 14.1;
  let result = await runGuard({ providers: withAntigravity, history: withAntigravityHistory });
  assert.notEqual(result.status, 0);

  const resetPeakHistory = projectHistoryV2(legacyHistory);
  const claudeReset = resetPeakHistory.records.find((record) => record.provider === 'claude');
  assert.ok(claudeReset, 'fixture should include a Claude history record');
  claudeReset.reset_markers.seven_day = {
    detected: true,
    manual: false,
    pre_reset_peak_pct: 14.1,
    pre_reset_observed_at: '2026-10-16T23:00:00Z'
  };
  result = await runGuard({ providers: projectProvidersV2(legacyProviders), history: resetPeakHistory });
  assert.notEqual(result.status, 0);
});

test('rejects Antigravity windows other than seven_day', async () => {
  const providers = projectProvidersV2(legacyProviders);
  const history = projectHistoryV2(legacyHistory);
  const { providers: withAntigravity, history: withAntigravityHistory } = addAntigravityProjection(providers, history);
  const providerBucket = withAntigravity.providers.at(-1).buckets[0];
  providerBucket.windows.five_hour = 1;
  providerBucket.resets_at.five_hour = null;
  providerBucket.reset_markers.five_hour = {
    detected: false,
    manual: false,
    pre_reset_peak_pct: null,
    pre_reset_observed_at: null
  };
  const record = withAntigravityHistory.records.at(-1);
  record.windows.monthly = 1;
  record.resets_at.monthly = null;
  record.reset_markers.monthly = {
    detected: false,
    manual: false,
    pre_reset_peak_pct: null,
    pre_reset_observed_at: null
  };
  const result = await runGuard({ providers: withAntigravity, history: withAntigravityHistory });
  assert.notEqual(result.status, 0);
});

test('keeps the provider allowlist closed during the transition', async () => {
  const providers = projectProvidersV2(legacyProviders);
  const history = projectHistoryV2(legacyHistory);
  addAntigravityProjection(providers, history);
  providers.providers = providers.providers.filter((provider) => provider.id !== 'claude');
  let result = await runGuard({ providers, history });
  assert.notEqual(result.status, 0);

  const unknownProviders = projectProvidersV2(legacyProviders);
  unknownProviders.providers.push({
    id: 'unapproved',
    label: 'Unapproved',
    observed_at: null,
    buckets: []
  });
  result = await runGuard({ providers: unknownProviders, history: projectHistoryV2(legacyHistory) });
  assert.notEqual(result.status, 0);
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

  const invalidWindowRange = projectHistoryV2(legacyHistory);
  const rangeRecord = invalidWindowRange.records[0];
  rangeRecord.windows[Object.keys(rangeRecord.windows)[0]] = 101;
  result = await runGuard({ providers: projectProvidersV2(legacyProviders), history: invalidWindowRange });
  assert.notEqual(result.status, 0);

  const invalidPeakRange = projectHistoryV2(legacyHistory);
  const peakRecord = invalidPeakRange.records[0];
  const peakWindow = Object.keys(peakRecord.windows)[0];
  peakRecord.reset_markers[peakWindow] = {
    detected: true,
    manual: false,
    pre_reset_peak_pct: 101,
    pre_reset_observed_at: '2026-10-04T11:34:56Z'
  };
  result = await runGuard({ providers: projectProvidersV2(legacyProviders), history: invalidPeakRange });
  assert.notEqual(result.status, 0);
});
