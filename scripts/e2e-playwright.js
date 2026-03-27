const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const outDir = path.resolve(__dirname, '../artifacts');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const results = { console: [], requests: [], screenshots: [], downloads: [], errors: [] };

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();

    page.on('console', msg => {
      results.console.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', err => {
      results.errors.push({ type: 'pageerror', reason: String(err && err.stack ? err.stack : err) });
    });

    page.on('request', req => {
      results.requests.push({ url: req.url(), method: req.method(), started: Date.now() });
    });

    const targetUrl = process.argv[2] || 'https://ai-lish.github.io/virtual-office/public/pages/token-analysis.html';
    console.log('Visiting', targetUrl);
    const resp = await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });

    results.httpStatus = resp.status();

    // Wait for potential lazy-load
    await page.waitForTimeout(1500);

    // Screenshot
    const shotPath = path.join(outDir, 'token-analysis.png');
    await page.screenshot({ path: shotPath, fullPage: true });
    results.screenshots.push(shotPath);

    // Ensure summary and full JSON fetched by checking network requests (best-effort)
    // Playwright doesn't expose finished requests easily after the fact; we recorded request starts.

    // Test export JSON
    try {
      await page.selectOption('#export-format', 'json');
      const [ download ] = await Promise.all([
        page.waitForEvent('download', { timeout: 7000 }),
        page.click('#export-btn')
      ]);
      const dlPath = path.join(outDir, await download.suggestedFilename());
      await download.saveAs(dlPath);
      results.downloads.push(dlPath);
    } catch (e) {
      results.downloadError = String(e && e.stack ? e.stack : e.message);
    }

    // Save results file
    const outPath = path.join(outDir, 'e2e-playwright-results.json');
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    console.log('Results written to', outPath);

    await browser.close();
    process.exit(0);
  } catch (err) {
    try { results.errors.push({ type: 'main-exception', reason: String(err && err.stack ? err.stack : err) }); } catch (e) {}
    const outPath = path.join(outDir, 'e2e-playwright-results.json');
    try { fs.writeFileSync(outPath, JSON.stringify(results, null, 2)); } catch (e) {}
    if (browser) await browser.close();
    console.error('E2E failed', err);
    process.exit(1);
  }
})();
