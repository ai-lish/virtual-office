'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(__dirname, 'publish-manifest.json');

function fail(message) {
  throw new Error(`PUBLIC_SITE_BUILD_FAILED: ${message}`);
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
    fail(`${field} contains a non-literal or unsafe path: ${value}`);
  }
  if (value.split('/').some((part) => part === '' || part === '.')) {
    fail(`${field} contains a non-canonical path: ${value}`);
  }
}

function loadManifest() {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
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

  const requiredGenerated = ['.nojekyll', 'index.html', 'robots.txt', 'status.json'];
  if (JSON.stringify([...manifest.generatedFiles].sort()) !== JSON.stringify([...requiredGenerated].sort())) {
    fail('manifest.generatedFiles must contain exactly the approved generated files');
  }
  if (manifest.sourceFiles.length !== 0) {
    fail('this conservative first-round build does not copy source files');
  }
  return manifest;
}

function assertSafeOutputDirectory(siteDir) {
  if (!isInside(REPO_ROOT, siteDir) || path.basename(siteDir) !== 'site') {
    fail(`refusing to clean output outside repository root: ${siteDir}`);
  }
}

function roundToUtcHour(date = new Date()) {
  const rounded = new Date(date);
  rounded.setUTCMinutes(0, 0, 0);
  return rounded.toISOString();
}

function createPublicIndex() {
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Virtual Office</title>
  <style>
    :root { color-scheme: dark; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #101827; color: #e5edf7; }
    main { width: min(680px, calc(100% - 40px)); padding: 48px 0; }
    .card { border: 1px solid #334155; border-radius: 18px; padding: 32px; background: #172235; box-shadow: 0 20px 60px #0005; }
    h1 { margin: 0 0 12px; font-size: clamp(2rem, 6vw, 3.5rem); letter-spacing: -0.04em; }
    p { color: #b8c5d6; line-height: 1.7; }
    .badge { display: inline-block; margin-top: 16px; padding: 8px 12px; border-radius: 999px; background: #123d32; color: #9af0ce; font-size: .9rem; }
    footer { margin-top: 18px; color: #8291a6; font-size: .85rem; }
  </style>
</head>
<body>
  <main>
    <section class="card" aria-labelledby="title">
      <h1 id="title">Virtual Office</h1>
      <p>Public deployment shell. Operational dashboard and source data remain behind the private source boundary.</p>
      <span class="badge">Public site online</span>
      <footer>Build-time sanitized deployment</footer>
    </section>
  </main>
</body>
</html>
`;
}

function createPublicStatus() {
  // This is a literal public template. It deliberately does not read or transform
  // any operational JSON, quota, token, model, user, or provider data.
  return {
    schema_version: '1',
    generated_at: roundToUtcHour(),
    services: [
      { label: 'public-site', status: 'ok' }
    ]
  };
}

function writeText(filePath, content) {
  fs.writeFileSync(filePath, content, { encoding: 'utf8', mode: 0o644 });
}

function build() {
  const manifest = loadManifest();
  const siteDir = path.join(REPO_ROOT, manifest.publicRoot);
  assertSafeOutputDirectory(siteDir);

  fs.rmSync(siteDir, { recursive: true, force: true });
  fs.mkdirSync(siteDir, { recursive: true, mode: 0o755 });

  writeText(path.join(siteDir, 'index.html'), createPublicIndex());
  writeText(path.join(siteDir, 'status.json'), `${JSON.stringify(createPublicStatus(), null, 2)}\n`);
  writeText(path.join(siteDir, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  fs.writeFileSync(path.join(siteDir, '.nojekyll'), '', { encoding: 'utf8', mode: 0o644 });

  const outputFiles = manifest.generatedFiles.map((file) => path.join(siteDir, file));
  for (const filePath of outputFiles) {
    if (!fs.existsSync(filePath)) {
      fail(`approved generated file was not produced: ${path.relative(REPO_ROOT, filePath)}`);
    }
  }
  console.log(`Built ${outputFiles.length} allowlisted public files in ${path.relative(REPO_ROOT, siteDir)}/`);
  return siteDir;
}

function extractLocalReferences(html) {
  const references = [];
  const pattern = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  for (const match of html.matchAll(pattern)) {
    const reference = match[1].trim();
    if (!reference || reference.startsWith('#') || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(reference)) {
      continue;
    }
    references.push(reference.split(/[?#]/, 1)[0]);
  }
  return [...new Set(references)];
}

function audit(siteDir) {
  const indexPath = path.join(siteDir, 'index.html');
  const references = extractLocalReferences(fs.readFileSync(indexPath, 'utf8'));
  const missing = references.filter((reference) => !fs.existsSync(path.join(siteDir, reference)));
  if (missing.length > 0) {
    fail(`dangling local references: ${missing.join(', ')}`);
  }
  console.log(`Offline reference audit passed (${references.length} local reference(s)).`);
}

if (require.main === module) {
  try {
    const siteDir = build();
    if (process.argv.includes('--audit')) {
      audit(siteDir);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { audit, build, createPublicIndex, createPublicStatus, loadManifest };
