const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const outDir = path.resolve(__dirname, '../artifacts');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const results = { console: [], requests: [], screenshots: [], downloads: [], errors: [] };

  // Global handlers to capture unhandled rejections / exceptions
  process.on('unhandledRejection', (reason) => {
    try { results.errors.push({ type: 'unhandledRejection', reason: String(reason) }); } catch (e) {}
  });
  process.on('uncaughtException', (err) => {
    try { results.errors.push({ type: 'uncaughtException', reason: String(err && err.stack ? err.stack : err) }); } catch (e) {}
  });

  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    // Capture console
    page.on('console', msg => {
      try {
        const args = msg.args().map(a => a._remoteObject?.value);
        results.console.push({ type: msg.type(), text: msg.text(), args });
      } catch (e) {
        results.console.push({ type: msg.type(), text: msg.text() });
      }
    });

    // Capture page errors
    page.on('pageerror', err => {
      results.errors.push({ type: 'pageerror', reason: String(err && err.stack ? err.stack : err) });
    });
    page.on('error', err => {
      results.errors.push({ type: 'page-err', reason: String(err && err.stack ? err.stack : err) });
    });

    // Track request timing
    const inflight = new Map();
    page.on('request', req => {
      try { inflight.set(req._requestId, { url: req.url(), method: req.method(), start: Date.now() }); } catch (e) {}
    });
    page.on('requestfinished', async req => {
      try {
        const id = req._requestId;
        const info = inflight.get(id) || { url: req.url(), method: req.method(), start: Date.now() };
        const res = req.response();
        const status = res ? res.status() : null;
        const headers = res ? res.headers() : {};
        const size = res && res.headers()['content-length'] ? parseInt(res.headers()['content-length']) : null;
        const entry = { url: info.url, method: info.method, status, durationMs: Date.now() - info.start, headers, size };
        results.requests.push(entry);
        inflight.delete(id);
      } catch (e) {
        // ignore
      }
    });
    
    page.on('requestfailed', req => {
      try {
        const id = req._requestId;
        const info = inflight.get(id) || { url: req.url(), method: req.method(), start: Date.now() };
        results.requests.push({ url: info.url, method: info.method, status: 'failed', durationMs: Date.now() - info.start });
        inflight.delete(id);
      } catch (e) {}
    });

    // Prepare download behavior (guarded)
    const downloadsPath = path.resolve(outDir, 'downloads');
    if (!fs.existsSync(downloadsPath)) fs.mkdirSync(downloadsPath, { recursive: true });
    try {
      const client = await page.target().createCDPSession();
      await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadsPath });
    } catch (e) {
      results.errors.push({ type: 'download-setup', reason: String(e && e.stack ? e.stack : e) });
    }

    const targetUrl = process.argv[2] || 'https://ai-lish.github.io/virtual-office/public/pages/token-analysis.html';
    console.log('Visiting', targetUrl);
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 90000 });

    // Wait a bit for lazy loads
    await page.waitForTimeout(1500);

    // Screenshot full page (guarded)
    try {
      const shotPath = path.join(outDir, 'token-analysis.png');
      await page.screenshot({ path: shotPath, fullPage: true });
      results.screenshots.push(shotPath);
    } catch (e) {
      results.errors.push({ type: 'screenshot', reason: String(e && e.stack ? e.stack : e) });
    }

    // Click export (JSON) and wait for a file to appear
    try {
      await page.select('#export-format', 'json');
      await page.click('#export-btn');
      // wait up to 7s for download
      let downloaded = false;
      for (let i = 0; i < 14; i++) {
        const files = fs.readdirSync(downloadsPath);
        if (files.length > 0) {
          results.downloads = files.map(f => path.join(downloadsPath, f));
          downloaded = true;
          break;
        }
        await page.waitForTimeout(500);
      }
      results.exported = downloaded;
    } catch (e) {
      results.exported = false;
      results.exportError = String(e && e.stack ? e.stack : e);
    }

    // Interact with date inputs: set blank then test
    try {
      const start = await page.$('#start-date');
      const end = await page.$('#end-date');
      if (start && end) {
        await page.evaluate(() => { document.getElementById('start-date').value = ''; document.getElementById('end-date').value = ''; });
        await page.waitForTimeout(300);
      }
    } catch (e) {
      results.errors.push({ type: 'date-interact', reason: String(e && e.stack ? e.stack : e) });
    }

    // Save results
    const outPath = path.join(outDir, 'e2e-results.json');
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    console.log('Results written to', outPath);

    await browser.close();
  } catch (err) {
    try {
      results.errors.push({ type: 'main-exception', reason: String(err && err.stack ? err.stack : err) });
      const outPath = path.join(outDir, 'e2e-results.json');
      fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    } catch (e) {}
    if (browser) await browser.close();
    process.exit(1);
  }

  process.exit(0);
})();
