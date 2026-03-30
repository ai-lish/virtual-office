#!/bin/bash
# MiniMax Token API Cron - 每個5小時interval的最後1小時監控
# Appends API data to Google Sheet: 19GFRnbjUlI7UnTngMWzqeoDD9g0lRs0OAO8iwieGJkA

set -e

API_KEY="sk-cp-CNrQtXcYz6dieW7vUVGQY7iZA8L2SE37Dz3jtH6J9b2LkgwXvwGZM8EP-L8eiBx3r7UWwulYCS9v3eKkKO3Fb2TVJHH3-nujRXEZz1_oEGVaS_rnrWg8_gU"
SHEET_ID="19GFRnbjUlI7UnTngMWzqeoDD9g0lRs0OAO8iwieGJkA"

# Fetch API data
RAW=$(curl -s --location 'https://api.minimax.io/v1/api/openplatform/coding_plan/remains' \
  --header "Authorization: Bearer $API_KEY" \
  --header 'Content-Type: application/json' \
  --header 'User-Agent: Mozilla/5.0')

# Check if API call succeeded
STATUS=$(echo "$RAW" | jq -r '.base_resp.status_code // "error"')
if [ "$STATUS" != "0" ]; then
  echo "API Error: $(echo "$RAW" | jq -r '.base_resp.status_msg')"
  exit 1
fi

# Timestamp
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M UTC")

# Extract common times (all models share same interval start/end)
START_TIME=$(echo "$RAW" | jq -r '.model_remains[0].start_time')
END_TIME=$(echo "$RAW" | jq -r '.model_remains[0].end_time')
START_HKT=$(date -j -f %s $((START_TIME/1000)) +"%Y-%m-%d %H:%M" 2>/dev/null || date -u -d @$((START_TIME/1000)) +"%Y-%m-%d %H:%M")
END_HKT=$(date -j -f %s $((END_TIME/1000)) +"%Y-%m-%d %H:%M" 2>/dev/null || date -u -d @$((END_TIME/1000)) +"%Y-%m-%d %H:%M")

# Weekly times
WEEKLY_START=$(echo "$RAW" | jq -r '.model_remains[0].weekly_start_time')
WEEKLY_END=$(echo "$RAW" | jq -r '.model_remains[0].weekly_end_time')
WEEKLY_START_HKT=$(date -j -f %s $((WEEKLY_START/1000)) +"%Y-%m-%d %H:%M" 2>/dev/null || date -u -d @$((WEEKLY_START/1000)) +"%Y-%m-%d %H:%M")
WEEKLY_END_HKT=$(date -j -f %s $((WEEKLY_END/1000)) +"%Y-%m-%d %H:%M" 2>/dev/null || date -u -d @$((WEEKLY_END/1000)) +"%Y-%m-%d %H:%M")

# Process each model
for i in 0 1 2 3 4 5; do
  MODEL=$(echo "$RAW" | jq -r ".model_remains[$i].model_name")
  INTERVAL_TOTAL=$(echo "$RAW" | jq -r ".model_remains[$i].current_interval_total_count")
  USAGE_COUNT=$(echo "$RAW" | jq -r ".model_remains[$i].current_interval_usage_count")
  REMAINS_MS=$(echo "$RAW" | jq -r ".model_remains[$i].remains_time")
  REMAINS_H=$(echo "$RAW" | jq -r "(${REMAINS_MS}/1000/3600)")
  WEEKLY_TOTAL=$(echo "$RAW" | jq -r ".model_remains[$i].current_weekly_total_count")
  WEEKLY_USAGE=$(echo "$RAW" | jq -r ".model_remains[$i].current_weekly_usage_count")

  # Calculate actual usage and remaining
  if [ "$INTERVAL_TOTAL" != "0" ] && [ "$INTERVAL_TOTAL" != "null" ]; then
    ACTUAL_USED=$((INTERVAL_TOTAL - USAGE_COUNT))
    ACTUAL_REMAIN=$USAGE_COUNT
  else
    ACTUAL_USED="0"
    ACTUAL_REMAIN="$REMAINS_MS ms"
  fi

  # Append to Google Sheet (use full path for launchd compatibility)
  /opt/homebrew/bin/gog sheets append "$SHEET_ID" "A100" \
    "$TIMESTAMP" \
    "$MODEL" \
    "$INTERVAL_TOTAL" \
    "$ACTUAL_REMAIN" \
    "$ACTUAL_USED" \
    "$START_HKT" \
    "$END_HKT" \
    "$REMAINS_MS" \
    "$REMAINS_H" \
    "$WEEKLY_TOTAL" \
    "$WEEKLY_USAGE" \
    "$WEEKLY_START_HKT" \
    "$WEEKLY_END_HKT" \
    2>&1

  echo "[$(date)] Appended row for $MODEL"
done

echo "[$(date)] MiniMax cron completed successfully"
