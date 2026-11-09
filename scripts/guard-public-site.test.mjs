import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile, copyFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicFiles = ['index.html', 'history.html', 'providers.json', 'history.json', 'robots.txt', 'status.json', 'pedagogy/index.html', 'pedagogy/pedagogy.json'];
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
        windows: { ...bucket.windows },
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
      windows: { ...record.windows },
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

async function runGuard({ providers = legacyProviders, history = legacyHistory, overrides = {} } = {}) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'virtual-office-guard-'));
  try {
    await mkdir(path.join(tempRoot, 'scripts'));
    await copyFile(path.join(repoRoot, 'publish.allowlist.json'), path.join(tempRoot, 'publish.allowlist.json'));
    await copyFile(path.join(repoRoot, 'scripts/guard-public-site.mjs'), path.join(tempRoot, 'scripts/guard-public-site.mjs'));
    await copyFile(path.join(repoRoot, 'scripts/build-public-site.mjs'), path.join(tempRoot, 'scripts/build-public-site.mjs'));
    for (const file of publicFiles) {
      const destination = path.join(tempRoot, file);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, Object.hasOwn(overrides, file) ? overrides[file]
        : file === 'providers.json' ? JSON.stringify(providers)
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

test('builds and guards the nested pedagogy page and JSON from the exact allowlist', async () => {
  const result = await runGuard();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Public-site guard passed \(9 exact files\)/);
  const page = await readFile(path.join(repoRoot, 'pedagogy/index.html'), 'utf8');
  assert.match(page, /if\(item\.action\)addField\(card,'這一步要做甚麼',item\.action\)/);
});

test('restricts citation hosts to the pedagogy source field', async () => {
  const cards = JSON.parse(await readFile(path.join(repoRoot, 'pedagogy/pedagogy.json'), 'utf8'));
  cards[0].source = 'Reference [link](https://unlisted.example/paper)';
  let result = await runGuard({ overrides: { 'pedagogy/pedagogy.json': JSON.stringify(cards) } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /(?:external host is not in manifest allowlist|source URL is outside the exact source host allowlist)/);

  const validCards = JSON.parse(await readFile(path.join(repoRoot, 'pedagogy/pedagogy.json'), 'utf8'));
  validCards[0].theory += ' https://doi.org/10.1000/example';
  result = await runGuard({ overrides: { 'pedagogy/pedagogy.json': JSON.stringify(validCards) } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /may only contain external URLs in source/);

  const homepage = `${await readFile(path.join(repoRoot, 'index.html'), 'utf8')}\n<a href="https://doi.org/10.1000/example">external</a>`;
  result = await runGuard({ overrides: { 'index.html': homepage } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /external host is not in manifest allowlist/);
});

test('allows the verified Project Gutenberg Montessori source and excludes the incorrect LOC host', async () => {
  const manifest = JSON.parse(await readFile(path.join(repoRoot, 'publish.allowlist.json'), 'utf8'));
  const cards = JSON.parse(await readFile(path.join(repoRoot, 'pedagogy/pedagogy.json'), 'utf8'));
  assert.ok(manifest.allowedPedagogySourceHosts.includes('www.gutenberg.org'));
  assert.ok(!manifest.allowedPedagogySourceHosts.includes('tile.loc.gov'));
  assert.ok(cards.some((card) => card.source.includes('https://www.gutenberg.org/ebooks/39863')));
  const result = await runGuard();
  assert.equal(result.status, 0, result.stderr);
});

test('allows only the public ERIC record-id citation query shape', async () => {
  const cards = JSON.parse(await readFile(path.join(repoRoot, 'pedagogy/pedagogy.json'), 'utf8'));
  cards[0].source += ' [ERIC test](https://eric.ed.gov/?id=ED053419)';
  let result = await runGuard({ overrides: { 'pedagogy/pedagogy.json': JSON.stringify(cards) } });
  assert.equal(result.status, 0, result.stderr);

  cards[0].source = cards[0].source.replace('https://eric.ed.gov/?id=ED053419', 'https://eric.ed.gov/?id=private-student-id');
  result = await runGuard({ overrides: { 'pedagogy/pedagogy.json': JSON.stringify(cards) } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /identifier-like query parameter/);
});

test('rejects percent-encoded identifier-like query keys', async () => {
  const cards = JSON.parse(await readFile(path.join(repoRoot, 'pedagogy/pedagogy.json'), 'utf8'));
  cards[0].source += ' [encoded ERIC id](https://eric.ed.gov/?%69d=private-student-id)';
  let result = await runGuard({ overrides: { 'pedagogy/pedagogy.json': JSON.stringify(cards) } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /identifier-like query parameter/);

  const tokenCards = JSON.parse(await readFile(path.join(repoRoot, 'pedagogy/pedagogy.json'), 'utf8'));
  tokenCards[0].source += ' [encoded token](https://doi.org/paper?%74oken=private-value)';
  result = await runGuard({ overrides: { 'pedagogy/pedagogy.json': JSON.stringify(tokenCards) } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /identifier-like query parameter/);

  const homepage = `${await readFile(path.join(repoRoot, 'index.html'), 'utf8')}\n<a href="https://ai-lish.github.io/?%69d=private-value">test</a>`;
  result = await runGuard({ overrides: { 'index.html': homepage } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /identifier-like query parameter/);
});

test('keeps the pedagogy projection schema closed', async () => {
  const cards = JSON.parse(await readFile(path.join(repoRoot, 'pedagogy/pedagogy.json'), 'utf8'));
  cards[0].private_note = 'must not publish';
  const result = await runGuard({ overrides: { 'pedagogy/pedagogy.json': JSON.stringify(cards) } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /pedagogy card 1 contains unknown or missing keys/);
});

test('accepts only the approved secondary and K2 pedagogy levels', async () => {
  const cards = JSON.parse(await readFile(path.join(repoRoot, 'pedagogy/pedagogy.json'), 'utf8'));
  const k2Cards = cards.filter((card) => card.level === 'k2');
  assert.ok(k2Cards.length > 0);
  assert.ok(cards.filter((card) => card.level === 'secondary').length > 0);
  const validResult = await runGuard({ overrides: { 'pedagogy/pedagogy.json': JSON.stringify(cards) } });
  assert.equal(validResult.status, 0, validResult.stderr);

  cards[0].level = 'preschool';
  const invalidResult = await runGuard({ overrides: { 'pedagogy/pedagogy.json': JSON.stringify(cards) } });
  assert.notEqual(invalidResult.status, 0);
  assert.match(invalidResult.stderr, /pedagogy card 1 has an invalid level/);
});

test('pedagogy guard accepts 1000 cards and rejects larger catalogs', async () => {
  const cards = JSON.parse(await readFile(path.join(repoRoot, 'pedagogy/pedagogy.json'), 'utf8'));
  const maximum = Array.from({ length: 1000 }, (_, index) => ({ ...cards[index % cards.length] }));
  let result = await runGuard({ overrides: { 'pedagogy/pedagogy.json': JSON.stringify(maximum) } });
  assert.equal(result.status, 0, result.stderr);

  maximum.push({ ...cards[0] });
  result = await runGuard({ overrides: { 'pedagogy/pedagogy.json': JSON.stringify(maximum) } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /between 1 and 1000 method cards/);
});

test('pedagogy guard enforces a 1 MiB JSON size limit', async () => {
  const cards = JSON.parse(await readFile(path.join(repoRoot, 'pedagogy/pedagogy.json'), 'utf8'));
  const card = cards[0];
  const oversized = Array.from({ length: 140 }, () => ({ ...card, example: 'x'.repeat(8000) }));
  const content = JSON.stringify(oversized);
  assert.ok(Buffer.byteLength(content, 'utf8') > 1024 * 1024);
  const result = await runGuard({ overrides: { 'pedagogy/pedagogy.json': content } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /exceeds the 1048576-byte limit/);
});

test('pedagogy guard accepts exactly 1 MiB and rejects one byte more', async () => {
  const cards = JSON.parse(await readFile(path.join(repoRoot, 'pedagogy/pedagogy.json'), 'utf8'));
  const content = JSON.stringify(cards);
  const exact = `${content}${' '.repeat(1024 * 1024 - Buffer.byteLength(content))}`;
  assert.equal(Buffer.byteLength(exact), 1024 * 1024);
  let result = await runGuard({ overrides: { 'pedagogy/pedagogy.json': exact } });
  assert.equal(result.status, 0, result.stderr);

  result = await runGuard({ overrides: { 'pedagogy/pedagogy.json': `${exact} ` } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /exceeds the 1048576-byte limit/);
});

test('rejects private canonical paths and a missing homepage pedagogy link', async () => {
  const page = `${await readFile(path.join(repoRoot, 'pedagogy/index.html'), 'utf8')}\n<!-- skills/shared/lesson-observation -->`;
  let result = await runGuard({ overrides: { 'pedagogy/index.html': page } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /pedagogy\/index.html contains a private path/);

  const k2PathPage = `${await readFile(path.join(repoRoot, 'pedagogy/index.html'), 'utf8')}\n<!-- skills/shared/k2-observation -->`;
  result = await runGuard({ overrides: { 'pedagogy/index.html': k2PathPage } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /pedagogy\/index.html contains a private path/);

  const homepage = (await readFile(path.join(repoRoot, 'index.html'), 'utf8'))
    .replace('href="/virtual-office/pedagogy/"', 'href="/virtual-office/missing/"');
  result = await runGuard({ overrides: { 'index.html': homepage } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /index.html is missing the pedagogy page link/);
});

test('accepts the seven-provider deployment with Claude account 2 and without Grok Bot', async () => {
  const providers = projectProvidersV2(legacyProviders);
  const history = projectHistoryV2(legacyHistory);
  providers.providers = providers.providers.filter((provider) => provider.id !== 'grok-bot');
  history.records = history.records.filter((record) => record.provider !== 'grok-bot');
  addAntigravityProjection(providers, history);
  addClaude2Projection(providers);
  assert.deepEqual(providers.providers.map((provider) => provider.id).sort(), [
    'antigravity', 'chatgpt', 'claude', 'claude-2', 'copilot', 'gemini', 'minimax'
  ]);
  const result = await runGuard({ providers, history });
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
  providers.providers = providers.providers.filter((provider) => provider.id !== 'claude-2');
  history.records = history.records.filter((record) => record.provider !== 'claude-2');
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

function addGrokBotProjection(providers, history, sevenDay = 2.2) {
  providers.providers = providers.providers.filter((provider) => provider.id !== 'grok-bot');
  history.records = history.records.filter((record) => record.provider !== 'grok-bot');
  const observedAt = '2026-11-01T12:58:00Z';
  const marker = {
    detected: true,
    manual: false,
    pre_reset_peak_pct: 88.8,
    pre_reset_observed_at: '2026-10-31T12:58:00Z'
  };
  providers.providers.push({
    id: 'grok-bot',
    label: 'Grok Bot',
    observed_at: observedAt,
    buckets: [{
      bucket: 'account',
      manual_resets_remaining: null,
      windows: { seven_day: sevenDay },
      resets_at: { seven_day: '2026-11-02T11:44:00Z' },
      reset_markers: { seven_day: { ...marker } }
    }]
  });
  history.records.push({
    provider: 'grok-bot',
    bucket: 'account',
    period: 'native',
    observed_at: observedAt,
    windows: { seven_day: sevenDay },
    resets_at: { seven_day: '2026-11-02T11:44:00Z' },
    reset_markers: { seven_day: { ...marker } },
    manual_resets_remaining: null
  });
}

function addClaude2Projection(providers) {
  // The live providers.json fixture may already carry Claude account 2.
  if (providers.providers.some((provider) => provider.id === 'claude-2')) return;
  providers.providers.push({ id: 'claude-2', label: 'Claude（帳號 2）', observed_at: null, buckets: [] });
}

function grokBotProjection() {
  const providers = projectProvidersV2(legacyProviders);
  const history = projectHistoryV2(legacyHistory);
  addAntigravityProjection(providers, history);
  addClaude2Projection(providers);
  addGrokBotProjection(providers, history);
  return { providers, history };
}

test('accepts all eight providers with one-decimal Grok Bot windows and reset peaks', async () => {
  const { providers, history } = grokBotProjection();
  assert.deepEqual(providers.providers.map((provider) => provider.id).sort(), [
    'antigravity', 'chatgpt', 'claude', 'claude-2', 'copilot', 'gemini', 'grok-bot', 'minimax'
  ]);
  const result = await runGuard({ providers, history });
  assert.equal(result.status, 0, result.stderr);
});

for (const source of ['providers', 'history']) {
  const target = ({ providers, history }) => source === 'providers'
    ? providers.providers.find((provider) => provider.id === 'grok-bot').buckets[0]
    : history.records.find((record) => record.provider === 'grok-bot');

  test(`rejects Grok Bot two-decimal window percentages in ${source}.json`, async () => {
    const projection = grokBotProjection();
    target(projection).windows.seven_day = 2.25;
    const result = await runGuard(projection);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, new RegExp(`${source}\\.json Grok Bot window values must be percentages with at most one decimal place`));
  });

  test(`rejects Grok Bot two-decimal reset peaks in ${source}.json`, async () => {
    const projection = grokBotProjection();
    target(projection).reset_markers.seven_day.pre_reset_peak_pct = 88.88;
    const result = await runGuard(projection);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, new RegExp(`${source}\\.json reset peak is invalid`));
  });

  for (const window of ['five_hour', 'monthly']) {
    test(`rejects the Grok Bot ${window} window in ${source}.json`, async () => {
      const projection = grokBotProjection();
      const record = target(projection);
      record.windows[window] = 1;
      record.resets_at[window] = null;
      record.reset_markers[window] = {
        detected: false, manual: false, pre_reset_peak_pct: null, pre_reset_observed_at: null
      };
      const result = await runGuard(projection);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, new RegExp(`${source}\\.json Grok Bot records must contain only the seven_day window`));
    });
  }
}

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
  const { providers, history } = grokBotProjection();
  providers.providers = providers.providers.filter((provider) => provider.id !== 'claude-2');
  let result = await runGuard({ providers, history });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /providers\.json must list exactly the approved providers/);

  const unknownProviders = grokBotProjection();
  const provider = unknownProviders.providers.providers.find((provider) => provider.id === 'grok-bot');
  provider.id = 'unapproved';
  provider.label = 'Unapproved';
  result = await runGuard(unknownProviders);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /providers\.json contains an unknown, relabelled or duplicate provider/);

  const unknownHistory = grokBotProjection();
  unknownHistory.history.records.find((record) => record.provider === 'grok-bot').provider = 'unapproved';
  result = await runGuard(unknownHistory);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /history\.json contains an unknown provider/);
});

test('rejects relabelled and duplicate Grok Bot providers', async () => {
  const relabelled = grokBotProjection();
  relabelled.providers.providers.find((provider) => provider.id === 'grok-bot').label = 'Grok';
  let result = await runGuard(relabelled);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /providers\.json contains an unknown, relabelled or duplicate provider/);

  const duplicate = grokBotProjection();
  duplicate.providers.providers[0] = duplicate.providers.providers.find((provider) => provider.id === 'grok-bot');
  result = await runGuard(duplicate);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /providers\.json contains an unknown, relabelled or duplicate provider/);
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
