# Cycle 1 Assessment — Copilot Phase 12

**評估時間：** 2026-03-28 01:05 GMT+8  
**評估者：** 小詩 (subagent)  
**目標：** Level 3 生產級別

---

## (a) 當前 blocker 優先級排序

### 🔴 P0 — 阻斷所有後續

**#1：n8n workflow 未 import/activate**
- webhook 目前返回 404，workflow 尚未載入 n8n
- 這是整條 chain 的起點，所有後續功能（通知、歷史、同步）都依賴它
- 不解決這個，後面全部無法測試

**#2：webhook URL 無法從互聯網訪問**
- localhost:5678 的 webhook 從外部無法觸及
- 需要 ngrok / cloudflare tunnel / tailscale 等工具暴露 webhook
- 即使 workflow 激活了，外部觸發不到等於無效

**#3：Virtual Office server 部署方式未確認**
- localhost:18899 目前僅 local access
- 前端（如有）在線上無法訪問 Copilot 數據
- 需要確認 server 最終是 local-only 還是會部署到公開 server

---

### 🟡 P1 — 核心功能 blocker

**#4：Webhook 無認證**
- 目前 webhook 沒有任何 auth mechanism（無 secret key / Basic Auth）
- 直接暴露會有安全風險
- 建議 workflow 激活 + 互聯網訪問確認後儘快加

**#5：Discord 通知未實現**
- Level 2 完成標準之一（>80% / >95% alert → Discord）
- 目前只有 local API，無觸發通道

---

## (b) 推薦下循環的頭 3 個動作

### Action 1：Import + Activate n8n workflow ⭐⭐
**目標：** 打開 n8n UI → Import `artifacts/n8n-copilot-workflow.json` → 激活 workflow  
**為什麼排第一：** 這是所有 chain 的起點。不 import，後面全部無法整合測試。  
**預期結果：** n8n webhook URL（`http://localhost:5678/webhook/...`）可觸發，返回非 404

### Action 2：部署 Tunnel 暴露 webhook ⭐⭐⭐
**目標：** 選擇一個 tunnel 方案（推薦 ngrok，最簡單）：
```bash
ngrok http 5678
```
拿到 `https://xxxx.ngrok.io/webhook/...` 公開 URL  
**為什麼排第二：** workflow 激活後，需要公開 URL 才能讓外部（GitHub CI、cron job）觸發  
**替代方案：** cloudflare tunnel（更長期穩定）或 tailscale（如果已配置）

### Action 3：確認 webhook 在公開 URL 可訪問 + 加入基本認證 ⭐⭐⭐
**目標：** 
1. curl 測試公開 webhook URL 確認可達
2. 在 n8n workflow 加入 `Header Auth` 或 `Query Auth`：加一個簡單的 `X-Webhook-Secret: <token>` 檢查
3. 記錄 webhook URL 和 secret

**為什麼排第三：** 這時候整條 chain 才真正打通：外部觸發 → n8n → 通知/存儲

---

## (c) 難度估算

| 動作 | 難度 | 原因 |
|------|------|------|
| Import + Activate n8n workflow | ⭐⭐ | 純 UI 操作，JSON 已準備好 |
| 部署 Tunnel（ngrok）| ⭐⭐⭐ | 依賴網絡環境，ngrok 免費版每次重啟 URL 會變 |
| Webhook 公開訪問 + 認證 | ⭐⭐⭐ | 需要網絡打通 + n8n workflow 小修改 |

---

## 補充觀察

- **好消息：** Local server API (`/api/copilot/quota`) 已經正確返回數據，backend 邏輯是好的
- **優先策略：** 先把手動流程跑通（import → activate → tunnel → curl 觸發），再投入自動化
- **ngrok 注意：** 免費版每次重啟 URL 會變，生產環境建議 cloudflare tunnel 或 tailscale
- **n8n 建議：** 激活 workflow 前，檢查 workflow 內的 node 設定（尤其是 webhook path 和 credential）是否與預期一致

---

## 建議的執行順序（完整 P0→P1）

```
1. n8n UI import + activate workflow  ← P0
2. ngrok tunnel 5678 → get public URL  ← P0
3. curl test public webhook URL  ← P0 verify
4. Add Basic/Header auth to webhook node  ← P1
5. Configure Discord notification node  ← P1
6. Google Sheets append node  ← P1
7. Frontend online access确认  ← P2
```
