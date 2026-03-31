/**
 * Google Apps Script - Trigger GitHub Actions Workflow
 * 
 * SETUP:
 * 1. Go to https://script.google.com → New project
 * 2. Paste this code
 * 3. Go to Project Settings → Script Properties → Add:
 *    - GITHUB_PAT: your GitHub Personal Access Token (with repo/workflow scope)
 * 4. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the Web App URL and put it in index.html
 */

function doGet(e) {
  return triggerWorkflow();
}

function doPost(e) {
  return triggerWorkflow();
}

function triggerWorkflow() {
  var pat = PropertiesService.getScriptProperties().getProperty('GITHUB_PAT');
  
  if (!pat) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'GITHUB_PAT not configured in Script Properties'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  var url = 'https://api.github.com/repos/ai-lish/virtual-office/actions/workflows/refresh-minimax-quota.yml/dispatches';
  
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
        message: 'Workflow triggered successfully'
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
