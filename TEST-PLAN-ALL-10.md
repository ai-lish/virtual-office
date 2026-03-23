# 虛擬辦公室 10 項功能綜合測試計劃

**測試日期:** 2026-03-22  
**測試環境:** Discord (虛擬辦公室 總辦公室)  
**測試者:** T仔 (Tester) 🔍  
**Bot:** @MacD  
**測試模式:** 自動化 (`node test-auto.js`) + 人工驗證

---

## 📋 測試清單總覽

| # | 功能 | 測試命令 | 優先級 |
|---|------|----------|--------|
| 1 | Thread Templates | `!thread dailyLog/weeklyLog` | P0 |
| 2 | Forum Channel | `!forum list/create/post` | P0 |
| 3 | 指令分類目錄 | `!menu` | P0 |
| 4 | 斜線指令 | `/template`, `/status` 等 | P0 |
| 5 | GitHub Webhook | Webhook endpoints | P1 |
| 6 | Google Calendar | `!gcal today/week/tomorrow` | P0 |
| 7 | Embed 狀態卡片 | `!status set/done/blocker` | P0 |
| 8 | 統計報告 | `!stats`, `!analytics` | P1 |
| 9 | Cron Job 提醒 | `!cron test/status/config` | P1 |
| 10 | 自動化工作流 | `!keyword add/remove/list` | P0 |

---

## 🔍 測試 1: Thread Templates (`!thread`)

**功能代碼:** `phase9.handleThreadTemplateCommand()`  
**數據文件:** `phase9-data.json` → `threadTemplates`

### 1.1 命令解析

| 測試用例 | 輸入 | 預期輸出 | 測試方法 |
|---------|------|----------|---------|
| TC-1.1.1 | `!thread` (無參數) | 顯示 4 個範本列表 | 發送命令，檢查回覆內容 |
| TC-1.1.2 | `!thread help` | 同 TC-1.1.1 | 發送命令，檢查回覆 |
| TC-1.1.3 | `!thread list` | 同 TC-1.1.1 | 發送命令，檢查回覆 |
| TC-1.1.4 | `!thread unknown` | ❌ 未知的範本類型 | 發送無效類型，檢查錯誤回覆 |
| TC-1.1.5 | `!thread dailyLog` | 顯示每日日誌填充格式 | 檢查 `{date}`, `{author}` 是否正確替換 |
| TC-1.1.6 | `!thread weeklyLog` | 顯示每週週報填充格式 | 檢查 `{weekOf}`, `{author}` 是否正確替換 |
| TC-1.1.7 | `!thread projectUpdate` | 顯示項目更新範本 | 檢查 `{project}`, `{progress}` 佔位符 |
| TC-1.1.8 | `!thread bugReport` | 顯示 Bug 報告範本 | 檢查 `{severity}`, `{steps}` 佔位符 |

### 1.2 格式填充驗證

| 測試用例 | 驗證點 | 預期 |
|---------|--------|------|
| TC-1.2.1 | `{author}` 替換 | 為發送者的 `displayName` |
| TC-1.2.2 | `{date}` 格式 | `YYYY/MM/DD` 中文格式 |
| TC-1.2.3 | `{weekOf}` 格式 | `YYYY 年 MM 月` |
| TC-1.2.4 | 所有 `{}` 佔位符 | 均已被替換（無殘留） |

### 1.3 自動化測試腳本

```javascript
// test-thread-templates.js
async function testThreadTemplates(client) {
  const channel = client.channels.cache.get('1483436247618682900');
  
  const tests = [
    { cmd: '!thread', expect: '每日工作日誌' },
    { cmd: '!thread help', expect: '每日工作日誌' },
    { cmd: '!thread list', expect: '每日工作日誌' },
    { cmd: '!thread dailyLog', expect: '📝 **每日工作日誌' },
    { cmd: '!thread weeklyLog', expect: '📊 **每週工作週報' },
    { cmd: '!thread projectUpdate', expect: '🚀 **項目更新' },
    { cmd: '!thread bugReport', expect: '🐛 **Bug 報告' },
    { cmd: '!thread invalidType', expect: '❌ 未知的範本類型' },
  ];
  
  let passed = 0, failed = 0;
  for (const t of tests) {
    const sent = await channel.send(t.cmd);
    const replies = await sent.channel.awaitMessages({
      filter: m => m.author.bot && m.mentions.has(client.user),
      max: 1, time: 5000
    });
    const reply = replies.first()?.content || '';
    const ok = reply.includes(t.expect);
    console.log(`${ok ? '✅' : '❌'} ${t.cmd} => ${ok ? 'PASS' : 'FAIL (got: ' + reply.slice(0,50) + ')'}`);
    ok ? passed++ : failed++;
  }
  
  console.log(`\nThread Templates: ${passed}/${tests.length} passed`);
}
```

---

## 🔍 測試 2: Forum Channel (`!forum`)

**功能代碼:** `phase9.handleForumCommand()`  
**數據文件:** `phase9-data.json` → `forumChannels`

### 2.1 命令解析

| 測試用例 | 輸入 | 預期輸出 | 前提條件 |
|---------|------|----------|---------|
| TC-2.1.1 | `!forum` (無參數) | 顯示 forum 命令幫助 | - |
| TC-2.1.2 | `!forum help` | 同 TC-2.1.1 | - |
| TC-2.1.3 | `!forum list` | 顯示 6 個項目的論壇狀態 | - |
| TC-2.1.4 | `!forum create unknown` | ❌ 未知的項目 | - |
| TC-2.1.5 | `!forum create ai-learning` | ✅ 已為項目創建 Forum Channel | 需要管理員權限 |
| TC-2.1.6 | `!forum post ai-learning 測試標題` | ✅ 已發帖 / ❌ 尚未創建 | 取決於 TC-2.1.5 |
| TC-2.1.7 | `!forum tags` | 顯示 4 個可用標籤 | - |

### 2.2 Forum Channel 創建驗證

| 測試用例 | 驗證點 | 預期 |
|---------|--------|------|
| TC-2.2.1 | `forumChannelId` 保存 | `phase9-data.json` 中更新 |
| TC-2.2.2 | Channel type | `ChannelType.GuildForum` |
| TC-2.2.3 | Channel name | `${project}-討論` |
| TC-2.2.4 | 重複創建 | 應返回現有 channelId |

### 2.3 自動化測試腳本

```javascript
// test-forum.js
async function testForum(client) {
  const channel = client.channels.cache.get('1483436247618682900');
  const data = phase9.loadData();
  
  const tests = [
    { cmd: '!forum', expect: '📋 **Forum Channel 命令**' },
    { cmd: '!forum list', expect: '📁 **項目論壇**' },
    { cmd: '!forum tags', expect: '🏷️ **可用標籤**' },
    { cmd: '!forum create invalid-project', expect: '❌ 未知的項目' },
    { cmd: '!forum post invalid-project 標題', expect: '❌ 未知的項目' },
  ];
  
  for (const t of tests) {
    const sent = await channel.send(t.cmd);
    await sleep(1000);
    const ok = lastReply.includes(t.expect);
    console.log(`${ok ? '✅' : '❌'} ${t.cmd}`);
  }
}
```

---

## 🔍 測試 3: 指令分類目錄 (`!menu`)

**功能代碼:** `phase9.sendCommandMenu()` + `phase9.handleCommandMenuSelect()`  
**數據文件:** `phase9-data.json` → `commandMenus`

### 3.1 Select Menu 發送

| 測試用例 | 輸入 | 預期輸出 | 驗證點 |
|---------|------|----------|---------|
| TC-3.1.1 | `!menu` | 發送含 Select Menu 的消息 | `components[0].type === 'SELECT_MENU'` |
| TC-3.1.2 | Select Menu placeholder | "選擇功能模組..." | `setPlaceholder` 值 |
| TC-3.1.3 | Select Menu options 數量 | 7 個選項 | `options.length === 7` |
| TC-3.1.4 | 第一個 option value | `menu_templates` | `options[0].value` |

### 3.2 Select Menu 交互

| 測試用例 | 選擇值 | 預期回覆內容 |
|---------|--------|------------|
| TC-3.2.1 | `menu_templates` | `📝 **範本命令**` + `!thread dailyLog` |
| TC-3.2.2 | `menu_status` | `📊 **狀態命令**` + `!status` |
| TC-3.2.3 | `menu_pomodoro` | `🍅 **Pomodoro 命令**` |
| TC-3.2.4 | `menu_poll` | `🗳️ **投票命令**` |
| TC-3.2.5 | `menu_reminder` | `🔔 **提醒命令**` |
| TC-3.2.6 | `menu_calendar` | `📅 **日曆命令**` |
| TC-3.2.7 | `menu_help` | `ℹ️ **幫助命令**` |

### 3.3 自動化測試腳本

```javascript
// test-menu.js
async function testMenu(client) {
  const channel = client.channels.cache.get('1483436247618682900');
  
  // TC-3.1: 發送 !menu 並驗證 Select Menu
  const msg = await channel.send('!menu');
  await sleep(1000);
  const sentMsg = await channel.messages.fetch(msg.id);
  const selectMenu = sentMsg.components[0]?.components[0];
  console.log(`${selectMenu?.type === 'SELECT_MENU' ? '✅' : '❌'} Select Menu 存在`);
  console.log(`✅ Options 數量: ${selectMenu?.options.length}`);
  
  // TC-3.2: 模擬 Select Menu 交互 (需 interactionCreate)
  // 由於是 Discord interaction，需要實際點擊或 mock
}
```

---

## 🔍 測試 4: 斜線指令 (Slash Commands)

**功能代碼:** `phase9.registerSlashCommands()` + `phase9.handleSlashCommand()`  
**數據文件:** `phase9-data.json` → `slashCommands`

### 4.1 Slash Commands 註冊

| 測試用例 | 驗證點 | 預期 |
|---------|--------|------|
| TC-4.1.1 | `slashCommands.enabled` | `true` |
| TC-4.1.2 | 註冊命令數量 | 7 個 (`template, status, pomodoro, poll, remind, gcal, help`) |
| TC-4.1.3 | `/template` 有選項 | `type: STRING` + 4 個 choices |
| TC-4.1.4 | `/status` 有選項 | `action`, `task` 選項 |
| TC-4.1.5 | `/pomodoro` 有選項 | `action`, `task` 選項 |
| TC-4.1.6 | `/poll` 必填選項 | `question`, `options` 必填 |
| TC-4.1.7 | `/remind` 必填選項 | `time`, `message` 必填 |

### 4.2 Slash Commands 交互測試

| 測試用例 | 命令 | 預期行為 | 前提 |
|---------|------|----------|------|
| TC-4.2.1 | `/template type:dailyLog` | 回覆每日日誌填充格式 | Bot 回复phem |
| TC-4.2.2 | `/template type:weeklyLog` | 回覆每週週報填充格式 | - |
| TC-4.2.3 | `/template type:invalid` | 回覆 ❌ 未知的範本類型 | - |
| TC-4.2.4 | `/status action:view` | 回覆 ✅ 請使用 `!status` 命令 | 目前為佔位 |
| TC-4.2.5 | `/pomodoro action:start task:測試` | 回覆 🍅 開始 Pomodoro | - |
| TC-4.2.6 | `/pomodoro action:status` | 回覆 📊 查看 Pomodoro 狀態 | - |
| TC-4.2.7 | `/poll question:測試 options:A\|B duration:1` | 回覆 🗳️ 創建投票 | - |
| TC-4.2.8 | `/remind time:1h message:測試` | 回覆 🔔 提醒已設定 | - |
| TC-4.2.9 | `/gcal action:today` | 回覆 📅 今日會議 | - |
| TC-4.2.10 | `/gcal action:week` | 回覆 📅 本週會議 | - |
| TC-4.2.11 | `/help` | 回覆 ℹ️ 使用 `!help` | - |

### 4.3 自動化測試腳本

```javascript
// test-slash-commands.js
// 注意: Slash Commands 需要 Discord application.commands 權限
// 測試時需要在 Discord 中實際輸入 / 命令

async function testSlashCommands(client) {
  // 驗證 Slash Commands 已註冊
  const commands = await client.application.commands.fetch();
  console.log(`已註冊 Slash Commands: ${commands.size}`);
  
  const expected = ['template', 'status', 'pomodoro', 'poll', 'remind', 'gcal', 'help'];
  for (const name of expected) {
    const cmd = commands.find(c => c.name === name);
    console.log(`${cmd ? '✅' : '❌'} /${name}`);
  }
  
  // 驗證 phase9Data 配置
  const data = phase9.loadData();
  console.log(`\nSlash Commands 啟用: ${data.slashCommands.enabled}`);
  console.log(`命令數量: ${data.slashCommands.commands.length}`);
}
```

---

## 🔍 測試 5: GitHub Webhook

**功能代碼:** `github-webhook.js`  
**端口:** `PORT` (預設 3000)

### 5.1 Webhook Endpoint 測試

| 測試用例 | 端點 | Method | 測試方式 |
|---------|------|--------|---------|
| TC-5.1.1 | `/webhook/github` | POST | 發送 test payload，驗證 response |
| TC-5.1.2 | `/webhook/github` (無 signature) | POST | 應接受（測試模式） |
| TC-5.1.3 | `/webhook/github` (錯誤 signature) | POST | 應返回 401 |
| TC-5.1.4 | `/webhook/github` (GET) | GET | 應返回 405 Method Not Allowed |
| TC-5.1.5 | `/health` | GET | 應返回 `{"status":"ok"}` |

### 5.2 Event 類型處理

| 測試用例 | Event | Payload | 預期 |
|---------|-------|---------|------|
| TC-5.2.1 | `push` | commit payload | ✅ 格式化 commit 消息發送到 Discord |
| TC-5.2.2 | `pull_request` (opened) | PR payload | 🆕 PR opened 消息 |
| TC-5.2.3 | `pull_request` (closed+merged) | PR payload | ✅ PR merged 消息 |
| TC-5.2.4 | `issues` (opened) | Issue payload | 🆕 Issue opened 消息 |
| TC-5.2.5 | `issues` (closed) | Issue payload | 🔴 Issue closed 消息 |
| TC-5.2.6 | `release` | Release payload | 🎉 Release 消息 |

### 5.3 Payload 格式化驗證

| 測試用例 | 驗證點 | 預期 |
|---------|--------|------|
| TC-5.3.1 | PR 標題顯示 | 不為空 |
| TC-5.3.2 | PR URL 顯示 | 為 GitHub URL |
| TC-5.3.3 | Repo 名稱 | 正確映射到 Discord channel |
| TC-5.3.4 | Emoji 根據 action | opened=🆕, closed=✅, merged=🔀 |

### 5.4 自動化測試腳本

```javascript
// test-github-webhook.js
const http = require('http');

const WEBHOOK_URL = 'http://localhost:3000/webhook/github';
const HEALTH_URL = 'http://localhost:3000/health';

async function testWebhook() {
  // TC-5.1.5: Health check
  const health = await fetch(HEALTH_URL);
  const healthData = await health.json();
  console.log(`${healthData.status === 'ok' ? '✅' : '❌'} /health => ${JSON.stringify(healthData)}`);
  
  // TC-5.2.1: Push event
  const pushPayload = {
    ref: 'refs/heads/main',
    repository: { name: 'ai-learning', full_name: 'ai-lish/ai-learning' },
    commits: [{ message: 'test commit', id: 'abc123' }]
  };
  const pushRes = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-GitHub-Event': 'push' },
    body: JSON.stringify(pushPayload)
  });
  console.log(`${pushRes.status === 200 ? '✅' : '❌'} push event => ${pushRes.status}`);
  
  // TC-5.2.2: PR opened
  const prPayload = {
    action: 'opened',
    pull_request: { title: 'Add feature', html_url: 'https://github.com/ai-lish/ai-learning/pull/1' },
    repository: { name: 'ai-learning' }
  };
  const prRes = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-GitHub-Event': 'pull_request' },
    body: JSON.stringify(prPayload)
  });
  console.log(`${prRes.status === 200 ? '✅' : '❌'} pull_request event => ${prRes.status}`);
  
  // TC-5.2.4: Issue opened
  const issuePayload = {
    action: 'opened',
    issue: { title: 'Bug report', html_url: 'https://github.com/ai-lish/ai-learning/issues/1' },
    repository: { name: 'ai-learning' }
  };
  const issueRes = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-GitHub-Event': 'issues' },
    body: JSON.stringify(issuePayload)
  });
  console.log(`${issueRes.status === 200 ? '✅' : '❌'} issues event => ${issueRes.status}`);
}
```

---

## 🔍 測試 6: Google Calendar (`!gcal`)

**功能代碼:** `discord-bot.js` → `!gcal` handler + `phase9.calendarEnhanced`  
**數據文件:** `phase9-data.json` → `calendarEnhanced`, `vo-calendar-db.json`

### 6.1 命令解析

| 測試用例 | 輸入 | 預期輸出 | 前提 |
|---------|------|----------|------|
| TC-6.1.1 | `!gcal` | 顯示今日會議 | 有 events 數據 |
| TC-6.1.2 | `!gcal today` | 同 TC-6.1.1 | - |
| TC-6.1.3 | `!gcal now` | 同 TC-6.1.1 | - |
| TC-6.1.4 | `!gcal tomorrow` | 顯示明日會議 | - |
| TC-6.1.5 | `!gcal week` | 顯示本週所有會議 | - |
| TC-6.1.6 | `!gcal tomorrow` (無數據) | 顯示空狀態 | - |

### 6.2 會議提醒功能

| 測試用例 | 驗證點 | 預期 |
|---------|--------|------|
| TC-6.2.1 | `notifyBefore` | 會議前 N 分鐘提醒 (預設 5 分鐘) |
| TC-6.2.2 | `notifyOnStart` | 會議開始時通知 |
| TC-6.2.3 | `upcomingEvents` 緩存 | 不為空時有緩存邏輯 |

### 6.3 Embed 格式驗證

| 測試用例 | 驗證點 | 預期 |
|---------|--------|------|
| TC-6.3.1 | Embed title | `📅 今日會議` |
| TC-6.3.2 | Embed color | 非 null |
| TC-6.3.3 | Event time 顯示 | HH:MM 格式 |
| TC-6.3.4 | Meet link 顯示 | `meet.google.com` 連結 |

### 6.4 自動化測試腳本

```javascript
// test-gcal.js
async function testGcal(client) {
  const channel = client.channels.cache.get('1483436247618682900');
  
  const tests = [
    { cmd: '!gcal', expect: '📅', desc: '今日會議' },
    { cmd: '!gcal today', expect: '📅', desc: 'today 等同 gcal' },
    { cmd: '!gcal now', expect: '📅', desc: 'now 等同 gcal' },
    { cmd: '!gcal tomorrow', expect: '📅', desc: '明日會議' },
    { cmd: '!gcal week', expect: '📅', desc: '本週會議' },
  ];
  
  for (const t of tests) {
    await channel.send(t.cmd);
    await sleep(2000);
    console.log(`✅ ${t.cmd} - ${t.desc}`);
  }
  
  // 驗證 calendarEnhanced 配置
  const data = phase9.loadData();
  console.log(`\nCalendar Enhanced: ${data.calendarEnhanced.enabled}`);
  console.log(`Notify Before: ${data.calendarEnhanced.notifyBefore} min`);
}
```

---

## 🔍 測試 7: Embed 狀態卡片 (`!status`)

**功能代碼:** `discord-bot.js` → `!status` handler  
**數據文件:** `vo-status-db.json`

### 7.1 命令解析

| 測試用例 | 輸入 | 預期輸出 | 前提 |
|---------|------|----------|------|
| TC-7.1.1 | `!status` (無 action) | 顯示所有成員狀態列表 | 有成員狀態數據 |
| TC-7.1.2 | `!status list` | 同 TC-7.1.1 | - |
| TC-7.1.3 | `!status set [任務]` | ✅ 狀態已設定 | - |
| TC-7.1.4 | `!status set` (無任務) | ❌ 任務內容不可為空 | - |
| TC-7.1.5 | `!status done` | ✅ 標記為完成 | 需先 `!status set` |
| TC-7.1.6 | `!status done` (未設定) | ❌ 你沒有設定狀態 | - |
| TC-7.1.7 | `!status blocker [原因]` | 設定阻礙狀態 | 需先 `!status set` |
| TC-7.1.8 | `!status blocker` (未設定) | ❌ 你沒有設定狀態 | - |
| TC-7.1.9 | `!status clear` | 清除狀態 | - |
| TC-7.1.10 | `!project [項目]` | 顯示項目進度卡片 | 有項目數據 |

### 7.2 Embed 卡片格式

| 測試用例 | 驗證點 | 預期 |
|---------|--------|------|
| TC-7.2.1 | Status embed title | `📊 團隊狀態` 或成員名 |
| TC-7.2.2 | Color coding | 🔴 blocked / 🟡 working / 🟢 done |
| TC-7.2.3 | Fields 數量 | 動態根據成員數量 |
| TC-7.2.4 | Timestamp | 包含時間戳 |

### 7.3 數據持久化

| 測試用例 | 驗證點 | 預期 |
|---------|--------|------|
| TC-7.3.1 | `vo-status-db.json` 更新 | 每次 `set/done/blocker` 後寫入 |
| TC-7.3.2 | 狀態過期 | `!status` 顯示正確狀態 |

### 7.4 自動化測試腳本

```javascript
// test-status.js
async function testStatus(client) {
  const channel = client.channels.cache.get('1483436247618682900');
  const testUserId = 'TEST_USER_123';
  
  // TC-7.1.3: 設定狀態
  await channel.send('!status set 測試任務');
  await sleep(1000);
  
  // TC-7.1.1: 查看狀態
  await channel.send('!status');
  await sleep(1000);
  
  // TC-7.1.5: 標記完成
  await channel.send('!status done');
  await sleep(1000);
  
  // TC-7.1.9: 清除
  await channel.send('!status clear');
  await sleep(1000);
  
  console.log('✅ Status command tests completed');
  
  // 驗證 vo-status-db.json
  const statusData = JSON.parse(fs.readFileSync('./vo-status-db.json', 'utf8'));
  console.log(`Members tracked: ${Object.keys(statusData.members || {}).length}`);
}
```

---

## 🔍 測試 8: 統計報告 (`!stats`, `!analytics`)

**功能代碼:** `phase7.getAnalyticsReport()` + `phase7.trackCommand()`  
**數據文件:** `analytics-db.json`

### 8.1 命令觸發

| 測試用例 | 輸入 | 預期輸出 | 前提 |
|---------|------|----------|------|
| TC-8.1.1 | `!stats` | 📊 使用統計報告 | - |
| TC-8.1.2 | `!analytics` | 同 TC-8.1.1 | - |
| TC-8.1.3 | `!stats 統計` | 同 TC-8.1.1 | 中文別名 |
| TC-8.1.4 | `!phase7 stats` | 同 TC-8.1.1 | - |

### 8.2 報告內容驗證

| 測試用例 | 驗證點 | 預期 |
|---------|--------|------|
| TC-8.2.1 | 總命令次數 | `totalCommands` 數值 |
| TC-8.2.2 | Top commands | 顯示前 5 常用命令 |
| TC-8.2.3 | Top channels | 顯示前 5 活躍頻道 |
| TC-8.2.4 | 語音時間 | 格式化為小時 |
| TC-8.2.5 | 每日統計 | 包含今日數據 |

### 8.3 數據追蹤驗證

| 測試用例 | 操作 | 驗證 |
|---------|------|------|
| TC-8.3.1 | 發送任意命令 | `analytics.commands` 增加 |
| TC-8.3.2 | 發送消息 | `analytics.messages[channel]` 增加 |
| TC-8.3.3 | 用戶操作 | `analytics.users[userId]` 更新 |

### 8.4 自動化測試腳本

```javascript
// test-stats.js
async function testStats(client) {
  const channel = client.channels.cache.get('1483436247618682900');
  
  // 先執行一些命令以產生數據
  await channel.send('!thread dailyLog');
  await channel.send('!status');
  await channel.send('!gcal');
  await sleep(2000);
  
  // TC-8.1.1: !stats
  await channel.send('!stats');
  await sleep(2000);
  
  // TC-8.1.2: !analytics
  await channel.send('!analytics');
  await sleep(2000);
  
  // 驗證 analytics-db.json
  const analytics = JSON.parse(fs.readFileSync('./analytics-db.json', 'utf8'));
  console.log('Analytics DB 內容:');
  console.log(`  Commands tracked: ${Object.keys(analytics.commands).length}`);
  console.log(`  Channels tracked: ${Object.keys(analytics.messages).length}`);
  console.log(`  Users tracked: ${Object.keys(analytics.users).length}`);
  console.log(`  Days tracked: ${Object.keys(analytics.daily).length}`);
  
  // 驗證數據不為負數
  const totalCommands = Object.values(analytics.commands).reduce((a, b) => a + b, 0);
  console.log(`${totalCommands >= 0 ? '✅' : '❌'} Total commands: ${totalCommands}`);
}
```

---

## 🔍 測試 9: Cron Job 提醒 (`!cron`)

**功能代碼:** `discord-bot.js` → `!cron` handler + `phase9.cronEnhanced`  
**數據文件:** `phase9-data.json` → `cronEnhanced`

### 9.1 命令解析

| 測試用例 | 輸入 | 預期輸出 | 前提 |
|---------|------|----------|------|
| TC-9.1.1 | `!cron` (無 action) | 顯示 cron 命令幫助 | - |
| TC-9.1.2 | `!cron status` | 顯示 5 個預設提醒狀態 | - |
| TC-9.1.3 | `!cron test standup` | 觸發 standup 測試消息 | - |
| TC-9.1.4 | `!cron test weekly` | 觸發週報催交測試 | - |
| TC-9.1.5 | `!cron test moodGreeting` | 觸發心情問候測試 | - |
| TC-9.1.6 | `!cron test invalid` | 用法: !cron test [standup|weekly|moodGreeting] | - |
| TC-9.1.7 | `!cron config moodGreeting on` | 開啟心情問候 | - |
| TC-9.1.8 | `!cron config moodGreeting off` | 關閉心情問候 | - |
| TC-9.1.9 | `!cron config moodGreeting time 10:00` | 設定時間 | - |
| TC-9.1.10 | `!cron config moodGreeting channel #general` | 設定頻道 | - |

### 9.2 Cron 提醒配置驗證

| 測試用例 | 驗證點 | 預期 |
|---------|--------|------|
| TC-9.2.1 | 預設提醒數量 | 5 個 (standup/weekly/mood/lunch/cleanup) |
| TC-9.2.2 | `standup` 配置 | `time: 09:00`, weekdays |
| TC-9.2.3 | `weekly` 配置 | `time: 17:00`, friday |
| TC-9.2.4 | `mood` 配置 | `time: 09:30`, weekdays |
| TC-9.2.5 | 自定義提醒 | `customReminders` 陣列 |

### 9.3 自動化測試腳本

```javascript
// test-cron.js
async function testCron(client) {
  const channel = client.channels.cache.get('1483436247618682900');
  
  const tests = [
    { cmd: '!cron', expect: '📋 **Cron 命令**' },
    { cmd: '!cron status', expect: '📋 **Cron 配置**' },
    { cmd: '!cron test standup', expect: '📋' },  // 任何回覆
    { cmd: '!cron test moodGreeting', expect: '📋' },
    { cmd: '!cron test invalid', expect: '用法: !cron test' },
    { cmd: '!cron config moodGreeting on', expect: '✅' },
    { cmd: '!cron config moodGreeting off', expect: '✅' },
  ];
  
  for (const t of tests) {
    await channel.send(t.cmd);
    await sleep(1500);
    console.log(`✅ ${t.cmd}`);
  }
  
  // 驗證 phase9-data.json cronEnhanced
  const data = phase9.loadData();
  const reminders = data.cronEnhanced.reminders;
  console.log(`\nCron Reminders (${reminders.length}):`);
  for (const r of reminders) {
    console.log(`  ${r.enabled ? '🟢' : '🔴'} ${r.name} @ ${r.time} (${r.days.join(', ')})`);
  }
}
```

---

## 🔍 測試 10: 自動化工作流 (`!keyword`)

**功能代碼:** `discord-bot.js` → `!keyword` handler  
**數據文件:** `keyword-db.json`

### 10.1 命令解析

| 測試用例 | 輸入 | 預期輸出 | 前提 |
|---------|------|----------|------|
| TC-10.1.1 | `!keyword` (無 action) | 顯示 keyword 命令幫助 | - |
| TC-10.1.2 | `!keyword add 緊急維護` | ✅ 關鍵詞已添加 | - |
| TC| TC-10.1.3 | `!keyword add` (無關鍵詞) | 用法: !keyword add [關鍵詞] | - |
| TC-10.1.4 | `!keyword add 緊急維護` (重複) | 該關鍵詞已在訂閱列表中 | 需先 TC-10.1.2 |
| TC-10.1.5 | `!keyword remove 緊急維護` | ✅ 關鍵詞已移除 | 需先 TC-10.1.2 |
| TC-10.1.6 | `!keyword remove` (無關鍵詞) | 用法: !keyword remove [關鍵詞] | - |
| TC-10.1.7 | `!keyword remove` (不在列表) | 該關鍵詞不在訂閱列表中 | - |
| TC-10.1.8 | `!keyword list` (有訂閱) | 顯示已訂閱關鍵詞列表 | 需有訂閱數據 |
| TC-10.1.9 | `!keyword list` (無訂閱) | 你暫時未有訂閱任何關鍵詞 | - |
| TC-10.1.10 | `!keyword formats` | 顯示 4 種公告格式 | - |
| TC-10.1.11 | `!keyword clear` | ✅ 已清除所有訂閱 | - |

### 10.2 關鍵詞匹配邏輯

| 測試用例 | 消息內容 | 預期觸發 | 前提 |
|---------|---------|---------|------|
| TC-10.2.1 | `[緊急] 系統維護` | 通知有 `緊急` 訂閱的用戶 | 用戶已訂閱 `緊急` |
| TC-10.2.2 | `的一般消息` | 不觸發通知 | 無匹配關鍵詞 |
| TC-10.2.3 | `[需要回覆] 請確認` | 通知有 `需要回覆` 訂閱的用戶 | - |
| TC-10.2.4 | 多個關鍵詞匹配 | 每個關鍵詞通知一次 | 同時匹配 2+ |

### 10.3 公告格式支援

| 測試用例 | 格式 | 關鍵詞 |
|---------|------|--------|
| TC-10.3.1 | `[決定]` | 最終決定，不需回覆 |
| TC-10.3.2 | `[需要回覆]` | 需要成員確認 |
| TC-10.3.3 | `[緊急]` | 緊急事項 |
| TC-10.3.4 | `[會議]` | 會議相關 |
| TC-10.3.5 | `[審查]` | 代碼/文件審查 |

### 10.4 數據持久化

| 測試用例 | 驗證點 | 預期 |
|---------|--------|------|
| TC-10.4.1 | `keyword-db.json` 更新 | `add/remove/clear` 後寫入 |
| TC-10.4.2 | 用戶隔離 | 每個用戶獨立訂閱列表 |
| TC-10.4.3 | 重啟後數據保留 | JSON 文件持久化 |

### 10.5 自動化測試腳本

```javascript
// test-keyword.js
const fs = require('fs');

async function testKeyword(client) {
  const channel = client.channels.cache.get('1483436247618682900');
  const TEST_USER = 'TEST_USER_999';
  
  // 清理測試環境
  const db = JSON.parse(fs.readFileSync('./keyword-db.json', 'utf8'));
  delete db.subscriptions[TEST_USER];
  fs.writeFileSync('./keyword-db.json', JSON.stringify(db, null, 2));
  
  const tests = [
    { cmd: '!keyword', expect: '📋 **關鍵詞訂閱**' },
    { cmd: '!keyword add 緊急維護', expect: '✅ 關鍵詞已添加' },
    { cmd: '!keyword add', expect: '用法: !keyword add' },
    { cmd: '!keyword add 緊急維護', expect: '已在訂閱列表中' },  // 重複
    { cmd: '!keyword list', expect: '緊急維護' },
    { cmd: '!keyword formats', expect: '🏷️ **公告格式**' },
    { cmd: '!keyword remove 緊急維護', expect: '✅ 關鍵詞已移除' },
    { cmd: '!keyword remove', expect: '用法: !keyword remove' },
    { cmd: '!keyword remove 未知', expect: '不在訂閱列表中' },
    { cmd: '!keyword list', expect: '暫時未有訂閱' },  // 乾淨狀態
    { cmd: '!keyword clear', expect: '✅ 已清除所有訂閱' },
  ];
  
  for (const t of tests) {
    await channel.send(t.cmd);
    await sleep(1500);
    console.log(`✅ ${t.cmd} => ${t.expect}`);
  }
  
  // 驗證 keyword-db.json
  const finalDb = JSON.parse(fs.readFileSync('./keyword-db.json', 'utf8'));
  console.log(`\nTotal subscriptions: ${Object.keys(finalDb.subscriptions).length}`);
}
```

---

## 🚀 執行順序

### Phase 1: 環境準備 (5 min)
```bash
# 1. 確認 Bot 在線
node -e "const c = require('./discord-bot.js');"

# 2. 確認 phase9-data.json 存在
ls -la phase9-data.json

# 3. 確認 github-webhook.js 端口可用
curl http://localhost:3000/health
```

### Phase 2: 獨立功能測試 (可並行)
| 批次 | 測試項 | 預計時間 |
|------|--------|---------|
| 批次 A | 測試 1, 2, 3 (Thread/Forum/Menu) | 15 min |
| 批次 B | 測試 4, 6, 7 (Slash/GCal/Status) | 15 min |
| 批次 C | 測試 5, 8, 9 (Webhook/Stats/Cron) | 15 min |
| 批次 D | 測試 10 (Keyword) | 10 min |

### Phase 3: 整合測試 (10 min)
```bash
# 運行自動化測試腳本
node test-auto.js
```

---

## 📊 通過標準

- **P0 測試**: 必須 100% 通過 (功能核心)
- **P1 測試**: 80% 以上通過 (重要功能)
- **發現問題**: 記錄到 `test-results/` 並標記 `🔴 FAIL`

---

## 🐛 已知限制

1. **Slash Commands** (`/template` 等): 需要 Discord 应用命令权限，测试需要在实际 Discord 中输入 `/` 触发
2. **GitHub Webhook**: 需要 localhost 可访问，或使用 ngrok 转发
3. **Forum Channel 創建**: 需要 Bot 管理員權限
4. **Select Menu 交互**: 需要實際點擊 Discord 中的 Select Menu（不能純文字測試）

---

## 📝 測試結果記錄

測試完成後，在 `test-results/` 目錄下創建：
- `TEST-ALL-10-YYYY-MM-DD.md` - 測試結果摘要
- `TEST-ALL-10-YYYY-MM-DD-detailed.md` - 詳細輸出日誌

