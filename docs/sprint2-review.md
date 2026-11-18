# Sprint 2 Review — SE_CampusFix (Jira: WD)

## Sprint 2 事實

| 項目 | 內容 |
| --- | --- |
| 期間 | 11/17 21:33 → 11/19 12:00（預定） |
| Sprint 目標 | Students can search existing reports by keyword or location before reporting, and staff can update and resolve reports with a required note. |
| 承諾 | S1～S8 共 22 點（S1～S3 由 Sprint 1 帶過來；S7、S8 為客戶要求的搜尋功能） |
| 中途加入 | S10 介面美化（WD-35，3 點，11/17 23:57 由 PO 加入，對應 Sprint 1 Retro 的產品回饋） |
| 完成 | 25 / 25 點，全部 Story 在測試紀錄合併後才移到完成（S1～S3 例外，見 Sprint 2 Retro） |
| 延後 | S9 夜間模式（WD-30，Low）留在 Backlog：S10 的樣式只有亮色，深色配色需要另外設計 |
| 已知缺陷 | 本 Sprint 沒有開 Jira Bug；測試中沒有發現失敗的案例 |
| 程式 / 測試 | main 上 `npm test` 46 項全部 Pass；人工測試 TC-01～TC-29 見 `docs/test-record.md` |

## 請另一組操作（作業 §7 Review）

請別組的同學照下面步驟操作，**不要先教他們怎麼用**，觀察他們能不能自己完成。

1. 打開 http://localhost:3000/ （由我們組的電腦執行 `npm start`）
2. 送出一筆報修：標題、地點、類別、描述自己填，按「送出報修」，記下畫面上的報修編號
3. 回到「報修列表」，用關鍵字或地點找到剛剛那一筆，點進去看詳情與狀態
4. （選做）用管理人員展示帳號 `staff01` / `staff-demo` 登入，把那一筆改為 In Progress，再填處理說明結案；登出後回到詳情頁看狀態與處理說明

請他們回答：

1. 有沒有順利送出並找回那筆報修？哪一步卡住？
2. 哪裡看不懂或不好用？
3. 最希望我們改哪一點？

## Review 結果（當場填寫，照對方的回答記錄，不要改寫意思）

| 欄位 | 內容 |
| --- | --- |
| 日期 / 時間 | |
| 對方組別 / 操作的同學 | |
| 我們組在場的人 | |
| 順利送出？報修編號 | |
| 順利找回並看到詳情與狀態？ | |
| 選做的管理人員流程 | |
| 回饋 1（卡住的地方） | |
| 回饋 2（看不懂或不好用） | |
| 回饋 3（最希望改的一點） | |
| 回饋怎麼處理（PO 決定：放 Backlog / 不處理，原因） | |
| Sprint 目標是否達成（PO 判斷與理由） | |
| 記錄人 | |
