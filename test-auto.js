#!/usr/bin/env node
/**
 * Virtual Office 自动化测试脚本
 * 用法: node test-auto.js
 */

const { chromium } = require('playwright');

const TEST_CONFIG = {
    url: 'https://math-lish.github.io/virtual-office/',
    timeout: 30000,
    viewport: {
        desktop: { width: 1280, height: 800 },
        mobile: { width: 390, height: 844 },
        ipad: { width: 768, height: 1024 }
    }
};

const tests = {
    desktop: [
        { name: '3.1', test: '左側1/3目錄 + 右側2/3內容', check: 'sidebar' },
        { name: '3.2', test: '頂部固定Bar', check: 'top-bar' },
        { name: '3.3', test: '左側項目列表', check: 'project-list' },
        { name: '3.4', test: '點擊項目顯示詳情', check: 'click-project' },
        { name: '3.5', test: '選擇另一項目', check: 'click-another' },
        { name: '3.6', test: '時序線顯示', check: 'timeline' },
        { name: '3.7', test: '返回首頁', check: 'back-btn' },
        { name: '3.8', test: 'Logo點擊', check: 'logo' },
        { name: '3.9', test: '項目詳情內容', check: 'detail-content' },
        { name: '3.10', test: '項目連結', check: 'link' },
    ],
    mobile: [
        { name: '1.1', test: '開啟網頁', check: 'page-load' },
        { name: '1.2', test: '頂部Agent狀態', check: 'agent-bar' },
        { name: '1.3', test: '漢堡包按鈕', check: 'hamburger' },
        { name: '1.4', test: '點擊項目', check: 'click-project' },
        { name: '1.5', test: '返回首頁', check: 'back' },
    ],
    ipad: [
        { name: '2.1', test: '左1/3 + 右2/3', check: 'layout' },
        { name: '2.2', test: '頂部Agent', check: 'top-bar' },
        { name: '2.3', test: '項目列表', check: 'project-list' },
    ]
};

async function runTest(browser, config, testList) {
    const context = await browser.newContext({
        viewport: config.viewport
    });
    const page = await context.newPage();
    
    const results = [];
    
    try {
        console.log(`\n🧪 Testing: ${config.name} (${config.viewport.width}x${config.viewport.height})`);
        console.log('─'.repeat(50));
        
        await page.goto(TEST_CONFIG.url, { waitUntil: 'networkidle', timeout: TEST_CONFIG.timeout });
        
        for (const t of testList) {
            try {
                // Take screenshot before test
                await page.screenshot({ path: `test-results/${config.name}_${t.name}_before.png` });
                
                // Execute test based on check type
                let passed = false;
                
                switch (t.check) {
                    case 'sidebar':
                        const sidebar = await page.$('.sidebar');
                        const main = await page.$('.main-content');
                        passed = !!(sidebar && main);
                        break;
                        
                    case 'top-bar':
                        const topBar = await page.$('.top-bar');
                        passed = !!topBar;
                        break;
                        
                    case 'project-list':
                        const projects = await page.$$('.project-item');
                        passed = projects.length >= 7;
                        break;
                        
                    case 'click-project':
                        await page.click('.project-item:first-child');
                        await page.waitForTimeout(500);
                        const detail = await page.$('.detail-view.active');
                        passed = !!detail;
                        break;
                        
                    case 'click-another':
                        await page.click('.project-item:nth-child(2)');
                        await page.waitForTimeout(500);
                        const detail2 = await page.$('.detail-view.active');
                        passed = !!detail2;
                        break;
                        
                    case 'timeline':
                        const timeline = await page.$('.timeline');
                        passed = !!timeline;
                        break;
                        
                    case 'back-btn':
                        await page.click('#backBtn');
                        await page.waitForTimeout(500);
                        const home = await page.$('.home-view');
                        passed = !!home;
                        break;
                        
                    case 'logo':
                        await page.click('#logoBtn');
                        await page.waitForTimeout(500);
                        const home2 = await page.$('.home-view');
                        passed = !!home2;
                        break;
                        
                    case 'detail-content':
                        await page.click('.project-item:first-child');
                        await page.waitForTimeout(500);
                        const title = await page.$eval('#detailTitle', el => el.textContent);
                        passed = title.length > 0;
                        break;
                        
                    case 'hamburger':
                        const btn = await page.$('.mobile-menu-btn');
                        passed = !!btn;
                        break;
                        
                    case 'page-load':
                        const body = await page.$('body');
                        passed = !!body;
                        break;
                        
                    case 'agent-bar':
                        const agents = await page.$$('.agent-mini');
                        passed = agents.length >= 3;
                        break;
                        
                    case 'link':
                        await page.click('.project-item:first-child');
                        await page.waitForTimeout(500);
                        const link = await page.$('a[href*="math-lish.github.io"]');
                        passed = !!link;
                        break;
                        
                    case 'back':
                        await page.click('.project-item:first-child');
                        await page.waitForTimeout(500);
                        await page.click('#backBtn');
                        await page.waitForTimeout(500);
                        const home3 = await page.$('.home-view');
                        passed = !!home3;
                        break;
                        
                    case 'layout':
                        const sidebar2 = await page.$('.sidebar');
                        const main2 = await page.$('.main-content');
                        passed = !!(sidebar2 && main2);
                        break;
                }
                
                await page.screenshot({ path: `test-results/${config.name}_${t.name}_after.png` });
                
                results.push({
                    name: t.name,
                    test: t.test,
                    passed: passed,
                    status: passed ? '✅' : '❌'
                });
                
                console.log(`  ${t.name}. ${t.test}: ${passed ? '✅' : '❌'}`);
                
            } catch (err) {
                results.push({
                    name: t.name,
                    test: t.test,
                    passed: false,
                    error: err.message,
                    status: '❌'
                });
                console.log(`  ${t.name}. ${t.test}: ❌ (${err.message})`);
            }
        }
        
    } catch (err) {
        console.error('Page load error:', err.message);
    } finally {
        await context.close();
    }
    
    return results;
}

async function main() {
    console.log('🎯 Virtual Office 自动化测试');
    console.log('='.repeat(50));
    console.log(`URL: ${TEST_CONFIG.url}`);
    console.log('');
    
    // Create test results directory
    const fs = require('fs');
    if (!fs.existsSync('test-results')) {
        fs.mkdirSync('test-results');
    }
    
    const browser = await chromium.launch({ headless: true });
    const allResults = [];
    
    // Run desktop tests
    const desktopResults = await runTest(browser, { name: 'desktop', viewport: TEST_CONFIG.viewport.desktop }, tests.desktop);
    allResults.push(...desktopResults);
    
    // Run mobile tests
    const mobileResults = await runTest(browser, { name: 'mobile', viewport: TEST_CONFIG.viewport.mobile }, tests.mobile);
    allResults.push(...mobileResults);
    
    // Run iPad tests
    const ipadResults = await runTest(browser, { name: 'ipad', viewport: TEST_CONFIG.viewport.ipad }, tests.ipad);
    allResults.push(...ipadResults);
    
    await browser.close();
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 测试结果总结');
    console.log('='.repeat(50));
    
    const passed = allResults.filter(r => r.passed).length;
    const total = allResults.length;
    const failed = total - passed;
    
    console.log(`\n总测试: ${total}`);
    console.log(`通过: ${passed} ✅`);
    console.log(`失败: ${failed} ${failed > 0 ? '❌' : '✅'}`);
    console.log(`成功率: ${Math.round(passed/total*100)}%`);
    
    // Save report
    const report = {
        timestamp: new Date().toISOString(),
        url: TEST_CONFIG.url,
        summary: { total, passed, failed, rate: Math.round(passed/total*100) },
        results: allResults
    };
    
    fs.writeFileSync('test-results/report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 报告已保存到 test-results/report.json');
    
    // Exit with error code if failed
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
