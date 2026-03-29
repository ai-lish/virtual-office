# Song of Songs 歌詞影片 BRIEF

## 目標
將歌詞（LRC）轉換為 1920x1080 MP4 歌詞影片，配合背景視覺效果。

## 狀態
🟡 Active — 歌詞編輯器已修復（2026-03-29），等待音頻檔案

## 背景
- **Repo:** ai-lish/Song-of-Songs
- **URL:** https://github.com/ai-lish/Song-of-Songs
- **Pipeline:** LRC → ASS (lrc2ass.py) → FFmpeg → 1920x1080 MP4
- **技術栈:** Python (lrc2ass.py), FFmpeg, libass, STHeiti Light

## 當前進度
- [x] lrc2ass.py 歌詞時間軸轉換
- [x] generate_video.py FFmpeg pipeline
- [x] FFmpeg libass 確認正常（STHeiti Light 粵語時間軸）
- [x] 測試輸出：2.6 MB, 1920×1080, H.264+AAC
- [ ] 畫家 — 背景視覺設計（未開始）
- [ ] 音頻檔案（Step1_latest.m4a + LRC 歌詞）

## 當前進度
- [x] lrc2ass.py 歌詞時間軸轉換
- [x] generate_video.py FFmpeg pipeline
- [x] FFmpeg libass 確認正常（STHeiti Light 粵語時間軸）
- [x] 歌詞編輯器修復（2026-03-29）
- [ ] 畫家 — 背景視覺設計（未開始）
- [ ] 音頻檔案（Step1_latest.m4a + LRC 歌詞）

## P0 阻斷
- **音頻檔案未提供：** Step1_latest.m4a + LRC 歌詞

## Subagent 上下文
> Song of Songs 係一個歌詞影片項目，目标是生成 1920x1080 MP4。Pipeline 已完成但需要：(1) Zach 提供音頻檔案，(2) 畫家設計背景視覺效果。目前完全停滯。
