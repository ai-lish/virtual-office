# Public deployment boundary

這個 repo 的 public deployment 第一輪只會產生 `site/` 內的 literal allowlist
輸出。現時輸出是一個不含 operational data 的 public shell，以及一個受 schema
限制的 `status.json`；`public/*.json`、`data/`、`memory/`、`scripts/`、logs、
config 同 dashboard 均不會上載。

## 本地驗證流程

在 repo 根目錄執行：

```text
node scripts/build-public-site.js --audit
node scripts/guard-public-site.js --check
node --test scripts/guard.test.js
```

`build-public-site.js` 只會重建 repo 根目錄內的 generated `site/`；它不會讀取
quota、token、model、provider、user 或其他 operational JSON。`guard-public-site.js`
會檢查 exact output allowlist、symlink、nested source boundary、filename denylist、
credential-shaped text、image magic bytes，以及 `status.json` 的封閉 schema。

`robots.txt` 和 HTML 的 `noindex` 只代表降低搜尋引擎收錄意願，並不是 access
control。任何已存在的 Pages cache、fork 或歷史公開內容，仍須另行處理及 rotate
曾經公開的 credentials。

## Post-deploy gate

`verify-public-pages.js` 預設不發 network request；只有提供 explicit target 才會
執行 live check：

```text
node scripts/verify-public-pages.js
VERIFY_TARGET=https://ai-lish.github.io/virtual-office/ node scripts/verify-public-pages.js
```

沒有 target 時會輸出 `PUBLIC_PAGES_VERIFY_SKIPPED` 並以 exit code `2` 結束；只有
explicit target 完成全部 checks 才是 exit code `0`。exit code `1` 代表 violation 或
transport error，exit code `3` 代表無法判定（例如 host 不支援 HEAD/GET status check）。

它會 GET `index.html`、`robots.txt`、`status.json`，檢查 status allowlist schema、
Content-Type、body size 及 public reference；再以固定 path list 用 `HEAD` 檢查舊有
operational files 及 spot-check paths 必須回 `404` 或 `410`。它不會列印 response body、
不會帶 auth header、不會查 GitHub API、不會 retry 或 crawl；若 HEAD 回 `405/501`，
只會降級至一次 GET status/headers check。

`scripts/legacy-paths.json` 是 deployment 前固定的 path snapshot，不是完整 path
enumeration；spot-check 只覆蓋列出的 paths，不等於證明所有 URL 變體或所有歷史 URL
均已 retirement。每次 source surface 有變更，必須重新 review 這份 manifest。

目前 external gate 尚未完成：GitHub Pages API 回報 `build_type=legacy`、source 是
`main:/`，而本地 `deploy.yml` 是 Actions artifact 流程。切換 Pages source 前，
不得把 workflow 改動視為已生效；目前 live verifier 對舊 paths 預期會 fail，這是
預期的 deployment blocker，不應為了變綠而放寬 allowlist。

外部批准後的順序：

1. Owner 將 Pages source 切換至 GitHub Actions，並確認 generated legacy workflow
   不會與新 deploy workflow race。
2. Review 後才 commit/push workflow 及 guard。
3. Pages deploy 完成後，執行 explicit post-deploy verifier。
4. 任一舊 operational path 回 `200`，立即停止後續 migration。

`ai-learning`、`local-tools` 及 repo history cleanup 是其他 open items，未包含在
這個 virtual-office Round 1 deployment slice。
