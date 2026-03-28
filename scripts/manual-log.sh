#!/bin/bash
# 手動記錄 Copilot 用量 — 粘貼以下命令到 terminal 執行
# 用法: ./manual-log.sh <model> <tokens> <feature>
# 例如: ./manual-log.sh claude-sonnet-4 500 chat

MODEL=${1:-claude-sonnet-4}
TOKENS=${2:-100}
FEATURE=${3:-chat}

curl -sS -X POST http://localhost:18899/api/copilot/log \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"$MODEL\",
    \"tokens\": $TOKENS,
    \"feature\": \"$FEATURE\",
    \"success\": true
  }" | python3 -c "import sys,json; d=json.load(sys.stdin); print('✅ 記錄成功' if d.get('success') else '❌ 失敗', d.get('data',{}).get('entry',{}).get('model'), '|', d.get('data',{}).get('quota',{}).get('remaining'), 'remaining')"
