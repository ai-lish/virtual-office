# HKDSE OCR 審核系統 BRIEF

## 目標
將 Google Sheets 的 HKDSE 試卷圖片通過 OCR 轉換為 LaTeX 格式文字，建立可審核的課題頁面系統。

## 狀態
🟡 Active — P1 完成，P2 待續（285題）

## 背景
- **Repo:** ai-lish/ai-learning (hkdse/ 目錄)
- **URL:** https://ai-lish.github.io/ai-learning/
- **P1 審核頁:** https://ai-lish.github.io/ai-learning/hkdse/pages/review.html
- **P2 審核頁:** https://ai-lish.github.io/ai-learning/hkdse/pages/review_p2.html
- **GAS URL:** https://script.google.com/macros/s/AKfycbyFoti709FMeYoZQAHsbWT7cW7jXp1x5vAaJydJWtVjk6BDiiCGqgbGvFxnoxPvgHNT/exec
- **Drive:** 175Lo70oD0xbHDJYChLXN8qMvqGjJlNcF
- **技術栈:** Tesseract OCR, LaTeX, Google Apps Script, potrace SVG

## 數據
- P1: 220題（31課題），已全部 OCR 完成
- P2: 285題（44課題），已全部 OCR 完成（2026-03-29）
- **P1 高信心:** 65.1% → 72.5%
- **P2 高信心:** 65.3%

## OCR Pipeline
1. Phase 1 — 預處理（preprocessor.py）✅
2. Phase 2 — AI 校正（ai_corrector.py）✅
3. Phase 3 — Re-OCR 引擎（re_ocr.py）✅
4. Phase 4 — 分流系統（phase4-router.html）✅

## 已知問題
- Tesseract 對數學分數/公式效果差，LaTeX format 已驗證
- Google Drive 圖片需用 `drive.google.com/thumbnail?id=...&sz=w800` 避免 CORS

## Subagent 上下文
> HKDSE OCR 系統已完成 Phase 1-4。P2 495題 OCR 結果已出（2026-03-29），包括 132個 SVG 圖表已上傳 GitHub。下一步係繼續審核 P2 題目，並建立更多課題頁面。
