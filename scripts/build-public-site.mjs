#!/usr/bin/env node

import { copyFile, lstat, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const manifest = JSON.parse(await readFile(path.join(root, 'publish.allowlist.json'), 'utf8'));
const siteRoot = path.resolve(root, manifest.publicRoot);

function assertSafeRelative(value, label) {
  if (typeof value !== 'string' || value.length === 0 || path.isAbsolute(value) || value.includes('..') || value.includes('\\') || value.split('/').some((part) => part === '' || part === '.')) {
    throw new Error(`${label} is not a safe relative path: ${value}`);
  }
}

function assertSafeHost(value) {
  if (typeof value !== 'string' || value.length === 0 || value !== value.toLowerCase() || /[/:?#\s*]/.test(value)) {
    throw new Error(`external host is not a bare lowercase hostname: ${value}`);
  }
}

if (manifest.version !== 2 || manifest.publicRoot !== 'site' || !Array.isArray(manifest.entries) || !Array.isArray(manifest.generatedFiles) || !Array.isArray(manifest.allowedExternalHosts)) {
  throw new Error('invalid publish manifest');
}

for (const host of manifest.allowedExternalHosts) assertSafeHost(host);

await rm(siteRoot, { recursive: true, force: true });
await mkdir(siteRoot, { recursive: true });

for (const entry of manifest.entries) {
  assertSafeRelative(entry.source, 'source');
  assertSafeRelative(entry.destination, 'destination');
  const sourcePath = path.resolve(root, entry.source);
  const destinationPath = path.resolve(siteRoot, entry.destination);
  const sourceStat = await lstat(sourcePath);
  if (!sourceStat.isFile() || sourceStat.isSymbolicLink()) throw new Error(`allowlisted source is not a regular file: ${entry.source}`);
  await mkdir(path.dirname(destinationPath), { recursive: true });
  await copyFile(sourcePath, destinationPath);
}

if (manifest.generatedFiles.length !== 1 || manifest.generatedFiles[0] !== '.nojekyll') throw new Error('generatedFiles must contain only .nojekyll');
await writeFile(path.join(siteRoot, '.nojekyll'), '');
console.log(`Built ${manifest.entries.length + manifest.generatedFiles.length} exact public files.`);
