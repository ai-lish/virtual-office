// ============================================
// 通告管理 - Google Apps Script 後端
// ============================================

// 試算表 ID（來自 Google Sheets URL）
// 格式：https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
// 請替換為你的試算表 ID
const SPREADSHEET_ID = '1VljZfrVqyzYSkJaxcF_U7NMvjjGroigZdQlhYcy6HjE';

// 通告工作表名稱
const ANNOUNCEMENT_SHEET = '通告';

// API Token 驗證
const API_TOKEN = 'homework-secret-2026';

// ============================================
// 工具函數
// ============================================

/**
 * 將日期物件轉換為 YYYY-MM-DD 字串
 * 確保所有日期都以字串形式統一存儲和比較
 */
function formatDateKey(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

/**
 * 將任何日期格式正規化為 YYYY-MM-DD
 * 用於比較來自不同來源的日期
 */
function normalizeDate(dateValue) {
  if (!dateValue) return '';
  return formatDateKey(new Date(dateValue));
}

// ============================================
// Web App 入口
// ============================================

/**
 * 處理 GET 請求
 */
function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'announcements') {
    return ContentService.createTextOutput(getAnnouncements())
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 處理 POST 請求
 */
function doPost(e) {
  const token = e.parameter.token || JSON.parse(e.postData.contents).token;
  
  // 驗證 Token
  if (token !== API_TOKEN) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'Unauthorized' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  
  let result;
  
  switch (action) {
    case 'saveAnnouncement':
      result = saveAnnouncement(data);
      break;
    case 'deleteAnnouncement':
      result = deleteAnnouncement(data);
      break;
    default:
      result = JSON.stringify({ error: 'Unknown action' });
  }
  
  return ContentService.createTextOutput(result)
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// 通告資料操作
// ============================================

/**
 * 獲取所有通告
 * 返回格式：{ data: [{ date, content, updated }, ...] }
 */
function getAnnouncements() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(ANNOUNCEMENT_SHEET);
  
  // 如果通告工作表不存在，返回空陣列
  if (!sheet) {
    return JSON.stringify({ data: [] });
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return JSON.stringify({ data: [] });
  
  const values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  const result = values
    .filter(row => row[0]) // 過濾空行
    .map(row => ({
      // 確保日期以 YYYY-MM-DD 格式返回
      date: normalizeDate(row[0]),
      content: String(row[1] || ''),
      updated: row[2] ? new Date(row[2]).toISOString() : ''
    }));
  
  return JSON.stringify({ data: result });
}

/**
 * 保存通告
 * 如果已存在該日期的通告，則更新內容；否則新增
 */
function saveAnnouncement(data) {
  const { date, content } = data;
  
  if (!date) {
    return JSON.stringify({ error: 'date is required' });
  }
  
  // 確保日期為 YYYY-MM-DD 格式
  const normalizedDate = normalizeDate(date);
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(ANNOUNCEMENT_SHEET);
  
  // 如果通告工作表不存在，創建它
  if (!sheet) {
    sheet = ss.insertSheet(ANNOUNCEMENT_SHEET);
    sheet.getRange(1, 1, 1, 3).setValues([['日期', '內容', '更新時間']]);
    sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
    // 設置日期列格式
    sheet.getRange('A:A').setNumberFormat('@'); // 純文字格式
  }
  
  // 設置日期列為純文字格式（避免 Google Sheets 自動轉換為日期）
  sheet.getRange('A:A').setNumberFormat('@');
  
  // 查找是否已有該日期的記錄
  const lastRow = sheet.getLastRow();
  let existingRow = -1;
  
  if (lastRow >= 2) {
    const dates = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < dates.length; i++) {
      const existingDate = normalizeDate(dates[i][0]);
      if (existingDate === normalizedDate) {
        existingRow = i + 2;
        break;
      }
    }
  }
  
  const now = new Date();
  
  if (existingRow > 0) {
    // 更新現有記錄
    sheet.getRange(existingRow, 2).setValue(content);
    sheet.getRange(existingRow, 3).setValue(now);
  } else {
    // 新增記錄（日期以純文字形式存儲）
    sheet.appendRow([normalizedDate, content, now]);
  }
  
  return JSON.stringify({ success: true, message: 'Announcement saved', date: normalizedDate });
}

/**
 * 刪除通告
 * 根據日期刪除（日期需完全匹配 YYYY-MM-DD 格式）
 */
function deleteAnnouncement(data) {
  const { date } = data;
  
  if (!date) {
    return JSON.stringify({ error: 'date is required' });
  }
  
  // 確保日期為 YYYY-MM-DD 格式
  const normalizedDate = normalizeDate(date);
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(ANNOUNCEMENT_SHEET);
  
  if (!sheet) {
    return JSON.stringify({ success: true, message: 'No announcements to delete' });
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return JSON.stringify({ success: true, message: 'No announcements to delete' });
  }
  
  // 獲取所有日期並找到匹配的行
  const dates = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const rowsToDelete = [];
  
  for (let i = 0; i < dates.length; i++) {
    const existingDate = normalizeDate(dates[i][0]);
    if (existingDate === normalizedDate) {
      rowsToDelete.push(i + 2); // +2 因為第一行是標題，且陣列從 0 開始
    }
  }
  
  // 從後往前刪除（避免行號改變影響後續刪除）
  rowsToDelete.reverse().forEach(rowNum => sheet.deleteRow(rowNum));
  
  return JSON.stringify({ success: true, message: 'Announcement deleted', count: rowsToDelete.length, date: normalizedDate });
}

// ============================================
// 測試函數（在 Apps Script 編輯器中運行）
// ============================================

function testNormalizeDate() {
  const testCases = [
    'Thu Apr 09 2026 08:00:00 GMT+0800 (香港標準時間)',
    '2026-04-09',
    new Date(),
    'Mon Mar 30 2026 00:00:00 GMT+0800 (香港標準時間)'
  ];
  
  testCases.forEach(tc => {
    console.log(`Input: ${tc} -> Output: ${normalizeDate(tc)}`);
  });
}

function testDeleteAnnouncement() {
  const result = deleteAnnouncement({ date: '2026-04-09' });
  console.log('Delete result:', result);
}

function testSaveAnnouncement() {
  const result = saveAnnouncement({ 
    date: '2026-04-09', 
    content: 'Test announcement for April 9th' 
  });
  console.log('Save result:', result);
}

function testGetAnnouncements() {
  const result = getAnnouncements();
  console.log('Get result:', result);
}

// ============================================
// GitHub Actions Workflow Trigger
// ============================================

/**
 * Trigger GitHub Actions Workflow for refreshing Minimax Quota
 * GET/POST to this script triggers the workflow
 */
function triggerMinimaxWorkflow(e) {
  var pat = PropertiesService.getScriptProperties().getProperty('GITHUB_PAT');
  
  if (!pat) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'GITHUB_PAT not configured in Script Properties'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  var githubRepo = 'ai-lish/virtual-office';
  var workflowFile = 'refresh-minimax-quota.yml';
  var url = 'https://api.github.com/repos/' + githubRepo + '/actions/workflows/' + workflowFile + '/dispatches';
  
  var options = {
    method: 'post',
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': 'Bearer ' + pat,
      'X-GitHub-Api-Version': '2022-11-28'
    },
    payload: JSON.stringify({ ref: 'main' }),
    contentType: 'application/json',
    muteHttpExceptions: true
  };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    
    if (code === 204) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Workflow triggered'
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'GitHub API returned ' + code,
        body: response.getContentText()
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: e.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return triggerMinimaxWorkflow(e);
}

function doPost(e) {
  return triggerMinimaxWorkflow(e);
}
