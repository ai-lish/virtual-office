#!/usr/bin/env node

import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outputPath = path.join(root, 'models.json');
const API_URL = 'https://api.minimax.io/v1/api/openplatform/coding_plan/remains';

function roundedUtcHour() {
  const now = new Date();
  now.setUTCMinutes(0, 0, 0);
  return now.toISOString();
}

function unavailableSnapshot() {
  return {
    schema_version: '1',
    generated_at: roundedUtcHour(),
    freshness: 'unavailable',
    models: []
  };
}

function safePercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 100) return null;
  return Math.round(number);
}

function safeModelName(value) {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return /^[A-Za-z0-9][A-Za-z0-9._ *-]{0,63}$/.test(name) ? name : null;
}

async function fetchSnapshot() {
  const key = process.env.MINIMAX_API_KEY;
  if (!key) return unavailableSnapshot();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(API_URL, {
      headers: { Authorization: `Bearer ${key}` },
      signal: controller.signal
    });
    if (!response.ok) return unavailableSnapshot();
    const body = await response.json();
    if (!Array.isArray(body?.model_remains)) return unavailableSnapshot();

    const names = new Set();
    const models = [];
    for (const item of body.model_remains) {
      const model = safeModelName(item?.model_name);
      const remaining = safePercent(item?.current_interval_remaining_percent);
      const weeklyRemaining = safePercent(item?.current_weekly_remaining_percent);
      if (!model || remaining === null || weeklyRemaining === null || names.has(model)) continue;
      names.add(model);
      models.push({
        model,
        interval_used_percent: 100 - remaining,
        weekly_used_percent: 100 - weeklyRemaining
      });
    }

    models.sort((left, right) => left.model.localeCompare(right.model));
    return {
      schema_version: '1',
      generated_at: roundedUtcHour(),
      freshness: 'live',
      models
    };
  } catch {
    return unavailableSnapshot();
  } finally {
    clearTimeout(timeout);
  }
}

const snapshot = await fetchSnapshot();
await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, { encoding: 'utf8', mode: 0o644 });
console.log(`Wrote sanitized model snapshot (${snapshot.freshness}, ${snapshot.models.length} model(s)).`);
