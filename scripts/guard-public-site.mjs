#!/usr/bin/env node

import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const manifest = JSON.parse(await readFile(path.join(root, 'publish.allowlist.json'), 'utf8'));
const siteRoot = path.resolve(root, manifest.publicRoot);
const forbiddenName = /(?:^|\/)(?:.*\.map|.*(?:token|secret|credential|api[-_]?key|quota|usage|log).*|.*(?:\.bak|~))$/i;
const forbiddenContent = [
  /ghp_[A-Za-z0-9_]+/i,
  /github_pat_[A-Za-z0-9_]+/i,
  /\bsk-[A-Za-z0-9_-]{12,}\b/i,
  /\bxox[baprs]-[A-Za-z0-9-]{8,}\b/i,
  /-----BEGIN(?: [A-Z0-9]+)* PRIVATE KEY-----/,
  /script\.google(?:usercontent)?\.com\/macros/i,
  /(?:API_TOKEN|DISCORD_WEBHOOK_URL|MINIMAX_API_KEY|GITHUB_TOKEN)\s*=/i,
  /(?:google_api_key|firebaseConfig|spreadsheetId|driveId|memory\/data)/i
];

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
}

console.log(`Public-site guard passed (${files.length} exact files).`);
