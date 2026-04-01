#!/bin/bash
# Run at end of each 5-hour window to capture final quota state
cd ~/.openclaw/workspace/virtual-office
bash scripts/refresh-data.sh minimax copilot 2>&1
git add public/minimax-api-status.json public/quota-history.json
git commit -m "Quota snapshot $(date -u +%Y-%m-%dT%H:%M:%SZ)" --quiet
git push 2>&1
