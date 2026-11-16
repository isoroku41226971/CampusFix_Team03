# Definition of Done — SE_CampusFix (Jira: WD)

一個 Story 必須**全部符合**以下條件才算 Done：

1. 已合併到 `main`，能在整合後的應用程式中運作。
2. 通過所有驗收條件 (acceptance criteria)，對應的測試案例都已執行並記錄 Pass。
3. 經過作者以外的成員審查，PR 已 approve。
4. Jira Story 附上程式碼連結（PR 或 commit）與測試證據。
5. 沒有影響預期使用的已知缺陷。

截圖、mock-up 或尚未整合的程式碼都不算完成。

## 流程

`待辦事項` → `進行中` → `送審` → `完成`

- 審查有問題：留言 @ 作者，退回 `進行中`，修好再送審。
- Story 還沒 Done 時發現問題，直接修，不開 Bug。
- Story 已經 Done 之後才發現的缺陷，開「漏洞」(Bug)，用「相關項目」連到原 Story；原 Story 維持 Done，由 PO 排優先順序。
