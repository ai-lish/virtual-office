const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const results = [];
  const consoleErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push('PAGEERROR: ' + err.message));

  const URL = 'https://ai-lish.github.io/virtual-office/dashboard.html';
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

  // Helper
  const pass = (item) => { results.push({ item, status: '✅ PASS', note: '' }); };
  const fail = (item, note) => { results.push({ item, status: '❌ FAIL', note }); };

  // ── 1. Page loads ──
  try {
    await page.waitForSelector('.tab-nav', { timeout: 10000 });
    pass('Page loads with tab nav');
  } catch(e) { fail('Page loads', e.message); }

  // ── 2. Tab structure ──
  const tabs = await page.$$eval('button.tab-btn', els => els.map(e => e.textContent.trim()));
  const expectedTabs = ['📜 配額歷史', '🤖 Copilot 使用明細', '📊 MiniMax 使用明細'];
  if (tabs.length === 3 && tabs.every((t,i) => t.includes(expectedTabs[i].split(' ')[0]))) {
    pass('Three tabs present: ' + tabs.join(', '));
  } else {
    fail('Three tabs', 'Got: ' + tabs.join(', '));
  }

  // ── 3. TabPanel class exists ──
  const tabPanelExists = await page.evaluate(() => typeof TabPanel !== 'undefined');
  if (tabPanelExists) pass('TabPanel class defined'); else fail('TabPanel class', 'Not found');

  // ── 4. QuotaHistory tab (default) ──
  try {
    await page.waitForSelector('#tab-history.active', { timeout: 5000 });
    pass('Quota History tab active by default');
  } catch(e) { fail('Quota History tab default', e.message); }

  // ── 5. QuotaPanel instance ──
  const histPagerExists = await page.evaluate(() => typeof histPager !== 'undefined' && histPager instanceof TabPanel);
  if (histPagerExists) pass('histPager (QuotaPanel) instance created'); else fail('histPager instance', 'Not found');

  // ── 6. QuotaHistory date filter ──
  try {
    const dateFilter = await page.$('#hist-date-filter');
    if (dateFilter) {
      const opts = await dateFilter.$$eval('option', els => els.map(e => e.value));
      pass('hist-date-filter present with ' + opts.length + ' options: ' + opts.slice(0,3).join(','));
    } else {
      fail('hist-date-filter', 'Not found');
    }
  } catch(e) { fail('hist-date-filter', e.message); }

  // ── 7. QuotaHistory pagination ──
  await page.waitForTimeout(2000); // wait for data load
  const histPaginationExists = await page.$('#hist-pagination');
  if (histPaginationExists) {
    const pgHTML = await histPaginationExists.innerHTML();
    const hasBtns = pgHTML.includes('‹') || pgHTML.includes('›') || pgHTML.includes('«');
    pass('hist-pagination element present' + (hasBtns ? ' with pagination controls' : ' (may be empty/no data)'));
  } else {
    fail('hist-pagination', 'Not found');
  }

  // ── 8. QuotaHistory stats boxes ──
  const statsBoxes = await page.$$('#hist-stats .stat-box');
  if (statsBoxes.length >= 4) pass('hist-stats 4 boxes present'); else fail('hist-stats', 'Got ' + statsBoxes.length);

  // ── 9. Tab: Copilot ──
  await page.click('button.tab-btn:has-text("Copilot")');
  await page.waitForTimeout(2000);
  const copilotActive = await page.$('#tab-copilot.active');
  if (copilotActive) pass('Copilot tab switches correctly'); else fail('Copilot tab switch', 'Panel not active');

  // ── 10. CopilotPanel instance ──
  const cpPagerExists = await page.evaluate(() => typeof copilotPager !== 'undefined' && copilotPager instanceof TabPanel);
  if (cpPagerExists) pass('copilotPager (CopilotPanel) instance created'); else fail('copilotPager instance', 'Not found');

  // ── 11. Copilot filter mode toggle ──
  const filterModeSel = await page.$('#cp-filter-mode');
  if (filterModeSel) {
    const vals = await filterModeSel.$$eval('option', els => els.map(e => e.value));
    if (vals.includes('month') && vals.includes('week') && vals.includes('date')) {
      pass('cp-filter-mode has month/week/date: ' + vals.join(','));
    } else {
      fail('cp-filter-mode options', 'Got: ' + vals.join(','));
    }
  } else {
    fail('cp-filter-mode', 'Not found');
  }

  // ── 12. Copilot filter mode switch ──
  try {
    await page.selectOption('#cp-filter-mode', 'week');
    await page.waitForTimeout(500);
    const weekPicker = await page.$('#cp-week-picker');
    const weekVisible = await weekPicker?.isVisible();
    if (weekVisible) pass('cp-filter-mode → week: week picker visible'); else fail('cp-filter-mode week', 'Week picker not visible');
    await page.selectOption('#cp-filter-mode', 'date');
    await page.waitForTimeout(500);
    const datePicker = await page.$('#cp-date-picker');
    const dateVisible = await datePicker?.isVisible();
    if (dateVisible) pass('cp-filter-mode → date: date picker visible'); else fail('cp-filter-mode date', 'Date picker not visible');
    await page.selectOption('#cp-filter-mode', 'month');
  } catch(e) { fail('cp-filter-mode switch', e.message); }

  // ── 13. Copilot pagination ──
  await page.waitForTimeout(2000);
  const cpPagination = await page.$('#cp-pagination');
  if (cpPagination) pass('cp-pagination element present'); else fail('cp-pagination', 'Not found');

  // ── 14. Tab: MiniMax ──
  await page.click('button.tab-btn:has-text("MiniMax")');
  await page.waitForTimeout(2000);
  const minimaxActive = await page.$('#tab-minimax.active');
  if (minimaxActive) pass('MiniMax tab switches correctly'); else fail('MiniMax tab switch', 'Panel not active');

  // ── 15. MinimaxPanel instance ──
  const tkPagerExists = await page.evaluate(() => typeof tokenPager !== 'undefined' && tokenPager instanceof TabPanel);
  if (tkPagerExists) pass('tokenPager (MinimaxPanel) instance created'); else fail('tokenPager instance', 'Not found');

  // ── 16. MiniMax filter mode ──
  const tkFilterMode = await page.$('#tk-filter-mode');
  if (tkFilterMode) {
    const vals = await tkFilterMode.$$eval('option', els => els.map(e => e.value));
    if (vals.includes('month') && vals.includes('week') && vals.includes('date')) {
      pass('tk-filter-mode has month/week/date');
    } else {
      fail('tk-filter-mode options', 'Got: ' + vals.join(','));
    }
  } else {
    fail('tk-filter-mode', 'Not found');
  }

  // ── 17. MiniMax model filter tabs ──
  const modelBtns = await page.$$('.model-filter-btn');
  if (modelBtns.length >= 4) {
    const labels = await Promise.all(modelBtns.map(b => b.textContent()));
    pass('Model filter buttons: ' + labels.map(l => l.trim()).join(', '));
  } else {
    fail('Model filter buttons', 'Expected >=4, got ' + modelBtns.length);
  }

  // ── 18. MiniMax model filter click ──
  try {
    const m27Btn = await page.$('.model-filter-btn[data-filter="M2.7"]');
    if (m27Btn) {
      await m27Btn.click();
      await page.waitForTimeout(500);
      const isActive = await m27Btn.evaluate(el => el.classList.contains('active'));
      if (isActive) pass('Model filter M2.7 click → active'); else fail('Model filter M2.7 click', 'Not active');
      const allBtn = await page.$('.model-filter-btn[data-filter="all"]');
      await allBtn?.click();
    } else {
      fail('Model filter M2.7 button', 'Not found');
    }
  } catch(e) { fail('Model filter M2.7 click', e.message); }

  // ── 19. Aggregation toggle ──
  const aggBtns = await page.$$('.agg-btn');
  if (aggBtns.length === 4) {
    const labels = await Promise.all(aggBtns.map(b => b.textContent()));
    pass('Aggregation toggle buttons: ' + labels.join(', '));
  } else {
    fail('Aggregation toggle buttons', 'Expected 4, got ' + aggBtns.length);
  }

  // ── 20. Aggregation mode switch ──
  try {
    const weeklyBtn = await page.$('#agg-weekly');
    if (weeklyBtn) {
      await weeklyBtn.click();
      await page.waitForTimeout(500);
      const isActive = await weeklyBtn.evaluate(el => el.classList.contains('active'));
      if (isActive) pass('agg-weekly click → active'); else fail('agg-weekly click', 'Not active');
    }
    const hourlyBtn = await page.$('#agg-hourly');
    await hourlyBtn?.click();
    await page.waitForTimeout(300);
    const hourlyActive = await hourlyBtn?.evaluate(el => el.classList.contains('active'));
    if (hourlyActive) pass('agg-hourly click → active'); else fail('agg-hourly click', 'Not active');
  } catch(e) { fail('agg mode switch', e.message); }

  // ── 21. MiniMax charts ──
  await page.waitForTimeout(1000);
  const trendChart = await page.$('#tk-trend-chart');
  if (trendChart) {
    const hasContent = await trendChart.evaluate(el => el.innerHTML.trim().length > 0);
    pass('tk-trend-chart rendered' + (hasContent ? ' with content' : ' (empty - no data)'));
  } else {
    fail('tk-trend-chart', 'Not found');
  }

  // ── 22. MiniMax pagination ──
  const tkPagination = await page.$('#tk-pagination');
  if (tkPagination) pass('tk-pagination element present'); else fail('tk-pagination', 'Not found');

  // ── 23. Tab switch back to QuotaHistory ──
  await page.click('button.tab-btn:has-text("配額歷史")');
  await page.waitForTimeout(1000);
  const backToHistory = await page.$('#tab-history.active');
  if (backToHistory) pass('Tab switch back to QuotaHistory'); else fail('Tab switch back', 'Panel not active');

  // ── 24. Console errors check ──
  const relevantErrors = consoleErrors.filter(e =>
    !e.includes('favicon') && !e.includes('fonts.googleapis') && !e.includes('404')
  );
  if (relevantErrors.length === 0) {
    pass('No console errors (excluding 404s/fonts)');
  } else {
    fail('Console errors', relevantErrors.slice(0,3).join(' | '));
  }

  // ── Summary ──
  console.log('\n=== SMOKE TEST RESULTS ===');
  results.forEach(r => {
    console.log(r.status + ' ' + r.item + (r.note ? ' → ' + r.note : ''));
  });
  const passed = results.filter(r => r.status.startsWith('✅')).length;
  const failed = results.filter(r => r.status.startsWith('❌')).length;
  console.log(`\nTotal: ${results.length} | ✅ ${passed} | ❌ ${failed}`);
  if (failed > 0) console.log('\nFAILED:');
  results.filter(r => r.status.startsWith('❌')).forEach(r => {
    console.log('  ❌ ' + r.item + ' → ' + r.note);
  });

  await browser.close();
})();
