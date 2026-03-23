# Discord 頻道架構 Phase 1 設定指引

## 概述

本文件定義虛擬辦公室 Discord 伺服器的頻道類別結構與 Thread 活用規範。

---

## 功能 1: 頻道類別結構

### 類別層級

| 類別名稱 | 用途 | 頻道組成 |
|---------|------|----------|
| **📌 總覽** | 入口與概覽 | #welcome, #announcements, #rules |
| **💬 一般** | 日常通用討論 | #general, #random, #help |
| **📋 項目** | 各專案獨立空間 | 每專案一子類別 (見下方) |
| **📅 站立會議** | 每日/每週進度同步 | #daily-standup, #weekly-review |
| **📚 資源** | 共享檔案與連結 | #links, #templates, #archive |

### 項目類別結構

每個項目獨立成類別，旗下包含：

```
📦 [項目名稱]
├── 💬 討論區      # [代碼]-discussion
├── 📝 任務板      # [代碼]-tasks  
├── 📊 進度更新    # [代碼]-updates
└── 📁 檔案共享    # [代碼]-files
```

### 現有項目對應代碼

| 項目 | 代碼 | GitHub |
|------|------|--------|
| ai-learning | AI | ai-lish/ai-learning |
| virtual-office | VO | ai-lish/virtual-office |
| lsc-ole-s1-2026 | OLE | ai-lish/lsc-ole-s1-2026 |
| homework-duty-system | HWD | ai-lish/homework-duty-system |
| math-week-2026 | MW | ai-lish/math-week-2026 |
| teacher-dev-day | TDD | ai-lish/teacher-dev-day |

---

## 功能 2: Thread 活用規範

### 命名格式

```
[代碼] 任務描述 - 負責人
```

**範例：**
- `[AI] 網站首頁改版 - Zach`
- `[VO] Phase 2 功能開發 - 師弟`
- `[OLE] S1 教材準備 - 小詩`

### Thread 類型

| 類型 | 前綴 | 用途 |
|------|------|------|
| 任務 Thread | `[代碼]` | 大任務主題，匯集討論與決定 |
| 會議 Thread | 📋 `[代碼]會議` | 會議記錄與結論 |
| 檢討 Thread | 🔍 `[代碼]檢討` | 項目回顧與改進 |

### Thread 管理

- **進行中**: 保持active，非封頂
- **完成後**: 設為已歸檔 (Archive)
- **重要資訊**: Pin起來

---

## 自動建立腳本

### 建立類別與頻道

```bash
# 需要在有 Discord 管理權限的環境執行
# 使用 openclaw message tool

# 1. 建立類別
message action=category-create name="📋 項目" guildId=1483416944681160757

# 2. 建立項目子類別與頻道 (以 ai-learning 為例)
message action=category-create name="📦 ai-learning" guildId=1483416944681160757 parentId=[項目類別ID]
message action=channel-create name="ai-discussion" guildId=1483416944681160757 type=0 parentId=[子類別ID]
message action=channel-create name="ai-tasks" guildId=1483416944681160757 type=0 parentId=[子類別ID]
message action=channel-create name="ai-updates" guildId=1483416944681160757 type=0 parentId=[子類別ID]
message action=channel-create name="ai-files" guildId=1483416944681161157 type=0 parentId=[子類別ID]
```

---

## 頻道權限建議

| 頻道類型 | @everyone | 負責人 | 備註 |
|---------|-----------|--------|------|
| #welcome | 讀 | - | 歡迎新成員 |
| #general | 讀寫 | - | 公開討論 |
| 項目頻道 | 讀 | 讀寫 | 保護項目資料 |
| #archive | 讀 | 管理 | 歷史紀錄 |

---

## 注意事項

1. **頻道建立順序**: 先建類別，再建頻道
2. **代碼一致性**: 所有 Thread 與頻道使用統一代碼
3. **定期歸檔**: 已完成項目 Thread 應歸檔
4. **權限最小化**: 依角色分配存取權限

---

*建立日期: 2026-03-20*
*Phase: 1/4*
