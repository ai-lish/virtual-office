/**
 * GitHub Actions Workflow Trigger
 * Deploy as Web App: Execute as Me, Access Anyone
 */

function triggerWorkflow(e) {
  var pat = PropertiesService.getScriptProperties().getProperty('GITHUB_PAT');
  
  if (!pat) {
    return ContentService.createTextOutput(JSON.stringify({success:false,error:'GITHUB_PAT not set'}))
      .setMimeType(ContentService.MimeType.JSON);
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
      return ContentService.createTextOutput(JSON.stringify({success:true}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({success:false,error:'Code: '+code}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({success:false,error:e.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) { return triggerWorkflow(e); }
function doPost(e) { return triggerWorkflow(e); }
