#!/usr/bin/env node
/**
 * sync-secretary.js
 * 書記總結同步脚本
 * 每日23:00執行：讀取secretary-records.md → 生成精簡summary → 更新project-records.json
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORKSPACE = '/Users/zachli/.openclaw/workspace';
const SECRETARY_FILE = path.join(WORKSPACE, 'secretary-records.md');
const RECORDS_FILE = path.join(WORKSPACE, 'virtual-office', 'project-records.json');
const TIMELINE_FILE = path.join(WORKSPACE, 'virtual-office', 'project-timeline.json');
const STATUS_FILE = path.join(WORKSPACE, 'virtual-office', 'status.json');

// Project name mapping (secretary-records.md name -> virtual-office name)
const PROJECT_MAP = {
    '全方位學習日網站': '全方位學習日',
    '全方位學習日': '全方位學習日',
    'lsc-ole-s1-2026': '全方位學習日',
    '晞霖學習網站': '晞霖學習網站',
    'preschool': '晞霖學習網站',
    '少康教學網站': '少康教學網站',
    'ai-learning': '少康教學網站',
    '虛擬辦公室': '虛擬辦公室',
    'virtual-office': '虛擬辦公室'
};

function getToday() {
    return new Date().toISOString().split('T')[0];
}

function readSecretaryRecords() {
    if (!fs.existsSync(SECRETARY_FILE)) {
        console.log('No secretary records file found');
        return null;
    }
    return fs.readFileSync(SECRETARY_FILE, 'utf-8');
}

function parseTodayRecords(content) {
    const today = getToday();
    const lines = content.split('\n');
    
    let currentProject = null;
    let inTodaySection = false;
    let records = {};
    
    // Find today's section
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Match ## YYYY-MM-DD or ### YYYY-MM-DD
        if (line.match(/^#{1,3}\s*\d{4}-\d{2}-\d{2}/)) {
            const date = line.replace(/^#{1,3}\s*/, '').trim();
            inTodaySection = (date === today);
            continue;
        }
        
        if (!inTodaySection) continue;
        
        // Match ## Project Name
        if (line.match(/^#{2}\s*/)) {
            const projectName = line.replace(/^#{2}\s*/, '').trim();
            // Try to match with known projects
            currentProject = PROJECT_MAP[projectName] || projectName;
            if (!records[currentProject]) {
                records[currentProject] = [];
            }
        }
        
        // Match | # | 項目 | ... (table rows)
        if (line.match(/^\|/) && currentProject) {
            const parts = line.split('|').map(p => p.trim()).filter(p => p);
            if (parts.length >= 2 && parts[1] && parts[1] !== '#' && parts[1] !== '項目') {
                records[currentProject].push(parts[1]);
            }
        }
    }
    
    return records;
}

function generateSummary(records) {
    const summary = {
        lastSync: new Date().toISOString(),
        projects: {}
    };
    
    const allProjects = ['全方位學習日', '少康教學網站', '虛擬辦公室', '晞霖學習網站'];
    
    for (const project of allProjects) {
        const items = records[project] || [];
        
        // Determine status based on items
        let status = 'pending';
        if (items.length > 0) {
            status = 'active';
        }
        
        summary.projects[project] = {
            status: status,
            summary: items.length > 0 
                ? items.slice(0, 5).join('、') + (items.length > 5 ? '...' : '')
                : '記錄中...',
            next: items.length > 0 ? ['持續更新中'] : ['等指示']
        };
    }
    
    return summary;
}

function updateRecords(summary) {
    fs.writeFileSync(RECORDS_FILE, JSON.stringify(summary, null, 2), 'utf-8');
    console.log(`Updated ${RECORDS_FILE}`);
}

function loadTimeline() {
    if (!fs.existsSync(TIMELINE_FILE)) {
        console.log('No timeline file, creating new...');
        return {
            lastSync: new Date().toISOString(),
            projects: {}
        };
    }
    return JSON.parse(fs.readFileSync(TIMELINE_FILE, 'utf-8'));
}

function updateTimeline(records) {
    const timeline = loadTimeline();
    const today = getToday();
    
    const allProjects = ['全方位學習日', '少康教學網站', '虛擬辦公室', '晞霖學習網站'];
    
    for (const project of allProjects) {
        const items = records[project] || [];
        
        // Initialize project if not exists
        if (!timeline.projects[project]) {
            timeline.projects[project] = { timeline: [] };
        }
        
        // Add today's entry if there are new items
        if (items.length > 0) {
            // Check if already added today
            const todayEntry = timeline.projects[project].timeline.find(
                t => t.date === today && t.event.includes('書記')
            );
            
            if (!todayEntry) {
                // Add new entry at the beginning
                timeline.projects[project].timeline.unshift({
                    date: today,
                    event: '📝 書記總結',
                    detail: `更新項目狀態：${items.slice(0, 3).join('、')}${items.length > 3 ? '...' : ''}`
                });
            }
        }
    }
    
    timeline.lastSync = new Date().toISOString();
    fs.writeFileSync(TIMELINE_FILE, JSON.stringify(timeline, null, 2), 'utf-8');
    console.log(`Updated ${TIMELINE_FILE}`);
}

function gitCommit() {
    try {
        const timestamp = new Date().toLocaleString('zh-HK');
        execSync('git add project-records.json', { cwd: path.join(WORKSPACE, 'virtual-office') });
        execSync(`git commit -m "📝 Update project records - ${timestamp}"`, { cwd: path.join(WORKSPACE, 'virtual-office') });
        execSync('git push', { cwd: path.join(WORKSPACE, 'virtual-office') });
        console.log('Git commit and push successful');
    } catch (e) {
        console.log('Git commit failed:', e.message);
    }
}

function main() {
    console.log('=== 書記總結同步開始 ===');
    console.log(`時間: ${new Date().toLocaleString('zh-HK')}`);
    
    const content = readSecretaryRecords();
    if (!content) {
        console.log('No content to process');
        return;
    }
    
    const todayRecords = parseTodayRecords(content);
    console.log('今日記錄:', JSON.stringify(todayRecords, null, 2));
    
    const summary = generateSummary(todayRecords);
    updateRecords(summary);
    updateTimeline(todayRecords);
    gitCommit();
    
    console.log('=== 同步完成 ===');
}

main();
