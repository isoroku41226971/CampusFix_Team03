# Working Agreement — SE_CampusFix (Jira: WD)

## 角色 (Roles)

| 角色 | 成員 |
| --- | --- |
| Product Owner (PO) | 陳泓青 |
| Scrum Master (SM) | 彭權毅 |
| Developers | 全體成員（PO 與 SM 也參與開發） |

## 1. 溝通 (Communication)

- 主要頻道：Discord 群組。與工作有關的決定一律同步到對應的 Jira 卡片留言。
- 工作時段內，訊息在 2 小時內回覆。
- **Daily Scrum**：每個工作日 21:00，線上 10 分鐘，由 SM 主持。每人說明：做了什麼、接下來做什麼、有沒有卡住。會後由 SM 記錄一則筆記（進度、下一步、障礙）。
- 需求或範圍變動一律找 PO，由 PO 更新 Backlog。

## 2. 審查 (Reviews)

- 所有程式碼透過 GitHub Pull Request 合併到 `main`，PR 標題帶 Jira key（例如 `WD-5 Add report form`）。**至少一位作者以外的成員 approve 才能合併。**
- Story 完成後移到「送審」狀態並 @ 審查者；審查者在 4 小時內回應。
- 審查發現問題：在 Jira 留言 @ 作者，卡片退回「進行中」，修好後再重新送審。

## 3. 可工作時間 (Availability)

- Sprint 1：11/16–11/17；Sprint 2：11/18–11/19 12:00。
- 期間每人每天至少投入 3 小時；無法工作的時段事先在 Discord 說明。

## 4. 沒做到承諾 (Missed commitments)

- 預期做不完時，最晚在下一次 Daily Scrum 提出，不拖到 Sprint 最後。
- 卡住超過 2 小時：在 Jira 卡片加旗標並 @ SM，由 SM 協助排除或重新分配。
- 未達到 Definition of Done 的 Story 不標 Done，移到下一個 Sprint 或放回 Backlog，並寫上原因。

## 5. 開發規範 (Conventions)

- 分支命名：`feature/WD-xx-short-name`
- commit 訊息：`WD-xx 動詞開頭的說明`（例如 `WD-5 Add report validation`）
- 使用 AI 工具輔助的部分，在 PR 說明中註明；作者需自行驗證並能解釋。
