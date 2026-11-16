# S3 報修詳情測試紀錄（WD-7 / WD-18 / WD-19）

- 基底版本：013a547（已整合 WD-6 報修列表，並重新執行六項測試通過）
- 執行日期：2026-11-16（Asia/Taipei）
- 執行者：Codex 自動執行；陳楷杰尚需自行驗證與說明程式
- 環境：Windows x64、Node.js 24.22.1、Express/EJS、better-sqlite3 13.2.0
- 測試指令：`npm test`（本次以 bundled Node 執行同等的 `node --test`）
- 資料庫：`:memory:`，測試結束關閉，不改動 data/campusfix.db
- 安裝：本機舊版 npm 11.6.2 的一般 ci 嘗試重新編譯 SQLite，因缺少 Visual Studio 失敗；改用 `npm ci --ignore-scripts`，使用套件內建預編譯檔成功執行測試。專案依賴與 lockfile 未變更。

| 測試 | 步驟／輸入 | 預期與實際結果 | 結果 |
| --- | --- | --- | --- |
| AC1 | 建立報修，以 Submitted、In Progress 分別 GET /reports/:id | 200，顯示標題、地點、類別、多行描述、CF 編號及即時狀態；不顯示處理說明草稿 | Pass |
| AC2 | 將報修改為 Resolved 並填入多行處理說明 | 200，顯示 Resolved 與處理說明；HTML 字元經跳脫 | Pass |
| 空說明 | Resolved 且 resolution_note 為 NULL | 顯示「尚未提供處理說明」 | Pass |
| AC3 | 查詢不存在、文字、零、負數、小數、科學記號及超過安全整數的 ID | 全部 404，顯示「查無此報修」 | Pass |
| 入口／回歸 | GET 已送出頁及 /reports/new | 已送出頁有詳情連結；新增頁仍為 200 | Pass |
| 文字安全 | 標題及描述包含 script/img 標記 | HTML 跳脫，沒有插入原始標記 | Pass |

自動測試結果：6 tests / 6 pass / 0 fail。
以上為 HTTP + 真實 SQLite + EJS 整合測試，尚未完成人工瀏覽器視覺驗收。

## 人工複驗

1. 執行 npm install、npm start（better-sqlite3 13 需要 Node.js 22 以上）。
2. 送出一筆報修，在成功頁點「查看報修詳情」。確認六項內容與輸入一致。
3. 使用團隊的狀態更新功能或測試資料，檢查 Resolved 報修的處理說明。
4. 打開 /reports/999999，確認顯示「查無此報修」。
5. 實際測試者自行填寫日期並附截圖；不要將自動測試當成已完成的人工測試。

## 送審

分支：`feature/WD-7-report-detail`。
由其他組員 approve，合併 main，並將 PR 與測試證據附到 Jira 後，依團隊 Definition of Done 判定是否完成。
