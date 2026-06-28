#!/bin/bash
# setup-usage-sheets.sh — One-time setup to create Codex QUOTA + Claude QUOTA
#                          + Gemini QUOTA tabs in the existing virtual-office
#                          Google Sheet.
#
# Per spec §5, the workbook must have 4 sheets: MiniMax QUOTA (existing, do not
# touch) + Codex QUOTA (new) + Claude QUOTA (new) + Gemini QUOTA (V3, MacD
# 2026-06-28). The gog CLI does NOT expose an add-tab command, so this script
# either:
#   (a) creates the tabs via Apps Script API (preferred, automated), OR
#   (b) prints manual instructions for the operator
#
# Run once before the first cron tick:
#   bash scripts/setup-usage-sheets.sh
#
# Idempotent: skips tabs that already exist.

set -euo pipefail
SHEET_ID="19GFRnbjUlI7UnTngMWzqeoDD9g0lRs0OAO8iwieGJkA"
TABS=("Codex QUOTA" "Claude QUOTA" "Gemini QUOTA")

echo "════════════════════════════════════════════════════════════════"
echo " AI Tools Cron — Sheet Setup (one-time)"
echo " Sheet: $SHEET_ID"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Check existing tabs
echo "── Existing tabs in workbook ──"
gog sheets metadata "$SHEET_ID" --plain 2>&1 | sed -n '/^Sheets:/,$p' || true
echo ""

existing_tabs=$(gog sheets metadata "$SHEET_ID" --plain 2>&1 \
  | awk '/^Sheets:/ {flag=1; next} flag' \
  | awk '{print $2}' \
  | grep -v '^TITLE$' || true)

missing=()
for tab in "${TABS[@]}"; do
  if echo "$existing_tabs" | grep -qF "$tab"; then
    echo "  ✅ $tab  (already exists, skip)"
  else
    echo "  ❌ $tab  (missing)"
    missing+=("$tab")
  fi
done

if [ ${#missing[@]} -eq 0 ]; then
  echo ""
  echo "All tabs present — nothing to do."
  exit 0
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo " MANUAL SETUP (gog CLI doesn't expose add-tab; choose one path)"
echo "════════════════════════════════════════════════════════════════"
cat <<'EOF'

Option A — Manual in Google Sheets UI (30 seconds, recommended for V1):
  1. Open: https://docs.google.com/spreadsheets/d/19GFRnbjUlI7UnTngMWzqeoDD9g0lRs0OAO8iwieGJkA/edit
  2. Click "+" at the bottom to add a sheet
  3. Name it exactly: Codex QUOTA
  4. Repeat: add another sheet named: Claude QUOTA
  5. Re-run this script to confirm

Option B — Apps Script automation (MacD does this for you):
  MacD can create a one-shot Apps Script project and run a function via:
    gog appscript create --title="v-office-usage-sheets-setup"
  Then write `addUsageTabs()` that does:
    const ss = SpreadsheetApp.openById('19GFRnbjUnTngMWzqeoDD9g0lRs0OAO8iwieGJkA');
    ['Codex QUOTA', 'Claude QUOTA'].forEach(n => {
      if (!ss.getSheetByName(n)) ss.insertSheet(n);
    });
  Deploy as API executable, then `gog appscript run <scriptId> addUsageTabs`.

EOF

echo "After creating tabs, re-run this script to verify."
exit 1