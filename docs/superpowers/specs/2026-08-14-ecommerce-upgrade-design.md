# OMA CRYSTAL 正規電商升級 — 設計規格

日期：2026-08-14
狀態：已與業主逐段確認核准（金流範圍、平台、庫存粒度、缺貨呈現、後台登入、聯盟預留、後台範圍、架構做法 A、四階段交付）

## 1. 目標

把現有的純靜態網站（GitHub Pages，商品資料寫死於 `app/catalog.tsx`、照片放 `public/materials/`、結帳僅產生訂單文字）升級為正規電商：

- 後台管理系統：上傳照片、編輯珠子/配件/成品/系列、調整尺寸與價格
- 庫存管理：每種珠子每個尺寸記顆數，下單自動扣，缺貨標「補貨中」
- 訂單系統：訂單入庫、狀態流轉
- 線上金流：綠界 ECPay（信用卡 / LINE Pay / ATM）
- 聯盟行銷地基：`?ref=` 追蹤 + 訂單記推薦碼（分潤後台屬未來範圍）

## 2. 已確認的決策

| 項目 | 決策 |
|---|---|
| 金流 | 接台灣金流（綠界 ECPay），線上直接付款；帳號核准前以測試環境開發 |
| 平台 | Cloudflare 全家桶（Workers + D1 + R2），初期與長期皆以此為準 |
| 庫存粒度 | 每珠子 × 每尺寸記顆數；配件單獨記顆數；下單自動扣 |
| 缺貨呈現 | 顯示但標「補貨中」，變灰、不可加入/下單 |
| 後台登入 | Google 帳號登入，Email 白名單：luxkey.tw@gmail.com、agent@tzgrotw.tw |
| 聯盟行銷 | 本次僅埋地基：推薦人表 + 訂單推薦碼欄位 + `?ref=` 捕捉 |
| 後台範圍 | 珠子/配件 + 成品手鍊 + 系列 + 訂單 + 全站設定（工費、運費） |
| 架構 | 做法 A：漸進式 — 前台既有程式不動，資料抽入 D1/R2，加 API 與後台 |

## 3. 整體架構

```
單一 repo（VitoKOK-lab/crystal）
├── 前台（現有 Vite 站：工作室 / 3D 預覽 / 商店）→ 改為讀 API
├── worker/       Cloudflare Worker：靜態資源 + /api/* + /admin
├── migrations/   D1 SQL 遷移檔（依序編號，CI 自動套用）
└── .github/workflows/deploy.yml
      push main → 建置前台 → wrangler deploy → d1 migrations apply
```

- **部署**：合併到 main 後 GitHub Actions 全自動（網站 + API + 資料庫遷移一次完成）。業主唯一動作是回「合併」。
- **網域**：先用 Cloudflare 提供之網址；自有網域之後可直接掛上，不影響架構。
- **既有 GitHub Pages**：切換完成並驗證後，於舊網址放轉址頁。
- **照片**：R2 bucket，key 格式 `materials/<id>.png`、`series/<id>.jpg`。Worker 以 `/img/*` 供圖並掛 CDN 快取。現有 58 張材質照與系列圖以腳本一次搬入。
- **資料搬遷**：以腳本把現行 `catalog.tsx` 的 21 礦石、37 配件、32 成品、8 系列全部種入 D1，業主不需重新輸入。

## 4. 資料庫結構（D1）

7 張核心表（欄位以實作時 migration 為準，此處列語意）：

- **stones** — id、中英文名、能量屬性(6 維 JSON)、文案、基礎價、照片 key、是否透光、排序、上架狀態
- **stone_sizes** — stone_id、mm、加價、**stock（顆數）**、上架狀態。取代現行寫死的 small/large/xlarge 三檔；每顆珠子可自訂尺寸清單
- **accessories** — id、中英文名、類型(spacer/charm)、金/銀、價格、文案、照片 key、**stock（顆數）**、上架狀態
- **series** — id、中英文名、調性文案、banner key、排序
- **products** — id、series_id、名稱、徽章、文案、**composition（JSON：項目與數量）**、售價、排序、上架狀態。成品不記自身庫存 — 由組成項的庫存推算，任一項不足即「補貨中」
- **orders** — 單號、時間、狀態(`pending / paid / making / shipped / done / cancelled`)、客人資料（姓名/電話/Email/地址/手圍/備註）、明細 JSON、工費、運費、總額、付款方式、綠界交易編號、**ref_code**
- **affiliates** — code、名稱、聯絡方式、啟用狀態（本次僅建表）

另有 **settings**（key-value）：基本工費（現 680）、運費、免運門檻。

庫存規則：

- 訂單成立（pending）即在同一交易內扣庫存，防超賣；取消或逾時自動回補
- 待付款訂單 24 小時未付 → 自動取消 + 回補庫存

## 5. 後台（/admin）

Google OAuth 登入，Email 白名單（環境變數），簽章 Cookie session。五頁：

1. **材質管理** — 珠子/配件 CRUD：上傳照片（直傳 R2）、文案、價格、尺寸清單編輯（mm/加價/庫存）、上下架。建議上傳去背 PNG；有背景照片可交由既有 rembg 流程處理
2. **成品管理** — 組成編輯器（選珠子+數量）、售價、文案、上下架；即時顯示推算庫存狀態
3. **訂單管理** — 列表（依狀態篩選）、詳情、一鍵改狀態
4. **系列管理** — 文案與 banner
5. **設定** — 工費 / 運費 / 免運門檻

## 6. 前台改動

- 商品資料改由 `GET /api/catalog`（單一 JSON，邊緣快取 ~60 秒）供應；`catalog.tsx` 保留型別與計算邏輯，資料來源替換
- 尺寸按鈕改為動態（該珠子實際尺寸清單）；缺貨尺寸灰化標「補貨中」
- 成品缺料 → 卡片標「補貨中」、不可購買
- 結帳送出 → `POST /api/orders` 建單，接金流跳轉
- API 失效時退回最近快取資料，站不白屏
- 分享連結 `?d=` 設計編碼維持相容；`?ref=` 進站即存 30 天，下單寫入訂單

## 7. 金流（綠界 ECPay）

```
確認下單 → POST /api/orders（pending、扣庫存）
→ Worker 產生綠界表單參數（含 CheckMacValue 簽章）→ 跳轉綠界付款頁
→ 客人完成付款 → 綠界 server-to-server 通知 /api/ecpay/notify
→ 驗簽 → 訂單轉 paid → 客人導回 /order/<單號> 完成頁
```

- 開發期全程走綠界測試環境；業主取得正式商店代號/HashKey/HashIV 後填入 Cloudflare secrets 即切正式
- webhook 驗簽失敗一律拒絕；重複通知冪等處理

## 8. 品質與安全

- 庫存扣減走 D1 交易；併發下單不超賣
- 後台 API 全部檢查 session；未登入 401
- 金流金鑰存 Cloudflare secrets，不進 repo
- 單元測試（現有 15 條保留 + 新增 API / 庫存 / 簽章測試）；每階段上線前跑無頭瀏覽器驗證
- D1 自動備份（Cloudflare Time Travel 30 天內任意時點還原）

## 9. 交付階段

| Phase | 內容 | 完成即上線 |
|---|---|---|
| 1 地基 | 站點搬 Cloudflare、D1 schema + 資料搬遷、R2 照片、CI 自動部署+遷移、前台讀 API | 網站功能與現在等同，但資料已入庫 |
| 2 後台 | Google 登入、五個管理頁 | 業主可自行管商品與庫存 |
| 3 訂單+金流 | 訂單入庫、綠界測試環境全流程、缺貨標示、逾時取消 | 可收測試訂單；金鑰一填即正式收款 |
| 4 聯盟地基 | affiliates 表、`?ref=` 捕捉、訂單記碼 | 未來分潤後台的資料從此刻開始累積 |

## 10. 業主待辦（外部申請，可並行）

1. 申請綠界會員與收款（個人賣家可申請）；核准後提供商店代號 / HashKey / HashIV
2. 後台登入 Google 帳號白名單：luxkey.tw@gmail.com、agent@tzgrotw.tw（已提供）
3. 購買自有網域（業主已確認要買；建議於 Cloudflare Registrar 購買，成本價且零設定）

## 11. 非目標（本次不做）

- 聯盟分潤後台與報表（僅埋地基）
- 會員系統（客人不需註冊）
- 多管理員權限分級（單一業主白名單）
- 發票/電子發票串接（依營業狀態日後評估）
