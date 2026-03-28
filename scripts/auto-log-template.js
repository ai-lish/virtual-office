#!/usr/bin/env node
/**
 * 自動攔截記錄範例 — 給師弟/其他AI工具使用
 * 
 * 當任何 AI 模型被調用時，調用這個 script 自動記錄用量。
 * 
 * 用法（直接粘貼到任何 AI tool 的回調中）:
 * 
 *   node auto-log.js --model claude-sonnet-4 --tokens 500 --feature chat
 * 
 * 或者在 server.js 中 require 此 module:
 * 
 *   const { autoLog } = require('./scripts/auto-log-template.js');
 *   autoLog({ model: 'claude-sonnet-4', tokens: 500, feature: 'chat' });
 */

const http = require('http');

/**
 * 自動記錄一次 AI 用量
 * @param {object} opts
 * @param {string} opts.model - 模型名稱
 * @param {number} opts.tokens - 使用 tokens
 * @param {string} opts.feature - 功能: chat | completion | vision | edit
 * @param {boolean} opts.success - 是否成功
 */
function autoLog({ model, tokens, feature = 'chat', success = true }) {
  const postData = JSON.stringify({
    model,
    tokens: tokens || 0,
    feature,
    success,
    source: 'auto-intercept',  // 區分自動 vs 手動
    timestamp: new Date().toISOString()
  });

  const req = http.request({
    hostname: 'localhost',
    port: 18899,
    path: '/api/copilot/log',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json.success) {
          console.log(`[Auto-Log] ✅ ${model} | ${tokens} tokens | ${feature} | remaining: ${json.data?.quota?.remaining}`);
        }
      } catch (e) {}
    });
  });
  req.on('error', () => {});
  req.write(postData);
  req.end();
}

// CLI 模式
if (require.main === module) {
  const args = require('minimist')(process.argv.slice(2));
  autoLog({
    model: args.model || 'claude-sonnet-4',
    tokens: parseInt(args.tokens || '100'),
    feature: args.feature || 'chat',
    success: args.success !== false
  });
}

module.exports = { autoLog };
